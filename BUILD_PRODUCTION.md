# Building for Production

This guide shows how to create a production build without the mesh deformation feature.

## Option 1: Disable Mesh Deformation via Flag

The easiest way - just set a flag in `app.js`:

```javascript
// In app.js, line 9:
const ENABLE_MESH_DEFORMATION = false;  // Change true to false
```

The scripts will still load, but the deformation code won't execute.

## Option 2: Remove Mesh Deformation Files

For a clean production build without any deformation code:

### 1. Remove script tags from `index.html`

Remove these lines (lines 64-68):
```html
<!-- ========== MESH DEFORMATION (OPTIONAL) ========== -->
<!-- Comment out these two lines to disable mesh deformation -->
<script src="mesh-deform-simple.js"></script>
<script src="deformations.js"></script>
<!-- ================================================= -->
```

### 2. (Optional) Clean up `app.js`

Remove mesh deformation code sections marked with:
```javascript
// ========== MESH DEFORMATION ... ==========
...
// ==================================================
```

Specifically, remove:
- Line 7-10: Feature flag definition
- Line 30: meshDeformer variable declaration
- Line 75-85: Mesh deformer initialization
- Line 195-220: Mesh deformation application in processAndDrawFrame

### 3. (Optional) Remove files

These files can be deleted for production:
- `mesh-deform-simple.js`
- `deformations.js`
- `mesh-editor.html`
- `create_uv_grid.py`
- `MESH_DEFORMATION.md`

## Files to Keep for Production

### Essential files:
- `index.html`
- `app.js`
- `styles.css`
- `masks/` directory (all 24 mask files)
- `gif.worker.js` (from gif.js library)

### Optional (for development):
- `prerender_masks.py`
- `process_frames.py`
- `generate_gif.py`
- `frames_web/` directory
- `README.md`

## Deployment Checklist

- [ ] Set `ENABLE_MESH_DEFORMATION = false` in `app.js`
- [ ] OR remove mesh deformation script tags from `index.html`
- [ ] Test the site works without deformation
- [ ] Verify GIF generation still works
- [ ] Check that preview animation loops correctly
- [ ] Ensure all pre-rendered masks load properly

## File Size Considerations

With mesh deformation removed:
- `mesh-deform-simple.js`: ~7KB (saved)
- `deformations.js`: ~1-5KB depending on complexity (saved)

The `masks/` directory is ~400KB and is required for the app to function.

## Why Keep Deformation for Development?

The mesh deformation system is useful for:
- Creating more realistic 3D effects
- Matching texture to body contours
- Adding depth and perspective

For your final published site, you can decide whether the added realism is worth the extra code complexity.
