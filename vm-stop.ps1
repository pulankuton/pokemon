# ==========================================
# vm-stop.ps1 — GCE VM を停止（課金停止）
# ==========================================
$VM = "champion"
$ZONE = "asia-northeast1-b"

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Pokemon Champions Server - 停止中..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$status = gcloud compute instances describe $VM --zone=$ZONE --format="value(status)" 2>&1
if ($status -eq "TERMINATED" -or $status -eq "STOPPED") {
    Write-Host "[OK] VM は既に停止しています" -ForegroundColor Green
} else {
    Write-Host "[...] VM を停止しています..." -ForegroundColor Yellow
    gcloud compute instances stop $VM --zone=$ZONE 2>&1 | Out-Null
    Write-Host "[OK] VM 停止完了 — 課金が止まりました" -ForegroundColor Green
}

Write-Host ""
Write-Host "再開するには vm-start.ps1 を実行してください" -ForegroundColor DarkGray
Write-Host ""
Read-Host "Enterキーで閉じます"


