@echo off
cd /d "%~dp0"
start "" http://localhost:4180
python -m http.server 4180
