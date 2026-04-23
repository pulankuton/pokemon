# ==========================================
# vm-start.ps1 — GCE VM を起動してURLを表示
# ==========================================
$VM = "champion"
$ZONE = "asia-northeast1-b"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Pokemon Champions Server - 起動中..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# VM の現在の状態を確認
$status = gcloud compute instances describe $VM --zone=$ZONE --format="value(status)" 2>&1
if ($status -eq "RUNNING") {
    Write-Host "[OK] VM は既に起動しています" -ForegroundColor Green
} else {
    Write-Host "[...] VM を起動しています..." -ForegroundColor Yellow
    gcloud compute instances start $VM --zone=$ZONE 2>&1 | Out-Null
    Write-Host "[OK] VM 起動完了" -ForegroundColor Green
    Write-Host "[...] サーバーの準備を待っています (約20秒)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 20
}

# 外部IPを取得
$ip = gcloud compute instances describe $VM --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>&1
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  サーバー準備完了!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL: http://$ip/" -ForegroundColor White
Write-Host ""
Write-Host "  合言葉: champion" -ForegroundColor DarkGray
Write-Host ""

# ヘルスチェック（最大60秒待つ）
Write-Host "[...] ヘルスチェック中..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 12; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://$ip/api/health" -TimeoutSec 5 -UseBasicParsing 2>$null
        if ($res.StatusCode -eq 200) {
            $data = $res.Content | ConvertFrom-Json
            Write-Host "[OK] サーバー応答OK (ポケモン: $($data.pokemonCount)匹, CPUコア: $($data.cpuCount))" -ForegroundColor Green
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 5
}

if (-not $ready) {
    Write-Host "[!] サーバーの応答がまだありません。1-2分後にアクセスしてみてください。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "停止するには vm-stop.ps1 を実行してください" -ForegroundColor DarkGray
Write-Host ""
Read-Host "Enterキーで閉じます"


