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

type TestCaseResult struct {
	TestCaseID   string
	Status       string
	TimeTaken    int
	MemoryUsed   int
	ActualOutput string
}

func RunSubmission(
	language string,
	code string,
	timeLimit int,
	memoryLimit int,
	testCases []struct {
		ID             string
		Input          string
		ExpectedOutput string
	},
) ([]TestCaseResult, error) {
	dir, err := os.MkdirTemp("", "dojo-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(dir)

	srcFile, err := writeSourceFile(dir, language, code)
	if err != nil {
		return nil, fmt.Errorf("failed to write source: %w", err)
	}

	if err := compile(dir, language, srcFile); err != nil {
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

	results := make([]TestCaseResult, 0, len(testCases))
	for _, tc := range testCases {
		result := runInDocker(dir, language, tc.Input, tc.ExpectedOutput, tc.ID, timeLimit, memoryLimit)
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
		return nil
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s", stderr.String())
	}
	return nil
}

func runInDocker(dir, language, input, expectedOutput, testCaseID string, timeLimit, memoryLimit int) TestCaseResult {
	image := dockerImage(language)

	runCmd := buildContainerRunCmd(language)

	args := []string{
		"run", "--rm",
		"--network", "none",
		fmt.Sprintf("--memory=%dm", memoryLimit),
		fmt.Sprintf("--memory-swap=%dm", memoryLimit),
		"--cpus=1",
		"--pids-limit=64",
		"-v", fmt.Sprintf("%s:/code:ro", dir),
		"--workdir", "/code",
		"-i",
		image,
	}
	args = append(args, runCmd...)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeLimit+5)*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", args...)
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
		if elapsed >= timeLimit*1000 {
			return TestCaseResult{
				TestCaseID: testCaseID,
				Status:     "tle",
				TimeTaken:  elapsed,
			}
		}
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
		ActualOutput: actualOutput,
	}
}

func dockerImage(language string) string {
	images := map[string]string{
		"python":     "python:3.12-alpine",
		"javascript": "node:20-alpine",
		"cpp":        "alpine:3.19",
		"c":          "alpine:3.19",
		"java":       "eclipse-temurin:21-jre-alpine",
	}
	return images[language]
}

func buildContainerRunCmd(language string) []string {
	switch language {
	case "python":
		return []string{"python3", "solution.py"}
	case "javascript":
		return []string{"node", "solution.js"}
	case "cpp", "c":
		return []string{"./solution"}
	case "java":
		return []string{"java", "-Xmx200m", "-cp", ".", "Solution"}
	}
	return nil
}
