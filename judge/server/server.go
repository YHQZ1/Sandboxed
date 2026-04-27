package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/YHQZ1/sandboxed/judge/runner"
	"github.com/redis/go-redis/v9"
)

type RunRequest struct {
	Language    string `json:"language"`
	Code        string `json:"code"`
	Input       string `json:"input"`
	TimeLimit   int    `json:"timeLimit"`
	MemoryLimit int    `json:"memoryLimit"`
}

type RunResponse struct {
	Output string `json:"output"`
	Error  string `json:"error"`
}

type TestCase struct {
	ID             string `json:"id"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
}

type SubmitRequest struct {
	SubmissionID    string     `json:"submissionId"`
	RoomCode        string     `json:"roomCode"`
	ProblemID       string     `json:"problemId"`
	ParticipantName string     `json:"participantName"`
	Language        string     `json:"language"`
	Code            string     `json:"code"`
	TimeLimit       int        `json:"timeLimit"`
	MemoryLimit     int        `json:"memoryLimit"`
	TestCases       []TestCase `json:"testCases"`
}

type TestCaseVerdictResult struct {
	TestCaseID   string `json:"testCaseId"`
	Status       string `json:"status"`
	TimeTaken    int    `json:"timeTaken"`
	MemoryUsed   int    `json:"memoryUsed"`
	ActualOutput string `json:"actualOutput"`
}

type VerdictResult struct {
	SubmissionID    string                  `json:"submissionId"`
	RoomCode        string                  `json:"roomCode"`
	ProblemID       string                  `json:"problemId"`
	ParticipantName string                  `json:"participantName"`
	Status          string                  `json:"status"`
	Score           int                     `json:"score"`
	TimeTaken       int                     `json:"timeTaken"`
	MemoryUsed      int                     `json:"memoryUsed"`
	Results         []TestCaseVerdictResult `json:"results"`
}

type Server struct {
	httpServer *http.Server
	redis      *redis.Client
}

func New(rc *redis.Client, port string) *Server {
	s := &Server{redis: rc}
	mux := http.NewServeMux()
	mux.HandleFunc("/run", s.handleRun)
	mux.HandleFunc("/submit", s.handleSubmit)

	s.httpServer = &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}
	return s
}

func (s *Server) Start() error {
	log.Printf("Judge server listening on port %s", s.httpServer.Addr)
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) {
	shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := s.httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}
}

func (s *Server) handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.TimeLimit == 0 {
		req.TimeLimit = 5
	}
	if req.MemoryLimit == 0 {
		req.MemoryLimit = 256
	}

	output, errMsg, err := runner.RunDirect(req.Language, req.Code, req.Input, req.TimeLimit, req.MemoryLimit)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunResponse{Error: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RunResponse{Output: output, Error: errMsg})
}

func (s *Server) handleSubmit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusAccepted)

	go s.processSubmission(req)
}

func (s *Server) processSubmission(req SubmitRequest) {
	log.Printf("Judging submission %s (%s, %s)", req.SubmissionID, req.Language, req.ParticipantName)

	tcs := make([]struct {
		ID             string
		Input          string
		ExpectedOutput string
	}, len(req.TestCases))
	for i, tc := range req.TestCases {
		tcs[i].ID = tc.ID
		tcs[i].Input = tc.Input
		tcs[i].ExpectedOutput = tc.ExpectedOutput
	}

	results, err := runner.RunSubmission(req.Language, req.Code, req.TimeLimit, req.MemoryLimit, tcs)
	if err != nil {
		log.Printf("Runner error for %s: %v", req.SubmissionID, err)
		s.publishVerdict(VerdictResult{
			SubmissionID:    req.SubmissionID,
			RoomCode:        req.RoomCode,
			ProblemID:       req.ProblemID,
			ParticipantName: req.ParticipantName,
			Status:          "runtime_error",
			Score:           0,
		})
		return
	}

	verdict := determineVerdict(results)
	score := 0
	if verdict == "accepted" {
		score = 100
	}

	maxTime := 0
	maxMem := 0
	tcResults := make([]TestCaseVerdictResult, len(results))
	for i, r := range results {
		tcResults[i] = TestCaseVerdictResult{
			TestCaseID:   r.TestCaseID,
			Status:       r.Status,
			TimeTaken:    r.TimeTaken,
			MemoryUsed:   r.MemoryUsed,
			ActualOutput: r.ActualOutput,
		}
		if r.TimeTaken > maxTime {
			maxTime = r.TimeTaken
		}
		if r.MemoryUsed > maxMem {
			maxMem = r.MemoryUsed
		}
	}

	s.publishVerdict(VerdictResult{
		SubmissionID:    req.SubmissionID,
		RoomCode:        req.RoomCode,
		ProblemID:       req.ProblemID,
		ParticipantName: req.ParticipantName,
		Status:          verdict,
		Score:           score,
		TimeTaken:       maxTime,
		MemoryUsed:      maxMem,
		Results:         tcResults,
	})
}

func (s *Server) publishVerdict(verdict VerdictResult) {
	data, err := json.Marshal(verdict)
	if err != nil {
		log.Printf("Failed to marshal verdict: %v", err)
		return
	}
	if err := s.redis.Publish(context.Background(), "pubsub:verdict", string(data)).Err(); err != nil {
		log.Printf("Failed to publish verdict: %v", err)
	}
}

func determineVerdict(results []runner.TestCaseResult) string {
	if len(results) == 0 {
		return "runtime_error"
	}
	for _, r := range results {
		if r.Status == "compilation_error" {
			return "compilation_error"
		}
		if r.Status == "tle" {
			return "tle"
		}
		if r.Status == "runtime_error" {
			return "runtime_error"
		}
		if r.Status == "wrong_answer" {
			return "wrong_answer"
		}
	}
	return "accepted"
}
