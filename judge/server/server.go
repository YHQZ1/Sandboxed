package server

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/YHQZ1/dojo/judge/runner"
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

func Start(port string) {
	http.HandleFunc("/run", handleRun)

	log.Printf("🌐 Judge HTTP server on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

func handleRun(w http.ResponseWriter, r *http.Request) {
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
