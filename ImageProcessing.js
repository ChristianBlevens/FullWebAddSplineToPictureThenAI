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
		// Create a 400x400 version for processing
		state.lowResImage = createResizedVersion(img, 400, 400);
		
		// Generate maps (filler data for now)
		setTimeout(() => {
			// Create depth map with value of 1 (filler data)
			state.depthMap = createFillerDepthMap();
			
			// Create line data (filler data)
			state.lineData = {"lines":[[{"x":300,"y":300},{"x":100,"y":100}]]};
			
			// Initialize canvas with 1000x1000 image
			initializeCanvas(imageUrl, 1000, 1000);
			
			// Hide processing overlay
			elements.processingOverlay.classList.add('hidden');
			state.processing = false;
			
			// Start in drawing mode automatically
			startLightsAnimation();
		}, 1500);
	};
	
	img.src = imageUrl;
}

function createResizedVersion(img, targetWidth, targetHeight) {
	// Create a resized version with exact dimensions
	const canvas = document.createElement('canvas');
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	
	const ctx = canvas.getContext('2d');
	// Draw the image to the target size (stretching/squashing as needed)
	ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
	
	return canvas.toDataURL('image/jpeg', 0.8);
}

function initializeCanvas(imageUrl, targetWidth, targetHeight) {
	const img = new Image();
	img.onload = () => {
		// Set canvas to the target size
		elements.canvas.width = targetWidth;
		elements.canvas.height = targetHeight;
		
		// Draw image to canvas at the target size
		ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
		
		// Create overlay canvases for depth map and line data
		createDepthMapOverlay();
		createLineDataOverlay();
		
		// Draw line data on its overlay
		drawLineData();
	};
	
	img.src = imageUrl;
}

function createDepthMapOverlay() {
	// Create depth map overlay canvas if it doesn't exist
	if (!elements.depthOverlayCanvas) {
		elements.depthOverlayCanvas = document.createElement('canvas');
		elements.depthOverlayCanvas.width = 1000;
		elements.depthOverlayCanvas.height = 1000;
		elements.depthOverlayCanvas.className = 'overlay-canvas hidden';
		elements.depthOverlayCanvas.id = 'depthOverlayCanvas';
		
		// Add to DOM
		elements.canvas.parentNode.appendChild(elements.depthOverlayCanvas);
		
		// Create depth toggle button
		const depthToggleBtn = document.createElement('button');
		depthToggleBtn.id = 'depthToggleBtn';
		depthToggleBtn.className = 'button button-blue toggle-btn';
		depthToggleBtn.textContent = 'Toggle Depth Map';
		elements.editorButtons.appendChild(depthToggleBtn);
		
		// Add toggle event
		depthToggleBtn.addEventListener('click', toggleDepthMap);
	}
	
	// Draw depth map (filler data - all white)
	const depthCtx = elements.depthOverlayCanvas.getContext('2d');
	depthCtx.fillStyle = 'white'; // Value of 1
	depthCtx.fillRect(0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
}

function createLineDataOverlay() {
	// Create line data overlay canvas if it doesn't exist
	if (!elements.lineOverlayCanvas) {
		elements.lineOverlayCanvas = document.createElement('canvas');
		elements.lineOverlayCanvas.width = 1000;
		elements.lineOverlayCanvas.height = 1000;
		elements.lineOverlayCanvas.className = 'overlay-canvas hidden';
		elements.lineOverlayCanvas.id = 'lineOverlayCanvas';
		
		// Add to DOM
		elements.canvas.parentNode.appendChild(elements.lineOverlayCanvas);
		
		// Create line toggle button
		const lineToggleBtn = document.createElement('button');
		lineToggleBtn.id = 'lineToggleBtn';
		lineToggleBtn.className = 'button button-orange toggle-btn';
		lineToggleBtn.textContent = 'Toggle Line Data';
		elements.editorButtons.appendChild(lineToggleBtn);
		
		// Add toggle event
		lineToggleBtn.addEventListener('click', toggleLineData);
	}
}

function drawLineData() {
	if (!elements.lineOverlayCanvas || !state.lineData) return;
	
	const lineCtx = elements.lineOverlayCanvas.getContext('2d');
	lineCtx.clearRect(0, 0, elements.lineOverlayCanvas.width, elements.lineOverlayCanvas.height);
	
	// Scale factor to convert from 400x400 to 1000x1000
	const scale = 1000 / 400;
	
	// Draw each line
	state.lineData.lines.forEach(line => {
		// Draw line between points
		lineCtx.beginPath();
		lineCtx.moveTo(line[0].x * scale, line[0].y * scale);
		lineCtx.lineTo(line[1].x * scale, line[1].y * scale);
		lineCtx.strokeStyle = 'orange';
		lineCtx.lineWidth = 2;
		lineCtx.stroke();
		
		// Draw points
		line.forEach(point => {
			lineCtx.beginPath();
			lineCtx.arc(point.x * scale, point.y * scale, 5, 0, Math.PI * 2);
			lineCtx.fillStyle = 'orange';
			lineCtx.fill();
		});
	});
}

function toggleDepthMap() {
	const isVisible = !elements.depthOverlayCanvas.classList.contains('hidden');
	
	if (isVisible) {
		// Hide depth map
		elements.depthOverlayCanvas.classList.add('hidden');
		elements.canvas.classList.remove('hidden');
	} else {
		// Show depth map
		elements.depthOverlayCanvas.classList.remove('hidden');
		elements.canvas.classList.add('hidden');
	}
	
	// Make sure line data is always visible
	if (!elements.lineOverlayCanvas.classList.contains('hidden')) {
		elements.lineOverlayCanvas.style.zIndex = '10';
	}
}

function toggleLineData() {
	const isVisible = !elements.lineOverlayCanvas.classList.contains('hidden');
	
	if (isVisible) {
		// Hide line data
		elements.lineOverlayCanvas.classList.add('hidden');
	} else {
		// Show line data
		elements.lineOverlayCanvas.classList.remove('hidden');
		elements.lineOverlayCanvas.style.zIndex = '10';
	}
}

// Create filler depth map (all white = value of 1)
function createFillerDepthMap() {
	const canvas = document.createElement('canvas');
	canvas.width = 400;
	canvas.height = 400;
	
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = 'white'; // Value of 1
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	return canvas.toDataURL();
}