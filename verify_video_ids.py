import json
import urllib.request
import urllib.error

# Cargar IDs de la playlist
with open('/sessions/gifted-sharp-planck/mnt/alexia-twerk-web-clean/playlist_ids.json', 'r') as f:
    playlist_ids = json.load(f)

print(f"[INFO] Verificando {len(playlist_ids)} IDs de la playlist en YouTube...")
print("=" * 60)

valid_count = 0
invalid_count = 0
invalid_ids = []

for i, vid_id in enumerate(playlist_ids[:50]):  # Verificar primeros 50
    url = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
    
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        response = urllib.request.urlopen(req, timeout=5)
        
        # Si el status es 200, el video es válido
        if response.status == 200:
            valid_count += 1
            print(f"  ✓ {vid_id}: VÁLIDO")
        else:
            invalid_count += 1
            invalid_ids.append(vid_id)
            print(f"  ✗ {vid_id}: INVÁLIDO (status {response.status})")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            invalid_count += 1
            invalid_ids.append(vid_id)
            print(f"  ✗ {vid_id}: NO EXISTE (404)")
        else:
            print(f"  ? {vid_id}: ERROR {e.code}")
    except Exception as e:
        print(f"  ? {vid_id}: ERROR {str(e)[:40]}")

print("=" * 60)
print(f"\n[RESULTADOS]")
print(f"  ✓ Videos válidos: {valid_count}")
print(f"  ✗ Videos inválidos: {invalid_count}")

if invalid_ids:
    print(f"\n[VIDEOS INVÁLIDOS]")
    for vid_id in invalid_ids:
        print(f"  - {vid_id}")
