# setup-d1-via-wrangler.ps1 — TWERKHUB · One-shot D1 setup via Cloudflare CLI
#
# Pegá línea por línea en PowerShell (una a la vez):

# ═══ 1) Instalar Wrangler (1 sola vez) ═══════════════════════════════════
npm install -g wrangler

# ═══ 2) Login a Cloudflare (1 sola vez) ══════════════════════════════════
# Abre browser → te logueás → autorizás → cierra. Después de eso, el CLI
# tiene token cacheado y ya no pide auth.
wrangler login

# ═══ 3) Crear la D1 database ═════════════════════════════════════════════
# El output va a tener una linea como:
#   database_id = "abc123-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# COPIÁ ESE ID — lo necesitás en el paso 4.
wrangler d1 create twerkhub-subscribers

# ═══ 4) Pegá el database_id en wrangler.toml ═════════════════════════════
# Abrí wrangler.toml en tu editor.
# Buscá la línea: database_id = "PASTE_DATABASE_ID_HERE"
# Reemplazala con el ID del paso 3.
# Guardá.

# ═══ 5) Correr el SQL schema en la D1 (remoto, prod) ════════════════════
wrangler d1 execute twerkhub-subscribers --remote --file="d1-subscribers-schema.sql"

# Output esperado: "Executed X queries in Y.YYY seconds" → tabla creada ✓

# ═══ 6) Verificar que la tabla existe ════════════════════════════════════
wrangler d1 execute twerkhub-subscribers --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Debe listar: subscribers ✓

# ═══ 7) Listo ═══════════════════════════════════════════════════════════
# El binding "DB" → twerkhub-subscribers va a aplicarse automáticamente
# en el próximo git push a través de wrangler.toml.
# Después de pushear, el endpoint /api/subscribe queda funcional.

# ═══ Comandos útiles para después ═══════════════════════════════════════
# Ver todos los emails capturados:
#   wrangler d1 execute twerkhub-subscribers --remote --command="SELECT email, source, datetime(created_at,'unixepoch') as created FROM subscribers ORDER BY created_at DESC LIMIT 50"
#
# Contar subscribers:
#   wrangler d1 execute twerkhub-subscribers --remote --command="SELECT COUNT(*) FROM subscribers"
#
# Exportar CSV:
#   wrangler d1 execute twerkhub-subscribers --remote --command="SELECT * FROM subscribers" --json > subscribers-export.json
