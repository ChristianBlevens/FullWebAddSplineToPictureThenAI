// Add event listener in a safer way that doesn't throw an error
// The original version tried to add an event listener immediately, but the canvas might not exist yet
// Instead, we'll attach the event listener after we've verified the canvas exists

function setupCanvasListeners() {
    // Add interaction events to both canvas and lights overlay canvas
    elements.canvas.addEventListener('mousedown', handleInteractionStart);
    elements.canvas.addEventListener('mouseup', handleInteractionEnd);
    elements.canvas.addEventListener('touchstart', handleInteractionStart);
    elements.canvas.addEventListener('touchend', handleInteractionEnd);
    
    // Add the same events to the lights overlay canvas
    elements.lightsOverlayCanvas.addEventListener('mousedown', handleInteractionStart);
    elements.lightsOverlayCanvas.addEventListener('mouseup', handleInteractionEnd);
    elements.lightsOverlayCanvas.addEventListener('touchstart', handleInteractionStart);
    elements.lightsOverlayCanvas.addEventListener('touchend', handleInteractionEnd);
    
    // Remove the old click event listeners as we're replacing them
    elements.canvas.removeEventListener('click', handleCanvasClick);
    elements.lightsOverlayCanvas.removeEventListener('click', handleCanvasClick);
    
    console.log('Canvas event listeners set up');
}

// Variables to track interaction timing
let interactionStartTime = 0;
let interactionStartPoint = null;

// Unified handler for interaction start (mousedown or touchstart)
function handleInteractionStart(e) {
    if (state.inEnhanceMode) return;
    
    console.log('Interaction start detected');
    
    // Determine if this is a touch or mouse event and extract position
    let x, y;
    const rect = (e.currentTarget || e.target).getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    
    if (e.type === 'touchstart') {
        // Prevent default behavior for touch to avoid scrolling
        e.preventDefault();
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            x = (touch.clientX - rect.left) * scaleX;
            y = (touch.clientY - rect.top) * scaleY;
        } else {
            return; // No touch points
        }
    } else {
        // Mouse event
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }
    
    // Record start time and position
    interactionStartTime = Date.now();
    interactionStartPoint = { x, y };
    console.log(`Interaction started at (${x}, ${y})`);
}

// Unified handler for interaction end (mouseup or touchend)
function handleInteractionEnd(e) {
    if (state.inEnhanceMode || !interactionStartPoint) return;
    
    console.log('Interaction end detected');
    
    // Determine if this is a touch or mouse event and extract position
    let x, y;
    const rect = (e.currentTarget || e.target).getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    
    if (e.type === 'touchend') {
        // Prevent default behavior for touch
        e.preventDefault();
        
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            x = (touch.clientX - rect.left) * scaleX;
            y = (touch.clientY - rect.top) * scaleY;
        } else {
            return; // No touch points
        }
    } else {
        // Mouse event
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }
    
    // Calculate interaction duration
    const interactionDuration = Date.now() - interactionStartTime;
    
    console.log(`Interaction ended at (${x}, ${y}), duration: ${interactionDuration}ms`);
    
    // Process the interaction
    processCanvasInteraction(x, y, interactionDuration);
    
    // Reset tracking variables
    interactionStartTime = 0;
    interactionStartPoint = null;
}

// Process canvas interaction
function processCanvasInteraction(x, y, duration) {
    console.log(`Processing interaction at (${x}, ${y}), duration: ${duration}ms`);
    
    // Find any existing point at this location
    // We'll pass this to handlePointPlacement to avoid duplicate checks
    const existingPointInfo = findExistingPoint(x, y);
    
    // Determine if and how to snap the point
    let finalPoint;
    
    if (existingPointInfo) {
        // If we clicked near an existing point, use that point's exact coordinates
        const { splineIndex, pointIndex } = existingPointInfo;
        finalPoint = { 
            x: state.splines[splineIndex][pointIndex].x, 
            y: state.splines[splineIndex][pointIndex].y 
        };
        console.log(`Found existing point at (${finalPoint.x}, ${finalPoint.y}), prioritizing over line snapping`);
    } else {
        // No existing point - check if we should snap to a line
        const shouldSnap = duration < 500; // Less than half a second
        
        if (shouldSnap) {
            finalPoint = snapToLine(x, y);
            
            // Visualization for debugging
            if (elements.lightsCtx) {
                elements.lightsCtx.beginPath();
                elements.lightsCtx.arc(x, y, 3, 0, Math.PI * 2);
                elements.lightsCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                elements.lightsCtx.fill();
                
                // Draw a line from original to snapped point if they're different
                if (finalPoint.x !== x || finalPoint.y !== y) {
                    elements.lightsCtx.beginPath();
                    elements.lightsCtx.moveTo(x, y);
                    elements.lightsCtx.lineTo(finalPoint.x, finalPoint.y);
                    elements.lightsCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                    elements.lightsCtx.lineWidth = 1;
                    elements.lightsCtx.stroke();
                    
                    // Draw a circle at the snapped point
                    elements.lightsCtx.beginPath();
                    elements.lightsCtx.arc(finalPoint.x, finalPoint.y, 3, 0, Math.PI * 2);
                    elements.lightsCtx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                    elements.lightsCtx.fill();
                }
                
                // Clear these debug visuals after 1 second
                setTimeout(() => {
                    if (elements.lightsCtx) {
                        elements.lightsCtx.clearRect(0, 0, elements.lightsOverlayCanvas.width, elements.lightsOverlayCanvas.height);
                    }
                }, 1000);
            }
        } else {
            console.log("Interaction too long, not snapping");
            finalPoint = { x, y };
        }
    }
    
    // Pass the already found existing point info to avoid duplicate checks
    handlePointPlacement(finalPoint, existingPointInfo);
}

// This function now accepts the existingPointInfo to avoid duplicate checks
function handlePointPlacement(point, existingPointInfo = null) {
    // Use the passed existingPointInfo if available, or initialize it as null
    const existingPoint = existingPointInfo;
    
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
            state.splines[splineIndex].unshift(point);
        } else {
            // Add to end
            state.splines[splineIndex].push(point);
        }
        
        state.lastClickedPoint = null;
    } else if (state.activeSplineIndex >= 0 && state.splines[state.activeSplineIndex].length === 1) {
        // Adding second point to active spline
        state.splines[state.activeSplineIndex].push(point);
    } else {
        // Starting a new spline
        state.splines.push([point]);
        state.activeSplineIndex = state.splines.length - 1;
    }
    
    // Redraw and update buttons
    redrawCanvas();
    updateButtonStates();
}

// Keep this function for backward compatibility
// This will be called by any existing event listeners from other files
function handleCanvasClick(e) {
    console.log('Legacy handleCanvasClick called');
    // Convert click to our new interaction model
    handleInteractionStart(e);
    // Simulate immediate end of interaction
    setTimeout(() => handleInteractionEnd(e), 10);
}

function findExistingPoint(x, y) {
    const threshold = 20; // Distance threshold for clicking on a point
    
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

// Updated function to more accurately snap to lines in the line data
function snapToLine(x, y) {
    if (!state.lineData || !state.lineData.lines || !Array.isArray(state.lineData.lines)) {
        console.log("No line data available for snapping");
        return { x, y }; // Return original point if no line data available
    }
    
    // Scale factor to convert from original image size to our canvas size
    const canvasWidth = elements.canvas.width;
    const canvasHeight = elements.canvas.height;
    const origWidth = state.lineData.width || 400;
    const origHeight = state.lineData.height || 400;
    const scaleX = canvasWidth / origWidth;
    const scaleY = canvasHeight / origHeight;
    
    let closestDistance = Infinity;
    let closestPoint = { x, y };
    
    // For debugging
    console.log(`Checking snap point (${x}, ${y})`);
    console.log(`Line data has ${state.lineData.lines.length} lines`);
    
    // Distance threshold - exactly 20 pixels
    const SNAP_THRESHOLD = 20;
    
    // Check each line
    for (let i = 0; i < state.lineData.lines.length; i++) {
        const line = state.lineData.lines[i];
        
        // Scale the line points to match canvas size
        const x1 = line.x1 * scaleX;
        const y1 = line.y1 * scaleY;
        const x2 = line.x2 * scaleX;
        const y2 = line.y2 * scaleY;
        
        // Segment length squared (for checking degenerate segments)
        const segLenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        
        // Skip if the line segment is too short (degenerate)
        if (segLenSq < 0.1) continue;
        
        // Calculate the projection of point onto line
        const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / segLenSq;
        
        // Calculate closest point on line segment
        let closestX, closestY;
        
        if (t < 0) {
            // Closest to endpoint 1
            closestX = x1;
            closestY = y1;
        } else if (t > 1) {
            // Closest to endpoint 2
            closestX = x2;
            closestY = y2;
        } else {
            // Closest to somewhere on the segment
            closestX = x1 + t * (x2 - x1);
            closestY = y1 + t * (y2 - y1);
        }
        
        // Calculate squared distance to closest point on segment
        const distance = Math.sqrt((x - closestX) * (x - closestX) + (y - closestY) * (y - closestY));
        
        // Debug log for this line
        console.log(`Line ${i}: (${x1},${y1}) to (${x2},${y2}), distance: ${distance.toFixed(2)}`);
        
        // If the distance is within our threshold and it's closer than any previous match
        if (distance <= SNAP_THRESHOLD && distance < closestDistance) {
            closestDistance = distance;
            closestPoint = { x: closestX, y: closestY };
            console.log(`New closest point: (${closestX.toFixed(2)}, ${closestY.toFixed(2)}), distance: ${distance.toFixed(2)}`);
        }
    }
    
    // If we didn't snap, log that information
    if (closestDistance === Infinity) {
        console.log("No lines within snapping threshold");
        return { x, y };
    }
    
    console.log(`Final snap result: point (${x}, ${y}) → (${closestPoint.x.toFixed(2)}, ${closestPoint.y.toFixed(2)}), distance: ${closestDistance.toFixed(2)}`);
    return closestPoint;
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