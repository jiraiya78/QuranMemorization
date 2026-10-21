@echo off
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting ReciteHelper...
echo   PC:    http://localhost:5173/
echo   Phone: http://YOUR-PC-IP:5173/  ^(same Wi-Fi; see Network URL below^)
echo.
echo If the phone cannot connect, allow Node.js in Windows Firewall when prompted,
echo or run:  netsh advfirewall firewall add rule name="Vite 5173" dir=in action=allow protocol=TCP localport=5173
echo.

start "" "http://localhost:5173/"
call npm run dev
