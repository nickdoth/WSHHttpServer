@echo off
if exist %SystemRoot%\SysWow64 (
    @%SystemRoot%\SysWow64\cscript.exe %~dp0\jscript.wsf %1 %2 %3
    goto end
)
rem else
    @%SystemRoot%\System32\cscript.exe %~dp0\jscript.wsf %1 %2 %3


:end