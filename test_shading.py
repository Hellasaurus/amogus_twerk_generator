#!/usr/bin/env python3
"""
Visualize the shading map
"""
from PIL import Image
import numpy as np
from process_frames import create_yellow_mask, extract_shading_map

# Load frame
frame = Image.open('working_frames/frame_1.png')

# Create mask
mask = create_yellow_mask(frame)
mask_array = np.array(mask)

# Extract shading
shading_map = extract_shading_map(frame, mask_array)

# Convert shading map to grayscale image
shading_vis = np.zeros((shading_map.shape[0], shading_map.shape[1]), dtype=np.uint8)
mask_bool = mask_array > 128
shading_vis[mask_bool] = (shading_map[mask_bool] * 255).astype(np.uint8)

# Save visualization
Image.fromarray(shading_vis).save('test_output/shading_map.png')
print("Saved shading map visualization to test_output/shading_map.png")
print(f"Shading range: {shading_map[mask_bool].min():.3f} to {shading_map[mask_bool].max():.3f}")
