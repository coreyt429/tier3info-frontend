# Build the image
docker build -t flask-cfg .

# Stop and remove any existing container (suppress error if it doesn't exist)
docker rm -f flask-cfg-app 2>$null

# Run the container
docker run -d --rm --name flask-cfg-app `
  -p 8080:8080 `
  -v "${PWD}\cfg.json:/app/cfg.json" `
  flask-cfg
