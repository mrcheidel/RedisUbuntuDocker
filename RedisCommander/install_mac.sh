docker stop rediscommander_instance
docker rm rediscommander_instance
docker rmi rediscommander-server
dm=$(ifconfig --format=unix | grep 'vboxnet0' -A 1  | grep 'inet'| cut -d\  -f2)
sed  "s/localhost/$dm/g" redis-commander.template > redis-commander.json 
docker build -t rediscommander-server .
docker run -d --name rediscommander_instance -h rediscommander_instance -p 8081:8081 -t rediscommander-server 