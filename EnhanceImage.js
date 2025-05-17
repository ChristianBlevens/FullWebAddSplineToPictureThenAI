// Module for handling image enhancement with AI
const EnhanceModule = (function() {
    // Private variables
    const API_CONFIG = {
        STABILITY_API_URL: 'https://api.stability.ai/v2beta/stable-image/edit/replace-background-and-relight',
        LIGHT_REFERENCE_URL: 'https://i.imgur.com/TeSRpGV.png'
    };
    
    // API key should be handled securely in production
    // This implementation allows for future improvement where the key is retrieved 
    // from a secure source rather than being hardcoded
    let apiKey = null;
    
    // Private methods
    const getApiKey = () => {
        // In a production environment, this would retrieve the key from a secure source
        // For now, we're keeping compatibility with the original implementation
        // but structuring it for future improvement
        if (!apiKey) {
            // This should be replaced with a proper secure method in production
            // e.g. retrieving from a secure backend endpoint
            apiKey = 'sk-eigMc56xmNp8EzY3myDsCn4AHNYSnq3PBJ5xs8zG1g2qI3nO';
        }
        return apiKey;
    };
    
    // Calculates the average depth from collected samples
    const calculateAverageDepth = () => {
        if (state.depthSamples.length > 0) {
            const sum = state.depthSamples.reduce((total, depth) => total + depth, 0);
            state.averageDepth = sum / state.depthSamples.length;
            console.log(`Average depth calculated: ${state.averageDepth}`);
        }
    };
    
    // Creates a combined image with lights overlay
    const createCombinedImage = () => {
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = elements.canvas.width;
        combinedCanvas.height = elements.canvas.height;
        const combinedCtx = combinedCanvas.getContext('2d');
        
        // First draw the main canvas image
        combinedCtx.drawImage(elements.canvas, 0, 0);
        
        // Then draw the lights overlay on top
        combinedCtx.drawImage(elements.lightsOverlayCanvas, 0, 0);
        
        return combinedCanvas.toDataURL('image/jpeg', 0.9);
    };
    
    // Updates UI to show processing state
    const showProcessingState = (message) => {
        const processingText = elements.processingOverlay.querySelector('p');
        if (processingText) {
            processingText.textContent = message;
        }
        elements.processingOverlay.classList.remove('hidden');
        state.processing = true;
    };
    
    // Updates UI for enhancement mode
    const enterEnhanceMode = () => {
        // Adjust UI for enhance mode
        elements.undoBtn.classList.add('hidden');
        elements.clearBtn.classList.add('hidden');
        elements.enhanceBtn.classList.add('hidden');
        elements.depthToggleBtn.classList.add('hidden');
        elements.lineToggleBtn.classList.add('hidden');
		elements.toggleAnimationBtn.classList.add('hidden');
		elements.toggleSplinesBtn.classList.add('hidden');
		elements.toggleIndependentColorsBtn.classList.add('hidden');

        // Hide control sidebar
        document.querySelector('.control-sidebar').style.display = 'none';

        // Hide overlays
        elements.depthOverlayCanvas.classList.add('hidden');
        elements.lineOverlayCanvas.classList.add('hidden');
        elements.lightsOverlayCanvas.classList.add('hidden');

        // Remove crosshair cursor
        elements.canvas.classList.remove('crosshair');
    };
    
    // Handles the enhancement process
    const applyEnhancements = async () => {
        showProcessingState('Enhancing with AI... This may take a few seconds');
        
        // Create and store the combined image
        const combinedImage = createCombinedImage();
        state.combinedImage = combinedImage;
        
        try {
            // Set up progress indicator
            const updateProgressIndicator = setupProgressIndicator();
            
            // Send image to Stability AI API and wait for result
            const enhancedImageUrl = await sendToStabilityRelight(combinedImage);
            
            // Clear progress indicator
            updateProgressIndicator(false);
            
            // Display enhanced image
            await displayEnhancedImage(enhancedImageUrl);
            
            // Store the enhanced image for download
            state.enhancedImage = enhancedImageUrl;
            
            // Stop animation loop since we're replacing it
            stopLightsAnimation();
            
        } catch (error) {
            console.error('AI enhancement failed:', error);
            handleEnhancementFailure('AI enhancement failed. You can still download the non-enhanced image.');
        }
    };
    
    // Sets up a progress indicator with dots animation
    const setupProgressIndicator = () => {
        let progressCounter = 0;
        let isProcessing = true;
        const processingText = elements.processingOverlay.querySelector('p');
        
        const progressInterval = setInterval(() => {
            if (!isProcessing) {
                clearInterval(progressInterval);
                return;
            }
            
            progressCounter++;
            const dots = '.'.repeat(progressCounter % 4);
            if (processingText) {
                processingText.textContent = `Enhancing with AI${dots} This may take a few seconds`;
            }
        }, 1000);
        
        return (stillProcessing) => {
            isProcessing = stillProcessing;
            if (!stillProcessing) {
                clearInterval(progressInterval);
            }
        };
    };
    
    // Displays the enhanced image on the canvas
    const displayEnhancedImage = (imageUrl) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Clear the canvas entirely
                elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
                
                // Draw the enhanced image on the main canvas
                elements.ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
                
                // Update instructions
                elements.instructions.textContent = 'Your enhanced image is ready!';
                
                // Hide processing overlay
                elements.processingOverlay.classList.add('hidden');
                state.processing = false;
                
                // Now that we've captured and drawn the combined image, we can hide the overlay
                elements.lightsOverlayCanvas.classList.add('hidden');
                
                resolve();
            };
            img.src = imageUrl;
        });
    };
    
    // Handles API request to Stability AI
    const sendToStabilityRelight = async (imageDataUrl) => {
        // Extract base64 data from data URL
        const base64Data = imageDataUrl.split(',')[1];
        
        // Convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
        }
        const blob = new Blob([new Uint8Array(byteArrays)], { type: 'image/jpeg' });
        
        // Prepare the form data
        const formData = new FormData();
        formData.append('subject_image', blob, 'christmas-lights-photo.jpg');
        
        // Fetch the light reference image
        try {
            const lightReferenceResponse = await fetch(API_CONFIG.LIGHT_REFERENCE_URL);
            if (!lightReferenceResponse.ok) {
                throw new Error(`Failed to fetch light reference: ${lightReferenceResponse.status}`);
            }
            const lightReferenceBlob = await lightReferenceResponse.blob();
            formData.append('light_reference', lightReferenceBlob, 'Enhancement8.png');
        } catch (error) {
            console.error('Error fetching light reference:', error);
            throw error;
        }
        
        // Add parameters
        formData.append('background_prompt', "colorful, multi-color christmas lights, dark home at twilight, adorned with very vibrant Christmas lights in multiple colors twinkling along the roofline which are the only source of light, reflecting the colorful glow, cinematic lighting, 8k resolution");
        formData.append('foreground_prompt', "cloudy night sky, very bright multi-color christmas lights, breathtaking nightscape atmosphere, high dynamic range, perfect exposure, crystal clear, photorealistic, detailed, 8k resolution, professional photography");
        formData.append('negative_prompt', "dim lights, warm lamp light");
        formData.append('preserve_original_subject', '0.6');
        formData.append('original_background_depth', (state.averageDepth).toString());
        formData.append('keep_original_background', 'true');
        formData.append('light_source_strength', '1');
        formData.append('output_format', 'png');
        formData.append('seed', '0');
        
        // Send request with timeout handling
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 30000);
        
        try {
            const response = await fetch(API_CONFIG.STABILITY_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getApiKey()}`,
                    'Accept': 'application/json'
                },
                body: formData,
                signal: abortController.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Stability API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Parse the response to get the generation ID
            const responseData = await response.json();
            const generationId = responseData.id;
            
            if (!generationId) {
                throw new Error('No generation ID returned from API');
            }
            
            console.log(`Generation started with ID: ${generationId}`);
            
            // Poll for results
            return await pollForResults(generationId);
        } catch (error) {
            clearTimeout(timeout);
            console.error('API request error:', error);
            throw error;
        }
    };
    
    // Polls for results from the Stability API
    const pollForResults = async (generationId) => {
        const maxAttempts = 15;
        const pollingInterval = 2000;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`Polling for results (attempt ${attempts}/${maxAttempts}): https://api.stability.ai/v2beta/results/${generationId}`);
            
            try {
                const response = await fetch(`https://api.stability.ai/v2beta/results/${generationId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${getApiKey()}`,
                        'Accept': '*/*'
                    }
                });
                
                // If response is 202, it means the generation is still processing
                if (response.status === 202) {
                    console.log('Still processing, waiting to poll again...');
                    await new Promise(resolve => setTimeout(resolve, pollingInterval));
                    continue;
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Result polling error: ${response.status} ${response.statusText} - ${errorText}`);
                }
                
                // Generation complete, get the image data
                const imageBlob = await response.blob();
                return URL.createObjectURL(imageBlob);
                
            } catch (error) {
                console.error('Error polling for results:', error);
                throw error;
            }
        }
        
        throw new Error(`Timed out after ${maxAttempts} polling attempts`);
    };
    
    // Handles enhancement failures gracefully
    const handleEnhancementFailure = (message) => {
        // Display alert with error message
        alert(message);
        
        // Use the non-enhanced combined image
        displayEnhancedImage(state.combinedImage)
            .then(() => {
                // Update instructions
                elements.instructions.textContent = 'Non-enhanced image is ready for download';
            });
    };
    
    // Public methods
    return {
        // Main entry point for enhancement
        enhanceImage: function() {
            // Set enhance mode to disable further drawing
            state.inEnhanceMode = true;
            
            // Show processing overlay
            showProcessingState('Processing image...');
            
            // Adjust UI for enhance mode
            enterEnhanceMode();
            
            // Calculate average depth for better enhancement
            calculateAverageDepth();

            // Show processing for a short time, then apply enhancements
            setTimeout(applyEnhancements, 2000);
        },
        
        // Downloads the enhanced image
        downloadImage: function() {
            if (state.enhancedImage) {
                const link = document.createElement('a');
                link.href = state.enhancedImage;
                link.download = 'christmas-lights-photo-enhanced.png';
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
			else {
				const link = document.createElement('a');
                link.href = createCombinedImage();
                link.download = 'christmas-lights-photo.png';
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
			}
        },
        
        // For testing
        _setApiKey: function(key) {
            apiKey = key;
        }
    };
})();

// Initialize and expose module
window.EnhanceModule = EnhanceModule;

elements.enhanceBtn.addEventListener('click', EnhanceModule.enhanceImage);
elements.downloadBtn.addEventListener('click', EnhanceModule.downloadImage);