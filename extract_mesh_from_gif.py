#!/usr/bin/env python3
"""
Extract mesh deformation data from the original GIF by tracking features
(like the jack-o-lantern pattern on the butt) across frames.
"""

from PIL import Image
import numpy as np
import cv2
import json

def load_gif_frames(gif_path):
    """Load all frames from a GIF file."""
    gif = Image.open(gif_path)
    frames = []

    try:
        while True:
            # Convert to RGB and then to numpy array
            frame = gif.convert('RGB')
            frame_array = np.array(frame)
            # Convert RGB to BGR for OpenCV
            frame_bgr = cv2.cvtColor(frame_array, cv2.COLOR_RGB2BGR)
            frames.append(frame_bgr)
            gif.seek(len(frames))
    except EOFError:
        pass

    return frames

def detect_features(frame, mask=None):
    """
    Detect feature points in a frame using corner detection.
    Focus on the yellow area where the jack-o-lantern is.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # If mask provided, only detect features in masked region
    if mask is not None:
        gray = cv2.bitwise_and(gray, gray, mask=mask)

    # Use goodFeaturesToTrack for corner detection
    features = cv2.goodFeaturesToTrack(
        gray,
        maxCorners=100,
        qualityLevel=0.01,
        minDistance=10,
        blockSize=7
    )

    return features

def create_yellow_mask(frame):
    """
    Create a mask for the yellow/orange area (the butt).
    """
    # Convert to HSV for better color detection
    hsv = frame.copy()
    hsv = cv2.cvtColor(hsv, cv2.COLOR_BGR2HSV)

    # Define range for yellow/orange colors
    # Hue for yellow/orange is roughly 15-45
    lower_yellow = np.array([10, 100, 100])
    upper_yellow = np.array([45, 255, 255])

    mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # Dilate to make mask slightly larger
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=2)

    return mask

def track_features_optical_flow(frames):
    """
    Track features across frames using optical flow.
    Returns feature positions for each frame.
    """
    if len(frames) == 0:
        return []

    # Use first frame as reference
    reference_frame = frames[0]
    mask = create_yellow_mask(reference_frame)

    # Detect features in reference frame
    features = detect_features(reference_frame, mask)

    if features is None or len(features) == 0:
        print("Warning: No features detected in reference frame")
        return []

    print(f"Detected {len(features)} features in reference frame")

    # Parameters for Lucas-Kanade optical flow
    lk_params = dict(
        winSize=(15, 15),
        maxLevel=2,
        criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03)
    )

    # Track features across all frames
    frame_features = [features]
    prev_gray = cv2.cvtColor(reference_frame, cv2.COLOR_BGR2GRAY)

    for i in range(1, len(frames)):
        curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)

        # Calculate optical flow
        next_features, status, err = cv2.calcOpticalFlowPyrLK(
            prev_gray, curr_gray, frame_features[-1], None, **lk_params
        )

        # Keep only good features
        if next_features is not None:
            good_features = next_features[status == 1]
            frame_features.append(good_features.reshape(-1, 1, 2))
        else:
            frame_features.append(frame_features[-1])  # Use previous if tracking fails

        prev_gray = curr_gray

    return frame_features

def features_to_mesh_deformation(frame_features, reference_features, frame_size, grid_size=8):
    """
    Convert tracked feature points to mesh deformation data.

    Uses thin plate spline or similar interpolation to create a deformation field
    from sparse feature points.
    """
    h, w = frame_size[:2]

    if reference_features is None or len(reference_features) == 0:
        return []

    # Flatten reference features
    ref_pts = reference_features.reshape(-1, 2)
    curr_pts = frame_features.reshape(-1, 2)

    if len(ref_pts) != len(curr_pts):
        print(f"Warning: feature count mismatch ({len(ref_pts)} vs {len(curr_pts)})")
        return []

    # Calculate displacement for each feature
    displacements = curr_pts - ref_pts

    # Create a regular grid of points
    grid_spacing = w / grid_size
    deformations = []

    for gy in range(grid_size + 1):
        for gx in range(grid_size + 1):
            grid_x = gx * grid_spacing
            grid_y = gy * grid_spacing
            grid_pt = np.array([grid_x, grid_y])

            # Use inverse distance weighting to interpolate displacement at this grid point
            # from nearby feature points
            distances = np.linalg.norm(ref_pts - grid_pt, axis=1)

            # Avoid division by zero
            distances = np.maximum(distances, 1.0)

            # Inverse distance weighting
            weights = 1.0 / (distances ** 2)
            weights /= np.sum(weights)

            # Weighted average of displacements
            dx = np.sum(displacements[:, 0] * weights)
            dy = np.sum(displacements[:, 1] * weights)

            # Only store if significant deformation
            if abs(dx) > 0.5 or abs(dy) > 0.5:
                deformations.append({
                    'x': gx / grid_size,
                    'y': gy / grid_size,
                    'dx': float(dx),
                    'dy': float(-dy)  # Invert Y to match coordinate system
                })

    return deformations

def visualize_features(frame, features, output_path):
    """Save a visualization of detected features."""
    vis = frame.copy()

    if features is not None and len(features) > 0:
        for feature in features:
            x, y = feature.ravel()
            cv2.circle(vis, (int(x), int(y)), 3, (0, 255, 0), -1)

    cv2.imwrite(output_path, vis)
    print(f"Saved feature visualization to {output_path}")

def main():
    gif_path = "Assets/twerking-amongus-amongus-twerk-halloween.gif"
    output_dir = "mesh_analysis"

    import os
    os.makedirs(output_dir, exist_ok=True)

    print("Loading GIF frames...")
    frames = load_gif_frames(gif_path)
    print(f"Loaded {len(frames)} frames")

    if len(frames) == 0:
        print("Error: No frames loaded")
        return

    # Save first frame with detected features for inspection
    print("\nDetecting features in reference frame...")
    mask = create_yellow_mask(frames[0])
    features = detect_features(frames[0], mask)

    if features is not None:
        visualize_features(frames[0], features, f"{output_dir}/frame_0_features.jpg")
        cv2.imwrite(f"{output_dir}/yellow_mask.jpg", mask)

    # Track features across all frames
    print("\nTracking features across frames...")
    frame_features = track_features_optical_flow(frames)

    if len(frame_features) == 0:
        print("Error: Feature tracking failed")
        return

    # Convert to mesh deformations
    print("\nGenerating mesh deformations...")
    reference_features = frame_features[0]
    all_deformations = {}

    for i, features in enumerate(frame_features):
        print(f"  Frame {i + 1}/{len(frame_features)}")
        deformations = features_to_mesh_deformation(
            features,
            reference_features,
            frames[i].shape,
            grid_size=8
        )
        all_deformations[i + 1] = deformations

        # Visualize tracked features
        visualize_features(frames[i], features, f"{output_dir}/frame_{i}_tracked.jpg")

    # Export as deformations.js format
    output_js = f"""// ========== MESH DEFORMATION DATA ==========
// This file defines how textures are deformed to appear 3D
//
// AUTO-GENERATED from {gif_path}
// Grid resolution: 8x8
// ===========================================

/**
 * Get deformation data for a specific frame
 * @param {{number}} frameIndex - Frame index (0-5)
 * @returns {{Array}} Array of deformation points {{x, y, dx, dy}}
 */
function getFrameDeformation(frameIndex) {{
    const deformations = {json.dumps(all_deformations, indent=4)};
    return deformations[frameIndex + 1] || [];
}}
"""

    output_path = f"{output_dir}/deformations_auto.js"
    with open(output_path, 'w') as f:
        f.write(output_js)

    print(f"\n✓ Generated deformations saved to: {output_path}")
    print(f"✓ Feature visualizations saved to: {output_dir}/")
    print("\nReview the visualizations to see if feature tracking worked well.")
    print("If good, copy the contents of deformations_auto.js to deformations.js")

if __name__ == "__main__":
    main()
