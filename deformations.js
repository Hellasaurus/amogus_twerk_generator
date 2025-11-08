/**
 * Mesh deformation data for each frame
 * Each deformation is defined by control points that warp the texture mesh
 */

/**
 * Generate a basic spherical/bulge deformation
 * Creates a curved surface effect to make texture appear 3D
 */
function generateBulgeDeformation(width, height, strength = 0.15) {
  const deformations = [];
  const gridSize = 5; // 5x5 control point grid

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2;

  for (let gy = 0; gy <= gridSize; gy++) {
    for (let gx = 0; gx <= gridSize; gx++) {
      const x = (gx / gridSize) * width;
      const y = (gy / gridSize) * height;

      // Distance from center (normalized)
      const dx = (x - centerX) / radius;
      const dy = (y - centerY) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.0) {
        // Apply spherical bulge
        // Points near center push outward more
        const bulge = Math.cos((dist * Math.PI) / 2) * strength;

        deformations.push({
          x: x,
          y: y,
          dx: dx * bulge * radius,
          dy: dy * bulge * radius,
        });
      }
    }
  }

  return deformations;
}

/**
 * Generate an oblate spheroid (flattened sphere) with rotation
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} radiusX - Horizontal radius (larger = wider)
 * @param {number} radiusY - Vertical radius (smaller = more flattened)
 * @param {number} rotation - Rotation angle in radians (0 = no rotation)
 * @param {number} strength - Deformation strength (0-1)
 * @returns {Array} Array of deformation control points
 */
function generateOblateSpheroid(width, height, radiusX, radiusY, rotation = 0, strength = 0.15) {
  const deformations = [];
  const gridSize = 7; // 7x7 control point grid for smoother deformation

  const centerX = width / 2;
  const centerY = height / 2;

  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  for (let gy = 0; gy <= gridSize; gy++) {
    for (let gx = 0; gx <= gridSize; gx++) {
      const x = (gx / gridSize) * width;
      const y = (gy / gridSize) * height;

      // Position relative to center
      let dx = x - centerX;
      let dy = y - centerY;

      // Rotate coordinates to align with spheroid orientation
      const dxRot = dx * cosR - dy * sinR;
      const dyRot = dx * sinR + dy * cosR;

      // Normalized distance in elliptical space
      const normX = dxRot / radiusX;
      const normY = dyRot / radiusY;
      const dist = Math.sqrt(normX * normX + normY * normY);

      if (dist < 1.0) {
        // Oblate spheroid bulge calculation
        // z-depth based on ellipsoid equation: z = sqrt(1 - x^2/a^2 - y^2/b^2)
        const z = Math.sqrt(1 - normX * normX - normY * normY);

        // Convert z-depth to outward displacement
        const bulge = z * strength;

        // Direction of bulge (outward from ellipse)
        const bulgeX = normX * bulge * radiusX;
        const bulgeY = normY * bulge * radiusY;

        // Rotate bulge direction back to original orientation
        const bulgeXFinal = bulgeX * cosR + bulgeY * sinR;
        const bulgeYFinal = -bulgeX * sinR + bulgeY * cosR;

        deformations.push({
          x: x,
          y: y,
          dx: bulgeXFinal,
          dy: bulgeYFinal,
        });
      }
    }
  }

  return deformations;
}

/**
 * Per-frame deformations
 * These match the butt shape and position in each frame
 * Coordinates are relative to the 480x480 source image
 */
const FRAME_DEFORMATIONS = {
  // Frame 1: butt facing mostly left
  1: generateBulgeDeformation(480, 480, 1),

  // Frame 2: butt swinging
  2: generateBulgeDeformation(480, 480, 0.15),

  // Frame 3: butt more centered
  3: generateBulgeDeformation(480, 480, 0.18),

  // Frame 4: butt facing right
  4: generateBulgeDeformation(480, 480, 0.15),

  // Frame 5: butt swinging back
  5: generateBulgeDeformation(480, 480, 0.12),

  // Frame 6: returning to start
  6: generateBulgeDeformation(480, 480, 0.1),
};

/**
 * Get deformation data for a specific frame
 */
function getFrameDeformation(frameIndex) {
  return FRAME_DEFORMATIONS[frameIndex + 1] || [];
}

// Export
window.getFrameDeformation = getFrameDeformation;
