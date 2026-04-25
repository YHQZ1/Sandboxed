package config

import (
	"os"
)

type Config struct {
	RedisURL    string
	PostgresURL string
}

func Load() *Config {
	return &Config{
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		PostgresURL: getEnv("POSTGRES_URL", "postgres://dojo:dojo@localhost:5433/dojo?sslmode=disable"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
