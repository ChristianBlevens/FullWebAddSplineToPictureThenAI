// App State
const state = {
    mode: 'camera', // 'camera' or 'file'
    stream: null,
    splines: [], // Array of splines, each spline is array of points [{x,y}, {x,y}]
    activeSplineIndex: -1, // Index of current active spline
    fullResImage: null, // Original full resolution image
    lowResImage: null, // Resized image for processing (400x400)
    depthMap: null,
    lineData: null, // Changed from lineMap to lineData for clarity
    animatingLights: true, // Always animating lights
    animationId: null,
    processing: false,
    enhancedImage: null,
    lastClickedPoint: null, // Used for tracking if we clicked on existing point
    inEnhanceMode: false, // Flag to control UI state after enhance button is pressed
    densityFactor: 1.0, // Default density factor for lights (new)
    colorMarkers: [], // Array of {y, color} objects for color timing (new)
    activeColorMarkerIndex: -1, // For color picker (new)
    colorPickerPosition: null, // For positioning the color picker (new)
    animationSpeed: 1.0, // Default animation speed (new)
	cycleLength: 10, // Default number of lights before color cycle resets
    glowSizeFactor: 1.0 // Default glow size factor for light glow effects
};

// DOM Elements
const elements = {
    // Tabs
    cameraTab: document.getElementById('cameraTab'),
    fileTab: document.getElementById('fileTab'),
    
    // Views
    cameraView: document.getElementById('cameraView'),
    fileView: document.getElementById('fileView'),
    editorView: document.getElementById('editorView'),
    resultsContainer: document.getElementById('resultsContainer'),
    
    // Camera Elements
    video: document.getElementById('video'),
    cameraPlaceholder: document.getElementById('cameraPlaceholder'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    takePictureBtn: document.getElementById('takePictureBtn'),
    
    // File Elements
    fileInput: document.getElementById('fileInput'),
    previewImage: document.getElementById('previewImage'),
    fileUploadPlaceholder: document.getElementById('fileUploadPlaceholder'),
    useImageBtn: document.getElementById('useImageBtn'),
    
    // Editor Elements
    canvas: document.getElementById('canvas'),
    processingOverlay: document.getElementById('processingOverlay'),
    instructions: document.getElementById('instructions'),
    
    // Overlay Canvases (new)
    depthOverlayCanvas: document.getElementById('depthOverlayCanvas'),
	lineOverlayCanvas: document.getElementById('lineOverlayCanvas'),
	lightsOverlayCanvas: document.getElementById('lightsOverlayCanvas'),
	lightsCtx: null, // We'll initialize this in the init function
    
    // Control Elements
    densitySlider: document.getElementById('densitySlider'),
    colorBar: document.getElementById('colorBar'),
    colorPickerOverlay: document.getElementById('colorPickerOverlay'),
    colorPickerInput: document.getElementById('colorPickerInput'),
    selectColorBtn: document.getElementById('selectColorBtn'),
    cancelColorBtn: document.getElementById('cancelColorBtn'),
    speedSlider: document.getElementById('speedSlider'),
	glowSizeSlider: document.getElementById('glowSizeSlider'),
    
    // Results
    enhancedImage: document.getElementById('enhancedImage'),
    
    // Buttons
    undoBtn: document.getElementById('undoBtn'),
    clearBtn: document.getElementById('clearBtn'),
    enhanceBtn: document.getElementById('enhanceBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    editorButtons: document.getElementById('editorButtons'),
	depthToggleBtn: document.getElementById('depthToggleBtn'),
	lineToggleBtn: document.getElementById('lineToggleBtn')
};

// Initialize canvas context
const ctx = elements.canvas.getContext('2d');

// Initialize with default colors
function initializeDefaultColors() {
    // Add some default color markers
    addColorMarker(0, '#ff0000');     // Red at top
    addColorMarker(50, '#0000ff');    // Blue at middle
    addColorMarker(100, '#ff0000');   // Red at bottom
}

// Initialize the canvas contexts
function initializeCanvasContexts() {
    // Lights overlay context
    elements.lightsCtx = elements.lightsOverlayCanvas.getContext('2d');
    
    // Add click event to lights overlay
    elements.lightsOverlayCanvas.addEventListener('click', handleCanvasClick);
}

// Add this function to main.js
function cropImageToSquare(imageUrl, callback) {
    const img = new Image();
    img.onload = () => {
        // Create a square canvas
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Calculate center crop coordinates
        const sourceX = (img.width - size) / 2;
        const sourceY = (img.height - size) / 2;
        
        // Draw the center square of the image
        ctx.drawImage(img, sourceX, sourceY, size, size, 0, 0, size, size);
        
        // Return the cropped image
        const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
        callback(croppedImage);
    };
    
    img.src = imageUrl;
}

// Function to preload cloud run servers
function preloadCloudRunServers() {
    console.log("Preloading Cloud Run servers...");
    
    // URLs for the servers we need to warm up
    const serverUrls = [
        'https://depth-map-service-848649041437.us-west1.run.app/',
        'https://line-detection-service-888356138865.us-west1.run.app/'
    ];
    
    // Ping each server with a simple GET request
    serverUrls.forEach(url => {
        fetch(url, { 
            method: 'GET',
            mode: 'cors' // Enable CORS for cross-origin requests
        })
        .then(response => {
            console.log(`Server ${url} preloaded successfully`);
        })
        .catch(error => {
            console.warn(`Failed to preload server ${url}:`, error);
            // Non-blocking error - we don't want to stop the app if preloading fails
        });
    });
}

// Call this function early in the application lifecycle
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Canvas contexts (your existing code)
    initializeCanvasContexts();
    
    // Preload servers immediately
    preloadCloudRunServers();
});