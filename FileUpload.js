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
            // Show preview first
            showImagePreview(event.target.result);
        };
        
        reader.onerror = () => {
            console.error('Error reading file');
            alert('Failed to read the selected file. Please try again.');
        };
        
        reader.readAsDataURL(file);
    };
    
    // Display the image preview
    const showImagePreview = (imageDataUrl) => {
        elements.previewImage.src = imageDataUrl;
        elements.previewImage.classList.remove('hidden');
        elements.fileUploadPlaceholder.classList.add('hidden');
        elements.useImageBtn.classList.remove('hidden');
        
        // Store the raw image for later use
        state.rawFileImage = imageDataUrl;
    };
    
    // Use the uploaded image
    const useUploadedImage = () => {
        // Process the image using our centralized handler
        if (typeof window.handleImage === 'function') {
            window.handleImage(state.rawFileImage);
        } else {
            console.error('handleImage function not found');
            alert('Image processing function unavailable. Please refresh the page and try again.');
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