@echo off
cls
title ZirveKampus - Firebase Deploy Sihirbazi (Hizli - Sadece Hosting)

echo =======================================================
echo     ZIRVEKAMPUS SIHIRBAZI (SADECE HOSTING - HIZLI)
echo =======================================================
echo.

REM Telemetri kapat - build surecini yavaslatir
set NEXT_TELEMETRY_DISABLED=1

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
echo [2/2] Sadece Hosting Varliklari Dagitiliyor...
echo.
call firebase deploy --only hosting
if %errorlevel% neq 0 (
    call npx firebase deploy --only hosting
    if %errorlevel% neq 0 goto deploy_hata
)
echo.
echo [BASARILI] ZirveKampus Arayuzu basariyla canliya alindi!
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
echo [HATA] Firebase hosting dagitimi basarisiz oldu!
pause
exit /b 1
