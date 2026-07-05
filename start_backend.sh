#!/bin/bash
echo "Starting SENTINEL backend..."
cd "$(dirname "$0")/backend"
pip install fastapi uvicorn google-genai -q
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
