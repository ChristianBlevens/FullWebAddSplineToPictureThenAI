const STABILITY_API_KEY = 'sk-F4Z3bZLTnnAjq5pzMOmtSyLo8uJjbO2wV59cDCcBX9Nk2I9z';

elements.enhanceBtn.addEventListener('click', enhanceImage);
        
function enhanceImage() {
	// Set enhance mode to disable further drawing
	state.inEnhanceMode = true;
	
	// Show processing overlay
	elements.processingOverlay.classList.remove('hidden');
	state.processing = true;
	
	// Adjust UI for enhance mode
	elements.undoBtn.classList.add('hidden');
	elements.clearBtn.classList.add('hidden');
	elements.enhanceBtn.classList.add('hidden');
	elements.depthToggleBtn.classList.add('hidden');
	elements.lineToggleBtn.classList.add('hidden');
	elements.downloadBtn.classList.remove('hidden');
	
	// Hide control sidebar
	document.querySelector('.control-sidebar').style.display = 'none';

	// Hide overlays
	elements.depthOverlayCanvas.classList.add('hidden');
	elements.lineOverlayCanvas.classList.add('hidden');
	elements.lightsOverlayCanvas.classList.add('hidden');

	// Remove crosshair cursor
	elements.canvas.classList.remove('crosshair');

	// Show processing for a short time
	setTimeout(() => {
		// Capture a frame with just the image and lights, no splines or control points
		// We do this by temporarily rendering a frame with inEnhanceMode true,
		// which will exclude the splines and control points
		applyEnhancements();
	}, 2000);
}

function applyEnhancements() {
    // Create a new canvas for combining the main canvas and lights overlay
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = elements.canvas.width;
    combinedCanvas.height = elements.canvas.height;
    const combinedCtx = combinedCanvas.getContext('2d');
    
    // First draw the main canvas image
    combinedCtx.drawImage(elements.canvas, 0, 0);
    
    // Then draw the lights overlay on top
    combinedCtx.drawImage(elements.lightsOverlayCanvas, 0, 0);
    
    // Get the combined image with lights
    const combinedImage = combinedCanvas.toDataURL('image/jpeg', 0.9);
    
    // Save the non-enhanced combined image
    state.combinedImage = combinedImage;
    
    // Show "Processing with AI" text in the processing overlay
    const processingText = elements.processingOverlay.querySelector('p');
    if (processingText) {
        processingText.textContent = 'Enhancing with AI... This may take a few seconds';
    }
    
    // Set a timeout to handle potential long delays
    const timeoutDuration = 30000; // 30 seconds timeout
    let timeoutId = setTimeout(() => {
        console.error('API request timed out');
        handleEnhancementFailure('Request timed out. You can still download the non-enhanced image.');
    }, timeoutDuration);
    
    // Send the image to the Stable Diffusion API
    sendToStableDiffusion(combinedImage)
        .then(enhancedImageUrl => {
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            
            // Once we get the enhanced image back, display it
            const img = new Image();
            img.onload = () => {
                // Clear the canvas entirely
                ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
                
                // Draw the enhanced image on the main canvas
                ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
                
                // Update instructions
                elements.instructions.textContent = 'Your enhanced image is ready!';
                
                // Hide processing overlay
                elements.processingOverlay.classList.add('hidden');
                state.processing = false;
                
                // Store the enhanced image for download
                state.enhancedImage = enhancedImageUrl;
                
                // Stop animation loop since we're replacing it
                stopLightsAnimation();
                
                // Now that we've captured and drawn the combined image, we can hide the overlay
                elements.lightsOverlayCanvas.classList.add('hidden');
            };
            img.src = enhancedImageUrl;
        })
        .catch(error => {
            // Clear the timeout since we got a response (even if it's an error)
            clearTimeout(timeoutId);
            
            console.error('AI enhancement failed:', error);
            handleEnhancementFailure('AI enhancement failed. You can still download the non-enhanced image.');
        });
}

// Function to send image to Stable Diffusion API
async function sendToStableDiffusion(imageDataUrl) {
    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    
    // Stable Diffusion API settings
    const STABILITY_API_URL = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
    
    // API key directly in the code - replace with your key
    // NOTE: For production, this should be handled securely through a server
    const STABILITY_KEY = STABILITY_API_KEY;
    
    // Prepare the form data
    const formData = new FormData();
    
    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
    }
    const blob = new Blob([new Uint8Array(byteArrays)], { type: 'image/jpeg' });
    
    // Add the image file
    formData.append('image', blob, 'christmas-lights-photo.jpg');
    
    // Add other parameters from the Python example
    formData.append('prompt', 'A professional photograph of a festive home decorated with Christmas lights, volumetric light, caustic lighting, glowing warm ambiance, soft light halos, dappled light patterns, light diffusion on surroundings, crisp details, twinkling lights with subtle lens flare, soft bokeh effect in background, Sony Alpha a7 III, 35mm lens, f/2.8 aperture, long exposure, cinematic composition, golden hour fading to blue hour');
    formData.append('negative_prompt', 'cgi, painting, drawing, anime, cartoon, octane render, bad photo, text, bad photography, worst quality, low quality, blurry, bad proportions, deformed, distorted, grainy, noisy, oversaturated, overexposed');
    formData.append('strength', '0.30');
    formData.append('seed', '0');
    formData.append('output_format', 'png');
    formData.append('mode', 'image-to-image');
    formData.append('model', 'sd3.5-medium');
    
    // Send request to Stable Diffusion API
    const response = await fetch(STABILITY_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${STABILITY_KEY}`,
            'Accept': 'image/*'  // This was missing in the previous version
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stable Diffusion API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Get the image data from the response
    const imageBlob = await response.blob();
    return URL.createObjectURL(imageBlob);
}

// Function to handle enhancement failures
function handleEnhancementFailure(message) {
    // Display alert with error message
    alert(message);
    
    // Use the non-enhanced combined image
    const img = new Image();
    img.onload = () => {
        // Clear the canvas entirely
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        
        // Draw the combined image on the main canvas
        ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
        
        // Update instructions
        elements.instructions.textContent = 'Non-enhanced image is ready for download';
        
        // Hide processing overlay
        elements.processingOverlay.classList.add('hidden');
        state.processing = false;
        
        // Store the non-enhanced image for download
        state.enhancedImage = state.combinedImage;
        
        // Stop animation loop since we're replacing it
        stopLightsAnimation();
        
        // Hide the lights overlay
        elements.lightsOverlayCanvas.classList.add('hidden');
    };
    img.src = state.combinedImage;
}

elements.downloadBtn.addEventListener('click', downloadImage);
        
function downloadImage() {
    if (state.enhancedImage) {
        // Download enhanced image
        const link = document.createElement('a');
        link.href = state.enhancedImage;
        link.download = 'christmas-lights-photo.jpg';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}