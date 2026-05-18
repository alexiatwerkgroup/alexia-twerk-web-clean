# TWERKHUB - NUKE OLD FEATURES + EGRESS FIX - ONE-SHOT PUSH
# 2026-05-02
#
# Just double-click this file or right-click then Run with PowerShell.
# It stages every modified file, commits, and pushes to main.
# Cloudflare auto-deploys in about 30 seconds.

Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "[1/3] Staging files..." -ForegroundColor Cyan
git add `
  assets/twerkhub-heatmap.js `
  assets/comments-community-v2.js `
  assets/video-discussion-bars.js `
  assets/community-page.js `
  assets/online-count-global.js `
  assets/global-nav-online.js `
  _supabase/emergency-cleanup-egress.sql `
  _supabase/nuke-old-features.sql `
  _supabase/MIGRATION-MANIFEST.md `
  _supabase/EXPORT-DATA.sql `
  PUSH-EGRESS-FIX.ps1

Write-Host ""
Write-Host "[2/3] Committing..." -ForegroundColor Cyan
git commit -m "egress: nuke old-page features (heatmap + comments + likes + vote-hot)" -m "Owner confirmed these features belong to the abandoned old design and can be deleted." -m "JS files stubbed to no-op so any leftover script tags in 957 HTML pages dont 404. SQL drops the 5 obsolete tables (video_comments, comment_reports, page_visits, video_heatmap, user_video_views) plus record_watch RPC. Only profiles plus auth.users remain."

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Commit failed (probably nothing to commit). Continuing to push anyway." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "DONE. Cloudflare Pages will deploy in about 30 seconds." -ForegroundColor Green
  Write-Host ""
  Write-Host "==============================================================" -ForegroundColor Yellow
  Write-Host " NEXT STEP - RUN THE SQL IN SUPABASE:" -ForegroundColor Yellow
  Write-Host "==============================================================" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "1. Open this URL:" -ForegroundColor White
  Write-Host "   https://supabase.com/dashboard/project/vieqniahusdrfkpcuqsn/sql/new" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "2. Copy the contents of _supabase/nuke-old-features.sql" -ForegroundColor White
  Write-Host "3. Paste into the SQL editor and click Run." -ForegroundColor White
  Write-Host ""
  Write-Host "That drops the 5 obsolete tables. After that egress should be" -ForegroundColor White
  Write-Host "essentially zero." -ForegroundColor White
  Write-Host ""
} else {
  Write-Host ""
  Write-Host "Push failed. Run 'git push origin main' manually." -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to close"
