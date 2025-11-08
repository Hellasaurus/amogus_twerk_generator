// Configuration
const CANVAS_SIZE = 128; // Slack emoji size
const FRAME_DELAY = 75; // ms (doubled framerate from 150ms)
const FRAME_COUNT = 6;
const SOURCE_CROP = 24; // Pixels to crop from each edge of source (480x480) for tighter framing

// Pre-rendered mask paths
const MASK_PATHS = {
    base: Array.from({length: FRAME_COUNT}, (_, i) => `masks/frame_${i+1}_base.png`),
    mask: Array.from({length: FRAME_COUNT}, (_, i) => `masks/frame_${i+1}_mask.png`),
    lines: Array.from({length: FRAME_COUNT}, (_, i) => `masks/frame_${i+1}_lines.png`),
    shading: Array.from({length: FRAME_COUNT}, (_, i) => `masks/frame_${i+1}_shading.png`),
};

// State
let prerenderedFrames = {
    base: [],    // Base frames with green screen removed
    mask: [],    // Yellow masks (where to apply texture)
    lines: [],   // Black outline lines
    shading: [], // Shading maps
};
let uploadedTexture = null;
let isGenerating = false;
let previewAnimationInterval = null; // For animating the preview

// DOM Elements
const textureUpload = document.getElementById('texture-upload');
const uploadArea = document.getElementById('upload-area');
const previewSection = document.getElementById('preview-section');
const previewCanvas = document.getElementById('preview-canvas');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const statusDiv = document.getElementById('status');
const resultPreview = document.getElementById('result-preview');
const resultGif = document.getElementById('result-gif');

const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });

// Load pre-rendered masks on startup
loadPrerenderedFrames();

async function loadPrerenderedFrames() {
    statusDiv.textContent = 'Loading pre-rendered frames and masks...';

    try {
        // Helper to load images
        const loadImage = (path) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = path;
            });
        };

        // Load all pre-rendered data in parallel
        const loadPromises = {
            base: Promise.all(MASK_PATHS.base.map(loadImage)),
            mask: Promise.all(MASK_PATHS.mask.map(loadImage)),
            lines: Promise.all(MASK_PATHS.lines.map(loadImage)),
            shading: Promise.all(MASK_PATHS.shading.map(loadImage)),
        };

        prerenderedFrames.base = await loadPromises.base;
        prerenderedFrames.mask = await loadPromises.mask;
        prerenderedFrames.lines = await loadPromises.lines;
        prerenderedFrames.shading = await loadPromises.shading;

        statusDiv.textContent = 'Upload a texture to get started!';
        console.log(`Loaded ${prerenderedFrames.base.length} frames with pre-rendered masks`);
    } catch (error) {
        statusDiv.textContent = 'Error loading frames. Please refresh.';
        console.error('Failed to load pre-rendered frames:', error);
    }
}

// File Upload Handlers
textureUpload.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadTexture(file);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadTexture(file);
    }
}

function loadTexture(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedTexture = img;
            previewSection.style.display = 'block';
            downloadBtn.style.display = 'none';
            resultPreview.style.display = 'none'; // Hide previous result
            statusDiv.textContent = 'Texture loaded! Click "Generate GIF" to create your emoji.';

            // Start animated preview
            if (prerenderedFrames.base.length > 0) {
                startPreviewAnimation();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function startPreviewAnimation() {
    // Stop any existing animation
    if (previewAnimationInterval) {
        clearInterval(previewAnimationInterval);
    }

    let currentFrame = 0;

    // Draw first frame immediately
    processAndDrawFrame(uploadedTexture, currentFrame);

    // Animate through all frames
    previewAnimationInterval = setInterval(() => {
        currentFrame = (currentFrame + 1) % FRAME_COUNT;
        processAndDrawFrame(uploadedTexture, currentFrame);
    }, FRAME_DELAY);
}

function stopPreviewAnimation() {
    if (previewAnimationInterval) {
        clearInterval(previewAnimationInterval);
        previewAnimationInterval = null;
    }
}

// Image processing functions using pre-rendered masks
function processAndDrawFrame(texture, frameIndex = 0) {
    // Get pre-rendered data for this frame
    const baseFrame = prerenderedFrames.base[frameIndex];
    const maskImage = prerenderedFrames.mask[frameIndex];
    const linesImage = prerenderedFrames.lines[frameIndex];
    const shadingImage = prerenderedFrames.shading[frameIndex];

    // Calculate cropped dimensions
    const sourceSize = baseFrame.width;
    const croppedSize = sourceSize - (SOURCE_CROP * 2);

    // Create temp canvas for processing at cropped size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = croppedSize;
    tempCanvas.height = croppedSize;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // Draw base frame (cropped by SOURCE_CROP pixels from each edge)
    tempCtx.drawImage(
        baseFrame,
        SOURCE_CROP, SOURCE_CROP, croppedSize, croppedSize,  // Source: crop from edges
        0, 0, croppedSize, croppedSize                       // Dest: fill canvas
    );
    const baseImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

    // Draw texture to get its image data (cropped)
    tempCtx.clearRect(0, 0, croppedSize, croppedSize);
    tempCtx.drawImage(
        texture,
        0, 0, texture.width, texture.height,  // Source: entire texture
        0, 0, croppedSize, croppedSize        // Dest: scaled to cropped size
    );
    const textureImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

    // Draw mask to get mask data (cropped)
    tempCtx.clearRect(0, 0, croppedSize, croppedSize);
    tempCtx.drawImage(
        maskImage,
        SOURCE_CROP, SOURCE_CROP, croppedSize, croppedSize,
        0, 0, croppedSize, croppedSize
    );
    const maskImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

    // Draw shading to get shading data (cropped)
    tempCtx.clearRect(0, 0, croppedSize, croppedSize);
    tempCtx.drawImage(
        shadingImage,
        SOURCE_CROP, SOURCE_CROP, croppedSize, croppedSize,
        0, 0, croppedSize, croppedSize
    );
    const shadingImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

    // Draw lines to get line mask data (cropped)
    tempCtx.clearRect(0, 0, croppedSize, croppedSize);
    tempCtx.drawImage(
        linesImage,
        SOURCE_CROP, SOURCE_CROP, croppedSize, croppedSize,
        0, 0, croppedSize, croppedSize
    );
    const linesImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

    // Apply texture to masked regions with shading
    const resultData = baseImageData.data;
    const texData = textureImageData.data;
    const maskData = maskImageData.data;
    const shadingData = shadingImageData.data;
    const linesData = linesImageData.data;

    for (let i = 0; i < resultData.length; i += 4) {
        const pixelIndex = i / 4;

        // Check if this pixel is in the mask (using red channel, since it's grayscale)
        if (maskData[i] > 128) {
            // Get shading value (0-255, maps to 0.4-1.0)
            // 102 = 0.4, 255 = 1.0
            const shadingValue = shadingData[i];
            const shade = (shadingValue / 255) * 0.6 + 0.4; // Map 0-255 to 0.4-1.0

            // Apply texture with shading
            resultData[i] = Math.floor(texData[i] * shade);         // R
            resultData[i + 1] = Math.floor(texData[i + 1] * shade); // G
            resultData[i + 2] = Math.floor(texData[i + 2] * shade); // B
            // Alpha from base frame is already set
        }

        // Overlay black lines on top
        if (linesData[i] > 128) {
            resultData[i] = 0;     // R
            resultData[i + 1] = 0; // G
            resultData[i + 2] = 0; // B
            // Keep alpha unchanged
        }
    }

    // Put the result back on canvas
    tempCtx.putImageData(baseImageData, 0, 0);

    // Draw to preview canvas (scaled down to 128x128)
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    return tempCanvas;
}

// GIF Generation
generateBtn.addEventListener('click', generateGIF);

async function generateGIF() {
    if (isGenerating || !uploadedTexture || prerenderedFrames.base.length === 0) return;

    isGenerating = true;
    generateBtn.disabled = true;
    downloadBtn.style.display = 'none';
    statusDiv.className = 'status processing';
    statusDiv.textContent = 'Generating GIF... This may take a moment.';

    // Use bright magenta as transparent marker (very unlikely to appear in textures)
    const TRANSPARENT_COLOR = { r: 255, g: 0, b: 254 };

    // Create GIF encoder
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        workerScript: 'gif.worker.js',
        transparent: (TRANSPARENT_COLOR.r << 16) | (TRANSPARENT_COLOR.g << 8) | TRANSPARENT_COLOR.b,
        repeat: 0  // 0 = loop forever
    });

    // Process all frames
    for (let i = 0; i < prerenderedFrames.base.length; i++) {
        const tempCanvas = processAndDrawFrame(uploadedTexture, i);

        // Create output canvas at emoji size with proper transparency handling
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = CANVAS_SIZE;
        outputCanvas.height = CANVAS_SIZE;
        const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });

        // Draw the frame
        outputCtx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Manually handle transparency by replacing transparent pixels with magenta
        const imageData = outputCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const data = imageData.data;

        for (let j = 0; j < data.length; j += 4) {
            const alpha = data[j + 3];

            // If pixel is very transparent (alpha < 128), replace with bright magenta
            if (alpha < 128) {
                data[j] = TRANSPARENT_COLOR.r;
                data[j + 1] = TRANSPARENT_COLOR.g;
                data[j + 2] = TRANSPARENT_COLOR.b;
                data[j + 3] = 255; // A (fully opaque)
            }
        }

        outputCtx.putImageData(imageData, 0, 0);

        gif.addFrame(outputCtx, { copy: true, delay: FRAME_DELAY });

        // Update progress
        const progress = Math.round((i + 1) / prerenderedFrames.base.length * 50);
        statusDiv.textContent = `Processing frames... ${progress}%`;

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    statusDiv.textContent = 'Encoding GIF... (50%)';

    // Render GIF
    gif.on('progress', (p) => {
        const progress = 50 + Math.round(p * 50);
        statusDiv.textContent = `Encoding GIF... ${progress}%`;
    });

    gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);

        // Display the generated GIF
        resultGif.src = url;
        resultPreview.style.display = 'block';

        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dance-emoji.gif';
            a.click();
        };

        downloadBtn.style.display = 'inline-block';
        statusDiv.className = 'status success';
        statusDiv.textContent = 'GIF ready! Click "Download Emoji" to save.';

        isGenerating = false;
        generateBtn.disabled = false;
    });

    gif.on('abort', () => {
        statusDiv.className = 'status';
        statusDiv.textContent = 'GIF generation was aborted.';
        isGenerating = false;
        generateBtn.disabled = false;
    });

    try {
        gif.render();
    } catch (error) {
        console.error('GIF render error:', error);
        statusDiv.className = 'status';
        statusDiv.textContent = 'Error generating GIF. Check console for details.';
        isGenerating = false;
        generateBtn.disabled = false;
    }
}
