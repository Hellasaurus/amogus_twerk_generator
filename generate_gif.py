#!/usr/bin/env python3
"""
Generate animated GIF from processed frames
"""
from PIL import Image
import os
from process_frames import process_frame


def generate_dancing_gif(texture_path, output_gif_path, frame_duration=150):
    """
    Process all 6 frames and create an animated GIF

    Args:
        texture_path: Path to texture image
        output_gif_path: Path to save GIF
        frame_duration: Duration of each frame in milliseconds
    """
    # Frame files in order
    frame_files = [
        "working_frames/frame_1.png",
        "working_frames/frame_2.png",
        "working_frames/frame_3.png",
        "working_frames/frame_4.png",
        "working_frames/frame_5.png",
        "working_frames/frame_6.png",
    ]

    processed_frames = []

    print("Processing frames...")
    for i, frame_file in enumerate(frame_files, 1):
        print(f"  Frame {i}/6...")
        temp_output = f"temp_frame_{i}.png"
        frame_128 = process_frame(frame_file, texture_path, temp_output)
        processed_frames.append(frame_128)

        # Clean up temp file
        if os.path.exists(temp_output):
            os.remove(temp_output)

    print(f"Creating animated GIF with {len(processed_frames)} frames...")

    # Save as animated GIF
    processed_frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=processed_frames[1:],
        duration=frame_duration,
        loop=0,  # Loop forever
        disposal=2,  # Clear frame before next one (for transparency)
        optimize=False,  # Don't optimize (can cause artifacts with transparency)
    )

    print(f"Saved animated GIF: {output_gif_path}")
    return output_gif_path


if __name__ == "__main__":
    # Generate test GIF with jack-o-lantern texture
    generate_dancing_gif(
        "Assets/clouds.bmp", "test_output/dancing_amogus.gif", frame_duration=75
    )
    print("\nDone! Check test_output/dancing_amogus.gif")
