@echo off
chcp 65001 > nul
echo ========================================
echo CANSLIM スクリーナー 本番実行
echo ========================================
echo.
echo ※ 全銘柄の分析には数分かかります
echo.

cd /d "%~dp0"

echo スクリーニング実行中...
call npm run screen

echo.
echo ========================================
echo 完了しました！
echo - LINEに結果が届いているか確認してください
echo - docs/index.html でWebレポートも見れます
echo ========================================
pause
