# Texture Upload Guide

## How Textures Are Processed

### Center-Crop Algorithm

Your uploaded texture is automatically center-cropped to a square. This preserves the aspect ratio and prevents distortion.

```
Step 1: Find shortest dimension
┌─────────────────┐
│   1920 x 1080   │  ← Landscape image
│                 │     Shortest: 1080px
└─────────────────┘

Step 2: Create centered square
┌─────────────────┐
│  ┌──────────┐   │
│  │1080x1080 │   │  ← Center 1080x1080 region
│  └──────────┘   │
└─────────────────┘

Step 3: Scale to working size
┌──────────┐
│ 480x480  │  ← Scaled for processing
└──────────┘
```

## Aspect Ratio Examples

### Portrait Image (600 x 800)
```
Original:              Center-Crop:         Result:
┌──────────┐          ┌──────────┐         ┌──────────┐
│          │          │          │         │          │
│   Face   │    →     │   Face   │    →    │   Face   │
│          │          │          │         │          │
│  Body    │          └──────────┘         └──────────┘
│          │           600 x 600            No distortion!
│  Legs    │           Center portion
└──────────┘           used
  Cropped
```
✅ Face preserved
✅ No stretching
❌ Top/bottom cropped (420px - 210px each side)

### Landscape Image (1200 x 800)
```
Original:                      Center-Crop:         Result:
┌────────────────────────┐    ┌──────────┐         ┌──────────┐
│                        │    │          │         │          │
│   [Subject in center]  │ → │ Subject  │    →    │ Subject  │
│                        │    │          │         │          │
└────────────────────────┘    └──────────┘         └──────────┘
                               800 x 800            No distortion!
                               Center portion
```
✅ Subject preserved
✅ No stretching
❌ Left/right cropped (400px - 200px each side)

### Square Image (500 x 500)
```
Original:              Result:
┌──────────┐          ┌──────────┐
│          │          │          │
│  Design  │    →     │  Design  │
│          │          │          │
└──────────┘          └──────────┘
                      No cropping needed!
```
✅ Perfect - no cropping
✅ No distortion

## Safe Zones

To ensure your design isn't cropped, follow these guidelines:

### For Landscape Images (wider than tall):
```
┌────────────────────────────┐
│ CROP│              │CROP   │
│     │              │       │
│     │   SAFE ZONE  │       │
│     │              │       │
│ CROP│              │CROP   │
└────────────────────────────┘

Safe zone = Height x Height square in center
```

### For Portrait Images (taller than wide):
```
┌──────────────┐
│ CROP         │
├──────────────┤
│              │
│  SAFE ZONE   │
│              │
├──────────────┤
│ CROP         │
└──────────────┘

Safe zone = Width x Width square in center
```

## Best Practices

### ✅ Do:
- **Center your design** - Most important content in the middle
- **Leave margins** - 10-20% margin on all sides is safe
- **Use square images** - No cropping needed (1:1 aspect ratio)
- **Test in mesh editor** - Preview shows exactly what will be used
- **High resolution** - 1000x1000 or larger for best quality

### ❌ Don't:
- Put important content at edges
- Use very extreme aspect ratios (like 3000x500)
- Assume entire image will be visible
- Upload very low resolution images (< 500px)

## Common Image Sizes

| Original Size | Shortest Dim | Crop Amount | Safe Zone |
|---------------|--------------|-------------|-----------|
| 1920 x 1080   | 1080         | 420px left/right | Center 1080x1080 |
| 1080 x 1920   | 1080         | 420px top/bottom | Center 1080x1080 |
| 1200 x 900    | 900          | 150px left/right | Center 900x900 |
| 800 x 600     | 600          | 100px left/right | Center 600x600 |
| 1000 x 1000   | 1000         | None! | Entire image |

## Testing Your Texture

1. Open `mesh-editor.html`
2. Upload your texture with "📷 Upload Test Texture"
3. Click "🔄 Preview Deformation"
4. See exactly what portion of your image is used

The preview shows:
- ✅ Which part of your texture is visible
- ✅ How it looks with the character
- ✅ Where cropping occurs (if any)

## Example Workflow

### Creating a Pattern Texture:

1. **Create square canvas** (1000 x 1000) in your image editor
2. **Design in center** with 100px margin on all sides
3. **Export as PNG**
4. **Upload to app** - No cropping needed!
5. **Perfect result** ✨

### Using a Photo:

1. **Crop to square** in photo editor first (recommended)
   - OR -
2. **Upload as-is** - App will center-crop automatically
3. **Preview in mesh editor** to verify good cropping
4. **Adjust in photo editor** if needed
5. **Re-upload** and test again

## Technical Notes

- Cropping happens **before** mesh deformation
- Cropping happens **before** scaling to 480x480
- Final GIF uses center 432x432 of the 480x480 (24px crop)
- Total crop from original: varies based on aspect ratio

## FAQ

**Q: Will my logo be cut off?**
A: If it's centered and takes up less than the smallest dimension, it will be preserved.

**Q: Can I control which part is cropped?**
A: No, it always uses the center. Pre-crop your image if you need different framing.

**Q: What if my image is already square?**
A: Perfect! No cropping will occur.

**Q: Does resolution matter?**
A: Yes! Higher resolution = better quality. Aim for at least 1000x1000 pixels.

**Q: Can I preview before generating the GIF?**
A: Yes! Use the mesh editor's preview feature to see exactly what will be used.
