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

### Python Scripts (for development/testing)

The repository also includes Python scripts for batch processing:

```bash
# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install Pillow numpy

# Generate a test GIF
python generate_gif.py
```

## How It Works

1. **Frame Extraction**: 6 key frames were extracted from the original Among Us animation video (frames 2, 5, 6, 9, 11, 12)
2. **Color Masking**: Yellow pixels are identified as the texture application area
3. **Mask Erosion**: Mask edges are refined by 2 iterations of erosion to remove antialiased pixels that would show artifacts after green screen removal
4. **Green Screen Removal**: The green background is made transparent using color-based keying
5. **Shading Extraction**: Original lighting/shadow information is extracted from the yellow regions using luminance values
6. **Texture Application**: Your uploaded texture is mapped onto the masked area with original shading applied (preserving depth and form)
7. **GIF Encoding**: All frames are combined into an animated GIF at 128x128px

## Technical Details

- **Client-side processing**: All image processing happens in the browser using Canvas API
- **No server required**: The tool runs entirely client-side
- **Transparent background**: Green screen is removed for clean emoji appearance
- **Optimized size**: 128x128px is perfect for Slack emoji resolution
- **6-frame animation**: Smooth looping animation at 150ms per frame

## Files

- `index.html` - Main web interface
- `app.js` - Client-side image processing and GIF generation
- `styles.css` - UI styling
- `frames_web/` - The 6 extracted animation frames
- `process_frames.py` - Python script for frame processing
- `generate_gif.py` - Python script for batch GIF generation

## Example Output

Upload a texture like a jack-o-lantern pattern, and get a dancing Among Us character with a pumpkin butt!
