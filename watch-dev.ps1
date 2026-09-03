$port = 5173
$url = "http://localhost:$port"

function Test-DevServer {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Free-Port {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}

function Start-DevServer {
    Write-Host "$(Get-Date -Format 'HH:mm:ss') 啟動 dev server..."
    Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
}

Write-Host "監控啟動，每 10 秒檢查一次 $url（Ctrl+C 可停止監控，但不會關掉已啟動的 dev server）"

if (-not (Test-DevServer)) {
    Start-DevServer
    Start-Sleep -Seconds 8
}

while ($true) {
    if (-not (Test-DevServer)) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') 偵測不到伺服器，清除卡住的程序後重啟..."
        Free-Port
        Start-Sleep -Seconds 1
        Start-DevServer
        Start-Sleep -Seconds 8
    }
    Start-Sleep -Seconds 10
}
