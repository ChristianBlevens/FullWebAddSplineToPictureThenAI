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
	elements.downloadBtn.classList.remove('hidden');
	
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
	// Get current canvas image (this has the lights on it)
	const canvasWithLights = elements.canvas.toDataURL('image/jpeg', 0.9);
	
	const img = new Image();
	img.onload = () => {
		// Create a new canvas for the enhanced image
		const enhanceCanvas = document.createElement('canvas');
		enhanceCanvas.width = img.width;
		enhanceCanvas.height = img.height;
		
		const enhanceCtx = enhanceCanvas.getContext('2d');
		
		// Draw original image
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
		};
		displayImg.src = state.enhancedImage;
	};
	
	img.src = canvasWithLights;
}

elements.downloadBtn.addEventListener('click', downloadImage);
        
function downloadImage() {
	if (state.inEnhanceMode && state.enhancedImage) {
		// Download enhanced image
		const link = document.createElement('a');
		link.href = state.enhancedImage;
		link.download = 'christmas-lights-photo.jpg';
		
		// Trigger download
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	} else {
		// Download current canvas image with lights
		const link = document.createElement('a');
		link.href = elements.canvas.toDataURL('image/jpeg', 0.9);
		link.download = 'christmas-lights-photo.jpg';
		
		// Trigger download
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
}