docker stop rediscommander_instance
docker rm rediscommander_instance
docker rmi rediscommander-server
cp redis-commander.template redis-commander.json 
docker build -t rediscommander-server .
docker run -d --name rediscommander_instance -h rediscommander_instance -p 8081:8081 -t rediscommander-server 