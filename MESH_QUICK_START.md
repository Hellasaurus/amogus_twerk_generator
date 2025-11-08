# Mesh Deformation Quick Start

## Current Status

The mesh deformation system is **integrated and ready to use**, but currently has **no deformations defined** (empty arrays).

Your app will work fine as-is - it just won't apply any mesh warping to textures.

## To Use Mesh Deformation:

### Step 1: Open the Editor
```bash
open mesh-editor.html
```

### Step 2: Create Deformations
1. Select Frame 1 from dropdown
2. Drag the green control points to deform the mesh
3. Try to make the grid follow the body's curves
4. Repeat for frames 2-6 (or use "Copy to All Frames" as a starting point)

### Step 3: Export
1. Click "Export JSON"
2. Copy the output
3. Replace the content in `deformations.js`

### Step 4: Test
Refresh your main app and upload a texture - you should see the deformation applied!

## To Disable Mesh Deformation:

### Quick disable (recommended for production):
In `app.js` line 9, change:
```javascript
const ENABLE_MESH_DEFORMATION = false;
```

### Complete removal:
See `BUILD_PRODUCTION.md` for full instructions.

## How It Works

```
User uploads texture
       ↓
[mesh-deform-simple.js applies deformation using WebGL]
       ↓
Deformed texture → composited with masks
       ↓
Final GIF
```

The mesh deformation happens **before** the texture is cropped and composited with the character's body.

## Tips for Good Deformations

- **Subtle is better** - Start with small adjustments
- **Center focus** - The middle area (where texture applies) needs the most attention
- **Follow curves** - Make the grid bulge/compress to match body shape
- **Use reference** - Look at the base frame to see body contours
- **Test frequently** - Export and test in the main app often

## Files

- `mesh-editor.html` - Visual editor for creating deformations
- `mesh-deform-simple.js` - WebGL deformation engine
- `deformations.js` - Your deformation data
- `MESH_DEFORMATION.md` - Full documentation
- `BUILD_PRODUCTION.md` - How to remove for production
