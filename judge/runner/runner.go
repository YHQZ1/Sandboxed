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
	dir, err := os.MkdirTemp("/tmp", "sandboxed-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(dir)

	if _, err := writeSourceFile(dir, language, code); err != nil {
		return nil, fmt.Errorf("failed to write source: %w", err)
	}

	results := make([]TestCaseResult, 0, len(testCases))
	for _, tc := range testCases {
		result := runInDocker(dir, language, tc.Input, tc.ExpectedOutput, tc.ID, timeLimit, memoryLimit)
		results = append(results, result)
	}

	return results, nil
}

func RunDirect(language string, code string, input string, timeLimit int, memoryLimit int) (string, string, error) {
	dir, err := os.MkdirTemp("/tmp", "sandboxed-run-*")
	if err != nil {
		return "", "", fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(dir)

	if _, err := writeSourceFile(dir, language, code); err != nil {
		return "", "", err
	}

	result := runInDocker(dir, language, input, "", "direct", timeLimit, memoryLimit)

	if result.Status == "runtime_error" {
		return "", result.ActualOutput, nil
	}
	if result.Status == "tle" {
		return "", "Time limit exceeded", nil
	}

	return result.ActualOutput, "", nil
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
		"-v", fmt.Sprintf("%s:/code", dir), // read-write mount
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
		// compilation error or runtime error; stderr holds details
		exitMsg := stderr.String()
		if strings.Contains(exitMsg, "error:") || strings.Contains(exitMsg, "cannot find symbol") {
			return TestCaseResult{
				TestCaseID:   testCaseID,
				Status:       "compilation_error",
				TimeTaken:    elapsed,
				ActualOutput: exitMsg,
			}
		}
		return TestCaseResult{
			TestCaseID:   testCaseID,
			Status:       "runtime_error",
			TimeTaken:    elapsed,
			ActualOutput: exitMsg,
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
		"python":     "sandboxed-sandbox-python:latest",
		"javascript": "sandboxed-sandbox-javascript:latest",
		"cpp":        "sandboxed-sandbox-cpp:latest",
		"c":          "sandboxed-sandbox-c:latest",
		"java":       "sandboxed-sandbox-java:latest",
	}
	return images[language]
}

func buildContainerRunCmd(language string) []string {
	switch language {
	case "python":
		return []string{"python3", "solution.py"}
	case "javascript":
		return []string{"node", "solution.js"}
	case "cpp":
		return []string{"sh", "-c", "g++ -O2 solution.cpp -o solution 2>&1 && ./solution"}
	case "c":
		return []string{"sh", "-c", "gcc solution.c -o solution 2>&1 && ./solution"}
	case "java":
		return []string{"sh", "-c", "javac Solution.java 2>&1 && java -Xmx200m Solution"}
	}
	return nil
}
