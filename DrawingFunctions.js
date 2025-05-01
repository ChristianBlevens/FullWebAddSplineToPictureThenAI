// Add event listener in a safer way that doesn't throw an error
// The original version tried to add an event listener immediately, but the canvas might not exist yet
// Instead, we'll attach the event listener after we've verified the canvas exists

function setupCanvasListeners() {
    // Add click event listener to canvas
    elements.canvas.addEventListener('click', handleCanvasClick);
}

// The rest of the file doesn't change the event listener directly
        
function handleCanvasClick(e) {
	// If in enhance mode, don't allow further drawing
	if (state.inEnhanceMode) return;
	
	const rect = elements.canvas.getBoundingClientRect();
	const scaleX = elements.canvas.width / rect.width;
	const scaleY = elements.canvas.height / rect.height;
	
	// Calculate click position on canvas
	const x = (e.clientX - rect.left) * scaleX;
	const y = (e.clientY - rect.top) * scaleY;
	
	// Snap to line if nearby
	const snappedPoint = snapToLine(x, y);
	
	// Check if clicked on an existing point
	const existingPoint = findExistingPoint(snappedPoint.x, snappedPoint.y);
	
	if (existingPoint) {
		// Clicked on existing point
		const { splineIndex, pointIndex, isEndpoint } = existingPoint;
		
		if (state.lastClickedPoint) {
			// Second click after selecting a point - ignore if clicking same point again
			if (state.lastClickedPoint.splineIndex === splineIndex && 
				state.lastClickedPoint.pointIndex === pointIndex) {
				return;
			}
			
			// Reset last clicked point
			state.lastClickedPoint = null;
		} else {
			// First click on an existing point
			if (isEndpoint) {
				// Clicked on endpoint, prepare to extend this spline
				state.activeSplineIndex = splineIndex;
				state.lastClickedPoint = { splineIndex, pointIndex, isEndpoint };
			} else {
				// Clicked on middle point, start new spline from here
				state.splines.push([{ 
					x: state.splines[splineIndex][pointIndex].x, 
					y: state.splines[splineIndex][pointIndex].y 
				}]);
				state.activeSplineIndex = state.splines.length - 1;
				state.lastClickedPoint = null;
			}
			redrawCanvas();
			return;
		}
	}
	
	// Normal click (not on existing point)
	if (state.lastClickedPoint) {
		// Second click after selecting an endpoint
		const { splineIndex, pointIndex, isEndpoint } = state.lastClickedPoint;
		
		// Add to beginning or end of spline
		if (pointIndex === 0) {
			// Add to beginning
			state.splines[splineIndex].unshift(snappedPoint);
		} else {
			// Add to end
			state.splines[splineIndex].push(snappedPoint);
		}
		
		state.lastClickedPoint = null;
	} else if (state.activeSplineIndex >= 0 && state.splines[state.activeSplineIndex].length === 1) {
		// Adding second point to active spline
		state.splines[state.activeSplineIndex].push(snappedPoint);
	} else {
		// Starting a new spline
		state.splines.push([snappedPoint]);
		state.activeSplineIndex = state.splines.length - 1;
	}
	
	// Redraw and update buttons
	redrawCanvas();
	updateButtonStates();
}

function findExistingPoint(x, y) {
	const threshold = 10; // Distance threshold for clicking on a point
	
	for (let splineIndex = 0; splineIndex < state.splines.length; splineIndex++) {
		const spline = state.splines[splineIndex];
		
		for (let pointIndex = 0; pointIndex < spline.length; pointIndex++) {
			const point = spline[pointIndex];
			const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
			
			if (distance <= threshold) {
				// Determine if it's an endpoint
				const isEndpoint = pointIndex === 0 || pointIndex === spline.length - 1;
				return { splineIndex, pointIndex, isEndpoint };
			}
		}
	}
	
	return null;
}

function snapToLine(x, y) {
	// For the simplified version, don't snap to any grid lines
	// Just return the original point
	return { x, y };
}

function redrawCanvas() {
	// Always re-render with lights if we have splines
	if (state.splines.some(spline => spline.length >= 2)) {
		// Just trigger a re-render of the animation loop,
		// which will handle showing the lights
		// The animation is always running when in editor mode
	} else {
		// Draw directly on the main canvas for now
		// Clear the canvas
		ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
		
		// Redraw the original image
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
			
			// Draw straight lines for any single point splines
			for (const spline of state.splines) {
				if (spline.length === 1) {
					// For single points, just draw the point
					ctx.beginPath();
					ctx.arc(spline[0].x, spline[0].y, 5, 0, Math.PI * 2);
					ctx.fillStyle = 'red';
					ctx.fill();
				}
			}
			
			// Highlight the last clicked point if any
			if (state.lastClickedPoint) {
				const { splineIndex, pointIndex } = state.lastClickedPoint;
				const point = state.splines[splineIndex][pointIndex];
				
				ctx.beginPath();
				ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
				ctx.strokeStyle = '#00ffff';
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		};
		img.src = state.fullResImage;
	}
}

function updateButtonStates() {
	// Count total points in all splines
	const totalPoints = state.splines.reduce((sum, spline) => sum + spline.length, 0);
	
	// Clear button enabled if we have any points
	elements.clearBtn.disabled = totalPoints === 0;
	
	// Undo button enabled if we have any points
	elements.undoBtn.disabled = totalPoints === 0;
	
	// Enhance button enabled if we have at least one spline with 2+ points
	const hasCompleteSpline = state.splines.some(spline => spline.length >= 2);
	elements.enhanceBtn.disabled = !hasCompleteSpline;
}

elements.undoBtn.addEventListener('click', undoLastAction);

function undoLastAction() {
	if (state.splines.length === 0) return;
	
	// If we have a last clicked point, clear it
	if (state.lastClickedPoint) {
		state.lastClickedPoint = null;
		redrawCanvas();
		return;
	}
	
	// If we have an active spline with only one point, remove it entirely
	if (state.activeSplineIndex >= 0 && 
		state.splines[state.activeSplineIndex].length === 1) {
		state.splines.splice(state.activeSplineIndex, 1);
		state.activeSplineIndex = state.splines.length - 1;
	} 
	// If we have an active spline with multiple points, remove the last point
	else if (state.activeSplineIndex >= 0 && 
			state.splines[state.activeSplineIndex].length > 1) {
		state.splines[state.activeSplineIndex].pop();
		
		// If we've removed all but one point, keep the active index
		if (state.splines[state.activeSplineIndex].length === 0) {
			state.splines.splice(state.activeSplineIndex, 1);
			state.activeSplineIndex = state.splines.length - 1;
		}
	} 
	// Otherwise remove the last point from the last spline
	else if (state.splines.length > 0) {
		const lastSplineIndex = state.splines.length - 1;
		
		if (state.splines[lastSplineIndex].length > 1) {
			state.splines[lastSplineIndex].pop();
		} else {
			state.splines.pop();
			state.activeSplineIndex = state.splines.length - 1;
		}
	}
	
	redrawCanvas();
	updateButtonStates();
}

elements.clearBtn.addEventListener('click', clearPoints);

function clearPoints() {
	state.splines = [];
	state.activeSplineIndex = -1;
	state.lastClickedPoint = null;
	redrawCanvas();
	updateButtonStates();
}