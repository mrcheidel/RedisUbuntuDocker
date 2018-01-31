# https://github.com/mrcheidel/RedisUbuntuDocker

LABEL maintainer="Claudio Heidel"

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


# Install Redis.
RUN \
  cd /tmp && \
  wget http://download.redis.io/redis-stable.tar.gz && \
  tar xvzf redis-stable.tar.gz && \
  cd redis-stable && \
  make && \
  make install && \
  cp -f src/redis-sentinel /usr/local/bin && \
  mkdir -p /etc/redis && \
  cp -f *.conf /etc/redis && \
  rm -rf /tmp/redis-stable* && \
  sed -i 's/^\(bind .*\)$/# \1/' /etc/redis/redis.conf && \
  sed -i 's/^\(daemonize .*\)$/# \1/' /etc/redis/redis.conf && \
  sed -i 's/^\(dir .*\)$/# \1\ndir \/data/' /etc/redis/redis.conf && \
  sed -i 's/^\(logfile .*\)$/# \1/' /etc/redis/redis.conf

RUN sed -i 's/protected-mode yes/protected-mode no/g' /etc/redis/redis.conf
#RUN sed -i 's/# daemonize no/daemonize yes/g' /etc/redis/redis.conf  

# Define mountable directories.
VOLUME ["/data"]

WORKDIR /data

EXPOSE 6379

ENTRYPOINT ["redis-server", "/etc/redis/redis.conf"]


# Build Docker Image
# docker build -t redis-server .

# Create Docker Instance from Docker Image
# docker run -d --name redis_instance -h redis_instance -p 6379:6379 -p 8081:8081 -t redis-server

# Enter in docker as shell
# docker exec -i -t redis_instance /bin/bash

# change the default configuration 
# nano /etc/redis/redis.conf     
# and i changed to:
#    protected-mode no
#    daemonize yes