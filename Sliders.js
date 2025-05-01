elements.densitySlider.addEventListener('input', function() {
	state.densityFactor = parseFloat(this.value);
	// If we have any ongoing light animations, update them
	if (state.animatingLights && state.splines.some(spline => spline.length >= 2)) {
		redrawCanvas();
	}
});

elements.speedSlider.addEventListener('input', function() {
	state.animationSpeed = parseFloat(this.value);
});

elements.glowSizeSlider.addEventListener('input', function() {
	state.glowSizeFactor = parseFloat(this.value);
	// If we have any ongoing light animations, update them
	if (state.animatingLights && state.splines.some(spline => spline.length >= 2)) {
		redrawCanvas();
	}
});

// Add this to each slider
elements.densitySlider.addEventListener('touchstart', function() {
    document.body.style.overflow = 'hidden'; // Prevent scrolling
});

elements.densitySlider.addEventListener('touchend', function() {
    document.body.style.overflow = ''; // Enable scrolling
});

elements.speedSlider.addEventListener('touchstart', function() {
    document.body.style.overflow = 'hidden';
});

elements.speedSlider.addEventListener('touchend', function() {
    document.body.style.overflow = '';
});

elements.glowSizeSlider.addEventListener('touchstart', function() {
    document.body.style.overflow = 'hidden';
});

elements.glowSizeSlider.addEventListener('touchend', function() {
    document.body.style.overflow = '';
});