#!/bin/bash
defaultversion=dev
VERSION=${1:-$defaultversion}

npm install
npm upgrade
doctl registry login
docker build . -t registry.digitalocean.com/wallfair/backend:$VERSION -f Dockerfile.node
docker push registry.digitalocean.com/wallfair/backend:$VERSION