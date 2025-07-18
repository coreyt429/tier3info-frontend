FROM python:3.12-slim

WORKDIR /app

COPY app.py cfg.json ./
RUN pip install flask flask-cors

EXPOSE 8080

CMD ["python", "app.py"]