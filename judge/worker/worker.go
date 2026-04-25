package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/yourusername/dojo/judge/runner"
)

type TestCase struct {
	ID             string `json:"id"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
}

type SubmissionJob struct {
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

type VerdictResult struct {
	SubmissionID    string                  `json:"submissionId"`
	RoomCode        string                  `json:"roomCode"`
	ParticipantName string                  `json:"participantName"`
	Status          string                  `json:"status"`
	Score           int                     `json:"score"`
	TimeTaken       int                     `json:"timeTaken"`
	MemoryUsed      int                     `json:"memoryUsed"`
	Results         []TestCaseVerdictResult `json:"results"`
}

type TestCaseVerdictResult struct {
	TestCaseID   string `json:"testCaseId"`
	Status       string `json:"status"`
	TimeTaken    int    `json:"timeTaken"`
	MemoryUsed   int    `json:"memoryUsed"`
	ActualOutput string `json:"actualOutput"`
}

type Worker struct {
	redis *redis.Client
	db    *sql.DB
}

func New(redisClient *redis.Client, db *sql.DB) *Worker {
	return &Worker{redis: redisClient, db: db}
}

func (w *Worker) Start(ctx context.Context) {
	log.Println("⚙️  Judge worker started, waiting for jobs...")

	for {
		select {
		case <-ctx.Done():
			log.Println("Worker shutting down")
			return
		default:
			// blocking pop with 5s timeout
			result, err := w.redis.BRPop(ctx, 5*time.Second, "queue:submissions").Result()
			if err != nil {
				if err == redis.Nil {
					continue // timeout, no jobs — loop again
				}
				if ctx.Err() != nil {
					return
				}
				log.Printf("Redis BRPop error: %v", err)
				continue
			}

			// result[0] = key, result[1] = value
			if len(result) < 2 {
				continue
			}

			var job SubmissionJob
			if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
				log.Printf("Failed to parse job: %v", err)
				continue
			}

			log.Printf("🔨 Judging submission %s (%s, %s)", job.SubmissionID, job.Language, job.ParticipantName)
			w.processJob(ctx, job)
		}
	}
}

func (w *Worker) processJob(ctx context.Context, job SubmissionJob) {
	// update status to judging
	w.db.ExecContext(ctx,
		`UPDATE submissions SET status = 'judging' WHERE id = $1`,
		job.SubmissionID,
	)

	// build test cases for runner
	tcs := make([]struct {
		ID             string
		Input          string
		ExpectedOutput string
	}, len(job.TestCases))
	for i, tc := range job.TestCases {
		tcs[i].ID = tc.ID
		tcs[i].Input = tc.Input
		tcs[i].ExpectedOutput = tc.ExpectedOutput
	}

	// run the code
	results, err := runner.RunSubmission(job.Language, job.Code, job.TimeLimit, job.MemoryLimit, tcs)
	if err != nil {
		log.Printf("Runner error for %s: %v", job.SubmissionID, err)
		w.publishVerdict(ctx, VerdictResult{
			SubmissionID:    job.SubmissionID,
			RoomCode:        job.RoomCode,
			ParticipantName: job.ParticipantName,
			Status:          "runtime_error",
			Score:           0,
		})
		return
	}

	// determine overall verdict
	verdict := determineVerdict(results)
	score := 0
	if verdict == "accepted" {
		score = w.getProblemScore(ctx, job.ProblemID)
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

	w.publishVerdict(ctx, VerdictResult{
		SubmissionID:    job.SubmissionID,
		RoomCode:        job.RoomCode,
		ParticipantName: job.ParticipantName,
		Status:          verdict,
		Score:           score,
		TimeTaken:       maxTime,
		MemoryUsed:      maxMem,
		Results:         tcResults,
	})
}

func (w *Worker) publishVerdict(ctx context.Context, verdict VerdictResult) {
	data, err := json.Marshal(verdict)
	if err != nil {
		log.Printf("Failed to marshal verdict: %v", err)
		return
	}
	if err := w.redis.Publish(ctx, "pubsub:verdict", string(data)).Err(); err != nil {
		log.Printf("Failed to publish verdict: %v", err)
		return
	}
	log.Printf("✅ Published verdict for %s: %s", verdict.SubmissionID, verdict.Status)
}

func (w *Worker) getProblemScore(ctx context.Context, problemID string) int {
	var score int
	err := w.db.QueryRowContext(ctx,
		`SELECT points FROM problems WHERE id = $1`, problemID,
	).Scan(&score)
	if err != nil {
		return 100 // default
	}
	return score
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

// keep compiler happy
var _ = fmt.Sprintf
