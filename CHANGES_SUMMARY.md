# Recent Changes Summary

## 1. Mesh Editor Now Shows Cropped Preview ✅

**Before:** Mesh editor showed full 480x480 frame
**After:** Mesh editor shows 432x432 cropped area (matching final output)

### Why?
The main app crops 24 pixels from each edge to make the character larger. The mesh editor now reflects this, so you see exactly what will be in the final GIF.

### Impact:
- Canvas is now 432x432 instead of 480x480
- Control points are positioned relative to the cropped area
- What you see in preview = what you get in final GIF

---

## 2. Textures Are Center-Cropped (Not Scaled) ✅

**Before:** Textures were stretched/squished to fit square canvas
**After:** Textures are center-cropped to square, preserving aspect ratio

### How It Works:

```
Original Texture (800x600):        Center-Cropped (600x600):
┌────────────────────┐            ┌──────────────┐
│                    │            │              │
│   ┌──────────┐     │      →     │   Content    │
│   │ Content  │     │            │   Preserved  │
│   └──────────┘     │            │              │
│                    │            └──────────────┘
└────────────────────┘
 Crop sides                        Square output
```

### Algorithm:
1. Find shortest dimension (width or height)
2. Create square using that dimension
3. Center the square on the image
4. Crop and scale to target size

### Benefits:
- **No distortion** - Aspect ratio is preserved
- **Better quality** - No stretching artifacts
- **Predictable** - Center of image is always visible
- **Works with any aspect ratio** - Portrait, landscape, or square

### Examples:

**Portrait photo (600x800):**
- Uses center 600x600 square
- Top and bottom cropped equally
- Face/subject usually centered, so it's preserved

**Landscape photo (1200x800):**
- Uses center 800x800 square
- Left and right cropped equally
- Main subject usually preserved

**Already square (500x500):**
- Uses entire image
- No cropping needed

---

## Technical Details

### Mesh Editor (mesh-editor.html)
```javascript
const SOURCE_SIZE = 480;
const SOURCE_CROP = 24;
const CANVAS_SIZE = 432;  // SOURCE_SIZE - (SOURCE_CROP * 2)
```

### Main App (app.js)
```javascript
const SOURCE_CROP = 24;
// Crops 24px from each edge → 432x432 working area
```

### Center-Crop Function (both files)
```javascript
function centerCropTextureToSquare(image, targetSize) {
    const size = Math.min(image.width, image.height);
    const offsetX = (image.width - size) / 2;
    const offsetY = (image.height - size) / 2;

    // Draw center square portion
    ctx.drawImage(
        image,
        offsetX, offsetY, size, size,  // Source
        0, 0, targetSize, targetSize   // Dest
    );
}
```

---

## What This Means for You

### Using the Mesh Editor:
1. The preview now exactly matches the final GIF
2. Control points are positioned on the cropped area
3. Your deformations will translate perfectly to the main app

### Uploading Textures:
1. Use any aspect ratio - it will be handled correctly
2. Make sure important content is **centered** in your image
3. A 200px margin around the edges is safe from cropping

### Best Practices:
- **Center your design** - Edges may be cropped
- **Test with preview** - See exactly what will be used
- **Square images** - Work best (no cropping)
- **High resolution** - Better quality after cropping

---

## Migration Notes

If you have existing deformations from an older version:
- They will need to be recreated with the new mesh editor
- Old deformations were for 480x480, new ones are for 432x432
- The coordinate system has changed

**Solution:** Just re-open mesh-editor.html and create new deformations with the updated tool.
