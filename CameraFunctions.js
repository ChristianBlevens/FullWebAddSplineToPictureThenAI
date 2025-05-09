// Camera functions module
const CameraModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration
    const CONFIG = {
        CAMERA_CONSTRAINTS: {
            video: {
                facingMode: 'environment',
                width: { ideal: 1000 },
                height: { ideal: 1000 }
            }
        },
        IMAGE_QUALITY: 0.9
    };
    
    // Start the camera
    const startCamera = async () => {
        try {
            // Request camera access
            state.stream = await navigator.mediaDevices.getUserMedia(CONFIG.CAMERA_CONSTRAINTS);
            
            // Update UI
            updateUIForActiveCamera();
            
            // Start video playback
            await elements.video.play();
        } catch (err) {
            console.error('Camera access error:', err);
            handleCameraError(err);
        }
    };
    
    // Update UI when camera is active
    const updateUIForActiveCamera = () => {
        elements.video.srcObject = state.stream;
        elements.video.classList.remove('hidden');
        elements.cameraPlaceholder.classList.add('hidden');
        elements.takePictureBtn.classList.remove('hidden');
        elements.startCameraBtn.classList.add('hidden');
    };
    
    // Handle camera access errors
    const handleCameraError = (err) => {
        let errorMessage = 'Could not access camera';
        
        // Provide more specific error messages based on error type
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = 'Camera access was denied. Please allow camera access to use this feature.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'No camera found on your device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = 'Your camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
            errorMessage = 'Camera constraints not satisfied. Please try a different device.';
        } else if (err.message) {
            errorMessage = `Could not access camera: ${err.message}`;
        }
        
        alert(errorMessage);
    };
    
    // Stop the camera
    const stopCamera = () => {
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
            state.stream = null;
        }
        
        updateUIForInactiveCamera();
    };
    
    // Update UI when camera is inactive
    const updateUIForInactiveCamera = () => {
        elements.video.srcObject = null;
        elements.video.classList.add('hidden');
        elements.cameraPlaceholder.classList.remove('hidden');
        elements.takePictureBtn.classList.add('hidden');
        elements.startCameraBtn.classList.remove('hidden');
    };
    
    // Capture an image from the video stream
    const captureImage = () => {
        // Check if video is ready
        if (!elements.video.videoWidth || !elements.video.videoHeight) {
            alert('Camera not ready yet. Please try again in a moment.');
            return;
        }
        
        // Create a temporary canvas to capture the video frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = elements.video.videoWidth;
        tempCanvas.height = elements.video.videoHeight;
        
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(elements.video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Get the full resolution image data
        const fullImage = tempCanvas.toDataURL('image/jpeg', CONFIG.IMAGE_QUALITY);
        
        // Stop the camera
        stopCamera();
        
        // Process the captured image using our centralized handler
        if (typeof window.handleImage === 'function') {
            window.handleImage(fullImage);
        } else {
            console.error('handleImage function not found');
            alert('Image processing function unavailable. Please refresh the page and try again.');
        }
    };
    
    // Initialize event listeners
    const initEventListeners = () => {
        // Start camera button
        if (elements.startCameraBtn) {
            elements.startCameraBtn.addEventListener('click', startCamera);
        }
        
        // Take picture button
        if (elements.takePictureBtn) {
            elements.takePictureBtn.addEventListener('click', captureImage);
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initEventListeners();
        },
        
        // Camera control functions exposed for other modules
        startCamera: startCamera,
        stopCamera: stopCamera,
        captureImage: captureImage
    };
})();

// Initialize and expose module
CameraModule.init();
window.CameraModule = CameraModule;

// Expose functions to global namespace for compatibility
window.startCamera = CameraModule.startCamera;
window.stopCamera = CameraModule.stopCamera;
window.captureImage = CameraModule.captureImage;