function startLightsAnimation() {
	state.animatingLights = true;
	
	// Load original image
	const img = new Image();
	img.onload = () => {
		let phase = 0;
		
		// Animation function
		const animate = () => {
			if (!state.animatingLights) return;
			
			// Draw the lights directly on the main canvas
			if (elements.lightsCtx) {
				// Clear the lights overlay
				elements.lightsCtx.clearRect(0, 0, elements.lightsOverlayCanvas.width, elements.lightsOverlayCanvas.height);
				
				// Only draw splines if we're not in enhance mode
				// This is for the editing view only, not for the final image
				if (!state.inEnhanceMode) {
					// Draw all splines with points for editing
					for (const spline of state.splines) {
						// Draw straight lines between points
						if (spline.length >= 2) {
							elements.lightsCtx.beginPath();
							elements.lightsCtx.moveTo(spline[0].x, spline[0].y);
							
							for (let i = 1; i < spline.length; i++) {
								elements.lightsCtx.lineTo(spline[i].x, spline[i].y);
							}
							
							elements.lightsCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
							elements.lightsCtx.lineWidth = 1;
							elements.lightsCtx.stroke();
						}
					}
				}
				
				// Draw lights for each spline
				for (const spline of state.splines) {
					if (spline.length < 2) {
						// For splines with only one point, just draw the point if not in enhance mode
						if (spline.length === 1 && !state.inEnhanceMode) {
							elements.lightsCtx.beginPath();
							elements.lightsCtx.arc(spline[0].x, spline[0].y, 5, 0, Math.PI * 2);
							elements.lightsCtx.fillStyle = 'red';
							elements.lightsCtx.fill();
						}
						continue;
					}
					
					// Calculate evenly spaced points along the spline, adjusted for depth
					const lightPoints = calculateDepthAdjustedLightPoints(spline);
					
					// Draw each light
					lightPoints.forEach((point, i) => {
						// Color based on position in the animation sequence
						const colorPosition = i + phase % state.cycleLength;
						const color = getColorFromMarkers(colorPosition);
						
						// Draw light with depth-based size
						const depth = getDepthAtPoint(point.x, point.y);
						const size = 3 + (depth * 7); // Size between 3-10px
						
						elements.lightsCtx.beginPath();
						elements.lightsCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
						elements.lightsCtx.fillStyle = color;
						elements.lightsCtx.fill();
						
						// Add glow effect
						// Extract RGB components from the color
						const r = parseInt(color.substring(1, 3), 16);
						const g = parseInt(color.substring(3, 5), 16);
						const b = parseInt(color.substring(5, 7), 16);
						
						// Create radial gradient with same color as the light but with decreasing opacity
						const glowSize = size * (2 + state.glowSizeFactor); // Adjust glow size based on slider
						const gradient = elements.lightsCtx.createRadialGradient(
							point.x, point.y, 0,
							point.x, point.y, glowSize
						);
						gradient.addColorStop(0, color);
						gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
						gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
						
						elements.lightsCtx.beginPath();
						elements.lightsCtx.arc(point.x, point.y, glowSize, 0, Math.PI * 2);
						elements.lightsCtx.fillStyle = gradient;
						elements.lightsCtx.fill();
					});
				}
				
				// Draw control points on top of lights only if not in enhance mode
				if (!state.inEnhanceMode) {
					for (const spline of state.splines) {
						// Draw points
						for (const point of spline) {
							elements.lightsCtx.beginPath();
							elements.lightsCtx.arc(point.x, point.y, 5, 0, Math.PI * 2);
							elements.lightsCtx.fillStyle = 'red';
							elements.lightsCtx.fill();
							elements.lightsCtx.strokeStyle = 'white';
							elements.lightsCtx.lineWidth = 1;
							elements.lightsCtx.stroke();
						}
					}
					
					// Highlight the last clicked point if any
					if (state.lastClickedPoint) {
						const { splineIndex, pointIndex } = state.lastClickedPoint;
						const point = state.splines[splineIndex][pointIndex];
						
						elements.lightsCtx.beginPath();
						elements.lightsCtx.arc(point.x, point.y, 7, 0, Math.PI * 2);
						elements.lightsCtx.strokeStyle = '#00ffff';
						elements.lightsCtx.lineWidth = 2;
						elements.lightsCtx.stroke();
					}
				}
			}
			
			// Increment phase for animation
			// Adjust phase increment by animation speed
			phase += 0.01 * state.animationSpeed;
			
			// Continue animation
			state.animationId = requestAnimationFrame(animate);
		};
		
		// Start animation loop
		animate();
	};
	
	img.src = state.fullResImage;
}

function stopLightsAnimation() {
	state.animatingLights = false;
	
	if (state.animationId) {
		cancelAnimationFrame(state.animationId);
		state.animationId = null;
	}
}

function calculateDepthAdjustedLightPoints(spline) {
	// Calculate points along a spline for lights using a depth accumulation method
	if (spline.length < 1) return [];
	
	const points = [];
	// Apply density factor to threshold
	// For 0.5 (sparse): THRESHOLD is doubled
	// For 1 (normal): THRESHOLD is unchanged
	// For 2 (dense): THRESHOLD is halved
	const baseThreshold = 10; // Base threshold for placing a light
	const THRESHOLD = baseThreshold / state.densityFactor;
	const STEP_SIZE = 1; // Step size in pixels for traversing the spline
	
	// Process each segment of the spline
	for (let i = 0; i < spline.length - 1; i++) {
		const start = spline[i];
		const end = spline[i + 1];
		
		// Calculate segment properties
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const segmentLength = Math.sqrt(dx * dx + dy * dy);
		
		// Skip very short segments
		if (segmentLength < 5) continue;
		
		// Calculate number of steps for this segment
		const steps = Math.ceil(segmentLength / STEP_SIZE);
		
		// Initialize depth accumulator
		let depthAccumulator = THRESHOLD - STEP_SIZE;
		
		// Track where the last light was placed to avoid double lights at junctions
		let lastLightPosition = -1;
		
		// Traverse the segment step by step
		for (let step = 0; step <= steps; step++) {
			const t = step / steps;
			
			// Calculate current position along the segment
			const x = start.x + dx * t;
			const y = start.y + dy * t;
			
			// Sample depth at current position
			const depth = getDepthAtPoint(x, y);
			
			// Accumulate depth
			// Use depth factor to make deeper areas (higher depth values) accumulate faster
			const depthFactor = 0.5 + (depth * 1.5); // Ranges from 0.5-2.0
			depthAccumulator += depthFactor * (STEP_SIZE / 10);
			
			// Check if we should place a light
			if (depthAccumulator >= THRESHOLD) {
				// Skip if we're at a junction point and this isn't the first segment
				if (i > 0 && step === 0) {
					// Reset accumulator but don't place light at junction
					// IMPROVED: Subtract threshold instead of resetting to zero
					depthAccumulator -= THRESHOLD;
					continue;
				}
				
				// Skip if we're too close to the last light
				if (lastLightPosition !== -1 && (step - lastLightPosition) < 3) {
					continue;
				}
				
				// Place a light at this position
				points.push({ x, y });
				
				// IMPROVED: Subtract threshold instead of resetting to zero
				depthAccumulator -= THRESHOLD;
				lastLightPosition = step;
			}
		}
	}
	
	return points;
}

function getDepthAtPoint(x, y) {
	// Convert canvas coordinates to depth map coordinates
	// Scale from 1000x1000 to 400x400
	const depthX = Math.floor((x / elements.canvas.width) * 400);
	const depthY = Math.floor((y / elements.canvas.height) * 400);
	
	// For the filler depth map, all values are 1
	return 1;
}