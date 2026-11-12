@echo off
setlocal
title PKG - Hentikan Server

set "PORT=%~1"
if not defined PORT set "PORT=4173"

echo.
echo  PKG - Penilaian Kinerja Guru
echo  ============================
echo  Menghentikan server pada port %PORT%...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if (-not $conns) { Write-Host 'Server PKG tidak sedang berjalan.'; exit 0 }; $done = $false; foreach ($c in $conns) { $procId = $c.OwningProcess; $p = Get-Process -Id $procId -ErrorAction SilentlyContinue; if (-not $p) { continue }; if ($p.ProcessName -ne 'node') { Write-Host ('Port %PORT% dipakai proses lain: ' + $p.ProcessName + ' (PID ' + $procId + '). Tidak dihentikan.'); continue }; Stop-Process -Id $procId -Force; Write-Host ('Server PKG dihentikan (PID ' + $procId + ').'); $done = $true }; if ($done) { Get-Process | Where-Object { $_.MainWindowTitle -like 'PKG Local Server*' } | Stop-Process -Force -ErrorAction SilentlyContinue }; if (-not $done) { exit 2 }"

if errorlevel 2 (
  echo.
  echo Tidak ada server PKG yang dihentikan.
)

echo.
pause
endlocal
