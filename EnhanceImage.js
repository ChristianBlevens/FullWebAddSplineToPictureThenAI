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
    
    const img = new Image();
    img.onload = () => {
        // Create a new canvas for the enhanced image
        const enhanceCanvas = document.createElement('canvas');
        enhanceCanvas.width = img.width;
        enhanceCanvas.height = img.height;
        
        const enhanceCtx = enhanceCanvas.getContext('2d');
        
        // Draw the combined image
        enhanceCtx.drawImage(img, 0, 0);
        
        // Apply effects to simulate AI enhancement
        enhanceCtx.filter = 'contrast(110%) brightness(110%) saturate(120%)';
        enhanceCtx.globalCompositeOperation = 'source-atop';
        enhanceCtx.drawImage(img, 0, 0);
        
        // Reset filters
        enhanceCtx.filter = 'none';
        enhanceCtx.globalCompositeOperation = 'source-over';
        
        // Add subtle vignette
        const gradient = enhanceCtx.createRadialGradient(
            enhanceCanvas.width / 2, enhanceCanvas.height / 2, enhanceCanvas.height * 0.3,
            enhanceCanvas.width / 2, enhanceCanvas.height / 2, enhanceCanvas.height * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
        
        enhanceCtx.fillStyle = gradient;
        enhanceCtx.fillRect(0, 0, enhanceCanvas.width, enhanceCanvas.height);
        
        // Save the enhanced image
        state.enhancedImage = enhanceCanvas.toDataURL('image/jpeg', 0.9);
        
        // Display enhanced image directly in the main canvas
        const displayImg = new Image();
        displayImg.onload = () => {
            // Clear the canvas entirely
            ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            
            // Draw the enhanced image on the main canvas
            ctx.drawImage(displayImg, 0, 0, elements.canvas.width, elements.canvas.height);
            
            // Update instructions
            elements.instructions.textContent = 'Your enhanced image is ready!';
            
            // Hide processing overlay
            elements.processingOverlay.classList.add('hidden');
            state.processing = false;
            
            // Stop animation loop since we're replacing it
            stopLightsAnimation();
            
            // Now that we've captured and drawn the combined image, we can hide the overlay
            elements.lightsOverlayCanvas.classList.add('hidden');
        };
        displayImg.src = state.enhancedImage;
    };
    
    img.src = combinedImage;
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