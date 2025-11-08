#!/usr/bin/env python3
"""
Pre-render masks and shading maps for all frames to reduce client-side processing
This script generates:
- Yellow masks (dilated) - where texture will be applied
- Black line masks - for outline overlay
- Shading maps - luminance information for realistic texture shading
- Base frames with green screen removed
"""

from PIL import Image
import numpy as np
import os

# Import existing functions from process_frames.py
from process_frames import (
    create_yellow_mask,
    extract_black_lines,
    remove_green_screen,
    extract_shading_map
)


def convert_shading_to_uint8(shading_map):
    """
    Convert float shading map (0.0-1.0) to uint8 (0-255) for storage
    The shading map uses range 0.4-1.0, which we map to 102-255
    """
    shading_array = np.array(shading_map)

    # The shading map from extract_shading_map is already in 0.4-1.0 range
    # Convert to 0-255 range: (value - 0.4) / 0.6 * 255
    # But we need to handle the default 1.0 values outside the mask
    uint8_shading = np.zeros_like(shading_array, dtype=np.uint8)

    # Values of 1.0 (outside mask) -> 255
    # Values in 0.4-1.0 range -> proportional mapping to 102-255
    uint8_shading = ((shading_array - 0.4) / 0.6 * 255).astype(np.uint8)
    uint8_shading = np.clip(uint8_shading, 102, 255)

    return uint8_shading


def prerender_frame_masks(frame_path, output_dir, frame_num):
    """
    Pre-render all masks and data for a single frame
    """
    print(f"Processing frame {frame_num}...")

    # Load original frame
    frame = Image.open(frame_path)

    # 1. Create yellow mask (dilated) - returns PIL Image
    yellow_mask = create_yellow_mask(frame)
    yellow_mask_path = os.path.join(output_dir, f'frame_{frame_num}_mask.png')
    yellow_mask.save(yellow_mask_path)
    print(f"  Saved yellow mask: {yellow_mask_path}")

    # 2. Extract black lines - returns numpy array
    black_lines = extract_black_lines(frame)
    lines_path = os.path.join(output_dir, f'frame_{frame_num}_lines.png')
    Image.fromarray(black_lines).save(lines_path)
    print(f"  Saved black lines: {lines_path}")

    # 3. Extract shading map - returns numpy float array
    shading_map = extract_shading_map(frame, yellow_mask)
    shading_uint8 = convert_shading_to_uint8(shading_map)
    shading_path = os.path.join(output_dir, f'frame_{frame_num}_shading.png')
    Image.fromarray(shading_uint8).save(shading_path)
    print(f"  Saved shading map: {shading_path}")

    # 4. Create base frame with green screen removed (for transparent background)
    frame_no_green = remove_green_screen(frame)
    # Apply aggressive green removal for edges
    frame_no_green = remove_green_screen(frame_no_green, aggressive=True)
    base_path = os.path.join(output_dir, f'frame_{frame_num}_base.png')
    frame_no_green.save(base_path)
    print(f"  Saved base frame: {base_path}")


def main():
    # Input/output directories
    input_dir = "frames_web"
    output_dir = "masks"

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Frame files
    frame_files = [
        'frame_1.png',
        'frame_2.png',
        'frame_3.png',
        'frame_4.png',
        'frame_5.png',
        'frame_6.png',
    ]

    print("Pre-rendering masks for all frames...")
    print("=" * 50)

    for i, frame_file in enumerate(frame_files, 1):
        frame_path = os.path.join(input_dir, frame_file)
        prerender_frame_masks(frame_path, output_dir, i)
        print()

    print("=" * 50)
    print("Done! All masks have been pre-rendered.")
    print(f"Output directory: {output_dir}/")
    print("\nGenerated files for each frame:")
    print("  - frame_N_mask.png    (yellow mask - where to apply texture)")
    print("  - frame_N_lines.png   (black outline lines)")
    print("  - frame_N_shading.png (shading/lighting information)")
    print("  - frame_N_base.png    (base frame with transparency)")


if __name__ == "__main__":
    main()
