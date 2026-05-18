Set-Location "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
git add -A
git commit -m "🛡️ Force Cloudflare rebuild - Shield v20260516-clean deployment fix"
git push origin main
Write-Host "✅ Cambios deployados exitosamente a GitHub" -ForegroundColor Green
Write-Host "Cloudflare Pages está compilando los cambios..." -ForegroundColor Yellow
