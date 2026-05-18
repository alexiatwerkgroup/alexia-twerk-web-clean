#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Ruta del sitemap
sitemap_path = r"C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\sitemap.xml"

# Leer el archivo
with open(sitemap_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Arreglando sitemap.xml...")
print("=" * 50)

# Fix 1: Cambiar /hot-models-influencers.html a /hot-models-influencers/
if 'hot-models-influencers.html' in content:
    content = content.replace(
        'https://alexiatwerkgroup.com/hot-models-influencers.html',
        'https://alexiatwerkgroup.com/hot-models-influencers/'
    )
    print("✓ Cambiado: /hot-models-influencers.html -> /hot-models-influencers/")
else:
    print("✗ /hot-models-influencers.html no encontrado")

# Fix 2: Agregar /creator/alexia/ si no existe
if 'creator/alexia' not in content:
    # Encontrar el cierre </urlset>
    new_entry = '''  <url>
    <loc>https://alexiatwerkgroup.com/creator/alexia/</loc>
    <lastmod>2026-05-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
'''

    # Agregar antes de </urlset>
    content = content.replace('</urlset>', new_entry + '</urlset>')
    print("✓ Agregado: /creator/alexia/")
else:
    print("✗ /creator/alexia/ ya existe en el sitemap")

# Guardar el archivo
with open(sitemap_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("=" * 50)
print("✓ Sitemap guardado correctamente")
print("")
print("Cambios realizados:")
print("1. /hot-models-influencers.html -> /hot-models-influencers/")
print("2. Agregado /creator/alexia/")
print("")
print("Listo para reindexar en Google Search Console!")
