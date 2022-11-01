@echo off
call colordef.cmd
cls
echo %_bBlue%%_fBlack%Update dependencies%_Reset%
cd ..\packages
for /D %%i in (.\*) do (
  echo.
  echo %_bBlue%%_fBlack%Package%_Reset% %_fWhite%%_Bold%%%~ni%_Reset%
  echo         %_Dim%%%~fi\package.json%_Reset%
  echo.
  cmd /c "echo off&&cd %%~fi&&npm update"
)
echo.
