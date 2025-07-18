#!/bin/bash

podman build -t flask-cfg .

podman rm -f flask-cfg-app 2>/dev/null

podman run -d --rm --name flask-cfg-app \
  -p 8080:8080 \
  -v "$PWD/cfg.json:/app/cfg.json:Z" \
  flask-cfg