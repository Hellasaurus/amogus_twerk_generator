#!/usr/bin/env python3
"""
Process Among Us frames to create masks and apply textures
"""

from PIL import Image
import numpy as np
import sys
import os


def dilate_mask(mask, iterations=4):
    """
    Dilate mask to expand it slightly and cover antialiased edges
    A pixel becomes part of mask if any neighbor is in the mask
    """
    mask_array = np.array(mask)
    result = mask_array.copy()

    for _ in range(iterations):
        dilated = result.copy()
        h, w = result.shape

        # Check 3x3 neighborhood
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                # If any neighbor is in mask, add this pixel to mask
                neighborhood = result[y - 1 : y + 2, x - 1 : x + 2]
                if np.any(neighborhood > 4):
                    dilated[y, x] = 255

        result = dilated

    return result


def extract_black_lines(img):
    """
    Extract black outline lines from the image
    Returns a mask where black lines are marked
    """
    img_array = np.array(img)

    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

    # Detect pixels that are very dark (close to black)
    # Using aggressive threshold to get thick lines
    black_mask = (r < 140) & (g < 140) & (b < 140)

    mask = np.zeros(img_array.shape[:2], dtype=np.uint8)
    mask[black_mask] = 255

    return mask


def create_yellow_mask(img):
    """
    Create a mask for yellow regions (the butt area where texture will be applied)
    Returns a binary mask where 255 = yellow region, 0 = other
    """
    img_array = np.array(img)

    # Define yellow color range in RGB
    # Looking at the frames, the yellow ranges from light to dark orange
    # Light yellow: approximately (255, 230, 120)
    # Dark yellow/orange: approximately (230, 170, 50)

    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

    # Yellow detection: high R, high G, low B
    yellow_mask = (
        (r > 180)  # Red channel is high
        & (g > 120)  # Green channel is moderate to high
        & (b < 150)  # Blue channel is low
        & (r > b)  # Red greater than blue
        & (g > b)  # Green greater than blue
    )

    mask = np.zeros(img_array.shape[:2], dtype=np.uint8)
    mask[yellow_mask] = 255

    # Dilate mask to expand it slightly and cover antialiased edges
    mask = dilate_mask(mask, iterations=4)

    return Image.fromarray(mask)


def remove_green_screen(img, threshold=100, aggressive=False):
    """
    Remove green background and make it transparent
    Returns RGBA image
    """
    img_array = np.array(img.convert("RGBA"))

    # Define green color range - convert to int16 to avoid overflow
    r = img_array[:, :, 0].astype(np.int16)
    g = img_array[:, :, 1].astype(np.int16)
    b = img_array[:, :, 2].astype(np.int16)

    if aggressive:
        # More aggressive green screen detection for second pass
        # Catches antialiased edge pixels that blend yellow+green
        green_mask = (
            (g > 100)  # Green channel is moderately high
            & (g > r)  # Green higher than red (any amount)
            & (g > b)  # Green higher than blue
        )
    else:
        # Standard green screen detection: green is dominant and much higher than red/blue
        # The green screen is around (22, 187, 0) - green is highest channel
        green_mask = (
            (g > threshold)  # Green channel is high
            & (g > r + 30)  # Green higher than red (no overflow now)
            & (g > b + 30)  # Green higher than blue
            & (r < 100)  # Red is low (helps distinguish from yellow)
        )

    # Set alpha to 0 where green screen is detected
    img_array[green_mask, 3] = 0

    return Image.fromarray(img_array)


def extract_shading_map(base_img, mask):
    """
    Extract shading information from the original yellow pixels
    Returns a shading map (0.0 to 1.0) where 1.0 is brightest, 0.0 is darkest
    """
    base_array = np.array(base_img)
    mask_array = np.array(mask) if isinstance(mask, Image.Image) else mask

    # Calculate luminance for yellow pixels
    r = base_array[:, :, 0].astype(np.float32)
    g = base_array[:, :, 1].astype(np.float32)
    b = base_array[:, :, 2].astype(np.float32)

    # Standard luminance formula
    luminance = 0.299 * r + 0.587 * g + 0.114 * b

    # Find max luminance in masked region
    mask_bool = mask_array > 128
    if np.any(mask_bool):
        max_luminance = np.max(luminance[mask_bool])
        min_luminance = np.min(luminance[mask_bool])

        # Create shading map (normalized to 0.0-1.0)
        shading_map = np.zeros_like(luminance)
        if max_luminance > min_luminance:
            # Normalize: bright areas = 1.0, dark areas = lower value
            shading_map[mask_bool] = (luminance[mask_bool] - min_luminance) / (
                max_luminance - min_luminance
            )
            # Clamp to reasonable range (don't go too dark)
            shading_map[mask_bool] = np.clip(shading_map[mask_bool], 0.4, 1.0)
        else:
            shading_map[mask_bool] = 1.0

        return shading_map
    else:
        return np.ones_like(luminance)


def apply_texture_to_mask(base_img, texture_img, mask, original_img=None):
    """
    Apply texture to the masked regions of the base image with shading
    base_img: RGBA image with green screen removed
    texture_img: RGB/RGBA texture to apply
    mask: Binary mask indicating where to apply texture
    original_img: Original image (before green screen removal) for shading extraction
    """
    base_array = np.array(base_img)
    mask_array = np.array(mask) if isinstance(mask, Image.Image) else mask

    # Resize texture to match base image if needed
    if texture_img.size != base_img.size:
        texture_img = texture_img.resize(base_img.size, Image.Resampling.LANCZOS)

    texture_array = np.array(texture_img.convert("RGBA"))

    # Extract shading from original frame (before green screen removal)
    source_for_shading = original_img if original_img is not None else base_img
    shading_map = extract_shading_map(source_for_shading, mask_array)

    # Apply texture only where mask is white
    mask_bool = mask_array > 128

    # Blend texture onto base image
    result = base_array.copy()

    # Apply texture with shading
    result[mask_bool, 0] = (
        texture_array[mask_bool, 0] * shading_map[mask_bool]
    ).astype(
        np.uint8
    )  # R
    result[mask_bool, 1] = (
        texture_array[mask_bool, 1] * shading_map[mask_bool]
    ).astype(
        np.uint8
    )  # G
    result[mask_bool, 2] = (
        texture_array[mask_bool, 2] * shading_map[mask_bool]
    ).astype(
        np.uint8
    )  # B
    # Keep alpha from base image (so transparency is preserved)

    return Image.fromarray(result)


def overlay_black_lines(base_img, line_mask):
    """
    Overlay black lines on top of the base image
    """
    base_array = np.array(base_img)
    line_mask_array = (
        np.array(line_mask) if isinstance(line_mask, Image.Image) else line_mask
    )

    line_pixels = line_mask_array > 128

    # Draw black lines on top
    base_array[line_pixels, 0] = 0  # R
    base_array[line_pixels, 1] = 0  # G
    base_array[line_pixels, 2] = 0  # B
    # Keep alpha channel unchanged

    return Image.fromarray(base_array)


def process_frame(frame_path, texture_path, output_path):
    """
    Process a single frame: create mask, remove green screen, apply texture, overlay lines
    """
    # Load frame
    frame = Image.open(frame_path)

    # Create yellow mask (dilated to cover antialiased edges)
    mask = create_yellow_mask(frame)

    # Extract black lines from original
    line_mask = extract_black_lines(frame)

    # Save mask for inspection
    mask_output = output_path.replace(".png", "_mask.png")
    mask.save(mask_output)
    print(f"Saved mask: {mask_output}")

    # Remove green screen
    frame_no_green = remove_green_screen(frame)

    # If texture provided, apply it
    if texture_path and os.path.exists(texture_path):
        texture = Image.open(texture_path)
        # Pass original frame for shading extraction
        result = apply_texture_to_mask(
            frame_no_green, texture, mask, original_img=frame
        )
        # Second pass: aggressive green removal to catch antialiased edges
        result = remove_green_screen(result, aggressive=True)
    else:
        result = frame_no_green

    # Overlay black lines on top to hide any edge artifacts
    result = overlay_black_lines(result, line_mask)

    # Downsample to 128x128 for Slack emoji
    result_128 = result.resize((128, 128), Image.Resampling.LANCZOS)

    # Save result
    result_128.save(output_path)
    print(f"Saved result: {output_path}")

    return result_128


if __name__ == "__main__":
    # Test with first frame
    test_frame = "working_frames/frame_1.png"
    test_output = "test_output"

    os.makedirs(test_output, exist_ok=True)

    print("Processing test frame to create mask...")
    process_frame(test_frame, None, f"{test_output}/test_frame_1.png")

    print("\nDone! Check test_output/ directory for results")
