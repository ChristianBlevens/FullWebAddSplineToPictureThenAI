function processImage(imageUrl) {
	// Show editor view and hide input views
	elements.cameraView.classList.add('hidden');
	elements.fileView.classList.add('hidden');
	elements.editorView.classList.remove('hidden');
	elements.resultsContainer.classList.add('hidden');
	
	// Show processing overlay
	elements.processingOverlay.classList.remove('hidden');
	state.processing = true;
	
	// Initialize the default color markers
	initializeDefaultColors();
	
	// Load and resize image for the canvas
	const img = new Image();
	img.onload = () => {
		// Create a lower resolution version for processing
		state.lowResImage = createLowResVersion(img);
		
		// Generate maps (in a real app, these would come from a server)
		setTimeout(() => {
			state.depthMap = createMockDepthMap();
			state.lineMap = createMockLineMap();
			
			elements.depthMapImage.src = state.depthMap;
			elements.lineMapImage.src = state.lineMap;
			elements.mapsContainer.classList.remove('hidden');
			
			// Initialize canvas with the FULL RES image
			initializeCanvas(state.fullResImage);
			
			// Hide processing overlay
			elements.processingOverlay.classList.add('hidden');
			state.processing = false;
			
			// Start in drawing mode automatically
			startLightsAnimation();
		}, 1500);
	};
	
	img.src = imageUrl;
}

function createLowResVersion(img) {
	// Create a lower resolution version for better performance
	const canvas = document.createElement('canvas');
	
	// Target resolution (max 640x480)
	const maxWidth = 640;
	const maxHeight = 480;
	
	let width = img.width;
	let height = img.height;
	
	// Scale down if needed while preserving aspect ratio
	if (width > height) {
		if (width > maxWidth) {
			height = Math.round(height * maxWidth / width);
			width = maxWidth;
		}
	} else {
		if (height > maxHeight) {
			width = Math.round(width * maxHeight / height);
			height = maxHeight;
		}
	}
	
	canvas.width = width;
	canvas.height = height;
	
	const ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0, width, height);
	
	return canvas.toDataURL('image/jpeg', 0.8);
}

function initializeCanvas(imageUrl) {
	const img = new Image();
	img.onload = () => {
		// Size canvas to match full-res image but limit to viewport
		const maxWidth = Math.min(window.innerWidth - 40, img.width);
		const aspectRatio = img.height / img.width;
		
		elements.canvas.width = maxWidth;
		elements.canvas.height = maxWidth * aspectRatio;
		
		// Draw image to canvas
		ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
	};
	
	img.src = imageUrl;
}

// -----------------------
// Mock Map Generation
// -----------------------
function createMockDepthMap() {
	const canvas = document.createElement('canvas');
	canvas.width = 640;
	canvas.height = 480;
	const ctx = canvas.getContext('2d');
	
	// Create a gradient from top (far) to bottom (near)
	const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, 'black');     // Far
	gradient.addColorStop(1, 'white');     // Near
	
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	return canvas.toDataURL();
}

function createMockLineMap() {
	const canvas = document.createElement('canvas');
	canvas.width = 640;
	canvas.height = 480;
	const ctx = canvas.getContext('2d');
	
	// Black background
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// White lines
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 2;
	
	// Horizontal lines
	for (let y = 60; y < canvas.height; y += 80) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.stroke();
	}
	
	// Vertical lines
	for (let x = 80; x < canvas.width; x += 120) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.stroke();
	}
	
	// Diagonal lines
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(canvas.width, canvas.height);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.moveTo(canvas.width, 0);
	ctx.lineTo(0, canvas.height);
	ctx.stroke();
	
	return canvas.toDataURL();
}