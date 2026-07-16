@echo off
cls
title ZirveKampus - Firebase Deploy Sihirbazi

echo =======================================================
echo          ZIRVEKAMPUS SIHIRBAZI (ONLY DEPLOY)
echo =======================================================
echo.

REM Telemetri kapat - build surecini yavaslatir
set NEXT_TELEMETRY_DISABLED=1

REM Lint kontrolunu build sirasinda atla (ayri calistir)
set NEXT_LINT_IGNORE_DURING_BUILD=true

:next_build
echo.
echo =======================================================
echo.
echo [1/2] Next.js Projesi Derleniyor...
echo       (Telemetri kapali, cache kullaniliyor)
echo.
call npm run build
if %errorlevel% neq 0 goto build_hata
echo.
echo [OK] Build islemi basariyla tamamlandi!
goto firebase_deploy

:firebase_deploy
echo.
echo =======================================================
echo.
echo [2/2] Firebase Dagitimi Yapiliyor...
echo.
call firebase deploy
if %errorlevel% neq 0 (
    REM firebase CLI yoksa npx ile dene
    call npx firebase deploy
    if %errorlevel% neq 0 goto deploy_hata
)
echo.
echo [BASARILI] ZirveKampus basariyla guncellendi ve canliya alindi!
echo.
echo Canli Site: https://globalog2.web.app
echo =======================================================
echo.
pause
exit /b 0

:build_hata
echo.
echo [HATA] Next.js build islemi basarisiz oldu! Dagitim iptal edildi.
pause
exit /b 1

:deploy_hata
echo.
echo [HATA] Firebase dagitimi basarisiz oldu!
pause
exit /b 1
