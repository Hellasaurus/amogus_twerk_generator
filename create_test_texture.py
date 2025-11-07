#!/usr/bin/env python3
"""
Create a simple test texture for testing
"""
from PIL import Image, ImageDraw
import numpy as np

# Create a 480x480 orange pumpkin-like texture
img = Image.new('RGB', (480, 480), (255, 140, 0))
draw = ImageDraw.Draw(img)

# Add some darker orange stripes to simulate pumpkin ridges
for x in range(0, 480, 60):
    draw.rectangle([x, 0, x+20, 480], fill=(200, 100, 0))

# Add triangle eyes and mouth for jack-o-lantern
# Left eye
draw.polygon([(150, 150), (200, 150), (175, 200)], fill=(50, 50, 0))

# Right eye
draw.polygon([(280, 150), (330, 150), (305, 200)], fill=(50, 50, 0))

# Mouth - zigzag
mouth_points = [
    (140, 300), (160, 320), (180, 300), (200, 320),
    (220, 300), (240, 320), (260, 300), (280, 320),
    (300, 300), (320, 320), (340, 300),
    (340, 350), (320, 330), (300, 350), (280, 330),
    (260, 350), (240, 330), (220, 350), (200, 330),
    (180, 350), (160, 330), (140, 350)
]
draw.polygon(mouth_points, fill=(50, 50, 0))

img.save('test_texture.png')
print("Created test_texture.png")
