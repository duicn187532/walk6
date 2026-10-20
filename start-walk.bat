@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Walk 我可遛 啟動器
echo.
echo  ===== Walk 我可遛 · 啟動伺服器與 ngrok =====
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [X] 找不到 Node.js，請先安裝 Node.js 22.13 以上版本：https://nodejs.org
  pause
  exit /b 1
)

rem 先關掉上一次留下來的伺服器／通道（不會影響其他專案的 ngrok）
call "%~dp0stop-walk.bat" quiet

if not exist node_modules (
  echo  [1/4] 第一次執行，安裝套件中...
  call npm install --no-audit --no-fund
) else (
  echo  [1/4] 套件已安裝
)

echo  [2/4] 建置前端...
call npx vite build --logLevel error
if errorlevel 1 (
  echo  [X] 前端建置失敗
  pause
  exit /b 1
)

echo  [3/4] 啟動伺服器（資料庫與 GPS 模擬器）...
start "Walk-Server" cmd /k "chcp 65001>nul && npm run start"
ping -n 4 127.0.0.1 >nul

where ngrok >nul 2>nul
if errorlevel 1 (
  echo  [!] 找不到 ngrok，只啟動本機版：http://localhost:4100
) else (
  echo  [4/4] 啟動 ngrok 對外分享（連結會顯示在新視窗，也會存到 share-links.txt）...
  start "Walk-Tunnel" cmd /k "chcp 65001>nul && npm run tunnel"
)

start "" "http://localhost:4100/owner?as=A"
echo.
echo  完成！本機體驗：
echo    體驗者 A（小晴）   http://localhost:4100/owner?as=A
echo    體驗者 B（林以安） http://localhost:4100/walker?as=B
echo  要關閉全部服務，請執行 stop-walk.bat
echo.
ping -n 9 127.0.0.1 >nul
