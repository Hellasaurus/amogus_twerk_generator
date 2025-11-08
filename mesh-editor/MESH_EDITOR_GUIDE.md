# Mesh Editor Visual Guide

## New Workflow with Visual Preview

The mesh editor now supports uploading test textures and previewing deformations in real-time!

## Step-by-Step Guide

### 1. Open the Mesh Editor
```bash
open mesh-editor.html
```

### 2. Upload a Test Texture
- Click **"📷 Upload Test Texture"** button
- Select an image you want to test with (e.g., a pattern, logo, or photo)
- You'll see a confirmation that the texture is loaded

### 3. Select Your Frame
- Choose which frame (1-6) you want to work on from the dropdown
- The base character frame will be displayed with green control points

### 4. Deform the Mesh
- **Drag the green control points** to warp the grid
- Think about how the texture should curve around the body:
  - Center points: Move outward to create bulge/depth
  - Edge points: Usually stay closer to original position
  - Follow the body's contours and perspective

### 5. Preview Your Deformation
- Click **"🔄 Preview Deformation"** button
- The canvas will show:
  - Your uploaded texture with the deformation applied
  - Character outline overlaid at 50% opacity
  - This shows exactly how it will look in the final GIF!

### 6. Iterate
- Adjust control points
- Click preview again
- Repeat until it looks good
- You can see the deformed texture with the character overlay

### 7. Repeat for Other Frames
- Select next frame from dropdown
- Option: Use **"Copy to All Frames"** as a starting point
- Adjust each frame individually
- Preview each one

### 8. Export
- Click **"Export JSON"**
- Data is automatically copied to clipboard
- Paste into `deformations.js`
- Refresh your main app to see results

## Visual Feedback Explained

When you click **"Preview Deformation"**:

```
Before Preview:                After Preview:
┌─────────────────┐           ┌─────────────────┐
│                 │           │                 │
│  Base Frame     │    →      │  Deformed       │
│  (Character)    │           │  Texture +      │
│                 │           │  Character      │
│  + Control      │           │  Overlay        │
│    Points       │           │                 │
└─────────────────┘           └─────────────────┘
```

The preview shows your texture warped by the mesh with the character outline on top, so you can see exactly how it will composite in the final animation.

## Tips for Good Results

### Control Point Placement
- **Center area** (where texture is visible): Most important!
- **Edges**: Can usually be left alone or moved slightly
- **Subtle movements**: Start small, you can always increase

### Deformation Goals
- Make texture appear to **wrap around** the body
- Create sense of **depth** and **perspective**
- Follow the **curves** of the character
- Match the **viewing angle** of each frame

### Using Preview Effectively
1. Start with a simple deformation (just a few points)
2. Preview to see the effect
3. Adjust based on what you see
4. Gradually refine until it looks natural

### Testing Different Textures
- Try with a **grid pattern** first to see deformation clearly
- Test with your **actual texture** to see final result
- Complex textures may need different deformations than simple ones

## Keyboard Shortcuts

- **Click + Drag**: Move control point
- **Preview Button**: See deformed result
- **Reset**: Clear all deformations for current frame

## Troubleshooting

**Preview shows weird artifacts?**
- Try reducing the strength of deformation (move points closer to original position)
- Check that you haven't moved edge points too far

**Can't see the character outline in preview?**
- The base frame is overlaid at 50% opacity
- If your texture is very bright, it might be hard to see
- Look carefully at the edges

**Deformation doesn't show up in main app?**
- Make sure you copied the exported JSON to `deformations.js`
- Check that `ENABLE_MESH_DEFORMATION = true` in `app.js`
- Verify the script tags are uncommented in `index.html`
- Check browser console for errors

## Example Workflow

1. Upload a test texture (e.g., checkerboard pattern)
2. Select Frame 1
3. Move center points outward by ~20-30 pixels
4. Click Preview - see the texture bulge
5. Adjust until it looks like it wraps around the body
6. Repeat for frames 2-6
7. Export and test in main app
8. Iterate if needed

## Advanced: Frame-Specific Deformations

Each frame can have completely different deformations:
- Frame 1 (butt to left): Compress left side, expand right
- Frame 3 (butt centered): Symmetric bulge
- Frame 4 (butt to right): Compress right, expand left

This makes the texture appear to follow the body's movement through the animation.
