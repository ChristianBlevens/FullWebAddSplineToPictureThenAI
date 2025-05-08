// Image processing module
const ImageProcessingModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration 
    const CONFIG = {
        // Server URLs stored in one place for easy management
        DEPTH_MAP_SERVER_URL: 'https://depth-map-service-848649041437.us-west1.run.app/api/depth',
        LINE_DATA_SERVER_URL: 'https://line-detection-service-888356138865.us-west1.run.app/api/lines',
        
        // Processing parameters
        PROCESSING_IMAGE_SIZE: 400, // Size for server processing
        CANVAS_SIZE: 1000,         // Size for editing canvas
        OVERLAY_ALPHA: 200,        // Alpha value for overlays (0-255)
        RETRY_ATTEMPTS: 2,         // Number of server retry attempts
        RETRY_DELAY: 1000          // Delay between retries in ms
    };
    
    // Process an image and prepare it for editing
    const processImage = (imageUrl) => {
        // Update UI to show processing state
        updateUIForProcessing();
        
        // Initialize the default color markers
        window.ColorBarModule.initializeDefaultColors();
        
        // Load and resize image for the canvas
        const img = new Image();
        img.onload = async () => {
            try {
                // Create a resized version for processing
                state.lowResImage = createResizedVersion(img, CONFIG.PROCESSING_IMAGE_SIZE, CONFIG.PROCESSING_IMAGE_SIZE);
                
                // Get depth map and line data from servers in parallel
                const [depthMap, lineData] = await Promise.all([
                    fetchDepthMapWithRetry(state.lowResImage),
                    fetchLineDataWithRetry(state.lowResImage)
                ]);
                
                // Store results
                state.depthMap = depthMap;
                state.lineData = lineData;
                
                // Initialize canvas with processed data
                initializeCanvas(imageUrl, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
                
                // Hide processing overlay and update UI
                updateUIAfterProcessing();
                
                // Setup event listeners on the canvas
                setupCanvasListeners();
                
                // Start in drawing mode automatically
                startLightsAnimation();
            } catch (error) {
                console.error('Error processing image:', error);
                
                // Handle error gracefully with fallback data
                handleProcessingError(imageUrl);
            }
        };
        
        // Handle image loading errors
        img.onerror = () => {
            console.error('Failed to load image');
            handleProcessingError(imageUrl);
        };
        
        img.src = imageUrl;
    };
    
    // Update UI to show processing state
    const updateUIForProcessing = () => {
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
    };
    
    // Update UI after processing completes
    const updateUIAfterProcessing = () => {
        // Hide processing overlay
        elements.processingOverlay.classList.add('hidden');
        state.processing = false;
    };
    
    // Handle processing errors with fallback data
    const handleProcessingError = (imageUrl) => {
        // Create fallback data for depth and lines
        state.depthMap = createFillerDepthMap();
        state.lineData = {
            "lines": [],
            "width": CONFIG.PROCESSING_IMAGE_SIZE,
            "height": CONFIG.PROCESSING_IMAGE_SIZE
        };
        
        // Initialize canvas with fallback data
        initializeCanvas(imageUrl, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
        
        // Update UI and continue with app
        updateUIAfterProcessing();
        setupCanvasListeners();
        startLightsAnimation();
        
        // Show alert to user
        alert('Could not connect to processing servers. Using basic mode instead.');
    };
    
    // Fetch depth map from server with retry logic
    const fetchDepthMapWithRetry = async (imageDataUrl, attempt = 0) => {
        try {
            return await fetchDepthMap(imageDataUrl);
        } catch (error) {
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                console.warn(`Depth map fetch failed, retrying (${attempt + 1}/${CONFIG.RETRY_ATTEMPTS})...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                return fetchDepthMapWithRetry(imageDataUrl, attempt + 1);
            }
            throw error;
        }
    };
    
    // Fetch line data from server with retry logic
    const fetchLineDataWithRetry = async (imageDataUrl, attempt = 0) => {
        try {
            return await fetchLineData(imageDataUrl);
        } catch (error) {
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                console.warn(`Line data fetch failed, retrying (${attempt + 1}/${CONFIG.RETRY_ATTEMPTS})...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                return fetchLineDataWithRetry(imageDataUrl, attempt + 1);
            }
            throw error;
        }
    };
    
    // Function to fetch depth map from server
    const fetchDepthMap = async (imageDataUrl) => {
        // Extract base64 data from data URL
        const base64Data = imageDataUrl.split(',')[1];

        // Send image to depth map server
        const response = await fetch(CONFIG.DEPTH_MAP_SERVER_URL, {
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
    };
    
    // Function to fetch line data from server
    const fetchLineData = async (imageDataUrl) => {
        // Extract base64 data from data URL
        const base64Data = imageDataUrl.split(',')[1];
        
        // Send image to line data server
        const response = await fetch(CONFIG.LINE_DATA_SERVER_URL, {
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
    };
    
    // Create a resized version of an image
    const createResizedVersion = (img, targetWidth, targetHeight) => {
        // Create a resized version with exact dimensions
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        // Draw the image to the target size
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    };
    
    // Initialize the canvas with an image and set up overlays
    const initializeCanvas = (imageUrl, targetWidth, targetHeight) => {
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
            elements.ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            // Initialize overlay canvases
            initializeDepthMap();
            initializeLineData();
        };
        
        img.src = imageUrl;
    };
    
    // Initialize the depth map visualization
    const initializeDepthMap = () => {
        if (!state.depthMap || !elements.depthOverlayCanvas) return;
        
        const depthCtx = elements.depthOverlayCanvas.getContext('2d');
        depthCtx.clearRect(0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);

        // Convert server response to visual display
        const width = state.depthMap.width || CONFIG.PROCESSING_IMAGE_SIZE;
        const height = state.depthMap.height || CONFIG.PROCESSING_IMAGE_SIZE;
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
            imageData.data[i * 4 + 3] = CONFIG.OVERLAY_ALPHA; // A (semi-transparent)
        }
        
        // Put the imageData on the temporary canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw to our full-sized overlay canvas
        depthCtx.drawImage(tempCanvas, 0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
    };
    
    // Initialize line data visualization
    const initializeLineData = () => {
        drawLineData();
    };
    
    // Draw line data on the line overlay canvas
    const drawLineData = () => {
        if (!elements.lineOverlayCanvas || !state.lineData) return;
        
        const lineCtx = elements.lineOverlayCanvas.getContext('2d');
        lineCtx.clearRect(0, 0, elements.lineOverlayCanvas.width, elements.lineOverlayCanvas.height);
        
        // Scale factor to convert from original image size to our canvas size
        const canvasWidth = elements.lineOverlayCanvas.width;
        const canvasHeight = elements.lineOverlayCanvas.height;
        const origWidth = state.lineData.width || CONFIG.PROCESSING_IMAGE_SIZE;
        const origHeight = state.lineData.height || CONFIG.PROCESSING_IMAGE_SIZE;
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
    };
    
    // Toggle depth map visibility
    const toggleDepthMap = () => {
        const isVisible = !elements.depthOverlayCanvas.classList.contains('hidden');
        
        if (isVisible) {
            // Hide depth map
            elements.depthOverlayCanvas.classList.add('hidden');
        } else {
            // Show depth map
            elements.depthOverlayCanvas.classList.remove('hidden');
        }
    };
    
    // Toggle line data visibility
    const toggleLineData = () => {
        const isVisible = !elements.lineOverlayCanvas.classList.contains('hidden');
        
        if (isVisible) {
            // Hide line data
            elements.lineOverlayCanvas.classList.add('hidden');
        } else {
            // Show line data
            elements.lineOverlayCanvas.classList.remove('hidden');
        }
    };
    
    // Create a filler depth map for fallback
    const createFillerDepthMap = () => {
        // Return structured data that mimics the server response
        return {
            "depth": new Array(CONFIG.PROCESSING_IMAGE_SIZE * CONFIG.PROCESSING_IMAGE_SIZE).fill(0.5),
            "width": CONFIG.PROCESSING_IMAGE_SIZE,
            "height": CONFIG.PROCESSING_IMAGE_SIZE
        };
    };
    
    // Set up event listeners for the module
    const initEventListeners = () => {
        // Add toggle events if elements exist
        if (elements.depthToggleBtn) {
            elements.depthToggleBtn.addEventListener('click', toggleDepthMap);
        }
        
        if (elements.lineToggleBtn) {
            elements.lineToggleBtn.addEventListener('click', toggleLineData);
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initEventListeners();
        },
        
        // Process an image to prepare it for editing
        processImage: processImage,
        
        // Toggle visualization overlays
        toggleDepthMap: toggleDepthMap,
        toggleLineData: toggleLineData,
        
        // Utility functions for other modules
        createResizedVersion: createResizedVersion,
        createFillerDepthMap: createFillerDepthMap
    };
})();

// Initialize and expose module
ImageProcessingModule.init();
window.ImageProcessingModule = ImageProcessingModule;

// Export functions to global namespace for compatibility
window.processImage = ImageProcessingModule.processImage;
window.toggleDepthMap = ImageProcessingModule.toggleDepthMap;
window.toggleLineData = ImageProcessingModule.toggleLineData;