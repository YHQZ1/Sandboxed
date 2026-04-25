package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/YHQZ1/dojo/judge/config"
	"github.com/YHQZ1/dojo/judge/worker"
	_ "github.com/lib/pq"
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

	db, err := sql.Open("postgres", cfg.PostgresURL)
	if err != nil {
		log.Fatalf("Postgres open failed: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("Postgres ping failed: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	w := worker.New(redisClient, db)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	go w.Start(ctx)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down judge...")
	cancel()
}
