#!/usr/bin/env python3
"""
Debug alpha channel issues
"""
from PIL import Image
import numpy as np
from process_frames import create_yellow_mask, remove_green_screen

# Load frame
frame = Image.open('working_frames/frame_1.png')

# Sample a pixel in the yellow region (roughly center of the body)
sample_x, sample_y = 280, 300

# Get original color
pixel = frame.getpixel((sample_x, sample_y))
print(f"Original pixel at ({sample_x}, {sample_y}): {pixel}")

# After green screen removal
frame_no_green = remove_green_screen(frame)
pixel_no_green = frame_no_green.getpixel((sample_x, sample_y))
print(f"After green removal: {pixel_no_green}")

# Check the mask
mask = create_yellow_mask(frame)
mask_value = mask.getpixel((sample_x, sample_y))
print(f"Mask value: {mask_value}")

# Save a visualization showing what pixels have alpha > 0
alpha_channel = np.array(frame_no_green)[:,:,3]
print(f"Alpha channel stats: min={alpha_channel.min()}, max={alpha_channel.max()}, mean={alpha_channel.mean():.2f}")
print(f"Pixels with alpha > 0: {np.sum(alpha_channel > 0)}")
print(f"Pixels with alpha == 255: {np.sum(alpha_channel == 255)}")

# Save alpha channel as image
alpha_img = Image.fromarray(alpha_channel)
alpha_img.save('test_output/debug_alpha.png')
print("Saved alpha channel visualization")
