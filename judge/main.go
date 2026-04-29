package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/YHQZ1/sandboxed/judge/config"
	"github.com/YHQZ1/sandboxed/judge/server"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()

	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Invalid Redis URL: %v", err)
	}
	redisClient := redis.NewClient(opt)

	ctx := context.Background()
	if _, err := redisClient.Ping(ctx).Result(); err != nil {
		log.Fatalf("Redis connection failed: %v", err)
	}
	log.Println("Connected to Redis")

	srv := server.New(redisClient, "5001")

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down judge...")
	srv.Shutdown(context.Background())
	if err := redisClient.Close(); err != nil {
		log.Printf("Redis close error: %v", err)
	}
}
