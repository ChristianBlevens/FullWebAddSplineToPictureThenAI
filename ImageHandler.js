// Image Handler module - Centralizes image processing for both camera and file uploads
const ImageHandlerModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration
    const CONFIG = {
        IMAGE_QUALITY: 0.9,
        CROP_SQUARE: true
    };
    
    // Process an image from any source (camera or file upload)
    const handleImage = (imageDataUrl) => {
        // Store the raw image
        state.rawImage = imageDataUrl;
        
        // Apply processing (cropping if needed)
        if (CONFIG.CROP_SQUARE) {
            cropImageToSquare(imageDataUrl, (croppedImage) => {
                // Store the processed image for further use
                state.fullResImage = croppedImage;
                
                // Process the image with the ImageProcessing module
                if (typeof window.processImage === 'function') {
                    window.processImage(state.fullResImage);
                } else {
                    console.error('processImage function not found');
                    alert('Image processing function unavailable. Please refresh the page and try again.');
                }
            });
        } else {
            // Use image as-is if no cropping needed
            state.fullResImage = imageDataUrl;
            
            // Process the image with the ImageProcessing module
            if (typeof window.processImage === 'function') {
                window.processImage(state.fullResImage);
            } else {
                console.error('processImage function not found');
                alert('Image processing function unavailable. Please refresh the page and try again.');
            }
        }
    };
    
    // Crop image to square (can be used by both camera and file upload)
    const cropImageToSquare = (imageUrl, callback) => {
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
            const croppedImage = canvas.toDataURL('image/jpeg', CONFIG.IMAGE_QUALITY);
            callback(croppedImage);
        };
        
        img.onerror = () => {
            console.error('Failed to load image for cropping');
            alert('Failed to process the image. Please try again.');
        };
        
        img.src = imageUrl;
    };
    
    // Public API
    return {
        // Main handler for images from any source
        handleImage: handleImage,
        
        // Utility functions that might be used directly
        cropImageToSquare: cropImageToSquare
    };
})();

// Export to global
window.ImageHandlerModule = ImageHandlerModule;
window.handleImage = ImageHandlerModule.handleImage;
window.cropImageToSquare = ImageHandlerModule.cropImageToSquare;