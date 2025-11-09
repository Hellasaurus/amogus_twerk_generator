#!/usr/bin/env python3
"""
Decompose GIF into individual frames for manual feature marking.
"""
from PIL import Image
import os

# Input and output paths
gif_path = "Assets/twerking-amongus-amongus-twerk-halloween.gif"
output_dir = "manual-feature-extraction"

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Open the GIF
gif = Image.open(gif_path)

# Extract each frame
frame_num = 0
try:
    while True:
        # Convert to RGB (GIFs can be in palette mode)
        frame_rgb = gif.convert('RGB')

        # Save the frame
        output_path = os.path.join(output_dir, f"frame_{frame_num}.png")
        frame_rgb.save(output_path)
        print(f"Saved {output_path}")

        frame_num += 1
        gif.seek(gif.tell() + 1)
except EOFError:
    print(f"\nExtracted {frame_num} frames to {output_dir}/")
