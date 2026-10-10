@echo off
setlocal
cd /d "%~dp0"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "%~dp0serve.py" %*
    goto :done
)
py -3 --version >nul 2>nul
if not errorlevel 1 (
    py -3 "%~dp0serve.py" %*
    goto :done
)
python --version >nul 2>nul
if not errorlevel 1 (
    python "%~dp0serve.py" %*
    goto :done
)
echo Python 3.10 or later is needed. Install Python, then run this launcher again.
pause
exit /b 1
:done
if errorlevel 1 pause
