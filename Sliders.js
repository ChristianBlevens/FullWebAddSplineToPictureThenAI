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