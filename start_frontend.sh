#!/bin/bash
echo "Starting SENTINEL frontend..."
cd "$(dirname "$0")/frontend"
npm install
npm run dev
