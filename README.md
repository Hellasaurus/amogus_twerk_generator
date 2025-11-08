# Among Us Booty Emoji Generator

A web-based tool to create custom animated Slack emojis by applying textures to a dancing Among Us character.

## What It Does

This tool takes a texture image (like a jack-o-lantern pattern) and applies it to the "butt" area of a dancing Among Us character, creating an animated GIF emoji perfect for Slack.

## How to Use

### Web Interface

1. Open `index.html` in a web browser
2. Upload your texture image (PNG, JPG, or GIF)
3. Preview the first frame with your texture applied
4. Click "Generate GIF" to create the animated emoji
5. Download the resulting 128x128px GIF, optimized for Slack

### Pre-rendering Masks (Development)

To regenerate the pre-rendered masks (only needed if you modify the source frames):

```bash
# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install Pillow numpy

# Pre-render all masks
python prerender_masks.py
```

This will generate 24 files in the `masks/` directory:
- `frame_N_base.png` - Base frame with transparency
- `frame_N_mask.png` - Yellow mask (where texture applies)
- `frame_N_lines.png` - Black outline overlay
- `frame_N_shading.png` - Shading/lighting map

## How It Works

### Pre-rendering Phase (Python)

1. **Frame Extraction**: 6 key frames were extracted from the original Among Us animation video (frames 2, 5, 6, 9, 11, 12)
2. **Mask Generation**: For each frame, the following are pre-rendered:
   - **Yellow Masks**: Yellow pixels are detected and dilated by 4 iterations to cover antialiased edges
   - **Black Line Masks**: Black outline pixels (RGB < 140) are extracted
   - **Shading Maps**: Luminance information is extracted from yellow regions (normalized to 0.4-1.0 range)
   - **Base Frames**: Green screen is removed with two-pass keying (standard + aggressive edge cleanup)

### Client-side Phase (JavaScript)

1. **Load Pre-rendered Assets**: All masks, shading maps, and base frames are loaded on page load
2. **Texture Upload**: User uploads their custom texture image
3. **Texture Composition**: For each frame:
   - Texture is scaled to 480x480 to match frame size
   - Texture pixels are multiplied by shading map values (preserving original lighting/shadows)
   - Textured pixels are composited onto base frame using the yellow mask
   - Black outlines are overlaid on top to ensure clean edges
4. **GIF Encoding**: All frames are combined into an animated GIF at 128x128px

## Technical Details

- **Pre-rendered masks**: Masks, shading, and base frames are generated once using Python/Pillow
- **Fast client-side composition**: Browser only needs to composite texture with pre-rendered data
- **No server required**: The tool runs entirely client-side after masks are pre-generated
- **Transparent background**: Green screen is pre-removed for clean emoji appearance
- **Clean edges**: Mask dilation + black line overlay eliminates antialiasing artifacts
- **Preserved shading**: Original lighting and shadows are pre-extracted and applied to textures
- **Optimized size**: 128x128px is perfect for Slack emoji resolution
- **Smooth animation**: 6-frame looping animation at 150ms per frame

## Files

- `index.html` - Main web interface
- `app.js` - Client-side texture composition and GIF generation
- `styles.css` - UI styling
- `frames_web/` - The 6 original extracted animation frames
- `masks/` - Pre-rendered masks, shading maps, and base frames (24 files total)
- `process_frames.py` - Python utilities for mask generation
- `prerender_masks.py` - Script to generate all pre-rendered masks
- `generate_gif.py` - Python script for batch GIF generation (legacy)

## Example Output

Upload a texture like a jack-o-lantern pattern, and get a dancing Among Us character with a pumpkin butt!
