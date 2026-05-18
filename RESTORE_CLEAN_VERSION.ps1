$projectPath = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
Set-Location $projectPath

Write-Host "==========================================="
Write-Host "RESTORING CLEAN HTML VERSION"
Write-Host "==========================================="
Write-Host ""

Write-Host "Resetting to clean HTML version (no video controls)..."
git reset --hard 796a21818

Write-Host ""
Write-Host "Pushing to GitHub..."
git push origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================="
    Write-Host "SUCCESS - CLEAN VERSION DEPLOYED!"
    Write-Host "==========================================="
    Write-Host ""
    Write-Host "Los controles de video han sido removidos."
    Write-Host "Cloudflare Pages is rebuilding..."
    Write-Host "Wait 30-60 seconds and reload:"
    Write-Host "https://alexiatwerkgroup.com/playlist/"
    Write-Host ""
} else {
    Write-Host "ERROR: Push failed"
}

Read-Host "Press Enter to close"
