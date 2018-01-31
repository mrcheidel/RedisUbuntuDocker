## Dockerized Redis Server + Wed Admin UI over Ubuntu 16.04

This is a Dockerfile to create a Redis Server running over Ubuntu 16.04 and a Web Admin based on Redis Commander

http://joeferner.github.io/redis-commander/


## How to use

### Install Redis Server
	
	cd RedisServer
	./install.sh


### Install Redis Commander (Redis Admin Web UI)

Edit the filename **redis-commander.json** and update the **host** value parameter with you docker-machine ip-address

If you are running over Mac, Docker run over a VirtualBox machine and do you need find the docker-machine ip-address:

	ifconfig --format=unix | grep 'vboxnet0' -A 1  | grep 'inet'| cut -d\  -f2


redis-commander.json content:

	{
	  "sidebarWidth":250,
	  "locked":false,
	  "CLIHeight":50,
	  "CLIOpen":false,
	  "default_connections": [
		{
		  "label":"local",
		  **"host":"192.168.99.1",**
		  "port":"6379",
		  "password":"",
		  "dbIndex":0
		}
	  ]
	}

Then run the installer

	cd RedisCommander
	./install.sh

### Enter to Web Admin UI
  
	http://localhost:8081


