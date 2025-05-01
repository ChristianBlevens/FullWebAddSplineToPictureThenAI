// Add toggle events
depthToggleBtn.addEventListener('click', toggleDepthMap);
lineToggleBtn.addEventListener('click', toggleLineData);

// Server URLs
const DEPTH_MAP_SERVER_URL = 'https://your-depth-map-server.com/api/depth';
const LINE_DATA_SERVER_URL = 'https://your-line-data-server.com/api/lines';

function processImage(imageUrl) {
    // Show editor view and hide input views
    elements.cameraView.classList.add('hidden');
    elements.fileView.classList.add('hidden');
    elements.editorView.classList.remove('hidden');
    elements.resultsContainer.classList.add('hidden');
    
    // Hide the title and tab navigation when entering editing view
    const appTitle = document.querySelector('h1');
    const tabContainer = document.querySelector('.tab-container');
    
    if (appTitle) appTitle.classList.add('hidden');
    if (tabContainer) tabContainer.classList.add('hidden');
    
    // Show processing overlay
    elements.processingOverlay.classList.remove('hidden');
    state.processing = true;
    
    // Initialize the default color markers
    initializeDefaultColors();
    
    // Load and resize image for the canvas
    const img = new Image();
    img.onload = async () => {
        // Create a 400x400 version for processing
        state.lowResImage = createResizedVersion(img, 400, 400);
        
        try {
            // Get depth map and line data from servers in parallel
            const [depthMap, lineData] = await Promise.all([
                fetchDepthMap(state.lowResImage),
                fetchLineData(state.lowResImage)
            ]);
            
            // Store results
            state.depthMap = depthMap;
            state.lineData = lineData;
            
            // Initialize canvas with 1000x1000 image
            initializeCanvas(imageUrl, 1000, 1000);
            
            // Hide processing overlay
            elements.processingOverlay.classList.add('hidden');
            state.processing = false;
            
            // Setup event listeners on the canvas (if needed)
            setupCanvasListeners();
            
            // Start in drawing mode automatically
            startLightsAnimation();
        } catch (error) {
            console.error('Error processing image:', error);
            
            // Fallback to placeholder data if servers fail
            state.depthMap = createFillerDepthMap();
            state.lineData = {"lines":[[{"x":300,"y":300},{"x":100,"y":100}]]};
            
            // Initialize canvas with fallback data
            initializeCanvas(imageUrl, 1000, 1000);
            
            // Hide processing overlay
            elements.processingOverlay.classList.add('hidden');
            state.processing = false;
            
            // Setup event listeners and start animation
            setupCanvasListeners();
            startLightsAnimation();
            
            // Show alert to user
            alert('Could not connect to processing servers. Using basic mode instead.');
        }
    };
    
    img.src = imageUrl;
}

// Function to fetch depth map from server
async function fetchDepthMap(imageDataUrl) {
    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    
    // Send image to depth map server
    const response = await fetch(DEPTH_MAP_SERVER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Data })
    });
    
    if (!response.ok) {
        throw new Error(`Depth map server error: ${response.status}`);
    }
    
    return await response.json();
}

// Function to fetch line data from server
async function fetchLineData(imageDataUrl) {
    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    
    // Send image to line data server
    const response = await fetch(LINE_DATA_SERVER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Data })
    });
    
    if (!response.ok) {
        throw new Error(`Line data server error: ${response.status}`);
    }
    
    return await response.json();
}

function createResizedVersion(img, targetWidth, targetHeight) {
    // Create a resized version with exact dimensions
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    // Draw the image to the target size (stretching/squashing as needed)
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    return canvas.toDataURL('image/jpeg', 0.8);
}

function initializeCanvas(imageUrl, targetWidth, targetHeight) {
    const img = new Image();
    img.onload = () => {
        // Set canvas to the target size
        elements.canvas.width = targetWidth;
        elements.canvas.height = targetHeight;
        elements.lightsOverlayCanvas.width = targetWidth;
        elements.lightsOverlayCanvas.height = targetHeight;
        elements.depthOverlayCanvas.width = targetWidth;
        elements.depthOverlayCanvas.height = targetHeight;
        elements.lineOverlayCanvas.width = targetWidth;
        elements.lineOverlayCanvas.height = targetHeight;
        
        // Draw image to canvas at the target size
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // Initialize overlay canvases
        initializeDepthMap();
        initializeLineData();
    };
    
    img.src = imageUrl;
}

// Clear the lights overlay canvas
function clearLightsOverlay() {
    if (elements.lightsCtx) {
        elements.lightsCtx.clearRect(0, 0, elements.lightsOverlayCanvas.width, elements.lightsOverlayCanvas.height);
    }
}

// Initialize the depth map display
function initializeDepthMap() {
    const depthCtx = elements.depthOverlayCanvas.getContext('2d');
    depthCtx.clearRect(0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
    
    if (typeof state.depthMap === 'string') {
        // If depthMap is a data URL, draw it directly
        const img = new Image();
        img.onload = () => {
            depthCtx.drawImage(img, 0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
            // Apply semi-transparent overlay
            depthCtx.globalAlpha = 0.5;
            depthCtx.fillStyle = 'blue';
            depthCtx.fillRect(0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
            depthCtx.globalAlpha = 1.0;
        };
        img.src = state.depthMap;
    } else if (state.depthMap.depth) {
        // If we have depth data from server (pixels array)
        // Convert server response to visual display
        const imageData = depthCtx.createImageData(400, 400);
        const pixels = state.depthMap.depth;
        
        for (let i = 0; i < pixels.length; i++) {
            // Convert depth value (0-1) to grayscale
            const value = Math.floor(pixels[i] * 255);
            
            // RGBA for each pixel in the imageData
            imageData.data[i * 4] = value;     // R
            imageData.data[i * 4 + 1] = value; // G
            imageData.data[i * 4 + 2] = value; // B
            imageData.data[i * 4 + 3] = 128;   // A (semi-transparent)
        }
        
        // Create a temporary canvas for the 400x400 data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 400;
        tempCanvas.height = 400;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw to our full-sized overlay canvas
        depthCtx.drawImage(tempCanvas, 0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
    } else {
        // Fallback to a simple depth map
        depthCtx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        depthCtx.fillRect(0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
    }
}

// Initialize line data display
function initializeLineData() {
    // Draw line data
    drawLineData();
}

function drawLineData() {
    if (!elements.lineOverlayCanvas || !state.lineData) return;
    
    const lineCtx = elements.lineOverlayCanvas.getContext('2d');
    lineCtx.clearRect(0, 0, elements.lineOverlayCanvas.width, elements.lineOverlayCanvas.height);
    
    // Scale factor to convert from 400x400 to 1000x1000
    const scale = elements.lineOverlayCanvas.width / 400;
    
    // Check if we have the expected data structure
    if (state.lineData.lines && Array.isArray(state.lineData.lines)) {
        // Draw each line
        state.lineData.lines.forEach(line => {
            if (Array.isArray(line) && line.length >= 2) {
                // Draw line between points
                lineCtx.beginPath();
                lineCtx.moveTo(line[0].x * scale, line[0].y * scale);
                lineCtx.lineTo(line[1].x * scale, line[1].y * scale);
                lineCtx.strokeStyle = 'orange';
                lineCtx.lineWidth = 2;
                lineCtx.stroke();
                
                // Draw points
                line.forEach(point => {
                    lineCtx.beginPath();
                    lineCtx.arc(point.x * scale, point.y * scale, 5, 0, Math.PI * 2);
                    lineCtx.fillStyle = 'orange';
                    lineCtx.fill();
                });
            }
        });
    }
}

function toggleDepthMap() {
    const isVisible = !elements.depthOverlayCanvas.classList.contains('hidden');
    
    if (isVisible) {
        // Hide depth map
        elements.depthOverlayCanvas.classList.add('hidden');
    } else {
        // Show depth map
        elements.depthOverlayCanvas.classList.remove('hidden');
    }
}

function toggleLineData() {
    const isVisible = !elements.lineOverlayCanvas.classList.contains('hidden');
    
    if (isVisible) {
        // Hide line data
        elements.lineOverlayCanvas.classList.add('hidden');
    } else {
        // Show line data
        elements.lineOverlayCanvas.classList.remove('hidden');
    }
}

// Create filler depth map (all white = value of 1)
function createFillerDepthMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; // Value of 1
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL();
}