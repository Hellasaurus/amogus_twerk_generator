// Configuration
const CANVAS_SIZE = 128; // Slack emoji size
const FRAME_DELAY = 40; // ms (25 fps to match original)
const FRAME_COUNT = 6;
const SOURCE_CROP = 24; // Pixels to crop from each edge of source (480x480) for tighter framing

// ========== MESH DEFORMATION FEATURE FLAG ==========
// Set to false to disable mesh deformation for production
const ENABLE_MESH_DEFORMATION = true;
// ===================================================

// Pre-rendered mask paths
const MASK_PATHS = {
  base: Array.from(
    { length: FRAME_COUNT },
    (_, i) => `masks/frame_${i + 1}_base.png`
  ),
  mask: Array.from(
    { length: FRAME_COUNT },
    (_, i) => `masks/frame_${i + 1}_mask.png`
  ),
  lines: Array.from(
    { length: FRAME_COUNT },
    (_, i) => `masks/frame_${i + 1}_lines.png`
  ),
  shading: Array.from(
    { length: FRAME_COUNT },
    (_, i) => `masks/frame_${i + 1}_shading.png`
  ),
  backpack: Array.from(
    { length: FRAME_COUNT },
    (_, i) => `masks/frame_${i + 1}_backpack.png`
  ),
};

// State
let prerenderedFrames = {
  base: [], // Base frames with green screen removed
  mask: [], // Yellow masks (where to apply texture)
  lines: [], // Black outline lines
  shading: [], // Shading maps
  backpack: [], // Backpack masks (for custom color)
};
let uploadedTexture = null;
let backpackColor = null; // Hex color for backpack, null = transparent
let isGenerating = false;
let previewAnimationInterval = null; // For animating the preview
let meshDeformer = null; // WebGL mesh deformer (only if ENABLE_MESH_DEFORMATION is true)
let processedFrameCache = []; // Cache for processed frames to avoid reprocessing
let lastTextureUrl = null; // Track texture changes to invalidate cache
let lastBackpackColor = null; // Track backpack color changes to invalidate cache

// DOM Elements
const textureUpload = document.getElementById("texture-upload");
const uploadArea = document.getElementById("upload-area");
const previewSection = document.getElementById("preview-section");
const previewCanvas = document.getElementById("preview-canvas");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const statusDiv = document.getElementById("status");
const generatedGifsSection = document.getElementById("generated-gifs-section");
const gifGrid = document.getElementById("gif-grid");
const backpackColorPicker = document.getElementById("backpack-color");
const backpackColorLabel = document.getElementById("backpack-color-label");

const ctx = previewCanvas.getContext("2d", { willReadFrequently: true });

// LocalStorage keys
const STORAGE_KEYS = {
  GIFS: "amogusTwerk_generatedGifs",
  MASKS: "amogusTwerk_cachedMasks",
};

// Load pre-rendered masks on startup
loadPrerenderedFrames();

// Initialize backpack color label
updateBackpackColorLabel();

// Load cached GIFs on startup
loadCachedGifs();

async function loadPrerenderedFrames() {
  statusDiv.textContent = "Loading pre-rendered frames and masks...";

  try {
    // Try to load masks from cache first
    const cachedMasks = loadMasksFromCache();

    // Helper to load images
    const loadImage = (path) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = path;
      });
    };

    // Helper to load images with optional fallback to null (for missing backpack masks)
    const loadImageOptional = (path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // Return null if image doesn't exist
        img.src = path;
      });
    };

    // Load from cache or fetch fresh
    if (cachedMasks) {
      console.log("Loading masks from cache");
      prerenderedFrames = cachedMasks;
    } else {
      console.log("Fetching masks from server");
      // Load all pre-rendered data in parallel
      const loadPromises = {
        base: Promise.all(MASK_PATHS.base.map(loadImage)),
        mask: Promise.all(MASK_PATHS.mask.map(loadImage)),
        lines: Promise.all(MASK_PATHS.lines.map(loadImage)),
        shading: Promise.all(MASK_PATHS.shading.map(loadImage)),
        backpack: Promise.all(MASK_PATHS.backpack.map(loadImageOptional)),
      };

      prerenderedFrames.base = await loadPromises.base;
      prerenderedFrames.mask = await loadPromises.mask;
      prerenderedFrames.lines = await loadPromises.lines;
      prerenderedFrames.shading = await loadPromises.shading;
      prerenderedFrames.backpack = await loadPromises.backpack;

      // Cache the masks for future visits
      cacheMasks(prerenderedFrames);
    }

    // Initialize mesh deformer if enabled (at cropped size to match mesh editor)
    if (ENABLE_MESH_DEFORMATION) {
      try {
        const sourceSize = prerenderedFrames.base[0].width;
        const croppedSize = sourceSize - SOURCE_CROP * 2;
        meshDeformer = new MeshDeformer(croppedSize, croppedSize, 8);
        console.log(
          "Mesh deformer initialized at",
          croppedSize,
          "x",
          croppedSize,
          "with 8x8 grid"
        );
      } catch (error) {
        console.warn("Failed to initialize mesh deformer:", error);
        meshDeformer = null;
      }
    }

    statusDiv.textContent = "Upload a texture to get started!";
    console.log(
      `Loaded ${prerenderedFrames.base.length} frames with pre-rendered masks`
    );
  } catch (error) {
    statusDiv.textContent = "Error loading frames. Please refresh.";
    console.error("Failed to load pre-rendered frames:", error);
  }
}

// File Upload Handlers
textureUpload.addEventListener("change", handleFileSelect);

// Backpack Color Picker Handler
backpackColorPicker.addEventListener("input", (e) => {
  backpackColor = e.target.value;
  invalidateFrameCache(); // Clear cache when color changes
  updateBackpackColorLabel();
  // Update preview if texture is loaded
  if (uploadedTexture && previewAnimationInterval) {
    // Preview is already animating, it will pick up the new color
  } else if (uploadedTexture) {
    // Static preview, redraw current frame
    processAndDrawFrame(uploadedTexture, 0);
  }
});

// Clear button for backpack color (make transparent)
const clearBackpackBtn = document.getElementById("clear-backpack-color");
if (clearBackpackBtn) {
  clearBackpackBtn.addEventListener("click", () => {
    backpackColor = null;
    backpackColorPicker.value = "#000000"; // Reset picker to default
    invalidateFrameCache(); // Clear cache when color changes
    updateBackpackColorLabel();
    // Update preview if texture is loaded
    if (uploadedTexture && previewAnimationInterval) {
      // Preview is already animating
    } else if (uploadedTexture) {
      processAndDrawFrame(uploadedTexture, 0);
    }
  });
}

function updateBackpackColorLabel() {
  if (backpackColor) {
    backpackColorLabel.innerHTML = `Backpack Color: <span style="display: inline-block; width: 20px; height: 20px; background: ${backpackColor}; border: 1px solid #999; border-radius: 3px; vertical-align: middle; margin-left: 4px;"></span> ${backpackColor.toUpperCase()}`;
  } else {
    backpackColorLabel.innerHTML = `Backpack Color: <span style="display: inline-block; width: 20px; height: 20px; background: white; border: 1px solid #999; border-radius: 3px; vertical-align: middle; margin-left: 4px; position: relative;"><span style="position: absolute; top: 50%; left: -2px; right: -2px; height: 1px; background: #e53e3e; transform: rotate(-45deg);"></span></span> Transparent`;
  }
}

function invalidateFrameCache() {
  processedFrameCache = [];
  lastTextureUrl = null;
  lastBackpackColor = null;
  console.log("Frame cache invalidated");
}

// ========== LOCALSTORAGE CACHING ==========

function cacheMasks(masks) {
  try {
    // Convert image elements to data URLs for storage
    const maskData = {
      base: [],
      mask: [],
      lines: [],
      shading: [],
      backpack: [],
    };

    // We can't directly store Image objects, so we'll just skip caching masks
    // and rely on browser HTTP cache instead
    console.log("Masks will be cached by browser HTTP cache");
  } catch (error) {
    console.warn("Failed to cache masks:", error);
  }
}

function loadMasksFromCache() {
  // Browser HTTP cache will handle this
  return null;
}

function saveCachedGifs(gifs) {
  try {
    localStorage.setItem(STORAGE_KEYS.GIFS, JSON.stringify(gifs));
    console.log(`Saved ${gifs.length} GIFs to cache`);
  } catch (error) {
    console.warn("Failed to save GIFs to cache:", error);
    // If quota exceeded, clear old GIFs
    if (error.name === "QuotaExceededError") {
      console.log("Storage quota exceeded, clearing oldest GIFs");
      const reducedGifs = gifs.slice(-5); // Keep only last 5
      try {
        localStorage.setItem(STORAGE_KEYS.GIFS, JSON.stringify(reducedGifs));
      } catch (e) {
        console.error("Still failed after reducing GIFs:", e);
      }
    }
  }
}

function loadCachedGifs() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.GIFS);
    if (!cached) return;

    const gifs = JSON.parse(cached);
    console.log(`Loaded ${gifs.length} cached GIFs`);

    if (gifs.length > 0) {
      generatedGifsSection.style.display = "block";
      gifs.forEach((gifData) => {
        addGifToGrid(gifData.dataUrl, gifData.timestamp);
      });
    }
  } catch (error) {
    console.warn("Failed to load cached GIFs:", error);
  }
}

function addGifToGrid(dataUrl, timestamp = Date.now()) {
  // Show the grid section
  generatedGifsSection.style.display = "block";

  // Create GIF item
  const gifItem = document.createElement("div");
  gifItem.className = "gif-item";
  gifItem.dataset.timestamp = timestamp;

  // Create checkered background with image
  const checkeredBg = document.createElement("div");
  checkeredBg.className = "checkered-bg";

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Generated GIF";

  // Click to download
  checkeredBg.onclick = (e) => {
    // Don't download if clicking the delete button
    if (e.target.classList.contains("delete-gif-btn")) return;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `dance-emoji-${timestamp}.gif`;
    a.click();
  };

  // Create download icon overlay
  const downloadOverlay = document.createElement("div");
  downloadOverlay.className = "download-icon-overlay";
  const downloadIcon = document.createElement("img");
  downloadIcon.src = "download-arrow.svg";
  downloadIcon.alt = "Download";
  downloadOverlay.appendChild(downloadIcon);

  // Create delete button (X in circle)
  const deleteBtn = document.createElement("div");
  deleteBtn.className = "delete-gif-btn";
  deleteBtn.title = "Delete GIF";
  deleteBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent download when clicking delete
    gifItem.remove();
    updateCachedGifs();
    // Hide section if no more GIFs
    if (gifGrid.children.length === 0) {
      generatedGifsSection.style.display = "none";
    }
  };

  checkeredBg.appendChild(img);
  checkeredBg.appendChild(downloadOverlay);
  checkeredBg.appendChild(deleteBtn);
  gifItem.appendChild(checkeredBg);

  // Add to grid (prepend to show newest first)
  gifGrid.insertBefore(gifItem, gifGrid.firstChild);
}

function updateCachedGifs() {
  // Get all current GIFs from the grid
  const gifItems = Array.from(gifGrid.querySelectorAll(".gif-item"));
  const gifs = gifItems.map((item) => ({
    dataUrl: item.querySelector("img").src,
    timestamp: parseInt(item.dataset.timestamp),
  }));

  saveCachedGifs(gifs);
}

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
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
      invalidateFrameCache(); // Clear cache when new texture is loaded
      previewSection.style.display = "block";
      downloadBtn.style.display = "none";
      statusDiv.textContent =
        'Texture loaded - Click "Generate" to export (suitable for Slack emotes)';

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

// Helper function to center-crop texture to square
function centerCropTextureToSquare(image, targetSize) {
  const size = Math.min(image.width, image.height);
  const offsetX = (image.width - size) / 2;
  const offsetY = (image.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");

  // Draw the center square portion of the image
  ctx.drawImage(
    image,
    offsetX,
    offsetY,
    size,
    size, // Source: center square
    0,
    0,
    targetSize,
    targetSize // Dest: fill canvas
  );

  return canvas;
}

// Image processing functions using pre-rendered masks
function processAndDrawFrame(texture, frameIndex = 0) {
  // Check if we have a cached version of this frame
  const textureUrl = texture.src;
  const cacheValid =
    processedFrameCache[frameIndex] &&
    lastTextureUrl === textureUrl &&
    lastBackpackColor === backpackColor;

  if (cacheValid) {
    // Use cached frame
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(processedFrameCache[frameIndex], 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return processedFrameCache[frameIndex];
  }

  // Get pre-rendered data for this frame
  const baseFrame = prerenderedFrames.base[frameIndex];
  const maskImage = prerenderedFrames.mask[frameIndex];
  const linesImage = prerenderedFrames.lines[frameIndex];
  const shadingImage = prerenderedFrames.shading[frameIndex];
  const backpackImage = prerenderedFrames.backpack[frameIndex];

  // Calculate cropped dimensions
  const sourceSize = baseFrame.width;
  const croppedSize = sourceSize - SOURCE_CROP * 2;

  // Center-crop texture to square at source size, then immediately crop to working size
  const squareTexture = centerCropTextureToSquare(texture, sourceSize);

  // Crop the texture to working size (432x432) BEFORE any deformation
  // This matches what the mesh editor shows
  const croppedTextureCanvas = document.createElement("canvas");
  croppedTextureCanvas.width = croppedSize;
  croppedTextureCanvas.height = croppedSize;
  const croppedTextureCtx = croppedTextureCanvas.getContext("2d");
  croppedTextureCtx.drawImage(
    squareTexture,
    SOURCE_CROP,
    SOURCE_CROP,
    croppedSize,
    croppedSize, // Source: crop from edges
    0,
    0,
    croppedSize,
    croppedSize // Dest: fill canvas
  );

  // Create temp canvas for processing at cropped size
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = croppedSize;
  tempCanvas.height = croppedSize;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

  // Draw base frame (cropped by SOURCE_CROP pixels from each edge)
  tempCtx.drawImage(
    baseFrame,
    SOURCE_CROP,
    SOURCE_CROP,
    croppedSize,
    croppedSize, // Source: crop from edges
    0,
    0,
    croppedSize,
    croppedSize // Dest: fill canvas
  );
  const baseImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

  // ========== MESH DEFORMATION (OPTIONAL) ==========
  // Apply mesh deformation to texture if enabled
  let textureToComposite = croppedTextureCanvas;
  if (
    ENABLE_MESH_DEFORMATION &&
    meshDeformer &&
    typeof getFrameDeformation === "function"
  ) {
    try {
      const deformations = getFrameDeformation(frameIndex);
      if (deformations && deformations.length > 0) {
        // Convert pixel-based deformations to normalized coordinates
        // Deformations from mesh-editor.html are in pixel space (based on croppedSize)
        const normalizedDeformations = deformations.map((d) => ({
          x: d.x,
          y: d.y,
          dx: (d.dx / croppedSize) * 2, // Convert pixels to -1 to 1 range
          dy: (d.dy / croppedSize) * 2,
        }));

        // Apply deformation to the cropped texture (432x432)
        meshDeformer.applyDeformation(normalizedDeformations);
        const deformedCanvas = meshDeformer.render(croppedTextureCanvas);
        textureToComposite = deformedCanvas;

        console.log(
          `Applied mesh deformation to frame ${frameIndex} (${deformations.length} points)`
        );
      }
    } catch (error) {
      console.warn(`Mesh deformation failed for frame ${frameIndex}:`, error);
    }
  }
  // ==================================================

  // Draw texture to get its image data (already cropped, no need to crop again)
  tempCtx.clearRect(0, 0, croppedSize, croppedSize);
  tempCtx.drawImage(textureToComposite, 0, 0, croppedSize, croppedSize);
  const textureImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

  // Draw mask to get mask data (cropped)
  tempCtx.clearRect(0, 0, croppedSize, croppedSize);
  tempCtx.drawImage(
    maskImage,
    SOURCE_CROP,
    SOURCE_CROP,
    croppedSize,
    croppedSize,
    0,
    0,
    croppedSize,
    croppedSize
  );
  const maskImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

  // Draw shading to get shading data (cropped)
  tempCtx.clearRect(0, 0, croppedSize, croppedSize);
  tempCtx.drawImage(
    shadingImage,
    SOURCE_CROP,
    SOURCE_CROP,
    croppedSize,
    croppedSize,
    0,
    0,
    croppedSize,
    croppedSize
  );
  const shadingImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

  // Draw lines to get line mask data (cropped)
  tempCtx.clearRect(0, 0, croppedSize, croppedSize);
  tempCtx.drawImage(
    linesImage,
    SOURCE_CROP,
    SOURCE_CROP,
    croppedSize,
    croppedSize,
    0,
    0,
    croppedSize,
    croppedSize
  );
  const linesImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);

  // Draw backpack mask if it exists for this frame
  let backpackImageData = null;
  if (backpackImage) {
    tempCtx.clearRect(0, 0, croppedSize, croppedSize);
    tempCtx.drawImage(
      backpackImage,
      SOURCE_CROP,
      SOURCE_CROP,
      croppedSize,
      croppedSize,
      0,
      0,
      croppedSize,
      croppedSize
    );
    backpackImageData = tempCtx.getImageData(0, 0, croppedSize, croppedSize);
  }

  // Apply texture to masked regions with shading
  const resultData = baseImageData.data;
  const texData = textureImageData.data;
  const maskData = maskImageData.data;
  const shadingData = shadingImageData.data;
  const linesData = linesImageData.data;
  const backpackData = backpackImageData ? backpackImageData.data : null;

  // Parse backpack color if provided
  let backpackRGB = null;
  if (backpackColor) {
    const hex = backpackColor.replace("#", "");
    backpackRGB = {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16),
    };
  }

  for (let i = 0; i < resultData.length; i += 4) {
    const pixelIndex = i / 4;

    // Check if this pixel is in the mask (using red channel, since it's grayscale)
    if (maskData[i] > 128) {
      // Get shading value (0-255, maps to 0.3-1.2)
      // 0 = 0.3 (deep shadows), 255 = 1.2 (bright highlights)
      const shadingValue = shadingData[i];
      const shade = (shadingValue / 255) * 0.9 + 0.3; // Map 0-255 to 0.3-1.2

      // Apply texture with shading
      // Clamp to 0-255 to prevent overflow
      resultData[i] = Math.min(255, Math.floor(texData[i] * shade)); // R
      resultData[i + 1] = Math.min(255, Math.floor(texData[i + 1] * shade)); // G
      resultData[i + 2] = Math.min(255, Math.floor(texData[i + 2] * shade)); // B
      resultData[i + 3] = 255; // A (make opaque, since base frame is now transparent here)
    }

    // Apply backpack color if specified and backpack mask exists
    if (backpackData && backpackData[i] > 128) {
      if (backpackRGB) {
        // Apply solid color to backpack
        resultData[i] = backpackRGB.r; // R
        resultData[i + 1] = backpackRGB.g; // G
        resultData[i + 2] = backpackRGB.b; // B
        resultData[i + 3] = 255; // A (fully opaque)
      } else {
        // Keep backpack transparent (alpha already 0 from optimized base frame)
      }
    }

    // Overlay black lines on top
    if (linesData[i] > 128) {
      resultData[i] = 0; // R
      resultData[i + 1] = 0; // G
      resultData[i + 2] = 0; // B
      resultData[i + 3] = 255; // A (make opaque, since base frame is now transparent here)
    }
  }

  // Put the result back on canvas
  tempCtx.putImageData(baseImageData, 0, 0);

  // Cache this processed frame
  processedFrameCache[frameIndex] = tempCanvas;
  lastTextureUrl = textureUrl;
  lastBackpackColor = backpackColor;

  // Draw to preview canvas (scaled down to 128x128)
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  return tempCanvas;
}

// GIF Generation
generateBtn.addEventListener("click", generateGIF);

async function generateGIF() {
  if (isGenerating || !uploadedTexture || prerenderedFrames.base.length === 0)
    return;

  isGenerating = true;
  generateBtn.disabled = true;
  downloadBtn.style.display = "none";
  statusDiv.style.display = "block";
  statusDiv.className = "status processing";
  statusDiv.textContent = "Generating GIF... This may take a moment.";

  // Use bright magenta as transparent marker (very unlikely to appear in textures)
  const TRANSPARENT_COLOR = { r: 255, g: 0, b: 254 };

  // Create GIF encoder
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    workerScript: "gif.worker.js",
    transparent:
      (TRANSPARENT_COLOR.r << 16) |
      (TRANSPARENT_COLOR.g << 8) |
      TRANSPARENT_COLOR.b,
    repeat: 0, // 0 = loop forever
  });

  // Process all frames
  for (let i = 0; i < prerenderedFrames.base.length; i++) {
    const tempCanvas = processAndDrawFrame(uploadedTexture, i);

    // Create output canvas at emoji size with proper transparency handling
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = CANVAS_SIZE;
    outputCanvas.height = CANVAS_SIZE;
    const outputCtx = outputCanvas.getContext("2d", {
      willReadFrequently: true,
    });

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
    const progress = Math.round(((i + 1) / prerenderedFrames.base.length) * 50);
    statusDiv.textContent = `Processing frames... ${progress}%`;

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  statusDiv.textContent = "Encoding GIF... (50%)";

  // Render GIF
  gif.on("progress", (p) => {
    const progress = 50 + Math.round(p * 50);
    statusDiv.textContent = `Encoding GIF... ${progress}%`;
  });

  gif.on("finished", (blob) => {
    const url = URL.createObjectURL(blob);

    // Convert blob to data URL for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const timestamp = Date.now();

      // Add to grid
      addGifToGrid(dataUrl, timestamp);

      // Update cache
      updateCachedGifs();
    };
    reader.readAsDataURL(blob);

    // Hide download button since we now have individual download buttons
    downloadBtn.style.display = "none";

    // Hide status when done
    statusDiv.className = "status";
    statusDiv.textContent = "";
    statusDiv.style.display = "none";

    isGenerating = false;
    generateBtn.disabled = false;
  });

  gif.on("abort", () => {
    statusDiv.style.display = "block";
    statusDiv.className = "status";
    statusDiv.textContent = "GIF generation was aborted.";
    isGenerating = false;
    generateBtn.disabled = false;
  });

  try {
    gif.render();
  } catch (error) {
    console.error("GIF render error:", error);
    statusDiv.style.display = "block";
    statusDiv.className = "status";
    statusDiv.textContent = "Error generating GIF. Check console for details.";
    isGenerating = false;
    generateBtn.disabled = false;
  }
}
