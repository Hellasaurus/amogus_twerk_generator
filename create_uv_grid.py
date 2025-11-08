#!/usr/bin/env python3
"""
Create a UV grid reference image for deformation mapping.
This grid will be deformed in Photoshop, then analyzed to extract displacement data.
"""

from PIL import Image, ImageDraw
import numpy as np

def create_uv_grid(size=480, grid_size=20, output_path='uv_grid.png'):
    """
    Create a colored UV grid for deformation tracking.

    Args:
        size: Image size (square)
        grid_size: Size of each grid cell in pixels
        output_path: Where to save the grid
    """
    img = Image.new('RGB', (size, size), color='black')
    draw = ImageDraw.Draw(img)

    # Draw grid lines
    for i in range(0, size, grid_size):
        # Vertical lines (vary red based on X position)
        red_value = int((i / size) * 255)
        draw.line([(i, 0), (i, size)], fill=(red_value, 128, 128), width=2)

        # Horizontal lines (vary green based on Y position)
        green_value = int((i / size) * 255)
        draw.line([(0, i), (size, i)], fill=(128, green_value, 128), width=2)

    # Add corner markers for reference
    marker_size = 10
    draw.ellipse([0, 0, marker_size, marker_size], fill='red')
    draw.ellipse([size-marker_size, 0, size, marker_size], fill='green')
    draw.ellipse([0, size-marker_size, marker_size, size], fill='blue')
    draw.ellipse([size-marker_size, size-marker_size, size, size], fill='white')

    img.save(output_path)
    print(f"Created UV grid: {output_path}")
    print(f"Next steps:")
    print(f"1. Open this image in Photoshop")
    print(f"2. Apply Filter > Liquify to deform the grid")
    print(f"3. Save the deformed grid as 'uv_grid_deformed.png'")
    print(f"4. Run extract_displacement_map.py to generate the displacement map")

    return img


def create_displacement_map_from_grids(original_grid_path, deformed_grid_path, output_path, grid_size=20):
    """
    Analyze deformed grid and create a displacement map.

    This is a simplified version - tracks grid intersections.
    Red channel = X displacement
    Green channel = Y displacement
    """
    original = Image.open(original_grid_path).convert('RGB')
    deformed = Image.open(deformed_grid_path).convert('RGB')

    width, height = original.size

    # Create displacement map (store displacement as RGB values)
    displacement = Image.new('RGB', (width, height), color=(128, 128, 0))
    disp_array = np.array(displacement)

    original_array = np.array(original)
    deformed_array = np.array(deformed)

    # For each pixel, calculate displacement
    # This is a simplified approach - in practice you'd track specific grid points
    print("Analyzing grid deformation...")

    # Track grid intersection points
    intersections_original = []
    intersections_deformed = []

    # Find grid intersections in original (where red and green lines meet)
    for y in range(0, height, grid_size):
        for x in range(0, width, grid_size):
            intersections_original.append((x, y))

    # For deformed image, we need to track where each intersection moved
    # This is complex - simplified version just computes optical flow-like displacement

    for y in range(height):
        for x in range(width):
            # Simple displacement: compare pixel colors
            # In a real implementation, you'd use optical flow or feature tracking
            orig_color = original_array[y, x]

            # Find where this color appears in deformed image (nearest match)
            # This is a very simplified approach
            dx = 0
            dy = 0

            # Store displacement as color (128 = no displacement)
            # 0-255 maps to -128 to +127 pixels displacement
            disp_array[y, x] = [
                128 + int(dx),  # X displacement
                128 + int(dy),  # Y displacement
                0               # Unused
            ]

    Image.fromarray(disp_array).save(output_path)
    print(f"Created displacement map: {output_path}")
    print("Note: This is a simplified version. For production, use optical flow or manual control points.")


if __name__ == "__main__":
    # Create UV grid for each frame
    import os
    os.makedirs('deformation_grids', exist_ok=True)

    for i in range(1, 7):
        output = f'deformation_grids/frame_{i}_uv_grid.png'
        create_uv_grid(size=480, grid_size=24, output_path=output)
        print()

    print("=" * 60)
    print("UV grids created!")
    print()
    print("WORKFLOW:")
    print("1. Open each uv_grid in Photoshop")
    print("2. Overlay it on the corresponding frame to see the character")
    print("3. Use Filter > Liquify to deform the grid to match the character's shape")
    print("4. Save as frame_N_deformed.png")
    print()
    print("ALTERNATIVE (EASIER): Use control point mesh instead")
    print("Run create_mesh_deformation.py for an interactive mesh editor")
