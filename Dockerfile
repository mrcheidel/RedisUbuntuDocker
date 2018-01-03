# Created by Claudio Heidel
# https://github.com/mrcheidel/RedisUbuntuDocker

FROM ubuntu:16.04

RUN apt-get update

RUN apt-get install -y wget curl build-essential nano npm

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

RUN \
	sed -i 's/# daemonize no/daemonize yes/g' /etc/redis/redis.conf  && \
	sed -i 's/protected-mode yes/protected-mode no/g' /etc/redis/redis.conf
	
	
RUN \
	printf '#!/bin/bash\nredis-server /etc/redis/redis.conf\nredis-commander\n' > /etc/redis/my_start.sh
	

# Define mountable directories.
VOLUME ["/data"]
WORKDIR /data
EXPOSE 6379

RUN curl -sL https://deb.nodesource.com/setup_9.x 
RUN apt-get install -y nodejs
RUN ln -s /usr/bin/nodejs /usr/bin/node
RUN npm install -g redis-commander
EXPOSE 8081

CMD ["bash", "/etc/redis/my_start.sh"]


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


