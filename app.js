// Configuration
const CANVAS_SIZE = 128; // Slack emoji size
const FRAME_DELAY = 150; // ms
const FRAME_PATHS = [
    'frames_web/frame_1.png',
    'frames_web/frame_2.png',
    'frames_web/frame_3.png',
    'frames_web/frame_4.png',
    'frames_web/frame_5.png',
    'frames_web/frame_6.png',
];

// State
let baseFrames = []; // Loaded Among Us frames
let uploadedTexture = null;
let isGenerating = false;

// DOM Elements
const textureUpload = document.getElementById('texture-upload');
const uploadArea = document.getElementById('upload-area');
const previewSection = document.getElementById('preview-section');
const previewCanvas = document.getElementById('preview-canvas');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const statusDiv = document.getElementById('status');

const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });

// Load base frames on startup
loadBaseFrames();

async function loadBaseFrames() {
    statusDiv.textContent = 'Loading base animation frames...';

    try {
        const loadPromises = FRAME_PATHS.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = path;
            });
        });

        baseFrames = await Promise.all(loadPromises);
        statusDiv.textContent = 'Upload a texture to get started!';
        console.log(`Loaded ${baseFrames.length} base frames`);
    } catch (error) {
        statusDiv.textContent = 'Error loading base frames. Please refresh.';
        console.error('Failed to load base frames:', error);
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
            statusDiv.textContent = 'Texture loaded! Click "Generate GIF" to create your emoji.';

            // Draw a preview frame
            if (baseFrames.length > 0) {
                processAndDrawFrame(baseFrames[0], uploadedTexture);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Image processing functions
function erodeMask(mask, width, height, iterations = 2) {
    let result = new Uint8ClampedArray(mask);

    for (let iter = 0; iter < iterations; iter++) {
        const eroded = new Uint8ClampedArray(width * height);

        // Check 3x3 neighborhood
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                if (result[idx] > 128) {
                    // Count neighbors
                    let count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = (y + dy) * width + (x + dx);
                            if (result[nIdx] > 128) count++;
                        }
                    }

                    // Keep pixel only if at least 7 of 9 neighbors are in mask
                    if (count >= 7) {
                        eroded[idx] = 255;
                    }
                }
            }
        }

        result = eroded;
    }

    return result;
}

function createYellowMask(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const mask = new Uint8ClampedArray(width * height);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Yellow detection: high R, high G, low B
        const isYellow = (
            r > 180 &&
            g > 120 &&
            b < 150 &&
            r > b &&
            g > b
        );

        mask[i / 4] = isYellow ? 255 : 0;
    }

    // Erode mask to remove antialiased edges
    return erodeMask(mask, width, height, 2);
}

function removeGreenScreen(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Green screen detection (avoid overflow by using proper comparisons)
        const isGreen = (
            g > 150 &&
            g > r + 30 &&
            g > b + 30 &&
            r < 100
        );

        if (isGreen) {
            data[i + 3] = 0; // Make transparent
        }
    }

    return imageData;
}

function extractShadingMap(imageData, mask) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const shadingMap = new Float32Array(width * height);

    // Calculate luminance for each pixel
    const luminance = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        luminance[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Find min/max luminance in masked region
    let minLum = Infinity;
    let maxLum = -Infinity;
    for (let i = 0; i < mask.length; i++) {
        if (mask[i] > 128) {
            minLum = Math.min(minLum, luminance[i]);
            maxLum = Math.max(maxLum, luminance[i]);
        }
    }

    // Create normalized shading map
    for (let i = 0; i < shadingMap.length; i++) {
        if (mask[i] > 128) {
            if (maxLum > minLum) {
                // Normalize to 0-1, then clamp to 0.4-1.0 range
                const normalized = (luminance[i] - minLum) / (maxLum - minLum);
                shadingMap[i] = Math.max(0.4, Math.min(1.0, normalized));
            } else {
                shadingMap[i] = 1.0;
            }
        } else {
            shadingMap[i] = 1.0;
        }
    }

    return shadingMap;
}

function applyTextureToMask(baseImageData, textureImageData, mask, originalImageData) {
    const baseData = baseImageData.data;
    const textureData = textureImageData.data;

    // Extract shading from original frame (before green screen removal)
    const shadingMap = extractShadingMap(originalImageData, mask);

    for (let i = 0; i < baseData.length; i += 4) {
        const pixelIndex = i / 4;

        if (mask[pixelIndex] > 128) {
            // Apply texture with shading
            const shade = shadingMap[pixelIndex];
            baseData[i] = Math.floor(textureData[i] * shade);     // R
            baseData[i + 1] = Math.floor(textureData[i + 1] * shade); // G
            baseData[i + 2] = Math.floor(textureData[i + 2] * shade); // B
            // Keep original alpha from base
        }
    }

    return baseImageData;
}

function processAndDrawFrame(baseFrame, texture) {
    // Create temp canvas for processing at original size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = baseFrame.width;
    tempCanvas.height = baseFrame.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // Draw base frame and get original image data
    tempCtx.drawImage(baseFrame, 0, 0);
    const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Create a copy for processing
    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Create yellow mask
    const mask = createYellowMask(originalImageData);

    // Remove green screen
    imageData = removeGreenScreen(imageData);

    // Draw texture
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(texture, 0, 0, tempCanvas.width, tempCanvas.height);
    const textureImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Apply texture to masked regions with shading from original
    imageData = applyTextureToMask(imageData, textureImageData, mask, originalImageData);

    // Draw result to temp canvas
    tempCtx.putImageData(imageData, 0, 0);

    // Draw to preview canvas (scaled down)
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    return tempCanvas;
}

// GIF Generation
generateBtn.addEventListener('click', generateGIF);

async function generateGIF() {
    if (isGenerating || !uploadedTexture || baseFrames.length === 0) return;

    isGenerating = true;
    generateBtn.disabled = true;
    downloadBtn.style.display = 'none';
    statusDiv.className = 'status processing';
    statusDiv.textContent = 'Generating GIF... This may take a moment.';

    // Create GIF encoder
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
        transparent: 0x00FF00 // Transparent color
    });

    // Process all frames
    for (let i = 0; i < baseFrames.length; i++) {
        const tempCanvas = processAndDrawFrame(baseFrames[i], uploadedTexture);

        // Create output canvas at emoji size
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = CANVAS_SIZE;
        outputCanvas.height = CANVAS_SIZE;
        const outputCtx = outputCanvas.getContext('2d');
        outputCtx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        gif.addFrame(outputCtx, { copy: true, delay: FRAME_DELAY });

        // Update progress
        const progress = Math.round((i + 1) / baseFrames.length * 50);
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

    gif.render();
}
