import yt_dlp
import json
import sys

# URL de la playlist
playlist_url = "https://www.youtube.com/playlist?list=PLMzWifnZnpVLt_Epf5QNFIBw146T_Ui7j"

print("[INFO] Extrayendo IDs de la playlist...")
print(f"[INFO] Playlist: {playlist_url}")

try:
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'extract_flat': 'in_playlist',
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)
        
        video_ids = []
        if 'entries' in info:
            for entry in info['entries']:
                if entry and 'id' in entry:
                    video_ids.append(entry['id'])
        
        print(f"\n[✓] Total de videos en la playlist: {len(video_ids)}")
        
        # Mostrar primeros 30
        print(f"\nPrimeros 30 IDs:")
        for i, vid_id in enumerate(video_ids[:30]):
            print(f"  {i+1}. {vid_id}")
        
        # Guardar todos los IDs
        with open('/sessions/gifted-sharp-planck/mnt/alexia-twerk-web-clean/playlist_ids.json', 'w') as f:
            json.dump(video_ids, f)
        
        print(f"\n[✓] IDs guardados en playlist_ids.json")

except Exception as e:
    print(f"[ERROR] {e}")
    print("\n[INFO] Usando IDs manual como fallback...")
    sys.exit(1)
