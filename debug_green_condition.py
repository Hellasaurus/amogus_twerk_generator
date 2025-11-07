#!/usr/bin/env python3
"""
Debug green screen condition
"""
from PIL import Image
import numpy as np

# Load frame
frame = Image.open('working_frames/frame_1.png')
img_array = np.array(frame)

r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]

# Test pixel at (280, 300) which is yellow
x, y = 280, 300
print(f"Pixel at ({x}, {y}): R={r[y,x]}, G={g[y,x]}, B={b[y,x]}")
print(f"Conditions:")
print(f"  g > 150: {g[y,x]} > 150 = {g[y,x] > 150}")
print(f"  g > r + 30: {g[y,x]} > {r[y,x]} + 30 = {g[y,x]} > {r[y,x] + 30} = {g[y,x] > r[y,x] + 30}")
print(f"  g > b + 30: {g[y,x]} > {b[y,x]} + 30 = {g[y,x]} > {b[y,x] + 30} = {g[y,x] > b[y,x] + 30}")

green_mask = (
    (g > 150) &
    (g > r + 30) &
    (g > b + 30)
)

print(f"  Overall green_mask: {green_mask[y,x]}")

# Test actual green background pixel
x2, y2 = 10, 10
print(f"\nPixel at ({x2}, {y2}) (should be green): R={r[y2,x2]}, G={g[y2,x2]}, B={b[y2,x2]}")
print(f"Conditions:")
print(f"  g > 150: {g[y2,x2]} > 150 = {g[y2,x2] > 150}")
print(f"  g > r + 30: {g[y2,x2]} > {r[y2,x2]} + 30 = {g[y2,x2]} > {r[y2,x2] + 30} = {g[y2,x2] > r[y2,x2] + 30}")
print(f"  g > b + 30: {g[y2,x2]} > {b[y2,x2]} + 30 = {g[y2,x2]} > {b[y2,x2] + 30} = {g[y2,x2] > b[y2,x2] + 30}")
print(f"  Overall green_mask: {green_mask[y2,x2]}")
