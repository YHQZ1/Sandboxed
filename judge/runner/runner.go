package runner

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type RunResult struct {
	Output     string
	TimeTaken  int // ms
	MemoryUsed int // MB
	TLE        bool
	RuntimeErr bool
	ExitCode   int
}

type TestCaseResult struct {
	TestCaseID   string
	Status       string // accepted | wrong_answer | tle | runtime_error
	TimeTaken    int
	MemoryUsed   int
	ActualOutput string
}

func RunSubmission(
	language string,
	code string,
	timeLimit int, // seconds
	memoryLimit int, // MB
	testCases []struct {
		ID             string
		Input          string
		ExpectedOutput string
	},
) ([]TestCaseResult, error) {
	// create temp working directory
	dir, err := os.MkdirTemp("", "dojo-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(dir)

	// write source file
	srcFile, err := writeSourceFile(dir, language, code)
	if err != nil {
		return nil, fmt.Errorf("failed to write source: %w", err)
	}

	// compile if needed
	if err := compile(dir, language, srcFile); err != nil {
		// compilation error — all test cases fail with CE
		results := make([]TestCaseResult, len(testCases))
		for i, tc := range testCases {
			results[i] = TestCaseResult{
				TestCaseID:   tc.ID,
				Status:       "compilation_error",
				ActualOutput: err.Error(),
			}
		}
		return results, nil
	}

	// run against each test case
	results := make([]TestCaseResult, 0, len(testCases))
	for _, tc := range testCases {
		result := runTestCase(dir, language, tc.Input, tc.ExpectedOutput, tc.ID, timeLimit, memoryLimit)
		results = append(results, result)
	}

	return results, nil
}

func writeSourceFile(dir, language, code string) (string, error) {
	filenames := map[string]string{
		"cpp":        "solution.cpp",
		"c":          "solution.c",
		"java":       "Solution.java",
		"python":     "solution.py",
		"javascript": "solution.js",
	}
	filename, ok := filenames[language]
	if !ok {
		return "", fmt.Errorf("unsupported language: %s", language)
	}
	path := filepath.Join(dir, filename)
	return path, os.WriteFile(path, []byte(code), 0644)
}

func compile(dir, language, srcFile string) error {
	var cmd *exec.Cmd

	switch language {
	case "cpp":
		cmd = exec.Command("g++", srcFile, "-o", filepath.Join(dir, "solution"), "-O2")
	case "c":
		cmd = exec.Command("gcc", srcFile, "-o", filepath.Join(dir, "solution"))
	case "java":
		cmd = exec.Command("javac", srcFile)
	default:
		return nil // python and js don't need compilation
	}

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s", stderr.String())
	}
	return nil
}

func runTestCase(dir, language, input, expectedOutput, testCaseID string, timeLimit, memoryLimit int) TestCaseResult {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeLimit+1)*time.Second)
	defer cancel()

	cmd := buildRunCommand(ctx, dir, language)
	if cmd == nil {
		return TestCaseResult{TestCaseID: testCaseID, Status: "runtime_error", ActualOutput: "unsupported language"}
	}

	cmd.Dir = dir
	cmd.Stdin = strings.NewReader(input)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	err := cmd.Run()
	elapsed := int(time.Since(start).Milliseconds())

	actualOutput := strings.TrimSpace(stdout.String())
	expected := strings.TrimSpace(expectedOutput)

	if ctx.Err() == context.DeadlineExceeded {
		return TestCaseResult{
			TestCaseID:   testCaseID,
			Status:       "tle",
			TimeTaken:    timeLimit * 1000,
			ActualOutput: actualOutput,
		}
	}

	if err != nil {
		return TestCaseResult{
			TestCaseID:   testCaseID,
			Status:       "runtime_error",
			TimeTaken:    elapsed,
			ActualOutput: stderr.String(),
		}
	}

	status := "wrong_answer"
	if actualOutput == expected {
		status = "accepted"
	}

	return TestCaseResult{
		TestCaseID:   testCaseID,
		Status:       status,
		TimeTaken:    elapsed,
		MemoryUsed:   0, // basic version — extend with /usr/bin/time if needed
		ActualOutput: actualOutput,
	}
}

func buildRunCommand(ctx context.Context, dir, language string) *exec.Cmd {
	switch language {
	case "cpp", "c":
		return exec.CommandContext(ctx, filepath.Join(dir, "solution"))
	case "java":
		return exec.CommandContext(ctx, "java", "-Xmx256m", "-cp", dir, "Solution")
	case "python":
		return exec.CommandContext(ctx, "python3", filepath.Join(dir, "solution.py"))
	case "javascript":
		return exec.CommandContext(ctx, "node", filepath.Join(dir, "solution.js"))
	}
	return nil
}
