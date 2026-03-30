@echo off
REM ===================================================
REM  FDK Run - GPT Ticket Assistant (Freshdesk)
REM  Configura Node 24.11.0 via nvm y ejecuta fdk run
REM ===================================================

set NVM_NODE=%APPDATA%\nvm\v24.11.0
set PATH=%NVM_NODE%;%PATH%

echo [INFO] Node version:
node -v
echo [INFO] FDK version:
call fdk version
echo.
echo [INFO] Starting FDK local server...
echo.

call fdk run
