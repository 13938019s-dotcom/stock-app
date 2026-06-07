@echo off
:: StockIQ Health Check - Windows Task Scheduler entry point
:: Set working directory to project root
cd /d "%~dp0\.."

:: Run the health check script
node scripts\healthcheck.mjs

:: Exit with the node process exit code
exit /b %ERRORLEVEL%
