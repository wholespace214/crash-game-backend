doctl registry login
docker build . -t registry.digitalocean.com/wallfair/backend -f Dockerfile.node
docker push registry.digitalocean.com/wallfair/backend

docker build . -t registry.digitalocean.com/wallfair/chat -f Dockerfile.chat
docker push registry.digitalocean.com/wallfair/chat