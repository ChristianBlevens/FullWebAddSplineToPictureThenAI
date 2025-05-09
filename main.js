// Main application module using IIFE pattern for encapsulation
const ChristmasLightsApp = (function() {
    // Private state object with proper initialization
    const appState = {
        // App mode and input settings
        mode: 'camera',  // 'camera' or 'file'
        stream: null,
        processing: false,
        inEnhanceMode: false,

        // Image data
        fullResImage: null,  // Original full resolution image
        lowResImage: null,   // Resized image for processing (400x400)
        depthMap: null,      // Depth data from server
        lineData: null,      // Line detection data
        enhancedImage: null, // Final enhanced image
        
        // Spline and drawing data
        splines: [],        // Array of splines, each spline is array of points [{x,y}, {x,y}]
        activeSplineIndex: -1, // Index of current active spline
        lastClickedPoint: null, // Used for tracking if we clicked on existing point
        
        // Advanced data structures (initialized later)
        dataStructure: null, // For points, splines, and networks
        actionHistory: null, // For undo functionality
        splineCreation: null, // For spline creation state

        // Depth and visual settings
        averageDepth: 0.5,   // Default average depth value
        depthSamples: [],    // Array to store all depth samples for averaging
        
        // Animation settings
		playAnimations: true, // Animation state - true means animations are playing
        showSplines: true,    // Splines visibility state - true means splines are visible
        animatingLights: true, // Always animating lights
        animationId: null,
        animationSpeed: 1.0,  // Default animation speed
        densityFactor: 1.0,   // Default density factor for lights
        glowSizeFactor: 1,    // Default glow size factor for light glow effects
        cycleLength: 10,      // Default number of lights before color cycle resets
        
        // Color settings
        colorMarkers: [],      // Array of {y, color} objects for color timing
        activeColorMarkerIndex: -1, // For color picker
        colorPickerPosition: null   // For positioning the color picker
    };
    
    // Cache for DOM elements to avoid repeated lookups
    let domElements = null;
    
    // Initialize advanced data structures
    const initializeDataStructures = () => {
        // Data structure for points and splines
        appState.dataStructure = {
            nextPointId: 1,       // Auto-incrementing ID for points
            nextSplineId: 1,      // Auto-incrementing ID for splines
            points: {},           // Map of pointId -> {id, x, y}
            splines: {},          // Map of splineId -> {id, pointIds: []}
            networks: [],         // Array of spline network objects
            pointsInUse: {},      // Map of pointId -> count of splines using the point
            selectedPointId: null // Currently selected point
        };
        
        // Action history for undo functionality
        appState.actionHistory = [];
        
        // Spline creation state
        appState.splineCreation = {
            activeSplineId: null,        // Currently active spline for addition
            justCreatedNewSpline: false  // Flag to track if we just created a new spline
        };
    };
    
    // Image utility functions
    const imageUtils = {
        // Crop an image to a square
        cropImageToSquare: (imageUrl, callback) => {
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
        },
        
        // Create a resized version of an image
        createResizedVersion: (img, targetWidth, targetHeight) => {
            // Create a resized version with exact dimensions
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            const ctx = canvas.getContext('2d');
            // Draw the image to the target size (stretching/squashing as needed)
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            return canvas.toDataURL('image/jpeg', 0.8);
        }
    };
    
    // Server communication functions
    const serverUtils = {
        // Preload cloud run servers to improve initial performance
        preloadCloudRunServers: () => {
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
    };
    
    // Color management functions
    const colorUtils = {
        // Initialize with default colors
        initializeDefaultColors: () => {
            // Add some default color markers
            addColorMarker(0, '#ff0000');     // Red at top
            addColorMarker(50, '#0000ff');    // Blue at middle
            addColorMarker(100, '#ff0000');   // Red at bottom
        }
    };
    
    // Initialize the app
    const initialize = () => {
        // Initialize elements cache - this should happen first
        if (!domElements) {
            domElements = initDomElements();
        }
        
        // Only proceed if we have valid elements
        if (!domElements) {
            console.error('Failed to initialize DOM elements');
            return;
        }
        
        // Initialize advanced data structures
        initializeDataStructures();
        
        // Preload server resources
        serverUtils.preloadCloudRunServers();
        
        // Initialize canvas contexts if needed
        if (!domElements.lightsCtx && domElements.lightsOverlayCanvas) {
            domElements.lightsCtx = domElements.lightsOverlayCanvas.getContext('2d');
        }
        
        console.log('Christmas Lights App initialized');
    };
    
    // Updated DOM element initialization with error handling
    const initDomElements = () => {
        const elements = {};
        
        // Define all element IDs to retrieve
        const elementIds = [
            'cameraTab', 'fileTab', 'cameraView', 'fileView', 'editorView', 'resultsContainer',
            'video', 'cameraPlaceholder', 'startCameraBtn', 'takePictureBtn',
            'fileInput', 'previewImage', 'fileUploadPlaceholder', 'useImageBtn',
            'canvas', 'processingOverlay', 'instructions',
            'depthOverlayCanvas', 'lineOverlayCanvas', 'lightsOverlayCanvas',
            'densitySlider', 'colorBar', 'colorPickerOverlay', 'colorPickerInput',
            'selectColorBtn', 'cancelColorBtn', 'speedSlider', 'glowSizeSlider',
            'enhancedImage', 'undoBtn', 'clearBtn', 'enhanceBtn', 'toggleAnimationBtn', 
			'toggleSplinesBtn', 'downloadBtn', 'resetBtn', 'editorButtons', 'depthToggleBtn', 
			'lineToggleBtn'
        ];
        
        // Get each element, but don't fail if some are missing
        elementIds.forEach(id => {
            elements[id] = document.getElementById(id);
            if (!elements[id]) {
                console.warn(`Element with ID '${id}' not found, this might cause issues.`);
            }
        });
        
        // Add canvas contexts which need to be initialized after getting elements
        if (elements.canvas) {
            elements.ctx = elements.canvas.getContext('2d');
        }
        
        return elements;
    };
    
    // Public API
    return {
        // Initialize the app (called on DOMContentLoaded)
        init: initialize,
        
        // State management (getters only - use specific methods to modify state)
        getState: () => ({ ...appState }),
        
        // DOM element access 
        getElements: () => domElements,
        
        // Utility functions made available to other modules
        utils: {
            image: imageUtils,
            server: serverUtils,
            color: colorUtils
        }
    };
})();

// Export global objects for compatibility with existing code
window.state = ChristmasLightsApp.getState();
window.elements = ChristmasLightsApp.getElements();

// Add this code at the end of main.js (replace the existing DOMContentLoaded listener)
document.addEventListener('DOMContentLoaded', () => {
    // First initialize the app
    ChristmasLightsApp.init();
    
    // Then expose the required globals
    window.state = ChristmasLightsApp.getState();
    window.elements = ChristmasLightsApp.getElements();
    
    // Now that globals are available, load the other scripts dynamically
    // This ensures they execute after the globals are defined
    const scripts = [
        'Sliders.js',
        'ColorBar.js',
        'TabNavigation.js',
		'ImageHandler.js',
        'CameraFunctions.js',
        'FileUpload.js',
        'ImageProcessing.js',
        'DrawingFunctions.js',
        'ChristmasLights.js',
        'EnhanceImage.js',
        'ResetApp.js'
    ];
    
    // Load scripts in sequence to preserve execution order
    let sequence = Promise.resolve();
    scripts.forEach(scriptName => {
        sequence = sequence.then(() => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = scriptName;
                script.onload = resolve;
                document.body.appendChild(script);
            });
        });
    });
});