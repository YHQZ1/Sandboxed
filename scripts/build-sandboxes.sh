#!/bin/sh
set -e

echo "Building sandbox images..."

docker build -t dojo-sandbox-python:latest docker/sandbox/python
docker build -t dojo-sandbox-javascript:latest docker/sandbox/javascript
docker build -t dojo-sandbox-cpp:latest docker/sandbox/cpp
docker build -t dojo-sandbox-c:latest docker/sandbox/c
docker build -t dojo-sandbox-java:latest docker/sandbox/java

echo "All sandbox images built successfully."