@echo off
call colordef.cmd
cls
echo %_bBlue%%_fBlack%Publish check%_Reset%
cd ..\packages
echo %_Dim%if needed type: npm adduser%_Reset%
echo %_Dim%if needed type: npm login%_Reset%
for /D %%i in (.\*) do (
  echo.
  echo %_bBlue%%_fBlack%Package%_Reset% %_fWhite%%_Bold%%%~ni%_Reset%
  echo         %_Dim%%%~fi\package.json%_Reset%
  echo.
  cmd /c "echo off&&cd %%~fi&&npm publish --dry-run"
)
echo.
