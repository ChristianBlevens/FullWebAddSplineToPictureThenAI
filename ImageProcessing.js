function processImage(imageUrl) {
	// Show editor view and hide input views
	elements.cameraView.classList.add('hidden');
	elements.fileView.classList.add('hidden');
	elements.editorView.classList.remove('hidden');
	elements.resultsContainer.classList.add('hidden');
	
	// Hide the title and tab navigation when entering editing view
	const appTitle = document.querySelector('h1');
	const tabContainer = document.querySelector('.tab-container');
	
	if (appTitle) appTitle.classList.add('hidden');
	if (tabContainer) tabContainer.classList.add('hidden');
	
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
			
			// Setup event listeners on the canvas
			setupCanvasListeners();
			
			// Start in drawing mode automatically
			startLightsAnimation();
			
			// Scroll down to hide tabs
			setTimeout(() => {
				// Scroll down just enough to hide the tabs
				const tabContainer = document.querySelector('.tab-container');
				if (tabContainer) {
					const tabBottom = tabContainer.getBoundingClientRect().bottom;
					window.scrollTo({
						top: tabBottom,
						behavior: 'smooth'
					});
				}
			}, 100);
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
        
        // Create overlay canvases
        createDepthMapOverlay();
        createLineDataOverlay();
        createLightsOverlay(); // Add this line to create the lights overlay
    };
    
    img.src = imageUrl;
}

function createLightsOverlay() {
    // Create lights overlay canvas
    elements.lightsOverlayCanvas = document.createElement('canvas');
    elements.lightsOverlayCanvas.width = 1000;
    elements.lightsOverlayCanvas.height = 1000;
    elements.lightsOverlayCanvas.className = 'overlay-canvas';
    elements.lightsOverlayCanvas.id = 'lightsOverlayCanvas';
    
    // Add to DOM
    elements.canvas.parentNode.appendChild(elements.lightsOverlayCanvas);
    
    // Store the context for easy access
    elements.lightsCtx = elements.lightsOverlayCanvas.getContext('2d');
    
    // Add event listener to the lights overlay canvas
    elements.lightsOverlayCanvas.addEventListener('click', handleCanvasClick);
}

// Add toggle event
depthToggleBtn.addEventListener('click', toggleDepthMap);

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
	}
	
	// Draw depth map (filler data - all white)
	const depthCtx = elements.depthOverlayCanvas.getContext('2d');
	depthCtx.fillStyle = 'white'; // Value of 1
	depthCtx.fillRect(0, 0, elements.depthOverlayCanvas.width, elements.depthOverlayCanvas.height);
}

// Add toggle event
lineToggleBtn.addEventListener('click', toggleLineData);

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
	}
	
	// Draw line data
	drawLineData();
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
    } else {
        // Show depth map
        elements.depthOverlayCanvas.classList.remove('hidden');
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