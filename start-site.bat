@echo off
chcp 65001 >nul
title HighScore - dev server
cd /d "%~dp0artifacts\heal"

echo.
echo   HighScore - starting the dev server...
echo   The browser will open by itself when it is ready.
echo.
echo   Keep THIS WINDOW OPEN while you work.
echo   Closing it (or pressing Ctrl+C) stops the site.
echo.

if not exist "node_modules" (
  if not exist "..\..\node_modules" (
    echo   Dependencies are not installed yet. Running pnpm install first...
    echo.
    pushd "%~dp0"
    call pnpm install
    popd
    echo.
  )
)

rem --open makes vite launch the browser only once the server is actually ready,
rem so there is no "site can't be reached" flash. No --strictPort on purpose: if
rem 5173 is busy vite picks the next free port and opens THAT one.
call npx vite --port 5173 --open

echo.
echo   The server has stopped.
pause
