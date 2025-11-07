#!/usr/bin/env python3
"""
Debug green edge artifacts
"""
from PIL import Image
import numpy as np
from process_frames import create_yellow_mask, remove_green_screen, extract_black_lines, apply_texture_to_mask, overlay_black_lines

# Load frame and texture
frame = Image.open('working_frames/frame_1.png')
texture = Image.open('test_texture.png')

# Process
mask = create_yellow_mask(frame)
line_mask = extract_black_lines(frame)
frame_no_green = remove_green_screen(frame)

# Apply texture
result = apply_texture_to_mask(frame_no_green, texture, mask, original_img=frame)

# Check for green pixels before second green screen removal
result_array = np.array(result)
r, g, b = result_array[:,:,0], result_array[:,:,1], result_array[:,:,2]

# Find light green pixels
light_green = (g > r) & (g > b) & (g > 100)
print(f"Light green pixels before second removal: {np.sum(light_green)}")

# Apply second green screen removal
result = remove_green_screen(result)

# Check again
result_array = np.array(result)
r, g, b = result_array[:,:,0], result_array[:,:,1], result_array[:,:,2]
light_green = (g > r) & (g > b) & (g > 100) & (result_array[:,:,3] > 0)
print(f"Light green pixels after second removal: {np.sum(light_green)}")

if np.any(light_green):
    # Find where they are
    coords = np.where(light_green)
    print(f"Sample green pixel locations (first 10):")
    for i in range(min(10, len(coords[0]))):
        y, x = coords[0][i], coords[1][i]
        print(f"  ({x}, {y}): RGB=({r[y,x]}, {g[y,x]}, {b[y,x]}), Alpha={result_array[y,x,3]}")

# Overlay lines and save
result = overlay_black_lines(result, line_mask)
result_480 = result.resize((480, 480), Image.Resampling.NEAREST)
result_480.save('test_output/debug_edges_480.png')
print("Saved debug image at 480x480")
