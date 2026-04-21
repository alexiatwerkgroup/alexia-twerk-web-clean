
(function(){
  const root = document.querySelector('[data-comments-root]');
  if (!root || root.dataset.commentsFinalV5 === '1') return;
  root.dataset.commentsFinalV5 = '1';
  root.classList.add('alexia-omega-clean');

  if (/\/playlist\//i.test(location.pathname || '')) {
    if (!document.getElementById('alexia-comments-lite-cleanup')) {
      const liteStyle = document.createElement('style');
      liteStyle.id = 'alexia-comments-lite-cleanup';
      liteStyle.textContent = `
        .yt-comment-avatar,.yt-avatar,.alexia-user-avatar,.alexia-profile-avatar,.alexia-avatar-img{
          box-shadow:none !important;
          filter:none !important;
          backdrop-filter:none !important;
          background:#2a2a2e !important;
          border:1px solid rgba(255,255,255,.12) !important;
          position:relative !important;
          overflow:hidden !important;
        }
        .yt-comment-avatar::before,.yt-comment-avatar::after,
        .yt-avatar::before,.yt-avatar::after,
        .alexia-user-avatar::before,.alexia-user-avatar::after,
        .alexia-profile-avatar::before,.alexia-profile-avatar::after,
        .alexia-avatar-img::before,.alexia-avatar-img::after{
          content:none !important;
          display:none !important;
          border:none !important;
          box-shadow:none !important;
          background:none !important;
          padding:0 !important;
        }
        .yt-comment [data-open-profile]{
          background:none !important;
          box-shadow:none !important;
          border:0 !important;
          padding:0 !important;
          pointer-events:auto !important;
        }
        .yt-comment [data-open-profile] *{
          pointer-events:none !important;
        }
        .yt-comment,.yt-comments,.yt-comments *{
          text-shadow:none !important;
        }
        .yt-comment{
          backdrop-filter:none !important;
        }
        .yt-comment-actions,.yt-comment-actions *{
          pointer-events:auto !important;
        }
        .yt-comment-actions{
          position:relative !important;
          z-index:4 !important;
        }
        .yt-icon-btn,.yt-comment-avatar,.yt-comment-author{
          position:relative !important;
          z-index:5 !important;
          pointer-events:auto !important;
        }

      .alexia-hover-card{display:none !important;opacity:0 !important;pointer-events:none !important;visibility:hidden !important}
      .yt-comment,.yt-comment-body,.yt-comment-meta,.yt-comment-text,.yt-comment-actions{overflow:visible !important}
      .yt-comment-avatar{padding:0 !important;line-height:1 !important;display:flex !important;align-items:center !important;justify-content:center !important;overflow:hidden !important;border-radius:999px !important;min-width:46px !important}
      .yt-comment-avatar.is-clickable,.yt-comment-author.is-clickable{cursor:pointer !important}
      .yt-comment-avatar > span,.yt-comment-avatar > img,.yt-comment-avatar .alexia-avatar-img,.yt-comment-avatar .alexia-user-avatar{pointer-events:none !important}

      `;
      document.head.appendChild(liteStyle);
    }
  }

  const listEl = root.querySelector('.yt-comments-list');
  const countEl = root.querySelector('.yt-comments-count');
  const inputEl = root.querySelector('.yt-input');
  const postBtn = root.querySelector('[data-comment-post]');
  const cancelBtn = root.querySelector('[data-comment-cancel]');
  const sortBtn = root.querySelector('.yt-sort');
  const statusEl = root.querySelector('.yt-comment-status');
  if (!listEl || !countEl || !inputEl || !postBtn) return;

  const SUPABASE_URL = typeof window.SUPABASE_URL !== 'undefined' ? window.SUPABASE_URL : 'https://vieqniahusdrfkpcuqsn.supabase.co';
  const SUPABASE_KEY = typeof window.SUPABASE_KEY !== 'undefined' ? window.SUPABASE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  const pageHtmlPath = location.pathname || '/';
  const pagePath = pageHtmlPath.replace(/\.html$/i, '');
  const pageSlug = (pagePath.split('/').pop() || 'page').trim();
  const slugVariants = Array.from(new Set([pagePath, pageSlug, '/' + pageSlug, pageHtmlPath].filter(Boolean)));
  const likedKey = 'alexia_comment_likes::' + pagePath;
  const sortStorageKey = 'alexia_comment_sort::' + pagePath;
  const pendingCommentKey = 'alexia_pending_comment_v2';
  const hiddenCommentsKey = 'alexia_hidden_comments_v1';
  const mutedUsersKey = 'alexia_muted_users_v1';
  const profilePrefsKey = 'alexia_profile_prefs_v1';
  const reportQueueKey = 'alexia_comment_reports_v1';
  const rateLimitKey = 'alexia_comment_last_post_v1';
  const likeBumpKey = 'alexia_comment_like_bumps::' + pagePath;
  const COMMENT_COOLDOWN_MS = 12000;
  let sortMode = localStorage.getItem(sortStorageKey) || 'hot';
  let busy = false;
  let authCheckedAutoPublish = false;
  let commentsCache = [];
  let profileCache = new Map();
  let globalStatsPromise = null;
  let currentProfileSnapshot = null;
  let currentUserSnapshot = null;
  let hoverShowTimer = null;
  let hoverHideTimer = null;

  const client = (() => {
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) return null;
    if (window.__alexiaCommentsClient) return window.__alexiaCommentsClient;
    try {
      window.__alexiaCommentsClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'alexia-comments-auth-v2'
        }
      });
      return window.__alexiaCommentsClient;
    } catch (e) {
      console.error('comments client init error', e);
      return null;
    }
  })();

  function esc(str){ return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function ago(ts){
    const ms = typeof ts === 'string' ? Date.parse(ts) : Number(ts || 0);
    const diff = Math.max(1, Math.floor((Date.now() - ms) / 1000));
    if (diff < 60) return 'just now';
    const mins = Math.floor(diff / 60); if (mins < 60) return mins + ' minute' + (mins === 1 ? '' : 's') + ' ago';
    const hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago';
    const days = Math.floor(hrs / 24); return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  }
  function likedMap(){ try { return JSON.parse(localStorage.getItem(likedKey) || '{}') || {}; } catch(e){ return {}; } }
  function saveLiked(map){ localStorage.setItem(likedKey, JSON.stringify(map || {})); }
  function likeBumps(){ try { return JSON.parse(localStorage.getItem(likeBumpKey) || '{}') || {}; } catch(e){ return {}; } }
  function saveLikeBumps(map){ localStorage.setItem(likeBumpKey, JSON.stringify(map || {})); }
  function getLastCommentAt(){ return Number(localStorage.getItem(rateLimitKey) || '0') || 0; }
  function markCommentPostedNow(){ localStorage.setItem(rateLimitKey, String(Date.now())); }
  function getCooldownRemaining(){ return Math.max(0, COMMENT_COOLDOWN_MS - (Date.now() - getLastCommentAt())); }
  function formatCooldown(ms){ return Math.max(1, Math.ceil(ms / 1000)); }
  function hotScore(item){
    const likes = Number(item && item.likes_count || 0);
    const created = Date.parse(item && item.created_at || '') || Date.now();
    const ageHours = Math.max(0.15, (Date.now() - created) / 36e5);
    return (likes + 1) / Math.pow(ageHours + 1.25, 1.35);
  }
  function syncButton(){ postBtn.disabled = busy || !inputEl.value.trim(); }
  function setStatus(message, kind){ if (!statusEl) return; statusEl.textContent = message || ''; statusEl.className = 'yt-comment-status' + (kind ? ' ' + kind : ''); }
  function updateSortLabel(){ if (!sortBtn) return; const label = sortMode === 'hot' ? 'Hot discussion' : (sortMode === 'top' ? 'Top comments' : 'Newest first'); sortBtn.innerHTML = '☰ <small>' + label + '</small>'; }
  function ensureStyle(){
    if (document.getElementById('alexia-community-style')) return;
    const style = document.createElement('style');
    style.id = 'alexia-community-style';
    style.textContent = `
      .alexia-comment-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 14px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.03)}
      .alexia-comment-toolbar .left,.alexia-comment-toolbar .right{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .alexia-user-chip{display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);cursor:pointer;text-decoration:none;color:#fff}
      .alexia-user-chip:hover,.alexia-mini-btn:hover{background:rgba(255,255,255,.07)}
      .alexia-user-avatar,.alexia-avatar-img{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;font-weight:900;background:linear-gradient(145deg,rgba(0,255,170,.20),rgba(255,46,99,.18));border:1px solid rgba(255,255,255,.10);overflow:hidden;color:#fff}
      .alexia-avatar-img img{width:100%;height:100%;object-fit:cover;display:block}
      .alexia-user-copy{display:grid;gap:2px;line-height:1.05}
      .alexia-user-copy strong{font-size:13px}
      .alexia-user-copy span{font-size:11px;color:rgba(255,255,255,.68)}
      .alexia-mini-btn{display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#fff;text-decoration:none;cursor:pointer;font-weight:700;font-size:12px}
      .alexia-mini-btn.primary{border-color:rgba(0,255,170,.35);background:linear-gradient(145deg,rgba(0,255,170,.18),rgba(0,255,170,.06))}
      .alexia-muted-note{font-size:11px;color:rgba(255,255,255,.55)}
      .alexia-online-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#fff;font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
      .alexia-online-pill .dot{width:8px;height:8px;border-radius:999px;background:#17f59a;box-shadow:0 0 0 0 rgba(23,245,154,.45);animation:alexiaOnlinePulse 1.9s ease-out infinite}
      .alexia-online-pill .num{font-size:13px;letter-spacing:0}
      @keyframes alexiaOnlinePulse{0%{box-shadow:0 0 0 0 rgba(23,245,154,.45)}70%{box-shadow:0 0 0 8px rgba(23,245,154,0)}100%{box-shadow:0 0 0 0 rgba(23,245,154,0)}}
      .yt-comment-avatar.is-clickable,.yt-comment-author.is-clickable{cursor:pointer}
      .yt-comment-author.is-clickable:hover{text-decoration:underline}
      .yt-comment-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
      .yt-icon-btn.alt{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.75);padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700;cursor:pointer}
      .yt-icon-btn.alt:hover{background:rgba(255,255,255,.08);color:#fff}
      .yt-rep-badge{display:inline-flex;align-items:center;gap:6px;margin-left:8px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.74);background:rgba(255,255,255,.04)}
      .yt-rep-badge.tier-1{border-color:rgba(0,255,170,.18);color:#c8ffe9}
      .yt-rep-badge.tier-2{border-color:rgba(255,180,80,.22);color:#ffe7bf}
      .yt-rep-badge.tier-3{border-color:rgba(255,120,180,.24);color:#ffd1ea}
      .yt-rep-badge.tier-4{border-color:rgba(168,130,255,.26);color:#e7ddff}
      .alexia-profile-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:99998;padding:18px}
      .alexia-profile-overlay.is-open{display:flex}
      .alexia-profile-modal{width:min(100%,720px);max-height:min(88vh,920px);overflow:auto;border-radius:24px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(7,7,12,.98),rgba(12,12,19,.98));box-shadow:0 30px 80px rgba(0,0,0,.45);color:#fff;padding:22px;position:relative}
      .alexia-profile-close{position:absolute;right:14px;top:14px;width:38px;height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);color:#fff;cursor:pointer}
      .alexia-profile-head{display:flex;gap:16px;align-items:flex-start;margin-bottom:18px}
      .alexia-profile-avatar{width:74px;height:74px;border-radius:999px;overflow:hidden;display:grid;place-items:center;font-size:28px;font-weight:900;background:linear-gradient(145deg,rgba(0,255,170,.20),rgba(255,46,99,.18));border:1px solid rgba(255,255,255,.10)}
      .alexia-profile-avatar img{width:100%;height:100%;object-fit:cover;display:block}
      .alexia-profile-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}
      .alexia-stat-card{border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:12px;background:rgba(255,255,255,.03)}
      .alexia-stat-card strong{display:block;font-size:18px}
      .alexia-stat-card span{display:block;font-size:11px;color:rgba(255,255,255,.62);text-transform:uppercase;letter-spacing:.08em;margin-top:4px}
      .alexia-profile-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:16px}
      .alexia-panel{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.03);padding:14px}
      .alexia-panel h4{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.68)}
      .alexia-profile-bio{color:rgba(255,255,255,.82);line-height:1.6;white-space:pre-wrap}
      .alexia-profile-history{display:grid;gap:10px}
      .alexia-history-item{padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
      .alexia-history-item .meta{font-size:11px;color:rgba(255,255,255,.56);margin-bottom:6px}
      .alexia-profile-field{display:grid;gap:7px;margin-bottom:10px}
      .alexia-profile-field label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.62);font-weight:700}
      .alexia-profile-field input,.alexia-profile-field textarea{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#fff;padding:12px 13px;font:inherit;outline:none}
      .alexia-profile-field textarea{min-height:98px;resize:vertical}
      .alexia-profile-actions{display:flex;gap:10px;flex-wrap:wrap}
      .alexia-hidden-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      @media (max-width:760px){.alexia-profile-grid{grid-template-columns:1fr}.alexia-profile-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}

      .alexia-mega-premium .yt-comment{
        position:relative;
        overflow:hidden;
        border-radius:24px;
        border:1px solid rgba(255,255,255,.11);
        background:
          radial-gradient(160% 160% at 0% 0%, rgba(255,46,99,.10), transparent 34%),
          radial-gradient(140% 160% at 100% 0%, rgba(0,255,170,.09), transparent 30%),
          linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.028));
        box-shadow:0 16px 38px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06);
        transition:transform .18s ease, box-shadow .22s ease, border-color .22s ease, background .22s ease;
      }
      .alexia-mega-premium .yt-comment::after{
        content:'';
        position:absolute;
        inset:0;
        background:linear-gradient(120deg, rgba(255,255,255,.08), transparent 18%, transparent 72%, rgba(255,255,255,.05));
        opacity:.34;
        pointer-events:none;
      }
      .alexia-mega-premium .yt-comment:hover{
        transform:translateY(-2px);
        border-color:rgba(255,255,255,.16);
        box-shadow:0 22px 52px rgba(0,0,0,.24), 0 10px 24px rgba(255,46,99,.06), inset 0 1px 0 rgba(255,255,255,.08);
      }
      .alexia-mega-premium .yt-comment.is-featured{
        border-color:rgba(255,196,92,.45);
        background:
          radial-gradient(180% 180% at 0% 0%, rgba(255,200,95,.18), transparent 34%),
          radial-gradient(160% 180% at 100% 0%, rgba(255,93,46,.12), transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
        box-shadow:0 28px 64px rgba(255,170,60,.16), 0 18px 46px rgba(0,0,0,.24);
      }
      .alexia-mega-premium .yt-comment.is-featured .yt-comment-author{
        text-shadow:0 0 22px rgba(255,209,120,.16);
      }
      .alexia-mega-premium .yt-comment-avatar,
      .alexia-mega-premium .alexia-user-avatar,
      .alexia-mega-premium .alexia-profile-avatar{
        position:relative;
        box-shadow:0 0 0 1px rgba(255,255,255,.08), 0 8px 18px rgba(0,0,0,.24);
      }
      .alexia-mega-premium .yt-comment-avatar::before,
      .alexia-mega-premium .alexia-user-avatar::before,
      .alexia-mega-premium .alexia-profile-avatar::before{
        content:'';
        position:absolute;
        inset:-2px;
        border-radius:inherit;
        padding:1px;
        background:linear-gradient(135deg, rgba(255,255,255,.24), rgba(255,46,99,.26), rgba(0,255,170,.26));
        -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite:xor;
        mask-composite:exclude;
        opacity:.8;
        pointer-events:none;
      }
      .alexia-mega-premium .yt-rep-badge,
      .alexia-mega-premium .badge{
        background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 8px 20px rgba(0,0,0,.12);
      }
      .alexia-mega-premium .alexia-hover-card{
        border:1px solid rgba(255,255,255,.14);
        box-shadow:0 32px 80px rgba(0,0,0,.42), 0 16px 40px rgba(255,46,99,.10), inset 0 1px 0 rgba(255,255,255,.08);
      }
      .alexia-mega-premium .alexia-hover-card::before{
        content:'';
        position:absolute;
        inset:0 auto auto 0;
        width:100%;
        height:72px;
        background:linear-gradient(180deg, rgba(255,255,255,.08), transparent);
        opacity:.55;
        pointer-events:none;
      }
      .alexia-mega-premium .alexia-comment-toolbar,
      .alexia-mega-premium .alexia-panel,
      .alexia-mega-premium .alexia-stat-card{
        box-shadow:0 14px 34px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.05);
      }
      .alexia-mega-premium .alexia-clip-highlight{
        position:relative;
        overflow:hidden;
        border-color:rgba(255,188,92,.30);
        box-shadow:0 18px 42px rgba(255,170,60,.12), inset 0 1px 0 rgba(255,255,255,.08);
      }
      .alexia-mega-premium .alexia-clip-highlight::after{
        content:'';
        position:absolute;
        width:140px;
        height:140px;
        right:-34px;
        top:-52px;
        border-radius:999px;
        background:radial-gradient(circle, rgba(255,209,120,.22), transparent 62%);
        pointer-events:none;
      }
      .alexia-trex-body .yt-comment.is-featured,
      .alexia-trex-body .alexia-clip-highlight,
      .alexia-trex-body .alexia-hover-card{
        animation:alexiaTrexPulse 4.2s ease-in-out infinite;
      }
      .alexia-trex-body .yt-comment.is-featured:hover,
      .alexia-trex-body .alexia-clip-highlight:hover{
        transform:translateY(-3px) scale(1.008);
      }
      .alexia-trex-body .yt-comment.is-featured::before{
        box-shadow:0 0 18px rgba(255,196,92,.20);
      }
      @keyframes alexiaTrexPulse{
        0%,100%{ box-shadow:0 22px 56px rgba(0,0,0,.22), 0 0 0 rgba(255,196,92,0); }
        50%{ box-shadow:0 26px 64px rgba(0,0,0,.26), 0 0 36px rgba(255,196,92,.10); }
      }
      @media (max-width:760px){
        .alexia-mega-premium .yt-comment{border-radius:20px}
        .alexia-mega-premium .alexia-hover-card{min-width:min(88vw,320px);max-width:min(88vw,320px)}
      }

    `;

style.textContent += `
  .alexia-comment-toolbar{
    position:relative;
    border-color:rgba(255,255,255,.10);
    background:
      radial-gradient(140% 180% at 0% 0%, rgba(255,46,99,.10), transparent 42%),
      radial-gradient(110% 180% at 100% 0%, rgba(0,255,170,.08), transparent 38%),
      linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
    box-shadow:0 16px 44px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
  }
  .alexia-user-chip,.alexia-mini-btn,.yt-icon-btn,.yt-icon-btn.alt,.yt-rep-badge,.yt-feature-flag,.yt-comment-streak{
    transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease, color .16s ease, opacity .16s ease;
  }
  .alexia-user-chip:hover,.alexia-mini-btn:hover,.yt-icon-btn:hover,.yt-icon-btn.alt:hover{
    transform:translateY(-1px);
    box-shadow:0 12px 28px rgba(0,0,0,.20);
  }
  .yt-comment{
    position:relative;
    border-radius:20px;
    padding:10px 10px 9px;
    margin:8px 0;
    border:1px solid rgba(255,255,255,.07);
    background:
      radial-gradient(120% 220% at 0% 0%, rgba(255,255,255,.035), transparent 40%),
      linear-gradient(180deg, rgba(255,255,255,.038), rgba(255,255,255,.022));
    box-shadow:0 12px 32px rgba(0,0,0,.16);
  }
  .yt-comment::before{
    content:'';
    position:absolute;
    inset:0 auto 0 0;
    width:3px;
    border-radius:20px 0 0 20px;
    background:linear-gradient(180deg, rgba(0,255,170,.35), rgba(255,46,99,.16));
    opacity:.7;
  }
  .yt-comment:hover{
    border-color:rgba(255,255,255,.12);
    background:
      radial-gradient(120% 220% at 0% 0%, rgba(255,255,255,.05), transparent 42%),
      linear-gradient(180deg, rgba(255,255,255,.048), rgba(255,255,255,.028));
    box-shadow:0 18px 42px rgba(0,0,0,.22);
  }
  .yt-comment.is-own{
    border-color:rgba(0,255,170,.16);
    background:
      radial-gradient(120% 220% at 0% 0%, rgba(0,255,170,.08), transparent 42%),
      linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.024));
  }
  .yt-comment.is-own::after{
    content:'Your comment';
    position:absolute;
    top:10px;
    right:12px;
    font-size:10px;
    letter-spacing:.08em;
    text-transform:uppercase;
    color:rgba(0,255,170,.78);
  }
  .yt-comment.is-featured{
    border-color:rgba(255,188,92,.34);
    background:
      radial-gradient(150% 220% at 0% 0%, rgba(255,188,92,.14), transparent 40%),
      linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
    box-shadow:0 20px 46px rgba(255,170,60,.10), 0 16px 40px rgba(0,0,0,.20);
  }
  .yt-comment.is-featured::before{
    width:4px;
    background:linear-gradient(180deg, rgba(255,215,120,.65), rgba(255,126,60,.26));
    opacity:1;
  }
  .yt-comment.tier-2 .yt-comment-avatar,
  .yt-comment.tier-2 .yt-comment-avatar > span{
    box-shadow:0 0 0 1px rgba(255,180,80,.24), 0 0 20px rgba(255,180,80,.12);
  }
  .yt-comment.tier-3 .yt-comment-avatar,
  .yt-comment.tier-3 .yt-comment-avatar > span{
    box-shadow:0 0 0 1px rgba(255,120,180,.26), 0 0 22px rgba(255,120,180,.14);
  }
  .yt-comment.tier-4 .yt-comment-avatar,
  .yt-comment.tier-4 .yt-comment-avatar > span{
    box-shadow:0 0 0 1px rgba(168,130,255,.30), 0 0 26px rgba(168,130,255,.18);
  }
  .yt-comment-avatar{
    width:38px!important;
    height:38px!important;
    border-radius:999px;
    overflow:visible;
  }
  .yt-comment-avatar > span{
    width:100%;
    height:100%;
    display:grid;
    place-items:center;
    border-radius:999px;
    border:1px solid rgba(255,255,255,.12);
    background:linear-gradient(145deg, rgba(0,255,170,.18), rgba(255,46,99,.16));
  }
  .yt-comment-body{min-width:0;flex:1}
  .yt-comment-meta{
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    gap:6px;
    margin-bottom:5px;
  }
  .yt-comment-author{
    color:#fff;
    font-weight:900;
    font-size:14px;
    letter-spacing:.01em;
  }
  .yt-comment-author:hover{
    color:#fff;
    text-shadow:0 0 18px rgba(255,255,255,.10);
  }
  .yt-comment-text{
    color:rgba(255,255,255,.90);
    line-height:1.48;
    font-size:14px;
    margin:2px 0 0;
  }
  .yt-comment-time{
    color:rgba(255,255,255,.46);
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.06em;
  }
  .yt-rep-badge{
    background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
    font-weight:800;
  }
  .yt-rep-badge.tier-1{background:linear-gradient(180deg, rgba(0,255,170,.14), rgba(255,255,255,.03));}
  .yt-rep-badge.tier-2{background:linear-gradient(180deg, rgba(255,180,80,.16), rgba(255,255,255,.03));}
  .yt-rep-badge.tier-3{background:linear-gradient(180deg, rgba(255,120,180,.16), rgba(255,255,255,.03));}
  .yt-rep-badge.tier-4{background:linear-gradient(180deg, rgba(168,130,255,.18), rgba(255,255,255,.03));}
  .yt-feature-flag{
    background:linear-gradient(180deg, rgba(255,196,92,.18), rgba(255,128,64,.10));
    border-color:rgba(255,180,80,.34);
    box-shadow:0 10px 22px rgba(255,170,60,.10);
  }
  .yt-comment-streak{
    background:rgba(255,255,255,.05);
    color:rgba(255,255,255,.84);
  }
  .yt-comment-actions{
    margin-top:9px;
    gap:7px;
  }
  .yt-icon-btn{
    border:1px solid rgba(255,255,255,.10);
    background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
  }
  .yt-icon-btn.is-liked{
    border-color:rgba(255,196,92,.44);
    background:linear-gradient(180deg, rgba(255,196,92,.20), rgba(255,140,66,.11));
    color:#fff7df;
    box-shadow:0 12px 26px rgba(255,170,60,.14);
  }
  .yt-icon-btn.alt{
    color:rgba(255,255,255,.78);
  }
  .yt-icon-btn.alt:hover{
    border-color:rgba(255,255,255,.14);
  }
  .alexia-hover-card{
    pointer-events:auto;
    min-width:280px;
    max-width:340px;
    border-radius:22px;
    border-color:rgba(255,255,255,.12);
    background:
      radial-gradient(160% 180% at 0% 0%, rgba(255,46,99,.12), transparent 38%),
      radial-gradient(140% 180% at 100% 0%, rgba(0,255,170,.10), transparent 34%),
      linear-gradient(180deg, rgba(8,8,13,.98), rgba(12,12,19,.98));
    box-shadow:0 26px 68px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.05);
    transform:translateY(6px) scale(.985);
    opacity:0;
    transition:opacity .16s ease, transform .16s ease;
  }
  .alexia-hover-card.open{
    display:block;
    opacity:1;
    transform:translateY(0) scale(1);
  }
  .alexia-hover-card .top{
    display:flex;
    align-items:center;
    gap:12px;
    margin-bottom:10px;
  }
  .alexia-hover-card .title{
    display:flex;
    flex-direction:column;
    gap:6px;
  }
  .alexia-hover-card .title strong{
    font-size:18px;
    line-height:1.05;
  }
  .alexia-hover-card .meta{
    color:rgba(255,255,255,.76);
    line-height:1.55;
    margin-bottom:10px;
  }
  .alexia-hover-card .row{
    display:flex;
    flex-wrap:wrap;
    gap:7px;
  }
  .alexia-hover-card .foot{
    margin-top:10px;
    padding-top:10px;
    border-top:1px solid rgba(255,255,255,.08);
    font-size:11px;
    letter-spacing:.08em;
    text-transform:uppercase;
    color:rgba(255,255,255,.54);
  }
  .alexia-clip-highlight{
    border:1px solid rgba(255,180,80,.24);
    background:
      radial-gradient(150% 220% at 0% 0%, rgba(255,180,80,.12), transparent 40%),
      linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.025));
    box-shadow:0 14px 34px rgba(255,170,60,.08);
  }
  .alexia-clip-highlight .eyebrow{
    font-size:11px;
    letter-spacing:.12em;
    text-transform:uppercase;
    color:#ffd7a8;
    margin-bottom:4px;
  }
  .alexia-clip-highlight .body{
    color:#fff;
  }
  .alexia-clip-highlight .by{
    color:rgba(255,255,255,.66);
  }
  @keyframes alexiaFloatIn{
    from{opacity:0;transform:translateY(8px) scale(.985)}
    to{opacity:1;transform:translateY(0) scale(1)}
  }
  .yt-comment{
    animation:alexiaFloatIn .22s ease;
  }
  @media (max-width:700px){
    .yt-comment{padding:9px 9px 8px}
    .yt-comment.is-own::after{position:static;display:block;margin-left:auto;font-size:9px}
    .yt-comment-meta{gap:5px}
  }
`;
    style.textContent += `\n
      .yt-comments{margin-top:8px !important;padding-top:0 !important}
      .yt-comments-head{margin:0 0 6px !important;align-items:center !important}
      .yt-comments-head h2{margin:0 !important;line-height:1.05 !important}
      .yt-comments-list{display:flex;flex-direction:column;gap:8px !important}
      .yt-compose{margin:6px 0 8px !important}
      .yt-avatar,.yt-comment-avatar{width:38px !important;height:38px !important;font-size:15px !important;flex:0 0 38px !important}
      .yt-comment{position:relative;display:flex;gap:10px !important;padding:8px 10px !important;border-radius:18px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
      .yt-comment:hover{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.10);box-shadow:0 10px 32px rgba(0,0,0,.18);transform:translateY(-1px)}
      .yt-comment.is-self{background:linear-gradient(180deg,rgba(0,255,170,.06),rgba(255,255,255,.02));border-color:rgba(0,255,170,.16);box-shadow:0 0 0 1px rgba(0,255,170,.04) inset}
      .yt-comment-body{min-width:0;flex:1;padding-top:1px}
      .yt-comment-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px !important;margin-bottom:3px !important}
      .yt-comment-author{display:inline-flex;align-items:center;max-width:100%;padding:2px 9px;border-radius:8px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.08);color:#fff !important;font-weight:800;line-height:1.1;box-shadow:0 1px 0 rgba(255,255,255,.04) inset}
      .yt-comment-author.is-clickable:hover{text-decoration:none;background:rgba(255,255,255,.14)}
      .yt-comment-time{font-size:11px !important;color:rgba(255,255,255,.55) !important}
      .yt-comment-text{line-height:1.34 !important;margin-top:1px}
      .yt-comment-actions{display:flex;flex-wrap:wrap;gap:6px !important;margin-top:6px !important}
      .yt-icon-btn{padding:5px 9px !important;border-radius:999px !important;font-size:11px !important;line-height:1 !important}
      .yt-icon-btn.alt{padding:5px 9px !important}
      .yt-empty{padding:4px 0 0 48px !important}
\n`;
    style.textContent += `\n
      .alexia-user-chip{box-shadow:0 12px 36px rgba(0,0,0,.16)}
      .alexia-user-avatar,.alexia-avatar-img{position:relative;box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 10px 24px rgba(0,0,0,.18)}
      .alexia-user-avatar::after,.yt-comment-avatar::after{content:"";position:absolute;inset:-2px;border-radius:999px;pointer-events:none;border:1px solid rgba(255,255,255,.08)}
      .yt-comment{overflow:hidden}
      .yt-comment.tier-1{border-color:rgba(0,255,170,.10)}
      .yt-comment.tier-2{border-color:rgba(88,177,255,.18)}
      .yt-comment.tier-3{border-color:rgba(255,174,84,.20);box-shadow:0 10px 30px rgba(255,174,84,.08)}
      .yt-comment.tier-4{border-color:rgba(255,112,190,.24);box-shadow:0 12px 34px rgba(255,112,190,.10)}
      .yt-comment.is-featured{background:linear-gradient(180deg,rgba(255,170,60,.08),rgba(255,255,255,.03));border-color:rgba(255,170,60,.28)}
      .yt-feature-flag{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;border:1px solid rgba(255,170,60,.26);background:rgba(255,170,60,.10);color:#ffd7a8}
      .yt-comment-streak{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);color:rgba(255,255,255,.72)}
      .alexia-hover-card{position:fixed;min-width:250px;max-width:320px;display:none;z-index:99997;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(7,7,12,.98),rgba(12,12,19,.98));box-shadow:0 24px 60px rgba(0,0,0,.35);pointer-events:none}
      .alexia-hover-card.open{display:block}
      .alexia-hover-card .top{display:flex;gap:12px;align-items:center;margin-bottom:10px}
      .alexia-hover-card .meta{font-size:12px;color:rgba(255,255,255,.68);line-height:1.45}
      .alexia-hover-card .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .alexia-clip-highlight{margin:6px 0 10px;padding:10px 12px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,170,60,.08),rgba(255,255,255,.03));display:none;gap:10px;align-items:flex-start}
      .alexia-clip-highlight.show{display:flex}
      .alexia-clip-highlight .kicker{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#ffd7a8;margin-bottom:4px}
      .alexia-clip-highlight .body{font-size:13px;line-height:1.35;color:#fff}
      .alexia-clip-highlight .by{font-size:12px;color:rgba(255,255,255,.68)}

      .yt-comments-list{display:grid;gap:8px}
      .yt-comment{position:relative;display:flex;gap:10px;align-items:flex-start;padding:10px 12px 10px 8px;margin:0;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));box-shadow:0 10px 26px rgba(0,0,0,.14);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease;overflow:hidden}
      .yt-comment::before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:linear-gradient(180deg,rgba(0,255,170,.18),rgba(255,46,99,.05));opacity:.75}
      .yt-comment:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.16);box-shadow:0 18px 42px rgba(0,0,0,.22);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))}
      .yt-comment.tier-2{border-color:rgba(84,196,255,.18)}
      .yt-comment.tier-3{border-color:rgba(255,178,84,.22);box-shadow:0 14px 34px rgba(255,178,84,.10)}
      .yt-comment.tier-4{border-color:rgba(191,132,255,.26);box-shadow:0 16px 38px rgba(191,132,255,.12)}
      .yt-comment.is-own{background:linear-gradient(180deg,rgba(0,255,170,.08),rgba(255,255,255,.03));border-color:rgba(0,255,170,.18)}
      .yt-comment.is-featured{background:linear-gradient(180deg,rgba(255,176,64,.10),rgba(255,255,255,.03));border-color:rgba(255,176,64,.30);box-shadow:0 20px 48px rgba(255,176,64,.11)}
      .yt-comment.is-featured::after{content:'Community highlight';position:absolute;top:10px;right:12px;padding:4px 8px;border-radius:999px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#ffe7bf;border:1px solid rgba(255,176,64,.25);background:rgba(255,176,64,.10)}
      .yt-comment-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 20px rgba(0,0,0,.18)}
      .yt-comment-avatar:hover,.yt-comment-author:hover{filter:brightness(1.08)}
      .yt-comment-body{min-width:0;flex:1}
      .yt-comment-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;line-height:1.05;margin-bottom:5px;padding-right:132px}
      .yt-comment-author{background:rgba(255,255,255,.08)!important;color:#fff!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:10px;padding:4px 9px;font-weight:800;font-size:13px}
      .yt-comment-author:hover{text-decoration:none!important;background:rgba(255,255,255,.12)!important}
      .yt-comment-time{font-size:11px;color:rgba(255,255,255,.54)}
      .yt-comment-text{font-size:14px;line-height:1.42;color:rgba(255,255,255,.92);margin-top:2px}
      .yt-comment-actions{margin-top:8px;gap:7px}
      .yt-comment-streak{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.68);background:rgba(255,255,255,.04)}
      .yt-icon-btn{box-shadow:none;transition:transform .14s ease,background .14s ease,border-color .14s ease}
      .yt-icon-btn:hover{transform:translateY(-1px)}
      .yt-icon-btn.is-liked{border-color:rgba(255,176,64,.35);background:rgba(255,176,64,.14);color:#ffe8c6}
      .yt-rep-badge{font-weight:800}
      .yt-rep-badge.tier-1{background:rgba(0,255,170,.06)}
      .yt-rep-badge.tier-2{background:rgba(84,196,255,.08)}
      .yt-rep-badge.tier-3{background:rgba(255,178,84,.08)}
      .yt-rep-badge.tier-4{background:rgba(191,132,255,.10)}
      .alexia-hover-card{transform:translateY(4px) scale(.985);opacity:0;transition:opacity .14s ease,transform .14s ease}
      .alexia-hover-card.open{display:block;opacity:1;transform:translateY(0) scale(1)}

\n`;

style.textContent += `
  .alexia-omega-clean .alexia-comment-toolbar{
    margin:4px 0 8px;
    padding:8px 10px;
    gap:8px;
    border-radius:16px;
    background:linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.025));
    box-shadow:0 10px 24px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.035);
  }
  .alexia-omega-clean .alexia-comment-toolbar .right{gap:8px}
  .alexia-omega-clean .alexia-mini-btn,
  .alexia-omega-clean .alexia-user-chip{
    min-height:34px;
    padding:7px 11px;
  }
  .alexia-omega-clean .alexia-user-chip{
    gap:9px;
    background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
  }
  .alexia-omega-clean .alexia-user-avatar,
  .alexia-omega-clean .alexia-avatar-img{width:30px;height:30px}
  .alexia-omega-clean .alexia-user-copy{gap:1px}
  .alexia-omega-clean .alexia-user-copy strong{font-size:12px}
  .alexia-omega-clean .alexia-user-copy span,
  .alexia-omega-clean .alexia-muted-note{font-size:10px;color:rgba(255,255,255,.62)}
  .alexia-omega-clean .alexia-mini-btn{font-size:11px;font-weight:800}
  .alexia-omega-clean .alexia-clip-highlight{
    margin:2px 0 8px;
    padding:8px 10px;
    gap:9px;
    border-radius:16px;
    background:linear-gradient(180deg, rgba(255,196,92,.11), rgba(255,255,255,.03));
    box-shadow:0 10px 24px rgba(0,0,0,.13);
  }
  .alexia-omega-clean .alexia-clip-highlight .emoji{font-size:18px;line-height:1}
  .alexia-omega-clean .alexia-clip-highlight .copy{min-width:0;flex:1}
  .alexia-omega-clean .alexia-clip-highlight .kicker{font-size:10px;letter-spacing:.14em;margin:0 0 2px;color:rgba(255,235,190,.82)}
  .alexia-omega-clean .alexia-clip-highlight .body{font-size:12px;line-height:1.35;color:#fff}
  .alexia-omega-clean .alexia-clip-highlight .by{font-size:10px;line-height:1.25;color:rgba(255,255,255,.62);margin-top:2px}
  .alexia-omega-clean .yt-comments-header,
  .alexia-omega-clean .yt-sort-row{margin-top:4px!important;margin-bottom:4px!important}
  .alexia-omega-clean .yt-comment{
    padding:8px 9px 7px;
    margin:6px 0;
    border-radius:18px;
    box-shadow:0 10px 24px rgba(0,0,0,.16);
  }
  .alexia-omega-clean .yt-comment:hover{transform:translateY(-1px)}
  .alexia-omega-clean .yt-comment-avatar{width:34px!important;height:34px!important}
  .alexia-omega-clean .yt-comment-body{padding-top:1px}
  .alexia-omega-clean .yt-comment-meta{gap:5px;margin-bottom:3px}
  .alexia-omega-clean .yt-comment-author{font-size:13px}
  .alexia-omega-clean .yt-comment-text{font-size:13px;line-height:1.42}
  .alexia-omega-clean .yt-comment-time{font-size:10px;opacity:.75}
  .alexia-omega-clean .yt-rep-badge,
  .alexia-omega-clean .yt-comment-streak,
  .alexia-omega-clean .yt-feature-flag{
    font-size:9px;
    padding:3px 7px;
    letter-spacing:.08em;
  }
  .alexia-omega-clean .yt-comment-actions{margin-top:6px;gap:6px}
  .alexia-omega-clean .yt-icon-btn,
  .alexia-omega-clean .yt-icon-btn.alt{
    padding:5px 8px;
    font-size:10px;
    border-radius:999px;
    box-shadow:none;
  }
  .alexia-omega-clean .yt-icon-btn.alt{opacity:.86}
  .alexia-omega-clean .yt-icon-btn.alt:hover{opacity:1}
  .alexia-omega-clean .yt-icon-btn.just-liked{
    transform:scale(1.08);
    box-shadow:0 0 0 1px rgba(0,255,170,.22), 0 0 22px rgba(0,255,170,.18);
  }
  .alexia-omega-clean .yt-comment.is-own::after{top:8px;right:10px;font-size:9px}
  .alexia-omega-clean .alexia-hover-card{
    min-width:280px;
    max-width:300px;
    padding:12px;
    border-radius:18px;
    backdrop-filter:blur(14px);
    background:linear-gradient(180deg, rgba(14,14,22,.94), rgba(10,10,16,.92));
  }
  .alexia-omega-clean .alexia-hover-card.open{animation:alexiaHoverLift .16s ease-out}
  @keyframes alexiaHoverLift{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
  .alexia-omega-clean .alexia-hover-card .top{gap:10px}
  .alexia-omega-clean .alexia-hover-card .title strong{font-size:14px}
  .alexia-omega-clean .alexia-hover-card .meta{font-size:12px;line-height:1.45}
  .alexia-omega-clean .alexia-hover-card .row{gap:6px;margin-top:9px}
  .alexia-omega-clean .alexia-hover-card .foot{margin-top:8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.54)}
  .alexia-omega-clean .yt-empty{padding:14px 0 6px;color:rgba(255,255,255,.60)}
  .alexia-omega-clean .yt-comment.is-featured{
    box-shadow:0 16px 34px rgba(255,170,60,.11), 0 12px 28px rgba(0,0,0,.18);
  }
  .alexia-omega-clean .yt-comment.is-featured::before{
    box-shadow:0 0 18px rgba(255,196,92,.16);
  }
  @media (max-width:760px){
    .alexia-omega-clean .alexia-comment-toolbar{padding:7px 8px}
    .alexia-omega-clean .alexia-user-copy span{display:none}
    .alexia-omega-clean .alexia-mini-btn{padding:7px 9px}
    .alexia-omega-clean .yt-comment{padding:7px 8px 6px}
    .alexia-omega-clean .yt-comment-actions{gap:5px}
    .alexia-omega-clean .yt-icon-btn,.alexia-omega-clean .yt-icon-btn.alt{padding:5px 7px;font-size:10px}
  }
`;
    document.head.appendChild(style);
  }

  function getPendingComment(){ try { return JSON.parse(localStorage.getItem(pendingCommentKey) || 'null'); } catch (e) { return null; } }
  function setPendingComment(payload){ if (!payload) { localStorage.removeItem(pendingCommentKey); return; } localStorage.setItem(pendingCommentKey, JSON.stringify(payload)); }
  function clearPendingComment(){ localStorage.removeItem(pendingCommentKey); }
  function storePendingComment(reason){
    const text = inputEl.value.trim();
    if (!text) return;
    setPendingComment({ body:text, pagePath, pageHtmlPath, pageUrl: location.href.split('#')[0], createdAt:Date.now(), reason:reason || 'auth', autoPost:true });
  }
  function restorePendingComment(){
    const pending = getPendingComment();
    if (!pending) return false;
    if (pending.pagePath !== pagePath && pending.pageHtmlPath !== pageHtmlPath) return false;
    if (inputEl.value.trim()) return false;
    inputEl.value = String(pending.body || '');
    inputEl.style.height = 'auto';
    inputEl.style.height = inputEl.scrollHeight + 'px';
    syncButton();
    return !!inputEl.value.trim();
  }
  function hiddenComments(){ try { return JSON.parse(localStorage.getItem(hiddenCommentsKey) || '[]') || []; } catch(e){ return []; } }
  function saveHiddenComments(arr){ localStorage.setItem(hiddenCommentsKey, JSON.stringify(Array.from(new Set(arr || [])))); }
  function mutedUsers(){ try { return JSON.parse(localStorage.getItem(mutedUsersKey) || '[]') || []; } catch(e){ return []; } }
  function saveMutedUsers(arr){ localStorage.setItem(mutedUsersKey, JSON.stringify(Array.from(new Set(arr || [])))); }
  function loadProfilePrefs(){ try { return JSON.parse(localStorage.getItem(profilePrefsKey) || '{}') || {}; } catch(e){ return {}; } }
  function saveProfilePrefs(all){ localStorage.setItem(profilePrefsKey, JSON.stringify(all || {})); }
  function getProfilePrefs(userId){ const all = loadProfilePrefs(); return (userId && all[userId]) || {}; }
  function setProfilePrefs(userId, prefs){ if (!userId) return; const all = loadProfilePrefs(); all[userId] = Object.assign({}, all[userId] || {}, prefs || {}); saveProfilePrefs(all); }
  function computeStreak(dayKeys){
    const keys = Array.from(new Set((dayKeys || []).filter(Boolean))).sort().reverse();
    if (!keys.length) return 0;
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0,0,0,0);
    const formatDay = d => d.toISOString().slice(0,10);
    let expected = formatDay(cursor);
    if (keys[0] !== expected) { cursor.setDate(cursor.getDate() - 1); expected = formatDay(cursor); if (keys[0] !== expected) return 0; }
    for (const key of keys) {
      if (key === expected) { streak += 1; cursor.setDate(cursor.getDate() - 1); expected = formatDay(cursor); }
      else if (key < expected) break;
    }
    return streak;
  }
  function rankPositionFor(stat){
    const map = window.__alexiaStatsCache;
    if (!map || !map.size || !stat) return null;
    const list = Array.from(map.values()).sort((a,b) => (b.points||0) - (a.points||0));
    return list.findIndex(item => item.key === stat.key) + 1 || null;
  }
  function reportQueue(){ try { return JSON.parse(localStorage.getItem(reportQueueKey) || '[]') || []; } catch(e){ return []; } }
  function saveReportQueue(arr){ localStorage.setItem(reportQueueKey, JSON.stringify(arr || [])); }
  function cleanDisplayName(value, fallback){
    let name = String(value || '').trim();
    if (!name) name = String(fallback || '').trim();
    if (!name) return 'Guest';
    if (/@/.test(name)) {
      const local = name.split('@')[0].replace(/[._-]+/g,' ').trim();
      if (local) name = local;
    }
    return name;
  }
  function localForumProfile(){ try { return JSON.parse(localStorage.getItem('alexia_forum_profile_v1') || '{}') || {}; } catch(e){ return {}; } }
  function localForumNickname(){ return cleanDisplayName((localForumProfile().nickname || ''), ''); }
  function makeUserKey(userId, username){ return userId ? 'user:' + userId : 'name:' + cleanDisplayName(username, 'Guest').toLowerCase(); }
  function reputationFor(stat){
    const comments = Number(stat && stat.comments || 0);
    const likes = Number(stat && stat.likes || 0);
    const recent = Number(stat && stat.recent || 0);
    const streak = Number(stat && stat.streak || 0);
    const points = comments * 10 + likes * 4 + recent * 2 + streak * 3;
    let badge = 'Fresh voice', tier = 1;
    if (points >= 320) { badge = 'Hall of heat'; tier = 4; }
    else if (points >= 170) { badge = 'Crowd magnet'; tier = 3; }
    else if (points >= 70) { badge = 'Rising heat'; tier = 2; }
    return { points, badge, tier, streak };
  }
  function renderAvatar(name, profile, cls){
    const safeName = String(name || 'Guest').trim();
    const prefsAvatar = profile && profile.avatar_url ? String(profile.avatar_url).trim() : '';
    if (prefsAvatar) return '<span class="' + (cls || 'alexia-user-avatar') + ' alexia-avatar-img"><img src="' + esc(prefsAvatar) + '" alt="' + esc(safeName) + '"></span>';
    return '<span class="' + (cls || 'alexia-user-avatar') + '">' + esc((safeName[0] || 'G').toUpperCase()) + '</span>';
  }
  function statKeyFromItem(item){ return makeUserKey(item && item.user_id, item && (item.username_snapshot || item.author_name)); }
  function getVisibleProfile(userId, fallback){ return Object.assign({}, fallback || {}, getProfilePrefs(userId)); }
  function aggregateUserStats(rows){
    const map = new Map();
    const now = Date.now();
    (rows || []).forEach(row => {
      if (!row) return;
      const prof = row && row.user_id ? profileCache.get(row.user_id) : null;
      const username = cleanDisplayName((prof && prof.username) || row.username_snapshot || row.author_name || '', 'Guest');
      const key = makeUserKey(row.user_id, username);
      if (!map.has(key)) map.set(key, { key, user_id: row.user_id || null, username, comments:0, likes:0, recent:0, last_at: row.created_at || null, recentComments: [], dayKeys: [] });
      const stat = map.get(key);
      stat.comments += 1;
      stat.likes += Number(row.likes_count || 0);
      const createdMs = Date.parse(row.created_at || '') || 0;
      if (createdMs && (now - createdMs) < (14 * 24 * 60 * 60 * 1000)) stat.recent += 1;
      if (createdMs) stat.dayKeys.push(new Date(createdMs).toISOString().slice(0,10));
      if (!stat.last_at || (createdMs > (Date.parse(stat.last_at)||0))) stat.last_at = row.created_at || stat.last_at;
      if (stat.recentComments.length < 8) stat.recentComments.push({ body: row.body || '', page_slug: row.page_slug || '', created_at: row.created_at || '' });
    });
    map.forEach(stat => { stat.streak = computeStreak(stat.dayKeys); const rep = reputationFor(stat); stat.points = rep.points; stat.badge = rep.badge; stat.tier = rep.tier; });
    return map;
  }
  async function loadGlobalStats(force){
    if (!client) return new Map();
    if (!force && globalStatsPromise) return globalStatsPromise;
    globalStatsPromise = (async () => {
      const { data, error } = await client.from('video_comments').select('id,user_id,username_snapshot,author_name,likes_count,created_at,page_slug,body').order('created_at', { ascending:false }).limit(5000);
      if (error || !Array.isArray(data)) return new Map();
      return aggregateUserStats(data);
    })();
    return globalStatsPromise;
  }
  function getStatForItem(item){
    const key = statKeyFromItem(item);
    const map = window.__alexiaStatsCache;
    return map && map.get ? map.get(key) : null;
  }
  function ensureCommunityToolbar(){
    if (root.querySelector('.alexia-comment-toolbar')) return root.querySelector('.alexia-comment-toolbar');
    const compose = inputEl.closest('.yt-compose') || inputEl.parentElement;
    const bar = document.createElement('div');
    bar.className = 'alexia-comment-toolbar';
    bar.innerHTML = '<div class="left" data-user-rail></div><div class="right"><a class="alexia-mini-btn" href="/community.html">Community rank</a><button class="alexia-mini-btn" type="button" data-reset-hidden>Hidden filters</button></div>';
    if (compose && compose.parentNode) compose.parentNode.insertBefore(bar, compose);
    bar.querySelector('[data-reset-hidden]').addEventListener('click', function(){ saveHiddenComments([]); saveMutedUsers([]); render(); refreshUserBar(); setStatus('Hidden comments and muted users were reset.', 'is-ok'); });
    return bar;
  }
  function ensureHoverCard(){
    let card = document.getElementById('alexia-hover-card');
    if (card) return card;
    card = document.createElement('div');
    card.id = 'alexia-hover-card';
    card.className = 'alexia-hover-card';
    card.addEventListener('pointerenter', function(){
      if (hoverHideTimer) { clearTimeout(hoverHideTimer); hoverHideTimer = null; }
      card.classList.add('open');
    });
    card.addEventListener('pointerleave', function(){ hideHoverCard(90); });
    document.body.appendChild(card);
    return card;
  }
  async function showHoverProfileForNode(node){ return; }
  function hideHoverCard(delay){ return; }
  function ensureClipHighlight(){
    let el = root.querySelector('.alexia-clip-highlight');
    if (el) return el;
    const compose = inputEl.closest('.yt-compose') || inputEl.parentElement;
    el = document.createElement('div');
    el.className = 'alexia-clip-highlight';
    if (compose && compose.parentNode) compose.parentNode.insertBefore(el, compose);
    return el;
  }
  function updateClipHighlight(items){
    const box = ensureClipHighlight();
    const ranked = (items || []).slice().sort((a,b) => (Number(b.likes_count||0) - Number(a.likes_count||0)) || (hotScore(b)-hotScore(a)));
    const best = ranked[0];
    const bestLikes = Number(best && best.likes_count || 0);
    if (!best || !String(best.body || '').trim() || bestLikes < 3) { box.classList.remove('show'); box.innerHTML = ''; return; }
    const userKey = statKeyFromItem(best);
    const stat = (window.__alexiaStatsCache && window.__alexiaStatsCache.get(userKey)) || { comments:0, likes:0, recent:0, streak:0 };
    box.innerHTML = `<div class="emoji">🔥</div><div class="copy"><div class="kicker">Clip champion</div><div class="body">${esc(String(best.body).slice(0,88))}${String(best.body).length > 88 ? '…' : ''}</div><div class="by">${esc(best.username_snapshot || best.author_name || 'Guest')} • ${bestLikes} likes${Number(stat.streak||0) >= 2 ? ' • ' + Number(stat.streak||0) + 'd streak' : ''}</div></div>`;
    box.classList.add('show');
  }
  async function getSession(){ if (!client || !client.auth) return null; const { data, error } = await client.auth.getSession(); if (error) return null; return data && data.session ? data.session : null; }
  async function getCurrentUser(){ const session = await getSession(); return session && session.user ? session.user : null; }
  async function getCurrentProfile(userId){
    if (!client || !userId) return null;
    if (profileCache.has(userId)) return profileCache.get(userId);
    const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) profileCache.set(userId, data);
    return data || null;
  }
  async function saveProfile(user, username, extras){
    if (!client || !user || !user.id) return null;
    const cleanUsername = String(username || '').trim();
    const payload = { id: user.id, email: String(user.email || '').trim().toLowerCase() || null, username: cleanUsername || null };
    let saved = null;
    try {
      const res = await client.from('profiles').upsert(payload, { onConflict:'id' }).select('*').maybeSingle();
      if (!res.error) saved = res.data || payload;
    } catch(e) {}
    if (!saved) {
      try {
        const res = await client.from('profiles').update({ email: payload.email, username: payload.username }).eq('id', user.id).select('*').maybeSingle();
        if (!res.error) saved = res.data || payload;
      } catch(e) {}
    }
    if (!saved) saved = payload;
    const extraUpdate = Object.assign({}, extras || {});
    if (Object.keys(extraUpdate).length) {
      try { await client.from('profiles').update(extraUpdate).eq('id', user.id); } catch(e) {}
    }
    profileCache.set(user.id, Object.assign({}, saved, extraUpdate));
    return profileCache.get(user.id);
  }
  async function ensureProfileUsername(user){
    if (!user || !user.id) throw new Error('Please log in first.');
    let profile = await getCurrentProfile(user.id);
    let username = localForumNickname() || (profile && profile.username ? String(profile.username).trim() : '');
    if (!username) username = String((user.user_metadata && (user.user_metadata.username || user.user_metadata.display_name)) || '').trim();
    if (!username) throw new Error('Your profile is missing a username. Please log in again.');
    profile = await saveProfile(user, cleanDisplayName(username, 'member'), { bio: (localForumProfile().bio || null), avatar_url: (localForumProfile().avatar_url || null) });
    return cleanDisplayName((profile && profile.username) || username, 'member');
  }

  function ensureAuthModal(){
    if (document.getElementById('alexia-auth-modal')) return document.getElementById('alexia-auth-modal');
    const style = document.createElement('style');
    style.id = 'alexia-auth-modal-style';
    style.textContent = `
      .alexia-auth-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:99999;padding:18px;}
      .alexia-auth-overlay.is-open{display:flex;}
      .alexia-auth-modal{width:min(100%,460px);border-radius:24px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(7,7,12,.98),rgba(12,12,19,.98));box-shadow:0 30px 80px rgba(0,0,0,.45);color:#fff;overflow:hidden;}
      .alexia-auth-head{padding:22px 22px 10px;}
      .alexia-auth-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:8px;}
      .alexia-auth-title{font-size:28px;font-weight:900;line-height:1.05;margin:0 0 8px;}
      .alexia-auth-sub{margin:0;color:rgba(255,255,255,.72);line-height:1.55;font-size:14px;}
      .alexia-auth-tabs{display:flex;gap:8px;padding:0 22px 8px;}
      .alexia-auth-tab{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);color:#fff;border-radius:999px;padding:9px 14px;font-weight:700;cursor:pointer;}
      .alexia-auth-tab.is-active{border-color:rgba(0,255,170,.35);background:rgba(0,255,170,.12);}
      .alexia-auth-body{padding:12px 22px 22px;}
      .alexia-auth-form{display:grid;gap:12px;}
      .alexia-auth-field{display:grid;gap:7px;}
      .alexia-auth-label{font-size:12px;color:rgba(255,255,255,.72);font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
      .alexia-auth-input{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;padding:13px 14px;font-size:14px;outline:none;}
      .alexia-auth-actions{display:flex;gap:10px;flex-wrap:wrap;padding-top:6px;}
      .alexia-auth-btn{display:inline-flex;align-items:center;justify-content:center;border-radius:14px;padding:12px 16px;font-weight:800;border:1px solid rgba(255,255,255,.12);cursor:pointer;background:rgba(255,255,255,.04);color:#fff;}
      .alexia-auth-btn.primary{border-color:rgba(0,255,170,.35);background:linear-gradient(145deg,rgba(0,255,170,.18),rgba(0,255,170,.07));}
      .alexia-auth-note{margin-top:10px;color:rgba(255,255,255,.62);font-size:12px;line-height:1.55;}
      .alexia-auth-error{min-height:18px;color:#ff9f9f;font-size:13px;line-height:1.45;}
      .alexia-auth-success{min-height:18px;color:#9bffd6;font-size:13px;line-height:1.45;}
      .alexia-auth-close{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);color:#fff;cursor:pointer;font-size:20px;}
      .alexia-auth-wrap{position:relative;}
    `;
    style.textContent += `\n
      .yt-comments{margin-top:8px !important;padding-top:0 !important}
      .yt-comments-head{margin:0 0 6px !important;align-items:center !important}
      .yt-comments-head h2{margin:0 !important;line-height:1.05 !important}
      .yt-comments-list{display:flex;flex-direction:column;gap:8px !important}
      .yt-compose{margin:6px 0 8px !important}
      .yt-avatar,.yt-comment-avatar{width:38px !important;height:38px !important;font-size:15px !important;flex:0 0 38px !important}
      .yt-comment{position:relative;display:flex;gap:10px !important;padding:8px 10px !important;border-radius:18px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
      .yt-comment:hover{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.10);box-shadow:0 10px 32px rgba(0,0,0,.18);transform:translateY(-1px)}
      .yt-comment.is-self{background:linear-gradient(180deg,rgba(0,255,170,.06),rgba(255,255,255,.02));border-color:rgba(0,255,170,.16);box-shadow:0 0 0 1px rgba(0,255,170,.04) inset}
      .yt-comment-body{min-width:0;flex:1;padding-top:1px}
      .yt-comment-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px !important;margin-bottom:3px !important}
      .yt-comment-author{display:inline-flex;align-items:center;max-width:100%;padding:2px 9px;border-radius:8px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.08);color:#fff !important;font-weight:800;line-height:1.1;box-shadow:0 1px 0 rgba(255,255,255,.04) inset}
      .yt-comment-author.is-clickable:hover{text-decoration:none;background:rgba(255,255,255,.14)}
      .yt-comment-time{font-size:11px !important;color:rgba(255,255,255,.55) !important}
      .yt-comment-text{line-height:1.34 !important;margin-top:1px}
      .yt-comment-actions{display:flex;flex-wrap:wrap;gap:6px !important;margin-top:6px !important}
      .yt-icon-btn{padding:5px 9px !important;border-radius:999px !important;font-size:11px !important;line-height:1 !important}
      .yt-icon-btn.alt{padding:5px 9px !important}
      .yt-empty{padding:4px 0 0 48px !important}
\n`;
    style.textContent += `\n
      .alexia-user-chip{box-shadow:0 12px 36px rgba(0,0,0,.16)}
      .alexia-user-avatar,.alexia-avatar-img{position:relative;box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 10px 24px rgba(0,0,0,.18)}
      .alexia-user-avatar::after,.yt-comment-avatar::after{content:"";position:absolute;inset:-2px;border-radius:999px;pointer-events:none;border:1px solid rgba(255,255,255,.08)}
      .yt-comment{overflow:hidden}
      .yt-comment.tier-1{border-color:rgba(0,255,170,.10)}
      .yt-comment.tier-2{border-color:rgba(88,177,255,.18)}
      .yt-comment.tier-3{border-color:rgba(255,174,84,.20);box-shadow:0 10px 30px rgba(255,174,84,.08)}
      .yt-comment.tier-4{border-color:rgba(255,112,190,.24);box-shadow:0 12px 34px rgba(255,112,190,.10)}
      .yt-comment.is-featured{background:linear-gradient(180deg,rgba(255,170,60,.08),rgba(255,255,255,.03));border-color:rgba(255,170,60,.28)}
      .yt-feature-flag{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;border:1px solid rgba(255,170,60,.26);background:rgba(255,170,60,.10);color:#ffd7a8}
      .yt-comment-streak{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);color:rgba(255,255,255,.72)}
      .alexia-hover-card{position:fixed;min-width:250px;max-width:320px;display:none;z-index:99997;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(7,7,12,.98),rgba(12,12,19,.98));box-shadow:0 24px 60px rgba(0,0,0,.35);pointer-events:none}
      .alexia-hover-card.open{display:block}
      .alexia-hover-card .top{display:flex;gap:12px;align-items:center;margin-bottom:10px}
      .alexia-hover-card .meta{font-size:12px;color:rgba(255,255,255,.68);line-height:1.45}
      .alexia-hover-card .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .alexia-clip-highlight{margin:6px 0 10px;padding:10px 12px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,170,60,.08),rgba(255,255,255,.03));display:none;gap:10px;align-items:flex-start}
      .alexia-clip-highlight.show{display:flex}
      .alexia-clip-highlight .kicker{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#ffd7a8;margin-bottom:4px}
      .alexia-clip-highlight .body{font-size:13px;line-height:1.35;color:#fff}
      .alexia-clip-highlight .by{font-size:12px;color:rgba(255,255,255,.68)}

      .yt-comments-list{display:grid;gap:8px}
      .yt-comment{position:relative;display:flex;gap:10px;align-items:flex-start;padding:10px 12px 10px 8px;margin:0;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));box-shadow:0 10px 26px rgba(0,0,0,.14);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease;overflow:hidden}
      .yt-comment::before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:linear-gradient(180deg,rgba(0,255,170,.18),rgba(255,46,99,.05));opacity:.75}
      .yt-comment:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.16);box-shadow:0 18px 42px rgba(0,0,0,.22);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))}
      .yt-comment.tier-2{border-color:rgba(84,196,255,.18)}
      .yt-comment.tier-3{border-color:rgba(255,178,84,.22);box-shadow:0 14px 34px rgba(255,178,84,.10)}
      .yt-comment.tier-4{border-color:rgba(191,132,255,.26);box-shadow:0 16px 38px rgba(191,132,255,.12)}
      .yt-comment.is-own{background:linear-gradient(180deg,rgba(0,255,170,.08),rgba(255,255,255,.03));border-color:rgba(0,255,170,.18)}
      .yt-comment.is-featured{background:linear-gradient(180deg,rgba(255,176,64,.10),rgba(255,255,255,.03));border-color:rgba(255,176,64,.30);box-shadow:0 20px 48px rgba(255,176,64,.11)}
      .yt-comment.is-featured::after{content:'Community highlight';position:absolute;top:10px;right:12px;padding:4px 8px;border-radius:999px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#ffe7bf;border:1px solid rgba(255,176,64,.25);background:rgba(255,176,64,.10)}
      .yt-comment-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 20px rgba(0,0,0,.18)}
      .yt-comment-avatar:hover,.yt-comment-author:hover{filter:brightness(1.08)}
      .yt-comment-body{min-width:0;flex:1}
      .yt-comment-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;line-height:1.05;margin-bottom:5px;padding-right:132px}
      .yt-comment-author{background:rgba(255,255,255,.08)!important;color:#fff!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:10px;padding:4px 9px;font-weight:800;font-size:13px}
      .yt-comment-author:hover{text-decoration:none!important;background:rgba(255,255,255,.12)!important}
      .yt-comment-time{font-size:11px;color:rgba(255,255,255,.54)}
      .yt-comment-text{font-size:14px;line-height:1.42;color:rgba(255,255,255,.92);margin-top:2px}
      .yt-comment-actions{margin-top:8px;gap:7px}
      .yt-comment-streak{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.68);background:rgba(255,255,255,.04)}
      .yt-icon-btn{box-shadow:none;transition:transform .14s ease,background .14s ease,border-color .14s ease}
      .yt-icon-btn:hover{transform:translateY(-1px)}
      .yt-icon-btn.is-liked{border-color:rgba(255,176,64,.35);background:rgba(255,176,64,.14);color:#ffe8c6}
      .yt-rep-badge{font-weight:800}
      .yt-rep-badge.tier-1{background:rgba(0,255,170,.06)}
      .yt-rep-badge.tier-2{background:rgba(84,196,255,.08)}
      .yt-rep-badge.tier-3{background:rgba(255,178,84,.08)}
      .yt-rep-badge.tier-4{background:rgba(191,132,255,.10)}
      .alexia-hover-card{transform:translateY(4px) scale(.985);opacity:0;transition:opacity .14s ease,transform .14s ease}
      .alexia-hover-card.open{display:block;opacity:1;transform:translateY(0) scale(1)}

\n`;

style.textContent += `
  .alexia-omega-clean .alexia-comment-toolbar{
    margin:4px 0 8px;
    padding:8px 10px;
    gap:8px;
    border-radius:16px;
    background:linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.025));
    box-shadow:0 10px 24px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.035);
  }
  .alexia-omega-clean .alexia-comment-toolbar .right{gap:8px}
  .alexia-omega-clean .alexia-mini-btn,
  .alexia-omega-clean .alexia-user-chip{
    min-height:34px;
    padding:7px 11px;
  }
  .alexia-omega-clean .alexia-user-chip{
    gap:9px;
    background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
  }
  .alexia-omega-clean .alexia-user-avatar,
  .alexia-omega-clean .alexia-avatar-img{width:30px;height:30px}
  .alexia-omega-clean .alexia-user-copy{gap:1px}
  .alexia-omega-clean .alexia-user-copy strong{font-size:12px}
  .alexia-omega-clean .alexia-user-copy span,
  .alexia-omega-clean .alexia-muted-note{font-size:10px;color:rgba(255,255,255,.62)}
  .alexia-omega-clean .alexia-mini-btn{font-size:11px;font-weight:800}
  .alexia-omega-clean .alexia-clip-highlight{
    margin:2px 0 8px;
    padding:8px 10px;
    gap:9px;
    border-radius:16px;
    background:linear-gradient(180deg, rgba(255,196,92,.11), rgba(255,255,255,.03));
    box-shadow:0 10px 24px rgba(0,0,0,.13);
  }
  .alexia-omega-clean .alexia-clip-highlight .emoji{font-size:18px;line-height:1}
  .alexia-omega-clean .alexia-clip-highlight .copy{min-width:0;flex:1}
  .alexia-omega-clean .alexia-clip-highlight .kicker{font-size:10px;letter-spacing:.14em;margin:0 0 2px;color:rgba(255,235,190,.82)}
  .alexia-omega-clean .alexia-clip-highlight .body{font-size:12px;line-height:1.35;color:#fff}
  .alexia-omega-clean .alexia-clip-highlight .by{font-size:10px;line-height:1.25;color:rgba(255,255,255,.62);margin-top:2px}
  .alexia-omega-clean .yt-comments-header,
  .alexia-omega-clean .yt-sort-row{margin-top:4px!important;margin-bottom:4px!important}
  .alexia-omega-clean .yt-comment{
    padding:8px 9px 7px;
    margin:6px 0;
    border-radius:18px;
    box-shadow:0 10px 24px rgba(0,0,0,.16);
  }
  .alexia-omega-clean .yt-comment:hover{transform:translateY(-1px)}
  .alexia-omega-clean .yt-comment-avatar{width:34px!important;height:34px!important}
  .alexia-omega-clean .yt-comment-body{padding-top:1px}
  .alexia-omega-clean .yt-comment-meta{gap:5px;margin-bottom:3px}
  .alexia-omega-clean .yt-comment-author{font-size:13px}
  .alexia-omega-clean .yt-comment-text{font-size:13px;line-height:1.42}
  .alexia-omega-clean .yt-comment-time{font-size:10px;opacity:.75}
  .alexia-omega-clean .yt-rep-badge,
  .alexia-omega-clean .yt-comment-streak,
  .alexia-omega-clean .yt-feature-flag{
    font-size:9px;
    padding:3px 7px;
    letter-spacing:.08em;
  }
  .alexia-omega-clean .yt-comment-actions{margin-top:6px;gap:6px}
  .alexia-omega-clean .yt-icon-btn,
  .alexia-omega-clean .yt-icon-btn.alt{
    padding:5px 8px;
    font-size:10px;
    border-radius:999px;
    box-shadow:none;
  }
  .alexia-omega-clean .yt-icon-btn.alt{opacity:.86}
  .alexia-omega-clean .yt-icon-btn.alt:hover{opacity:1}
  .alexia-omega-clean .yt-icon-btn.just-liked{
    transform:scale(1.08);
    box-shadow:0 0 0 1px rgba(0,255,170,.22), 0 0 22px rgba(0,255,170,.18);
  }
  .alexia-omega-clean .yt-comment.is-own::after{top:8px;right:10px;font-size:9px}
  .alexia-omega-clean .alexia-hover-card{
    min-width:280px;
    max-width:300px;
    padding:12px;
    border-radius:18px;
    backdrop-filter:blur(14px);
    background:linear-gradient(180deg, rgba(14,14,22,.94), rgba(10,10,16,.92));
  }
  .alexia-omega-clean .alexia-hover-card.open{animation:alexiaHoverLift .16s ease-out}
  @keyframes alexiaHoverLift{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
  .alexia-omega-clean .alexia-hover-card .top{gap:10px}
  .alexia-omega-clean .alexia-hover-card .title strong{font-size:14px}
  .alexia-omega-clean .alexia-hover-card .meta{font-size:12px;line-height:1.45}
  .alexia-omega-clean .alexia-hover-card .row{gap:6px;margin-top:9px}
  .alexia-omega-clean .alexia-hover-card .foot{margin-top:8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.54)}
  .alexia-omega-clean .yt-empty{padding:14px 0 6px;color:rgba(255,255,255,.60)}
  .alexia-omega-clean .yt-comment.is-featured{
    box-shadow:0 16px 34px rgba(255,170,60,.11), 0 12px 28px rgba(0,0,0,.18);
  }
  .alexia-omega-clean .yt-comment.is-featured::before{
    box-shadow:0 0 18px rgba(255,196,92,.16);
  }
  @media (max-width:760px){
    .alexia-omega-clean .alexia-comment-toolbar{padding:7px 8px}
    .alexia-omega-clean .alexia-user-copy span{display:none}
    .alexia-omega-clean .alexia-mini-btn{padding:7px 9px}
    .alexia-omega-clean .yt-comment{padding:7px 8px 6px}
    .alexia-omega-clean .yt-comment-actions{gap:5px}
    .alexia-omega-clean .yt-icon-btn,.alexia-omega-clean .yt-icon-btn.alt{padding:5px 7px;font-size:10px}
  }
`;
    document.head.appendChild(style);
    const overlay = document.createElement('div');
    overlay.className = 'alexia-auth-overlay';
    overlay.id = 'alexia-auth-modal';
    overlay.innerHTML = `
      <div class="alexia-auth-wrap">
        <button class="alexia-auth-close" type="button" aria-label="Close">×</button>
        <div class="alexia-auth-modal">
          <div class="alexia-auth-head">
            <div class="alexia-auth-kicker">Alexia Twerk Group</div>
            <h3 class="alexia-auth-title">Join to comment and rank clips</h3>
            <p class="alexia-auth-sub">Create your account once. After that, comments, reputation and rankings stay linked to your profile.</p>
          </div>
          <div class="alexia-auth-tabs">
            <button type="button" class="alexia-auth-tab is-active" data-auth-tab="signup">Create account</button>
            <button type="button" class="alexia-auth-tab" data-auth-tab="signin">Log in</button>
          </div>
          <div class="alexia-auth-body">
            <form class="alexia-auth-form" novalidate>
              <div class="alexia-auth-field" data-auth-username-wrap>
                <label class="alexia-auth-label" for="alexia-auth-username">Username</label>
                <input class="alexia-auth-input" id="alexia-auth-username" name="username" autocomplete="username" maxlength="40" placeholder="Choose your public name">
              </div>
              <div class="alexia-auth-field">
                <label class="alexia-auth-label" for="alexia-auth-email">Email</label>
                <input class="alexia-auth-input" id="alexia-auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com">
              </div>
              <div class="alexia-auth-field">
                <label class="alexia-auth-label" for="alexia-auth-password">Password</label>
                <input class="alexia-auth-input" id="alexia-auth-password" name="password" type="password" autocomplete="current-password" placeholder="At least 6 characters">
              </div>
              <div class="alexia-auth-error" data-auth-error></div>
              <div class="alexia-auth-success" data-auth-success></div>
              <div class="alexia-auth-actions">
                <button type="submit" class="alexia-auth-btn primary" data-auth-submit>Create account</button>
                <button type="button" class="alexia-auth-btn" data-auth-cancel>Cancel</button>
              </div>
              <div class="alexia-auth-note">You will confirm your email once. After confirmation, we bring you back to the same video and finish the comment flow automatically.</div>
            </form>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeAuthModal(); });
    overlay.querySelector('[data-auth-cancel]').addEventListener('click', function(){ closeAuthModal(); });
    overlay.querySelector('.alexia-auth-close').addEventListener('click', function(){ closeAuthModal(); });
    overlay.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click', function(){ switchAuthTab(this.getAttribute('data-auth-tab') || 'signup'); }));
    overlay.querySelector('form').addEventListener('submit', onAuthSubmit);
    return overlay;
  }
  let authMode = 'signup';
  function switchAuthTab(mode){
    authMode = mode === 'signin' ? 'signin' : 'signup';
    const modal = ensureAuthModal();
    modal.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.toggle('is-active', btn.getAttribute('data-auth-tab') === authMode));
    const usernameWrap = modal.querySelector('[data-auth-username-wrap]');
    const usernameInput = modal.querySelector('#alexia-auth-username');
    const passwordInput = modal.querySelector('#alexia-auth-password');
    const submit = modal.querySelector('[data-auth-submit]');
    if (usernameWrap) usernameWrap.style.display = authMode === 'signup' ? '' : 'none';
    if (passwordInput) passwordInput.setAttribute('autocomplete', authMode === 'signup' ? 'new-password' : 'current-password');
    if (submit) submit.textContent = authMode === 'signup' ? 'Create account' : 'Log in';
    setAuthMessage('', '');
    if (authMode === 'signin' && usernameInput) usernameInput.value = '';
  }
  function setAuthMessage(error, success){
    const modal = ensureAuthModal();
    const err = modal.querySelector('[data-auth-error]');
    const ok = modal.querySelector('[data-auth-success]');
    if (err) err.textContent = error || '';
    if (ok) ok.textContent = success || '';
  }
  function openAuthModal(mode){ const modal = ensureAuthModal(); switchAuthTab(mode || authMode || 'signup'); modal.classList.add('is-open'); const email = modal.querySelector('#alexia-auth-email'); if (email) setTimeout(() => email.focus(), 25); }
  function closeAuthModal(){ const modal = ensureAuthModal(); modal.classList.remove('is-open'); setAuthMessage('', ''); }
  async function signUpUser(email, password, username){
    if (!client || !client.auth) throw new Error('Authentication is unavailable right now.');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanUsername = String(username || '').trim();
    if (!cleanEmail) throw new Error('Email is required.');
    if (!password || password.length < 6) throw new Error('Use a password with at least 6 characters.');
    if (!cleanUsername) throw new Error('Username is required.');
    const { data: existingProfile } = await client.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
    if (existingProfile) throw new Error('That username is already taken.');
    localStorage.setItem('alexia_pending_username::' + cleanEmail, cleanUsername);
    const redirectBase = location.origin + '/auth-callback.html';
    const redirectTo = redirectBase + '?returnTo=' + encodeURIComponent(location.href.split('#')[0]);
    const { data, error } = await client.auth.signUp({ email: cleanEmail, password: password, options: { emailRedirectTo: redirectTo, data: { username: cleanUsername, comment_return_to: location.href.split('#')[0] } } });
    if (error) throw error;
    if (data && data.user && data.session) await saveProfile(data.user, cleanUsername);
    return data;
  }
  async function signInUser(email, password){ if (!client || !client.auth) throw new Error('Authentication is unavailable right now.'); const { data, error } = await client.auth.signInWithPassword({ email: String(email || '').trim().toLowerCase(), password: password || '' }); if (error) throw error; return data; }
  async function signOutUser(){ if (client && client.auth) await client.auth.signOut(); }

  async function onAuthSubmit(ev){
    ev.preventDefault();
    const modal = ensureAuthModal();
    const email = String(modal.querySelector('#alexia-auth-email').value || '').trim();
    const password = String(modal.querySelector('#alexia-auth-password').value || '');
    const username = String((modal.querySelector('#alexia-auth-username') || {value:''}).value || '').trim();
    const submit = modal.querySelector('[data-auth-submit]');
    if (submit) submit.disabled = true;
    setAuthMessage('', '');
    try {
      if (authMode === 'signup') {
        const data = await signUpUser(email, password, username);
        if (data && data.session) {
          setAuthMessage('', 'Account ready. Publishing your comment...');
          closeAuthModal();
          setTimeout(function(){ addComment(null, { bypassAuth: true, forceText: inputEl.value.trim() }); }, 30);
        } else {
          setAuthMessage('', 'Account created. Check your email and confirm it. We will bring you back to this video automatically.');
        }
      } else {
        await signInUser(email, password);
        setAuthMessage('', 'Logged in. Publishing your comment...');
        closeAuthModal();
        setTimeout(function(){ addComment(null, { bypassAuth: true, forceText: inputEl.value.trim() }); }, 30);
      }
      refreshUserBar();
    } catch (e) {
      console.error('comment auth error', e);
      const message = e && e.message ? e.message : 'Could not complete authentication right now.';
      setAuthMessage(message, '');
    } finally { if (submit) submit.disabled = false; }
  }

  async function loadRecentCommentsForUser(userId, username){
    if (!client) return [];
    let query = client.from('video_comments').select('id,page_slug,body,likes_count,created_at').order('created_at', { ascending:false }).limit(12);
    if (userId) query = query.eq('user_id', userId); else query = query.eq('username_snapshot', username);
    const { data } = await query;
    return Array.isArray(data) ? data : [];
  }

  function ensureProfileModal(){
    if (document.getElementById('alexia-profile-modal')) return document.getElementById('alexia-profile-modal');
    ensureStyle();
    const overlay = document.createElement('div');
    overlay.className = 'alexia-profile-overlay';
    overlay.id = 'alexia-profile-modal';
    overlay.innerHTML = '<div class="alexia-profile-modal"><button class="alexia-profile-close" type="button">×</button><div data-profile-content></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.classList.remove('is-open'); });
    overlay.querySelector('.alexia-profile-close').addEventListener('click', function(){ overlay.classList.remove('is-open'); });
    return overlay;
  }
  async function openProfileModal(config){
    const overlay = ensureProfileModal();
    const content = overlay.querySelector('[data-profile-content]');
    const userId = config.userId || null;
    const username = String(config.username || 'Guest');
    const editable = !!config.editable;
    const statsMap = window.__alexiaStatsCache || await loadGlobalStats();
    const stat = statsMap.get(makeUserKey(userId, username)) || aggregateUserStats([{ user_id:userId, username_snapshot:username, author_name:username, likes_count:0, created_at:new Date().toISOString() }]).values().next().value;
    const profileRow = userId ? await getCurrentProfile(userId) : null;
    const merged = getVisibleProfile(userId, profileRow || {});
    const recent = await loadRecentCommentsForUser(userId, username);
    const rep = reputationFor(stat);
    const rank = rankPositionFor(stat);
    const avatarHtml = renderAvatar(username, merged, 'alexia-profile-avatar');
    content.innerHTML = `
      <div class="alexia-profile-head">
        ${avatarHtml}
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.58);margin-bottom:8px">Alexia community profile</div>
          <h3 style="margin:0 0 8px;font-size:32px;line-height:1.02">${esc(username)}</h3>
          <div class="yt-rep-badge tier-${rep.tier}">${esc(rep.badge)}</div>
          <p style="margin:12px 0 0;color:rgba(255,255,255,.74);line-height:1.6">${esc((merged.bio || '').trim() || (editable ? 'Add a short bio so other users understand your vibe.' : 'This user has not added a bio yet.'))}</p>
        </div>
      </div>
      <div class="alexia-profile-stats">
        <div class="alexia-stat-card"><strong>${rep.points}</strong><span>Reputation points</span></div>
        <div class="alexia-stat-card"><strong>${Number(stat.comments || 0)}</strong><span>Comments</span></div>
        <div class="alexia-stat-card"><strong>${Number(stat.likes || 0)}</strong><span>Likes received</span></div>
        <div class="alexia-stat-card"><strong>${Number(stat.recent || 0)}</strong><span>Active 14d</span></div>
      </div>
      <div class="alexia-profile-grid">
        <div class="alexia-panel">
          <h4>${editable ? 'Edit profile' : 'Profile'}</h4>
          ${editable ? `
            <div class="alexia-profile-field"><label>Avatar image URL</label><input type="text" data-profile-avatar value="${esc(merged.avatar_url || '')}" placeholder="https://... optional"></div>
            <div class="alexia-profile-field"><label>Short bio</label><textarea data-profile-bio maxlength="220" placeholder="Short bio for your community profile">${esc(merged.bio || '')}</textarea></div>
            <div class="alexia-profile-actions">
              <button class="alexia-mini-btn primary" type="button" data-profile-save>Save profile</button>
              <a class="alexia-mini-btn" href="/community.html">Open community rank</a>
            </div>
            <div class="alexia-hidden-tools">
              <button class="alexia-mini-btn" type="button" data-unhide-comments>Reset hidden comments</button>
              <button class="alexia-mini-btn" type="button" data-unmute-users>Reset muted users</button>
            </div>
          ` : `<div class="alexia-profile-bio">${esc((merged.bio || '').trim() || 'No public bio yet.')}</div>`}
        </div>
        <div class="alexia-panel">
          <h4>Recent comment history</h4>
          <div class="alexia-profile-history">${recent.length ? recent.map(row => `<div class="alexia-history-item"><div class="meta">${esc(prettySlugLabel(row.page_slug))} • ${ago(row.created_at)}</div><div>${esc(row.body)}</div></div>`).join('') : '<div class="alexia-history-item">No comments yet.</div>'}</div>
        </div>
      </div>`;
    overlay.classList.add('is-open');
    if (editable) {
      const saveBtn = content.querySelector('[data-profile-save]');
      if (saveBtn) saveBtn.addEventListener('click', async function(){
        const bio = String((content.querySelector('[data-profile-bio]') || { value:'' }).value || '').trim().slice(0,220);
        const avatar = String((content.querySelector('[data-profile-avatar]') || { value:'' }).value || '').trim();
        setProfilePrefs(userId, { bio: bio || '', avatar_url: avatar || '' });
        try { await client.from('profiles').update({ bio: bio || null, avatar_url: avatar || null }).eq('id', userId); } catch(e) {}
        const currentRow = (profileCache.get(userId) || {});
        profileCache.set(userId, Object.assign({}, currentRow, { id:userId, bio: bio || null, avatar_url: avatar || null }));
        globalStatsPromise = null;
        try { window.__alexiaStatsCache = await loadGlobalStats(true); } catch(e) {}
        await refreshUserBar();
        await render();
        setStatus('Profile updated.', 'is-ok');
        overlay.classList.remove('is-open');
      });
      const resetHidden = content.querySelector('[data-unhide-comments]');
      if (resetHidden) resetHidden.addEventListener('click', function(){ saveHiddenComments([]); render(); setStatus('Hidden comments reset.', 'is-ok'); });
      const resetMuted = content.querySelector('[data-unmute-users]');
      if (resetMuted) resetMuted.addEventListener('click', function(){ saveMutedUsers([]); render(); setStatus('Muted users reset.', 'is-ok'); });
    }
  }

  async function refreshUserBar(){
    const bar = ensureCommunityToolbar();
    const rail = bar.querySelector('[data-user-rail]');
    if (!rail) return;
    const user = await getCurrentUser();
    currentUserSnapshot = user || null;
    if (!user) {
      rail.innerHTML = '<button class="alexia-mini-btn primary" type="button" data-auth-open>Join to comment</button><span class="alexia-muted-note">Registered users build reputation, badges and ranking history.</span>';
      rail.querySelector('[data-auth-open]').addEventListener('click', function(){ openAuthModal('signup'); });
      return;
    }
    const profile = await getCurrentProfile(user.id) || { username: cleanDisplayName((user.user_metadata && user.user_metadata.username) || (user.user_metadata && user.user_metadata.display_name) || '', 'member') };
    currentProfileSnapshot = getVisibleProfile(user.id, profile || {});
    var localNick = localForumNickname();
    currentProfileSnapshot.username = cleanDisplayName(localNick || currentProfileSnapshot.username || profile.username || '', 'member');
    const statsMap = window.__alexiaStatsCache || await loadGlobalStats();
    const stat = statsMap.get(makeUserKey(user.id, currentProfileSnapshot.username || profile.username || 'member')) || { comments:0, likes:0, recent:0 };
    const rep = reputationFor(stat);
    const rank = rankPositionFor(stat);
    const avatar = renderAvatar(currentProfileSnapshot.username || profile.username || 'member', currentProfileSnapshot, 'alexia-user-avatar');
    rail.innerHTML = `<button class=\"alexia-user-chip\" type=\"button\" data-open-self-profile>${avatar}<span class=\"alexia-user-copy\"><strong>${esc(currentProfileSnapshot.username || profile.username || 'member')}</strong><span>${rep.badge} • ${rep.points} pts${Number(stat.streak||0) >= 2 ? ' • ' + Number(stat.streak||0) + 'd streak' : ''}${rank ? ' • #' + rank : ''}</span></span></button><button class=\"alexia-mini-btn\" type=\"button\" data-auth-logout>Log out</button>`;
    const openBtn = rail.querySelector('[data-open-self-profile]');
    if (openBtn) openBtn.addEventListener('click', function(){ openProfileModal({ userId:user.id, username: currentProfileSnapshot.username || profile.username || 'member', editable:true }); });
    const logoutBtn = rail.querySelector('[data-auth-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', async function(){ await signOutUser(); currentUserSnapshot = null; currentProfileSnapshot = null; setStatus('Logged out.', 'is-ok'); refreshUserBar(); render(); });
  }

  function itemTpl(item){
    const liked = !!likedMap()[String(item.id)];
    const likes = Number(item.likes_count || 0);
    const author = item.username_snapshot || item.author_name || 'guest';
    const userKey = statKeyFromItem(item);
    const stat = (window.__alexiaStatsCache && window.__alexiaStatsCache.get(userKey)) || { comments:1, likes:Number(item.likes_count||0), recent:1, streak:0 };
    const rep = reputationFor(stat);
    const highlight = Number(item.likes_count || 0) >= 5 || (rep.tier >= 3 && Number(item.likes_count || 0) >= 2);
    const hidden = hiddenComments().includes(String(item.id));
    if (hidden) return '';
    const ownComment = !!(item.user_id && currentUserSnapshot && currentUserSnapshot.id === item.user_id);
    const avatarHtml = renderAvatar(author, ownComment ? currentProfileSnapshot : {}, 'yt-comment-avatar');
    const featureFlag = highlight ? '<span class="yt-feature-flag">🔥 Community highlight</span>' : '';
    const streakChip = Number(stat.streak || 0) >= 2 ? `<span class="yt-comment-streak">${Number(stat.streak || 0)}d streak</span>` : '';
    return `<div class="yt-comment tier-${rep.tier}${highlight ? ' is-featured' : ''}${ownComment ? ' is-own' : ''}" data-comment-id="${item.id}" data-user-key="${esc(userKey)}" data-user-id="${esc(item.user_id || '')}" data-username="${esc(author)}">
      <button class="yt-comment-avatar is-clickable" type="button" data-open-profile>${avatarHtml.replace('yt-comment-avatar','')}</button>
      <div class="yt-comment-body">
        <div class="yt-comment-meta">${featureFlag}<button class="yt-comment-author is-clickable" type="button" data-open-profile aria-label="Open user profile">${esc(author)}</button><span class="yt-rep-badge tier-${rep.tier}">${esc(rep.badge)}</span>${streakChip}<span class="yt-comment-time">${ago(item.created_at)}</span></div>
        <div class="yt-comment-text">${esc(item.body)}</div>
        <div class="yt-comment-actions">
          <button class="yt-icon-btn${liked ? ' is-liked' : ''}" type="button" data-like-id="${item.id}">👍 <span class="count">${likes}</span></button>
          <button class="yt-icon-btn alt" type="button" data-report-id="${item.id}">Report</button>
          <button class="yt-icon-btn alt" type="button" data-hide-id="${item.id}">Hide</button>
          <button class="yt-icon-btn alt" type="button" data-mute-user="${esc(userKey)}">Mute user</button>
        </div>
      </div>
    </div>`;
  }
  async function fetchComments(){
    if (!client) return [];
    const hidden = new Set(hiddenComments().map(String));
    const muted = new Set(mutedUsers());
    const { data, error } = await client.from('video_comments').select('id,page_slug,author_name,username_snapshot,user_id,body,likes_count,created_at').in('page_slug', slugVariants).order('created_at', { ascending:false });
    if (error || !Array.isArray(data)) return [];
    const ids = Array.from(new Set((data || []).map(item => item && item.user_id).filter(Boolean)));
    const missing = ids.filter(id => !profileCache.has(id));
    if (missing.length) {
      try {
        const { data: profRows } = await client.from('profiles').select('id,username,bio,avatar_url').in('id', missing);
        (profRows || []).forEach(row => { if (row && row.id) profileCache.set(row.id, row); });
      } catch(e) {}
    }
    const bumps = likeBumps();
    const byId = new Map();
    data.forEach(item => {
      if (!item || hidden.has(String(item.id))) return;
      if (muted.has(statKeyFromItem(item))) return;
      if (!byId.has(String(item.id))) {
        const clone = Object.assign({}, item);
        const prof = clone.user_id ? profileCache.get(clone.user_id) : null;
        const visibleName = cleanDisplayName((prof && prof.username) || clone.username_snapshot || clone.author_name || '', 'Guest');
        clone.author_name = visibleName;
        clone.username_snapshot = visibleName;
        clone.likes_count = Number(clone.likes_count || 0) + Number(bumps[String(clone.id)] || 0);
        byId.set(String(item.id), clone);
      }
    });
    const items = Array.from(byId.values());
    commentsCache = items.slice();
    if (sortMode === 'top') items.sort((a,b) => (Number(b.likes_count||0)-Number(a.likes_count||0)) || ((Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)));
    else if (sortMode === 'hot') items.sort((a,b) => hotScore(b) - hotScore(a) || ((Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)));
    else items.sort((a,b) => ((Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)));
    return items;
  }
  async function render(){
    updateSortLabel();
    const items = await fetchComments();
    countEl.textContent = String(items.length);
    updateClipHighlight(items);
    listEl.innerHTML = items.length ? items.map(itemTpl).join('') : '<div class=\"yt-empty\">No comments yet. Be the first to say something.</div>';
  }
  async function likeComment(id, btn){
    const liked = likedMap();
    const bumps = likeBumps();
    const row = commentsCache.find(item => String(item.id) === String(id));
    const serverLikes = Number(row && row.likes_count || 0);
    const already = !!liked[String(id)];
    const nextLikes = Math.max(0, serverLikes + (already ? -1 : 1));
    try {
      if (already) { delete liked[String(id)]; delete bumps[String(id)]; }
      else { liked[String(id)] = 1; bumps[String(id)] = 1; }
      saveLiked(liked);
      saveLikeBumps(bumps);
      commentsCache = commentsCache.map(item => String(item.id) === String(id) ? Object.assign({}, item, { likes_count: nextLikes }) : item);
      if (btn) {
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.classList.toggle('is-liked', !already);
        const currentCountEl = btn.querySelector('.count');
        if (currentCountEl) currentCountEl.textContent = String(nextLikes);
      }
      setStatus(already ? 'Like removed.' : 'Comment liked.', 'is-ok');

      let syncError = null;
      try {
        if (client) {
          const { error } = await client.from('video_comments').update({ likes_count: nextLikes }).eq('id', id);
          if (error) syncError = error;
        }
      } catch(e) { syncError = e; }

      if (!syncError) {
        const fresh = likeBumps();
        delete fresh[String(id)];
        saveLikeBumps(fresh);
      } else {
        console.warn('comment like server sync pending', syncError);
      }

      globalStatsPromise = null;
      try { window.__alexiaStatsCache = await loadGlobalStats(true); } catch(e) {}
      await render();
      refreshUserBar();
    } catch(e) {
      console.error('comment like error', e);
      setStatus('Like saved locally. Server sync will retry later.', 'is-ok');
      await render();
    }
  }
  async function reportComment(id){
    const row = commentsCache.find(item => String(item.id) === String(id));
    if (!row) return;
    const reason = window.prompt('Report this comment. Short reason:', 'spam / abuse / off-topic');
    if (reason === null) return;
    const entry = { comment_id: row.id, page_slug: pagePath, reason: String(reason || '').trim().slice(0,180), created_at: new Date().toISOString(), username_snapshot: row.username_snapshot || row.author_name || null };
    const queue = reportQueue(); queue.unshift(entry); saveReportQueue(queue.slice(0,100));
    try {
      const user = await getCurrentUser();
      await client.from('comment_reports').insert({ comment_id: row.id, page_slug: pagePath, reason: entry.reason || null, reporter_user_id: user ? user.id : null, reported_user_id: row.user_id || null });
    } catch(e) {}
    setStatus('Thanks. The report was saved for moderation review.', 'is-ok');
  }
  function hideComment(id){ const items = hiddenComments(); items.push(String(id)); saveHiddenComments(items); render(); setStatus('Comment hidden from your view.', 'is-ok'); }
  function muteUser(userKey){ const items = mutedUsers(); items.push(String(userKey)); saveMutedUsers(items); render(); setStatus('User muted in your view.', 'is-ok'); refreshUserBar(); }
  async function openProfileFromNode(node){
    const wrap = node && node.closest('[data-comment-id]');
    if (!wrap) return;
    try {
      await openProfileModal({ userId: wrap.getAttribute('data-user-id') || null, username: wrap.getAttribute('data-username') || 'Guest', editable:false });
    } catch(e) {
      console.error('open profile failed', e);
    }
  }
  async function tryAutoPublishPending(){
    if (authCheckedAutoPublish) return;
    authCheckedAutoPublish = true;
    const pending = getPendingComment();
    if (!pending) return;
    if (pending.pagePath !== pagePath && pending.pageHtmlPath !== pageHtmlPath) return;
    const user = await getCurrentUser();
    if (!user) return;
    if (!inputEl.value.trim()) restorePendingComment();
    setStatus('Account confirmed. Publishing your comment...', 'is-ok');
    await addComment(null, { bypassAuth: true, forceText: String(pending.body || '') });
  }
  async function addComment(ev, opts){
    opts = opts || {};
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    if (busy) return false;
    const text = String(opts.forceText || inputEl.value || '').trim();
    if (!text) { syncButton(); return false; }
    if (!client) { setStatus('Comments are temporarily unavailable.', 'is-error'); return false; }
    let currentUser = await getCurrentUser();
    if (!currentUser && !opts.bypassAuth) {
      storePendingComment('auth'); setStatus('Create your account or log in to publish this comment.', 'is-ok'); openAuthModal('signup'); return false;
    }
    if (!currentUser) { setStatus('Please confirm your account first.', 'is-error'); return false; }
    const cooldownRemaining = getCooldownRemaining();
    if (cooldownRemaining > 0 && !opts.bypassRateLimit) { setStatus('Please wait ' + formatCooldown(cooldownRemaining) + 's before posting again.', 'is-error'); return false; }
    busy = true; syncButton(); setStatus('Posting...', '');
    try {
      const usernameToUse = await ensureProfileUsername(currentUser);
      const { error } = await client.from('video_comments').insert({ page_slug: pagePath, author_name: usernameToUse, username_snapshot: usernameToUse, user_id: currentUser.id, body: text, likes_count: 0 });
      if (error) throw error;
      try {
        window.dispatchEvent(new CustomEvent('alexia-comment-posted', {
          detail: {
            userId: currentUser.id,
            username: usernameToUse,
            pageSlug: pagePath,
            body: text,
            createdAt: new Date().toISOString()
          }
        }));
      } catch(e) {}
      clearPendingComment(); markCommentPostedNow(); inputEl.value = ''; inputEl.style.height = 'auto'; setStatus('Comment posted.', 'is-ok');
      globalStatsPromise = null; window.__alexiaStatsCache = await loadGlobalStats(true);
      await render(); refreshUserBar();
    } catch (e) { console.error('comment insert error', e); const msg = (e && e.message) ? e.message : 'Could not save the comment right now.'; setStatus(msg, 'is-error'); }
    finally { busy = false; syncButton(); }
    return false;
  }

  if (client && client.auth) {
    client.auth.onAuthStateChange(function(_event, session){
      if (session && restorePendingComment()) tryAutoPublishPending();
      refreshUserBar();
    });
  }

  ensureStyle();
  restorePendingComment();
  ensureCommunityToolbar();
  listEl.addEventListener('pointerover', function(e){ if (e && e.stopImmediatePropagation) e.stopImmediatePropagation(); return;
    const profileNode = e.target.closest('[data-open-profile]');
    if (!profileNode) return;
    const related = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-open-profile]') : null;
    if (related === profileNode) return;
    if (hoverShowTimer) clearTimeout(hoverShowTimer);
    hoverShowTimer = setTimeout(function(){ showHoverProfileForNode(profileNode); }, 90);
  });
  listEl.addEventListener('pointerout', function(e){ if (e && e.stopImmediatePropagation) e.stopImmediatePropagation(); return;
    const profileNode = e.target.closest('[data-open-profile]');
    if (!profileNode) return;
    const related = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-open-profile]') : null;
    if (related === profileNode) return;
    hideHoverCard(120);
  });
  listEl.addEventListener('click', function(e){
    const actionBtn = e.target.closest('[data-like-id],[data-report-id],[data-hide-id],[data-mute-user],[data-open-profile]');
    if (!actionBtn) return;
    e.stopPropagation();
  }, true);
  listEl.addEventListener('focusin', function(e){ return; });
  listEl.addEventListener('focusout', function(e){ return; });
  listEl.addEventListener('click', function(e){
    const likeBtn = e.target.closest('[data-like-id]');
    if (likeBtn) { e.preventDefault(); likeComment(likeBtn.getAttribute('data-like-id'), likeBtn); return; }
    const reportBtn = e.target.closest('[data-report-id]');
    if (reportBtn) { e.preventDefault(); reportComment(reportBtn.getAttribute('data-report-id')); return; }
    const hideBtn = e.target.closest('[data-hide-id]');
    if (hideBtn) { e.preventDefault(); hideComment(hideBtn.getAttribute('data-hide-id')); return; }
    const muteBtn = e.target.closest('[data-mute-user]');
    if (muteBtn) { e.preventDefault(); muteUser(muteBtn.getAttribute('data-mute-user')); return; }
    const profileBtn = e.target.closest('[data-open-profile]');
    if (profileBtn) { e.preventDefault(); openProfileFromNode(profileBtn); return; }
  });

  document.addEventListener('click', function(e){
    const p = e.target.closest && e.target.closest('[data-open-profile]');
    if (!p || !listEl.contains(p)) return;
    e.preventDefault();
    e.stopPropagation();
    openProfileFromNode(p);
  }, true);

  inputEl.addEventListener('input', function(){ this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; syncButton(); });
  inputEl.addEventListener('keydown', function(e){ if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addComment(e); });
  postBtn.addEventListener('click', addComment, true);
  if (cancelBtn) cancelBtn.addEventListener('click', function(e){ e.preventDefault(); inputEl.value = ''; inputEl.style.height = 'auto'; clearPendingComment(); setStatus('', ''); syncButton(); });
  if (sortBtn) sortBtn.addEventListener('click', async function(e){ e.preventDefault(); sortMode = sortMode === 'hot' ? 'top' : (sortMode === 'top' ? 'new' : 'hot'); localStorage.setItem(sortStorageKey, sortMode); await render(); });
  window.addEventListener('pageshow', function(){ render(); tryAutoPublishPending(); refreshUserBar(); });
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) { render(); refreshUserBar(); } });
  window.addEventListener('focus', function(){ render(); refreshUserBar(); });
  syncButton();
  ensureOnlineCounter();
  loadGlobalStats().then(map => { window.__alexiaStatsCache = map; render(); refreshUserBar(); }).catch(() => {});
  render();
  refreshUserBar();
  setTimeout(tryAutoPublishPending, 250);
})();


(function(){
  if (window.__alexiaCommentsPresencePatchV1) return;
  window.__alexiaCommentsPresencePatchV1 = true;
  var SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  var VISITOR_KEY = 'alexia_global_online_visitor_v1';
  var likedKey = 'alexia_comment_likes::' + (location.pathname || '').replace(/\.html$/i,'');
  function getVisitorId(){ try{ var v=localStorage.getItem(VISITOR_KEY); if(v) return v; v='v_'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem(VISITOR_KEY,v); return v; }catch(e){ return 'v_'+Math.random().toString(36).slice(2); } }
  async function rest(path, opts){
    var res = await fetch(SUPABASE_URL + '/rest/v1/' + path, Object.assign({ headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=minimal','Cache-Control':'no-cache'}, credentials:'omit', cache:'no-store' }, opts||{}));
    if (!res.ok) throw new Error('API '+res.status);
    return res.status===204 ? null : res.json();
  }
  function likedMap(){ try{return JSON.parse(localStorage.getItem(likedKey)||'{}')||{};}catch(e){return {};}}
  function saveLiked(map){ try{ localStorage.setItem(likedKey, JSON.stringify(map||{})); }catch(e){} }
  function ensureStyle(){
    if (document.getElementById('alexia-presence-patch-style')) return;
    var s=document.createElement('style'); s.id='alexia-presence-patch-style';
    s.textContent=`
      .alexia-presence-line{display:flex;align-items:center;gap:8px;margin:8px 0 0;color:rgba(255,255,255,.72);font-size:12px}
      .alexia-presence-dot{width:8px;height:8px;border-radius:999px;display:inline-block;box-shadow:0 0 12px rgba(0,0,0,.15)}
      .alexia-presence-dot.online{background:linear-gradient(180deg,#8effc1,#24cf7e);box-shadow:0 0 12px rgba(47,255,146,.35)}
      .alexia-presence-dot.offline{background:linear-gradient(180deg,#ff8e8e,#d63b3b);box-shadow:0 0 12px rgba(255,80,80,.28)}
      .alexia-profile-status{display:inline-flex;align-items:center;gap:8px;margin:12px 0 0;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
      .alexia-profile-status .alexia-presence-dot{width:9px;height:9px}
    `; document.head.appendChild(s);
  }
  function ago(ts){ var ms = typeof ts === 'string' ? Date.parse(ts) : Number(ts||0); if (!ms) return 'offline'; var diff = Math.max(1, Math.floor((Date.now()-ms)/1000)); if(diff < 90) return 'online now'; var mins=Math.floor(diff/60); if(mins<60) return 'last seen '+mins+' min ago'; var hrs=Math.floor(mins/60); if(hrs<24) return 'last seen '+hrs+' hour'+(hrs===1?'':'s')+' ago'; var days=Math.floor(hrs/24); return 'last seen '+days+' day'+(days===1?'':'s')+' ago'; }
  function isOnline(ts){ var ms = typeof ts === 'string' ? Date.parse(ts) : Number(ts||0); return !!ms && (Date.now()-ms) < 2*60*1000; }
  async function touchPresence(){
    try{
      if (!window.__alexiaCommentsClient) return;
      var out = await window.__alexiaCommentsClient.auth.getSession();
      var user = out && out.data && out.data.session && out.data.session.user;
      if (!user || !user.id) return;
      await rest('page_visits', { method:'POST', body: JSON.stringify({ page:'presence::'+user.id, visitor_id:getVisitorId() }) });
    }catch(e){}
  }
  async function fetchPresence(userId){
    if (!userId) return null;
    try{
      var rows = await fetch(SUPABASE_URL + '/rest/v1/page_visits?select=created_at&page=eq.' + encodeURIComponent('presence::'+userId) + '&order=created_at.desc&limit=1&_=' + Date.now(), { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Cache-Control':'no-cache'}, credentials:'omit', cache:'no-store' }).then(function(r){ if(!r.ok) throw new Error(String(r.status)); return r.json(); });
      return Array.isArray(rows) && rows[0] ? rows[0].created_at : null;
    }catch(e){ return null; }
  }
  async function updateModalPresence(){
    ensureStyle();
    var overlay = document.querySelector('.alexia-profile-overlay.is-open');
    if (!overlay) return;
    var src = window.__alexiaLastProfileSource;
    if (!src || !src.userId) return;
    var last = await fetchPresence(src.userId);
    var host = overlay.querySelector('.alexia-profile-head div[style*="flex:1"]') || overlay.querySelector('.alexia-profile-head');
    if (!host) return;
    var existing = overlay.querySelector('.alexia-profile-status');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.className='alexia-profile-status';
    wrap.innerHTML='<span class="alexia-presence-dot '+(isOnline(last)?'online':'offline')+'"></span><span>'+(last?ago(last):'offline')+'</span>';
    host.appendChild(wrap);
  }
  async function refreshLikeCounts(){
    var btns = Array.from(document.querySelectorAll('[data-comments-root] [data-like-id]'));
    if (!btns.length) return;
    var rows;
    try{
      rows = await fetch(SUPABASE_URL + '/rest/v1/page_visits?select=page,visitor_id&page=like.' + encodeURIComponent('comment_like::%') + '&limit=5000&_=' + Date.now(), { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Cache-Control':'no-cache'}, credentials:'omit', cache:'no-store' }).then(function(r){ if(!r.ok) throw new Error(String(r.status)); return r.json(); });
    }catch(e){ return; }
    var map = {};
    (Array.isArray(rows)?rows:[]).forEach(function(r){
      var page = r && r.page ? String(r.page) : '';
      var m = page.match(/^comment_like::(.+)$/);
      if (!m) return;
      var id = m[1];
      if (!map[id]) map[id] = new Set();
      if (r.visitor_id) map[id].add(r.visitor_id);
    });
    var liked = likedMap();
    btns.forEach(function(btn){
      var id = String(btn.getAttribute('data-like-id')||''); if(!id) return;
      var count = map[id] ? map[id].size : 0;
      var countEl = btn.querySelector('.count');
      if (countEl) countEl.textContent = String(count);
      btn.classList.toggle('is-liked', !!liked[id]);
    });
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('[data-comments-root] [data-like-id]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var id = String(btn.getAttribute('data-like-id')||''); if(!id) return;
    var liked = likedMap();
    if (liked[id]) return;
    liked[id] = 1; saveLiked(liked);
    btn.classList.add('is-liked');
    var countEl = btn.querySelector('.count');
    if (countEl) countEl.textContent = String((parseInt(countEl.textContent||'0',10)||0)+1);
    rest('page_visits', { method:'POST', body: JSON.stringify({ page:'comment_like::'+id, visitor_id:getVisitorId() }) }).then(refreshLikeCounts).catch(function(){});
  }, true);
  document.addEventListener('click', function(e){
    var profileBtn = e.target.closest && e.target.closest('[data-comments-root] [data-open-profile]');
    if (!profileBtn) return;
    var comment = profileBtn.closest('.yt-comment');
    if (!comment) return;
    window.__alexiaLastProfileSource = { userId: comment.getAttribute('data-user-id') || '', username: comment.getAttribute('data-username') || '' };
    setTimeout(updateModalPresence, 120);
  }, true);
  var obs = new MutationObserver(function(){ refreshLikeCounts(); updateModalPresence(); });
  obs.observe(document.documentElement || document.body, { childList:true, subtree:true });
  ensureStyle();
  refreshLikeCounts();
  touchPresence();
  setInterval(function(){ if(document.visibilityState==='visible'){ touchPresence(); refreshLikeCounts(); } }, 30000);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible'){ touchPresence(); refreshLikeCounts(); updateModalPresence(); } });
})();
