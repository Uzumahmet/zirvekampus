@echo off
cls
title Erüatical - Git Guncelleme Sihirbazi

echo =======================================================
echo          ERUATICAL GIT GUNCELLEME SIHIRBAZI
echo =======================================================
echo.

echo Git Degisiklikleri Kontrol Ediliyor...
echo.
git status -s
echo.

set /p commit_mesaj="Commit mesaji girin (Bos birakirsaniz 'Guncelleme yapildi' yazilir): "
if "%commit_mesaj%"=="" set commit_mesaj=Guncelleme yapildi

echo.
echo Git asamasina ekleniyor (git add .)...
git add .

echo.
echo Değişiklikler kaydediliyor (git commit)...
git commit -m "%commit_mesaj%"

echo.
echo GitHub'a gonderiliyor (git push)...
git push
if %errorlevel% neq 0 (
    echo.
    echo [HATA] GitHub'a gonderilemedi!
    echo Lutfen GitHub deponuzu bagladiginizdan emin olun.
    pause
    exit /b 1
)

echo.
echo [OK] Değişiklikler başarıyla GitHub'a yüklendi!
echo =======================================================
echo.
pause
exit /b 0
