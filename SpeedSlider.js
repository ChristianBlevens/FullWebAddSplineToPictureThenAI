elements.speedSlider.addEventListener('input', function() {
	state.animationSpeed = parseFloat(this.value);
	// No need to redraw here as the animation loop will use the new speed value
});