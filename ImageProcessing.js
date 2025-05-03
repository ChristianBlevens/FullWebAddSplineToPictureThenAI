// Add toggle events
depthToggleBtn.addEventListener('click', toggleDepthMap);
lineToggleBtn.addEventListener('click', toggleLineData);

// Server URLs
const DEPTH_MAP_SERVER_URL = 'http://localhost:8080/api/depth';
const LINE_DATA_SERVER_URL = 'http://localhost:8081/api/lines';

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
            //console.error('Error processing image:', error);
            
            // Fallback to placeholder data if servers fail
            state.depthMap = createFillerDepthMap();
            state.lineData = {
                "lines": [
                    {
                        "x1": 100,
                        "y1": 100,
                        "x2": 300,
                        "y2": 300,
                        "score": 0.9
                    }
                ],
                "width": 400,
                "height": 400
            };
            
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
    
    if (state.depthMap && state.depthMap.depth) {
        // If we have depth data from server (pixels array)
        // Convert server response to visual display
        const width = state.depthMap.width || 400;
        const height = state.depthMap.height || 400;
        const pixels = state.depthMap.depth;
        
        // Create a temporary canvas for the data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Create imageData
        const imageData = tempCtx.createImageData(width, height);
        
        for (let i = 0; i < pixels.length; i++) {
            // Convert depth value (0-1) to grayscale
            const value = Math.floor(pixels[i] * 255);
            
            // RGBA for each pixel in the imageData
            imageData.data[i * 4] = value;     // R
            imageData.data[i * 4 + 1] = value; // G
            imageData.data[i * 4 + 2] = value; // B
            imageData.data[i * 4 + 3] = 200;   // A (semi-transparent)
        }
        
        // Put the imageData on the temporary canvas
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
    
    // Scale factor to convert from original image size to our canvas size
    const canvasWidth = elements.lineOverlayCanvas.width;
    const canvasHeight = elements.lineOverlayCanvas.height;
    const origWidth = state.lineData.width || 400;
    const origHeight = state.lineData.height || 400;
    const scaleX = canvasWidth / origWidth;
    const scaleY = canvasHeight / origHeight;
    
    // Check if we have the expected data structure
    if (state.lineData.lines && Array.isArray(state.lineData.lines)) {
        // Draw each line
        state.lineData.lines.forEach((line, index) => {
            // Generate a color based on the index for visual variety
            const hue = (index * 137) % 360; // Golden angle in degrees ensures good color distribution
            lineCtx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            lineCtx.fillStyle = lineCtx.strokeStyle;
            lineCtx.lineWidth = 2;
            
            // Draw line between x1,y1 and x2,y2
            lineCtx.beginPath();
            lineCtx.moveTo(line.x1 * scaleX, line.y1 * scaleY);
            lineCtx.lineTo(line.x2 * scaleX, line.y2 * scaleY);
            lineCtx.stroke();
            
            // Draw circles at endpoints
            // Start point
            lineCtx.beginPath();
            lineCtx.arc(line.x1 * scaleX, line.y1 * scaleY, 5, 0, Math.PI * 2);
            lineCtx.fill();
            
            // End point
            lineCtx.beginPath();
            lineCtx.arc(line.x2 * scaleX, line.y2 * scaleY, 5, 0, Math.PI * 2);
            lineCtx.fill();
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
    // Return structured data that mimics the server response
    return {
        "depth": new Array(400 * 400).fill(1), // All white (value of 1)
        "width": 400,
        "height": 400
    };
}