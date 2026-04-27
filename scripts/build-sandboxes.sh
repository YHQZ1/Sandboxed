#!/bin/sh
set -e

echo "Building sandbox images..."

docker build -t sandboxed-sandbox-python:latest docker/sandbox/python
docker build -t sandboxed-sandbox-javascript:latest docker/sandbox/javascript
docker build -t sandboxed-sandbox-cpp:latest docker/sandbox/cpp
docker build -t sandboxed-sandbox-c:latest docker/sandbox/c
docker build -t sandboxed-sandbox-java:latest docker/sandbox/java

echo "All sandbox images built successfully."