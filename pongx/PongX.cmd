@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo PongX requires Node.js 22 or newer.
  echo Install Node.js, reopen this terminal, and run PongX again.
  pause
  exit /b 1
)
for /f %%v in ('node -p "Number(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
if not defined NODE_MAJOR exit /b 1
if %NODE_MAJOR% LSS 22 (
  echo PongX requires Node.js 22 or newer. Current major version: %NODE_MAJOR%
  pause
  exit /b 1
)
node "%~dp0bin\pongx.js" %*
