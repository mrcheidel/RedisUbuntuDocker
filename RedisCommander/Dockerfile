# Created by Claudio Heidel
# https://github.com/mrcheidel/RedisUbuntuDocker

FROM ubuntu:16.04

RUN \
  sed -i 's/# \(.*multiverse$\)/\1/g' /etc/apt/sources.list && \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y build-essential && \
  apt-get install -y wget && \
  apt-get install -y curl && \
  apt-get install -y nano && \
  apt-get install -y npm 


# Redis Commander
RUN \
  adduser redis-commander && \
  curl -sL https://deb.nodesource.com/setup_9.x  && \
  apt-get install -y nodejs && \
  ln -s /usr/bin/nodejs /usr/bin/node && \
  npm install -g redis-commander 
  # && \ mkdir /home/redis-commander 
  
  
USER redis-commander
  
ADD redis-commander.json /home/redis-commander/.redis-commander 
ADD entrypoint.sh /usr/bin/entrypoint 


EXPOSE 8081

CMD ["redis-commander"]


# Build Docker Image
# docker build -t redis-server .

# Create Docker Instance from Docker Image
# docker run -d --name rediscommander_instance -h rediscommander_instance -p 6379:6379 -p 8081:8081 -t rediscommander-server -m 512m

# Enter in docker as shell
# docker exec -i -t rediscommander_instance /bin/bash

