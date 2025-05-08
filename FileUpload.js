// File Upload module
const FileUploadModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration
    const CONFIG = {
        ACCEPTED_TYPES: 'image/*',
        IMAGE_QUALITY: 0.9
    };
    
    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        
        // Validate file
        if (!isValidFile(file)) {
            alert('Please select a valid image file.');
            return;
        }
        
        // Read the file and process it
        readAndProcessFile(file);
    };
    
    // Validate that the file is an acceptable image
    const isValidFile = (file) => {
        return file && file.type.match(CONFIG.ACCEPTED_TYPES);
    };
    
    // Read the file and process it for display
    const readAndProcessFile = (file) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            // Crop the image to square before showing the preview
            cropImageToSquare(event.target.result, showImagePreview);
        };
        
        reader.onerror = () => {
            console.error('Error reading file');
            alert('Failed to read the selected file. Please try again.');
        };
        
        reader.readAsDataURL(file);
    };
    
    // Crop image to square (using the utility from main.js)
    const cropImageToSquare = (imageUrl, callback) => {
        // If we have access to the utility, use it
        if (typeof window.ChristmasLightsApp !== 'undefined' && 
            window.ChristmasLightsApp.utils && 
            window.ChristmasLightsApp.utils.image &&
            window.ChristmasLightsApp.utils.image.cropImageToSquare) {
            
            window.ChristmasLightsApp.utils.image.cropImageToSquare(imageUrl, callback);
        } else {
            // Fallback to original implementation
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
                alert('Failed to process the image. Please try another file.');
            };
            
            img.src = imageUrl;
        }
    };
    
    // Display the image preview
    const showImagePreview = (croppedImage) => {
        elements.previewImage.src = croppedImage;
        elements.previewImage.classList.remove('hidden');
        elements.fileUploadPlaceholder.classList.add('hidden');
        elements.useImageBtn.classList.remove('hidden');
    };
    
    // Use the uploaded image
    const useUploadedImage = () => {
        state.fullResImage = elements.previewImage.src;
        
        // Check if processImage is available (should be from ImageProcessing.js)
        if (typeof processImage === 'function') {
            processImage(state.fullResImage);
        } else {
            console.error('processImage function not found');
            alert('Something went wrong. Please refresh the page and try again.');
        }
    };
    
    // Initialize event listeners
    const initEventListeners = () => {
        // File input change event
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', handleFileSelect);
        }
        
        // Use image button click event
        if (elements.useImageBtn) {
            elements.useImageBtn.addEventListener('click', useUploadedImage);
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initEventListeners();
        },
        
        // Exposed for potential direct usage
        handleFileSelect: handleFileSelect,
        useUploadedImage: useUploadedImage
    };
})();

// Initialize and expose module
FileUploadModule.init();
window.FileUploadModule = FileUploadModule;