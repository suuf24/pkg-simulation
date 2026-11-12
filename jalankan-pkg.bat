@echo off
setlocal
title PKG - Penilaian Kinerja Guru
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js belum terpasang atau belum ada di PATH.
  echo Install Node.js dari https://nodejs.org/ lalu jalankan file ini lagi.
  echo.
  pause
  exit /b 1
)

if not exist "server.mjs" (
  echo.
  echo [ERROR] server.mjs tidak ditemukan di folder ini.
  echo Pastikan file .bat berada di folder utama aplikasi PKG.
  echo.
  pause
  exit /b 1
)

set "HOST=127.0.0.1"
set "PORT=4173"
set "URL=http://127.0.0.1:4173/"

echo.
echo  PKG - Penilaian Kinerja Guru
echo  ============================
echo.

where curl >nul 2>nul
if errorlevel 1 goto nocurl

curl -s -o nul "%URL%"
if not errorlevel 1 (
  echo  Server sudah berjalan. Membuka aplikasi...
  goto ready
)
goto startserver

:nocurl
echo  Memulai server lokal...
start "PKG Local Server" /D "%~dp0" cmd /k node server.mjs
echo  Menunggu server siap...
ping -n 6 127.0.0.1 >nul
goto ready

:startserver
echo  Memulai server lokal...
start "PKG Local Server" /D "%~dp0" cmd /k node server.mjs
echo  Menunggu server siap...

set /a tries=0

:wait
set /a tries+=1
curl -s -o nul "%URL%"
if not errorlevel 1 goto ready
if %tries% GEQ 30 goto timeout
ping -n 2 127.0.0.1 >nul
goto wait

:ready
start "" "%URL%"
ping -n 3 127.0.0.1 >nul
exit /b 0

:timeout
echo.
echo [PERINGATAN] Server belum merespons setelah 30 detik.
echo Periksa jendela "PKG Local Server" untuk melihat pesan kesalahan.
echo.
pause
exit /b 1
