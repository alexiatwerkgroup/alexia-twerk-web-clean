# REINDEX STRATEGY - Final solution for Google Search Console
# This script identifies the 10 highest-priority URLs to reindex after all recent fixes

$projectRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

Write-Host "===========================================",
          " REINDEX STRATEGY FOR GOOGLE SEARCH      ",
          "===========================================`n" -ForegroundColor Cyan

Write-Host "Context:" -ForegroundColor Yellow
Write-Host "- Created new /creator/alexia/ page"
Write-Host "- Fixed canonical tags (s-alexiatwerkgroup.com -> alexiatwerkgroup.com)"
Write-Host "- Fixed sitemap entries for directory vs file URLs"
Write-Host ""

Write-Host "TOP 10 URLS TO REINDEX IN GOOGLE SEARCH CONSOLE" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green

$urlsToReindex = @(
    @{
        Priority = "1 - CRITICAL";
        URL = "https://alexiatwerkgroup.com/creator/alexia/";
        Reason = "New page - Principal creator profile";
        Type = "New";
        Impact = "HIGHEST";
    },
    @{
        Priority = "2 - CRITICAL";
        URL = "https://alexiatwerkgroup.com/hot-models-influencers/";
        Reason = "Fixed directory URL (was pointing to .html)";
        Type = "Fixed";
        Impact = "HIGHEST";
    },
    @{
        Priority = "3 - HIGH";
        URL = "https://alexiatwerkgroup.com/best-twerk-dancers.html";
        Reason = "Fixed canonical tags + mentioned in GSC as redirect error";
        Type = "Fixed";
        Impact = "HIGH";
    },
    @{
        Priority = "4 - HIGH";
        URL = "https://alexiatwerkgroup.com/creators";
        Reason = "Directory hub page - updated after changes";
        Type = "Updated";
        Impact = "HIGH";
    },
    @{
        Priority = "5 - MEDIUM";
        URL = "https://alexiatwerkgroup.com/hot-models-influencers/yanet-garcia.html";
        Reason = "First featured model - canonical tag fix";
        Type = "Fixed";
        Impact = "MEDIUM";
    },
    @{
        Priority = "6 - MEDIUM";
        URL = "https://alexiatwerkgroup.com/";
        Reason = "Homepage - references new creator page";
        Type = "Updated";
        Impact = "MEDIUM";
    },
    @{
        Priority = "7 - MEDIUM";
        URL = "https://alexiatwerkgroup.com/sitemap.xml";
        Reason = "Sitemap itself - updated with new entries";
        Type = "Updated";
        Impact = "MEDIUM";
    },
    @{
        Priority = "8 - MEDIUM";
        URL = "https://alexiatwerkgroup.com/alexia-video-packs.html";
        Reason = "Primary brand content page - canonical fix";
        Type = "Fixed";
        Impact = "MEDIUM";
    },
    @{
        Priority = "9 - MEDIUM";
        URL = "https://alexiatwerkgroup.com/membership";
        Reason = "Revenue page - canonical tags updated";
        Type = "Fixed";
        Impact = "MEDIUM";
    },
    @{
        Priority = "10 - MEDIUM";
        URL = "https://alexiatwerkgroup.com/community.html";
        Reason = "Community hub - updated canonical links";
        Type = "Fixed";
        Impact = "MEDIUM";
    }
)

for ($i = 0; $i -lt $urlsToReindex.Count; $i++) {
    $url = $urlsToReindex[$i]
    Write-Host "$($url.Priority)" -ForegroundColor Yellow -NoNewline
    Write-Host " | " -NoNewline
    Write-Host "$($url.URL)" -ForegroundColor Cyan
    Write-Host "  Reason: $($url.Reason)" -ForegroundColor White
    Write-Host "  Type: $($url.Type) | Impact: $($url.Impact)`n" -ForegroundColor Gray
}

Write-Host "===========================================`n" -ForegroundColor Cyan

Write-Host "HOW TO REINDEX IN GOOGLE SEARCH CONSOLE:" -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Green

Write-Host "Method 1: Inspect Each URL (Recommended for critical URLs)" -ForegroundColor Yellow
Write-Host "1. Open Google Search Console"
Write-Host "2. Go to URL Inspection tool"
Write-Host "3. Enter each URL one by one"
Write-Host "4. Click 'Request Indexing' (blue button)"
Write-Host "5. Wait 24-48 hours for reindex`n"

Write-Host "Method 2: Submit Sitemap (Fastest for bulk)" -ForegroundColor Yellow
Write-Host "1. Go to Google Search Console"
Write-Host "2. Sitemaps section in left menu"
Write-Host "3. Submit sitemap: https://alexiatwerkgroup.com/sitemap.xml"
Write-Host "4. This will queue all 1,273 URLs for recrawl`n"

Write-Host "RECOMMENDED APPROACH:" -ForegroundColor Cyan
Write-Host "1. IMMEDIATELY: Use Method 1 to request indexing of the 3 CRITICAL URLs"
Write-Host "2. IN PARALLEL: Submit the sitemap via Method 2 (affects all 1,273 URLs)"
Write-Host "3. MONITOR: Check GSC URL inspection for status changes over next 48 hours"
Write-Host ""

Write-Host "WHY THESE 10 URLS MATTER:" -ForegroundColor Green
Write-Host "=======================`n" -ForegroundColor Green

Write-Host "CRITICAL (1-2):" -ForegroundColor Red
Write-Host "- /creator/alexia/: BRAND NEW page, signals major content update"
Write-Host "- /hot-models-influencers/: Fixed directory structure issue`n"

Write-Host "HIGH (3-4):" -ForegroundColor Yellow
Write-Host "- /best-twerk-dancers.html: Was showing 'redirect' error in GSC"
Write-Host "- /creators: Hub page that links to new alexia page`n"

Write-Host "MEDIUM (5-10):" -ForegroundColor Green
Write-Host "- Featured model pages: All had canonical tag fixes"
Write-Host "- Homepage & hubs: Updated to link to new content"
Write-Host "- Sitemap: Updated with new entries`n"

Write-Host "===========================================`n" -ForegroundColor Cyan

Write-Host "URLS READY TO COPY-PASTE INTO GSC:" -ForegroundColor Cyan
Write-Host "==================================`n"

foreach ($url in $urlsToReindex) {
    Write-Host $url.URL -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===========================================`n" -ForegroundColor Cyan
Write-Host "Strategy complete. You are ready to reindex!" -ForegroundColor Green
