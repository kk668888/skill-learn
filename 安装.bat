@echo off
rem This file is GBK (CP936) encoded with CRLF line endings.
rem Keep every line before "chcp 936" pure ASCII: cmd decodes the batch
rem file with the active console codepage, line by line.
chcp 936 >nul
rem 离线技能包安装向导入口：双击运行，检查 Node 版本后启动交互式向导。
rem 本文件必须放在解压后的包根目录，与 offline/ 文件夹同级。
where node >nul 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 Node.js。离线安装需要 Node 20.19 或更高版本。
  echo 请先安装 Node.js LTS 版本，再重新运行本向导。
  pause
  exit /b 1
)
set NODE_MAJOR=0
set NODE_MINOR=0
for /f "tokens=1,2 delims=vn." %%a in ('node -v') do (
  set "NODE_MAJOR=%%a"
  set "NODE_MINOR=%%b"
)
if %NODE_MAJOR% LSS 20 goto node-too-old
if %NODE_MAJOR% EQU 20 if %NODE_MINOR% LSS 19 goto node-too-old
title 离线安装向导
node "%~dp0offline\install-skills.mjs"
set "EXIT_CODE=%errorlevel%"
pause
exit /b %EXIT_CODE%

:node-too-old
echo [错误] 当前 Node 版本为 %NODE_MAJOR%.%NODE_MINOR%，离线安装需要 Node 20.19 或更高版本。
pause
exit /b 1
