docker stop redis_instance
docker rm redis_instance
docker rmi redis-server
docker build -t redis-server .
docker run -d --name redis_instance -h redis_instance -p 6379:6379 -t redis-server 