package config

import "os"

type Config struct {
	RedisURL string
}

func Load() *Config {
	return &Config{
		RedisURL: getEnv("REDIS_URL", "redis://localhost:6379"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
