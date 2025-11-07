#!/usr/bin/env python3
"""
Debug texture application
"""
from PIL import Image
import numpy as np
from process_frames import create_yellow_mask, remove_green_screen, apply_texture_to_mask

# Load frame
frame = Image.open('working_frames/frame_1.png')
print(f"Frame size: {frame.size}, mode: {frame.mode}")

# Create mask
mask = create_yellow_mask(frame)
print(f"Mask size: {mask.size}, mode: {mask.mode}")
print(f"Mask white pixels: {np.sum(np.array(mask) > 128)}")

# Remove green
frame_no_green = remove_green_screen(frame)
print(f"No green size: {frame_no_green.size}, mode: {frame_no_green.mode}")

# Load texture
texture = Image.open('test_texture.png')
print(f"Texture size: {texture.size}, mode: {texture.mode}")

# Apply texture
result = apply_texture_to_mask(frame_no_green, texture, mask)
print(f"Result size: {result.size}, mode: {result.mode}")

# Save full size result first
result.save('test_output/debug_full_size.png')
print("Saved full size result")

# Now downsample
result_128 = result.resize((128, 128), Image.Resampling.LANCZOS)
result_128.save('test_output/debug_128.png')
print("Saved 128x128 result")
