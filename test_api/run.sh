#!/bin/bash

podman build -t flask-cfg .

podman rm -f flask-cfg-app 2>/dev/null

podman run -d --rm --name flask-cfg-app \
  -p 8080:8080 \
  -v "$PWD/app.py:/app/app.py:Z" \
  -v "$PWD/locate_sample_data.json:/app/locate_sample_data.json:Z" \
  flask-cfg

echo "flask-cfg should be running now"

podman ps -a 
