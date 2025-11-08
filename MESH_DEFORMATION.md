## Mesh Deformation Workflow

This document explains how to create mesh deformations for your animation frames.

## Option 1: Interactive Mesh Editor (Recommended)

This is the easiest approach - manually define control points with a visual editor.

### Steps:

1. **Open the mesh editor:**
   ```bash
   open mesh-editor.html
   ```

2. **For each frame (1-6):**
   - Select the frame from the dropdown
   - Drag the green control points to deform the mesh
   - The goal: make the mesh follow the contours of the character's body
   - Focus on the center area where the texture is applied

3. **Tips for good deformation:**
   - Less is more! Start subtle
   - The texture should appear to "wrap around" the body
   - Areas closer to camera should bulge outward slightly
   - Areas further away should compress inward slightly
   - Match the body's curves and perspective

4. **Export the data:**
   - Click "Export JSON"
   - Save the output to `deformations.js`

5. **Use in your app:**
   - Include the deformation script in `index.html`
   - The deformations will automatically apply to textures

### Grid Resolution:

- **5x5**: Fast, but less precise
- **10x10**: Good balance (recommended)
- **15x15**: Very precise, but more work to configure

---

## Option 2: Photoshop Liquify (Advanced)

If you prefer using Photoshop's Liquify tool, you'll need to extract displacement maps.

### Workflow:

1. **Create UV grid:**
   ```bash
   source venv/bin/activate
   python create_uv_grid.py
   ```
   This creates reference grids in `deformation_grids/`

2. **For each frame:**
   - Open `deformation_grids/frame_N_uv_grid.png` in Photoshop
   - Add the corresponding frame as a layer underneath for reference
   - Use Filter → Liquify to deform the grid to match the body shape
   - Save the deformed grid as `frame_N_deformed.png`

3. **Extract displacement maps:**
   ```bash
   python extract_displacement.py
   ```
   This analyzes the grid deformation and creates displacement maps

4. **Use in app:**
   - Load displacement maps instead of control points
   - Apply in shader (more complex implementation needed)

### Pros of Photoshop approach:
- More natural, artist-friendly interface
- Can see real-time preview of deformation
- Can use familiar Photoshop tools

### Cons of Photoshop approach:
- Requires additional processing to extract data
- Displacement map extraction is approximate
- More complex to integrate

---

## How It Works

### Control Point Mesh:

The texture is mapped onto a 2D grid. By moving control points, you deform the grid, which deforms the texture.

```
Regular Grid:          Deformed Grid:
+--+--+--+            +--+--+--+
|  |  |  |            | / \ |  |
+--+--+--+     →      +/   \+--+
|  |  |  |            |\   /|  |
+--+--+--+            | \ / +--+
                       +--+
```

### WebGL Rendering:

1. Create triangle mesh from grid
2. Apply control point displacements to vertices
3. Render texture onto deformed mesh
4. Result: texture appears to follow 3D contours

### Deformation Data Format:

```javascript
{
  "1": [  // Frame 1
    { "x": 0.5, "y": 0.5, "dx": 0.1, "dy": -0.05 },
    // x, y: grid position (0-1)
    // dx, dy: displacement (-1 to 1)
  ],
  "2": [...],  // Frame 2
  // etc.
}
```

---

## Integration with App

Once you have `deformations.js`, add it to your `index.html`:

```html
<script src="mesh-deform-simple.js"></script>
<script src="deformations.js"></script>
<script src="app.js"></script>
```

Then in `app.js`, the deformation will be applied automatically when processing frames.

---

## Recommended Workflow

1. Start with **mesh-editor.html** for quick iteration
2. Do frame 1 first, then use "Copy to All Frames" as a starting point
3. Refine each frame individually
4. Export and test in the main app
5. Iterate until it looks good!

The goal is to make the texture appear "printed" on the character's body, following its curves and depth.
