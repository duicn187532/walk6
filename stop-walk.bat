@echo off
chcp 65001 >nul
rem 只停止 Walk 我可遛 自己的程序：佔用 4100-4102 的伺服器，以及指向 4100 的 ngrok。其他專案的 ngrok 不受影響。
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -State Listen -LocalPort 4100,4101,4102 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue };" ^
  "Get-CimInstance Win32_Process -Filter \"Name='ngrok.exe'\" | Where-Object { $_.CommandLine -match 'http 4100' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
taskkill /FI "WINDOWTITLE eq Walk-Server*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq Walk-Tunnel*" /T /F >nul 2>nul
if /i not "%~1"=="quiet" (
  echo  已停止 Walk 我可遛 的伺服器與 ngrok。
  ping -n 4 127.0.0.1 >nul
)
