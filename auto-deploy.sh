docker login -u ${DIGITALOCEAN_ACCESS_TOKEN} -p ${DIGITALOCEAN_ACCESS_TOKEN} registry.digitalocean.com
docker build . -t registry.digitalocean.com/wallfair/backend -f Dockerfile.node
docker push registry.digitalocean.com/wallfair/backend