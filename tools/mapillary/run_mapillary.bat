@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==== Mapillary downloader ====
set "PY="
set "ARG="
if exist "E:\blender\5.2\python\bin\python.exe" set "PY=E:\blender\5.2\python\bin\python.exe"
if defined PY goto run
for /d %%B in ("C:\Program Files\Blender Foundation\Blender*") do for /d %%V in ("%%B\*") do if exist "%%V\python\bin\python.exe" set "PY=%%V\python\bin\python.exe"
if defined PY goto run
where py >nul 2>nul
if errorlevel 1 goto nopy
set "PY=py"
set "ARG=-3"
:run
echo Python: %PY%
"%PY%" %ARG% "%~dp0mapillary_download.py"
echo.
echo The window can be closed now.
pause
exit /b 0
:nopy
echo Python was not found. Tell Claude about it.
pause
exit /b 1
