#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

file_path = "index.html"

# Read the file in binary mode
with open(file_path, 'rb') as f:
    content = f.read()

# Remove UTF-8 BOM if present
if content.startswith(b'\xef\xbb\xbf'):
    content = content[3:]
    print(f"Removed UTF-8 BOM from {file_path}")
else:
    print(f"No UTF-8 BOM found in {file_path}")

# Write the file back
with open(file_path, 'wb') as f:
    f.write(content)

print("File saved successfully")
