## Dockerized Redis Server + Wed Admin UI over Ubuntu 16.04

This is a Dockerfile to create a Redis Server running over Ubuntu 16.04 and a Web Admin based on Redis Commander

http://joeferner.github.io/redis-commander/


## How to use

### Install Redis Server
	
	cd RedisServer
	./install.sh


### Install Redis Commander (Redis Admin Web UI)

If you are running over **Mac OS**, Docker run over a VirtualBox machine and do you need find the docker-machine ip-address.

Linux

	cd RedisCommander
	./install.sh

Mac
	cd RedisCommander
	./install_mac.sh


### Enter to Web Admin UI
  
	http://localhost:8081


