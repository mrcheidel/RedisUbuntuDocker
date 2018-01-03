## Dockerized Redis Server + Wed Admin UI over Ubuntu 16.04

This is a Dockerfile to create a Redis Server running over Ubuntu 16.04 and a Web Admin based on Redis Commander

http://joeferner.github.io/redis-commander/


# Build Docker Image

  docker build -t redis-server .

# Create Docker Instance from Docker Image

  docker run -d --name redis_instance -h redis_instance -p 6379:6379 -p 8081:8081 -t redis-server

# Enter in docker as shell

  docker exec -i -t redis_instance /bin/bash

Claudio Heidel
