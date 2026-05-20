TWERKHUB viewed thumbnails patch

Changes included:
- Visual-only grey/viewed state for playlist thumbnails after user clicks/opens a video.
- Uses localStorage only; no backend, no GA, no player/embed changes.
- Adds a small VIEWED pill on thumbnails already opened by the visitor.
- Does NOT touch the home index.html and does NOT touch webcam/camera logic.

Install:
Copy these folders/files over the real repo, replacing only the included index.html files.
Then commit with: Add viewed grey state to playlist thumbnails
