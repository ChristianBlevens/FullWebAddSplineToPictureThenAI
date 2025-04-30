// App State
const state = {
    mode: 'camera', // 'camera' or 'file'
    stream: null,
    splines: [], // Array of splines, each spline is array of points [{x,y}, {x,y}]
    activeSplineIndex: -1, // Index of current active spline
    fullResImage: null, // Original full resolution image
    lowResImage: null, // Resized image for processing
    depthMap: null,
    lineMap: null,
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
    animationSpeed: 1.0 // Default animation speed (new)
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
    
    // New Control Elements
    densitySlider: document.getElementById('densitySlider'),
    colorBar: document.getElementById('colorBar'),
    colorPickerOverlay: document.getElementById('colorPickerOverlay'),
    colorPickerInput: document.getElementById('colorPickerInput'),
    selectColorBtn: document.getElementById('selectColorBtn'),
    cancelColorBtn: document.getElementById('cancelColorBtn'),
    speedSlider: document.getElementById('speedSlider'),
    
    // Maps
    mapsContainer: document.getElementById('mapsContainer'),
    depthMapImage: document.getElementById('depthMapImage'),
    lineMapImage: document.getElementById('lineMapImage'),
    
    // Results
    enhancedImage: document.getElementById('enhancedImage'),
    
    // Buttons
    undoBtn: document.getElementById('undoBtn'),
    clearBtn: document.getElementById('clearBtn'),
    enhanceBtn: document.getElementById('enhanceBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn')
};

// Initialize canvas context
const ctx = elements.canvas.getContext('2d');

// Initialize with default colors
function initializeDefaultColors() {
    // Add some default color markers
    addColorMarker(0, '#ff0000');     // Red at top
    addColorMarker(50, '#00ff00');    // Green at middle
    addColorMarker(100, '#0000ff');   // Blue at bottom
    addColorMarker(25, '#ffff00');    // Yellow at 25%
    addColorMarker(75, '#ff00ff');    // Magenta at 75%
}