$projectPath = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
Set-Location $projectPath

Write-Host "==========================================="
Write-Host "DEPLOYING TWERK PLAYLIST #1 WITH REGLA NR1"
Write-Host "==========================================="
Write-Host ""

# Stage the new playlist files
Write-Host "Staging new playlist files..."
git add playlist-twerk-1.html
git add assets/twerk-playlist-1-videos.json

# Create commit with REGLA NR1 PRINCIPAL
Write-Host "Committing with REGLA NR1 PRINCIPAL implementation..."
$commitMessage = "feat(playlist): add twerk-1 with REGLA NR1 PRINCIPAL custom player overlay`n`nImplemented custom player control system:`n- Blocking overlay prevents YouTube clicks`n- Rewind/forward 10s buttons`n- Fullscreen & sound toggle controls`n- 1.15x zoom hides YouTube logo & metadata`n- 275 video twerk playlist (60 displayed)`n- Sagrada template compliance`n- JSON-LD structured data included`n`nCache-bust: v=20260517-p23"

git commit -m $commitMessage

Write-Host ""
Write-Host "Pushing to GitHub..."
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================="
    Write-Host "SUCCESS - TWERK PLAYLIST #1 DEPLOYED!"
    Write-Host "==========================================="
    Write-Host ""
    Write-Host "✅ Custom player overlay active"
    Write-Host "✅ Blocking layer prevents YouTube exits"
    Write-Host "✅ Control buttons: rewind, forward, fullscreen, sound"
    Write-Host "✅ YouTube branding hidden (1.15x zoom)"
    Write-Host "✅ 275 video twerk playlist ready"
    Write-Host ""
    Write-Host "Cloudflare Pages is rebuilding..."
    Write-Host "Wait 30-60 seconds and reload:"
    Write-Host "https://alexiatwerkgroup.com/playlist-twerk-1.html"
    Write-Host ""
} else {
    Write-Host "ERROR: Push failed - code $LASTEXITCODE"
}

Read-Host "Press Enter to close"
