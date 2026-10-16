#!/bin/bash
# keep-alive для mini-service ИИ «Цветочки»
# Запускается в фоне, перезапускает мини-сервис при падении.

cd /home/z/my-project

while true; do
  if ! pgrep -f "mini-services/ai-service/index.ts" > /dev/null; then
    echo "[$(date)] starting ai-service..."
    bun run mini-services/ai-service/index.ts >> /tmp/ai-service.log 2>&1 &
    disown
  fi
  sleep 5
done
