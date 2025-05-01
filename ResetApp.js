elements.resetBtn.addEventListener('click', resetApp);
        
function resetApp() {
	// Stop animations if running
	stopLightsAnimation();
	
	// Reset state
	state.splines = [];
	state.activeSplineIndex = -1;
	state.lastClickedPoint = null;
	state.fullResImage = null;
	state.lowResImage = null;
	state.depthMap = null;
	state.lineData = null; // Changed from lineMap
	state.enhancedImage = null;
	state.inEnhanceMode = false;
	state.densityFactor = 1.0;
	state.animationSpeed = 1.0;
	state.glowSizeFactor = 1.0;
	
	// Reset sliders
	elements.densitySlider.value = 1.0;
	elements.speedSlider.value = 1.0;
	elements.glowSizeSlider.value = 1.0;
	
	// Clear color markers
	while (elements.colorBar.firstChild) {
		elements.colorBar.removeChild(elements.colorBar.firstChild);
	}
	state.colorMarkers = [];
	
	// Remove overlay canvases if they exist
	if (elements.depthOverlayCanvas) {
		elements.depthOverlayCanvas.parentNode.removeChild(elements.depthOverlayCanvas);
		elements.depthOverlayCanvas = null;
	}
	
	if (elements.lineOverlayCanvas) {
		elements.lineOverlayCanvas.parentNode.removeChild(elements.lineOverlayCanvas);
		elements.lineOverlayCanvas = null;
	}

	// Show title and tabs again
	const appTitle = document.querySelector('h1');
	const tabContainer = document.querySelector('.tab-container');

	if (appTitle) appTitle.classList.remove('hidden');
	if (tabContainer) tabContainer.classList.remove('hidden');
	
	// Reset UI based on current mode
	if (state.mode === 'camera') {
		elements.cameraView.classList.remove('hidden');
		elements.fileView.classList.add('hidden');
		elements.editorView.classList.add('hidden');
		
		elements.video.classList.add('hidden');
		elements.cameraPlaceholder.classList.remove('hidden');
		elements.takePictureBtn.classList.add('hidden');
		elements.startCameraBtn.classList.remove('hidden');
	} else {
		elements.fileView.classList.remove('hidden');
		elements.cameraView.classList.add('hidden');
		elements.editorView.classList.add('hidden');
		
		elements.previewImage.classList.add('hidden');
		elements.fileUploadPlaceholder.classList.remove('hidden');
		elements.useImageBtn.classList.add('hidden');
		elements.fileInput.value = ''; // Reset file input
	}
	
	// Reset editor UI
	elements.undoBtn.classList.remove('hidden');
	elements.clearBtn.classList.remove('hidden');
	elements.enhanceBtn.classList.remove('hidden');
	elements.downloadBtn.classList.add('hidden');
	elements.canvas.classList.add('crosshair');
	elements.instructions.textContent = 'Click to add points for your Christmas lights';
	elements.resultsContainer.classList.add('hidden');
	
	// Reset button states
	elements.undoBtn.disabled = true;
	elements.clearBtn.disabled = true;
	elements.enhanceBtn.disabled = true;
}

// Initialize the app by setting up the color picker cancel button
elements.cancelColorBtn.addEventListener('click', function() {
	elements.colorPickerOverlay.classList.add('hidden');
	state.colorPickerPosition = null;
	state.activeColorMarkerIndex = -1;
	
	// Reset select button behavior
	elements.selectColorBtn.textContent = 'Select';
	elements.selectColorBtn.onclick = null;
});