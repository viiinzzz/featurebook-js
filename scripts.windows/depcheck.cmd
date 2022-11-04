@echo off
call colordef.cmd
cls
echo %_bBlue%%_fBlack%Dependency check%_Reset%
cd ..\packages
for /D %%i in (.\*) do (
  echo.
  echo %_bBlue%%_fBlack%Package%_Reset% %_fWhite%%_Bold%%%~ni%_Reset%
  echo         %_Dim%%%~fi\package.json%_Reset%
  echo.
  cmd /c "echo off&&cd %%~fi&&for /f "tokens^=2 skip^=1" %%a in ('npx depcheck') do echo %_fYellow%unused:%_Reset% %%a %_Dim%^(you may: npm uninstall %%a^)%_Reset%"
)
echo.
