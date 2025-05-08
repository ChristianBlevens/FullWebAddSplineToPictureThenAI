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
                
                // Only draw splines and control points if we're not in enhance mode
                // This is for the editing view only, not for the final image
                if (!state.inEnhanceMode) {
                    drawEditingVisuals();
                }
                
                // Process and draw lights for all spline networks
                drawNetworkLights(phase);
                
                // Increment phase for animation
                // Adjust phase increment by animation speed
                phase += getDeltaTime() * state.animationSpeed * 5;
                
                // Continue animation
                state.animationId = requestAnimationFrame(animate);
            }
        };
        
        // Start animation loop
        animate();
    };
    
    img.src = state.fullResImage;
}

function getDeltaTime() {
  const currentTime = performance.now();
  if (!getDeltaTime.lastTime) {
    getDeltaTime.lastTime = currentTime;
  }
  
  const deltaTime = (currentTime - getDeltaTime.lastTime) / 1000; // Convert to seconds
  getDeltaTime.lastTime = currentTime;
  
  return deltaTime;
}

function stopLightsAnimation() {
    state.animatingLights = false;
    
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
    }
}

// Draws editing interface elements like splines and control points
function drawEditingVisuals() {
    // Draw all splines with simple lines
    for (const splineId in state.dataStructure.splines) {
        const spline = state.dataStructure.splines[splineId];
        if (spline.pointIds.length >= 2) {
            elements.lightsCtx.beginPath();
            
            // Get first point
            const firstPointId = spline.pointIds[0];
            const firstPoint = state.dataStructure.points[firstPointId];
            elements.lightsCtx.moveTo(firstPoint.x, firstPoint.y);
            
            // Draw lines to all points
            for (let i = 1; i < spline.pointIds.length; i++) {
                const pointId = spline.pointIds[i];
                const point = state.dataStructure.points[pointId];
                elements.lightsCtx.lineTo(point.x, point.y);
            }
            
            // Highlight active spline with a different color
            if (splineId === state.splineCreation.activeSplineId) {
                elements.lightsCtx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                elements.lightsCtx.lineWidth = 2;
            } else {
                elements.lightsCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                elements.lightsCtx.lineWidth = 1;
            }
            
            elements.lightsCtx.stroke();
        }
    }
    
    // Draw control points on top of splines
    for (const pointId in state.dataStructure.points) {
        // Only draw if the point is in use
        if (state.dataStructure.pointsInUse[pointId] > 0) {
            const point = state.dataStructure.points[pointId];
            const isEndpoint = isPointEndpoint(pointId);
            
            // Draw the point
            elements.lightsCtx.beginPath();
            elements.lightsCtx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            
            // Color based on endpoint status
            elements.lightsCtx.fillStyle = isEndpoint ? '#ffff00' : '#ff0000';
            elements.lightsCtx.fill();
            elements.lightsCtx.strokeStyle = 'white';
            elements.lightsCtx.lineWidth = 1;
            elements.lightsCtx.stroke();
            
            // Highlight selected point with blue outline
            if (pointId === state.dataStructure.selectedPointId) {
                elements.lightsCtx.beginPath();
                elements.lightsCtx.arc(point.x, point.y, 7, 0, Math.PI * 2);
                elements.lightsCtx.strokeStyle = '#00ffff';
                elements.lightsCtx.lineWidth = 2;
                elements.lightsCtx.stroke();
            }
        }
    }
}

// Determines if a point is an endpoint (only belongs to one spline)
function isPointEndpoint(pointId) {
    // Count how many splines this point belongs to
    let splineCount = 0;
    for (const splineId in state.dataStructure.splines) {
        const spline = state.dataStructure.splines[splineId];
        if (spline.pointIds.includes(pointId)) {
            splineCount++;
            
            // Also check if it's at the start or end of a spline
            const isFirst = spline.pointIds[0] === pointId;
            const isLast = spline.pointIds[spline.pointIds.length - 1] === pointId;
            
            // If it's in the middle of a spline, it's not an endpoint
            if (!isFirst && !isLast) {
                return false;
            }
        }
    }
    
    // If it belongs to exactly one spline, it's an endpoint
    return splineCount === 1;
}

// Draws Christmas lights for all spline networks
function drawNetworkLights(phase) {
	state.depthSamples = [];
	
    // Process each network separately
    for (const network of state.dataStructure.networks) {
        // Calculate light positions across the entire network
        const networkLightPoints = calculateNetworkLightPoints(network);
        
        // Draw all light points with animations
        networkLightPoints.forEach((point, index) => {
            // Calculate a consistent color position using the accumulated step
            const colorPosition = (point.step + phase) % state.cycleLength;
            const color = getColorFromMarkers(colorPosition);
			//console.log(color);
            
            // Enhanced depth calculation for better 3D effect
            const depth = getDepthAtPoint(point.x, point.y);
            // Size varies based on depth
            const size = 1.2 + (depth * 5.5); // Size between 1.2-6.7px
            
            // Enable lighter composite operation for better blending
            elements.lightsCtx.globalCompositeOperation = 'lighter';
            
            // Draw light core
            elements.lightsCtx.beginPath();
            elements.lightsCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
            elements.lightsCtx.fillStyle = color;
            elements.lightsCtx.fill();
            
            // Add tiny bright center for more intensity
            elements.lightsCtx.beginPath();
            elements.lightsCtx.arc(point.x, point.y, size * 0.4, 0, Math.PI * 2);
            elements.lightsCtx.fillStyle = '#ffffff';
            elements.lightsCtx.globalAlpha = 0.7;
            elements.lightsCtx.fill();
            elements.lightsCtx.globalAlpha = 1.0;
            
            // Add glow effect
            // Extract RGB components from the color
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            
            // Create enhanced radial gradient
            const glowSize = (size + (100 * state.glowSizeFactor)) * depth;
            const baseAlpha = 0.85;
            const gradient = elements.lightsCtx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, glowSize
            );
            
            // Better fade control
            const exponent = 3.5;
            const stepCount = 24;
            
            // Add color stops with improved distribution
            for (let i = 0; i <= stepCount; i++) {
                const position = i / stepCount;
                // Enhanced opacity calculation for better light falloff
                const opacity = baseAlpha * Math.pow(1 - position, exponent);
                
                // Add subtle color shift toward blue for distant lights
                const shift = 0.1 * position;
                const shiftedR = Math.max(0, r * (1 - shift));
                const shiftedG = Math.max(0, g * (1 - shift * 0.5));
                const shiftedB = Math.min(255, b * (1 + shift * 0.2));
                
                gradient.addColorStop(position, `rgba(${shiftedR}, ${shiftedG}, ${shiftedB}, ${opacity})`);
            }
            
            // Draw improved glow
            elements.lightsCtx.beginPath();
            elements.lightsCtx.arc(point.x, point.y, glowSize, 0, Math.PI * 2);
            elements.lightsCtx.fillStyle = gradient;
            elements.lightsCtx.fill();
            
            // Reset composite operation
            elements.lightsCtx.globalCompositeOperation = 'source-over';
        });
    }
}

// Calculates light points for an entire spline network
function calculateNetworkLightPoints(network) {
    if (!network || !network.splineIds || network.splineIds.length === 0) {
        return [];
    }
    
    // All light points for this network
    const lightPoints = [];
    
    // Track which splines have been processed
    const processedSplines = new Set();
    
    // Track accumulated step values at each junction point
    const pointStepValues = {};
    
    // Initialize step value for the starting point if specified
    if (network.startPointId) {
        pointStepValues[network.startPointId] = 0;
    }
    
    // Process each spline in the network
    // We use breadth-first traversal to ensure connected splines are processed together
    const queue = [];
    
    // Start with any spline in the network
    if (network.splineIds.length > 0) {
        queue.push(network.splineIds[0]);
    }
    
    // Process splines in breadth-first order
    while (queue.length > 0) {
        const splineId = queue.shift();
        
        // Skip if already processed
        if (processedSplines.has(splineId)) continue;
        
        const spline = state.dataStructure.splines[splineId];
        if (!spline || spline.pointIds.length < 2) continue;
        
        // Mark as processed
        processedSplines.add(splineId);
        
        // Determine the starting step value for this spline
        let startingStep = 0;
        let direction = 1; // 1 for forward, -1 for reverse
        let startPointId = null;
        
        // Check if either endpoint of this spline has an accumulated step value
        const firstPointId = spline.pointIds[0];
        const lastPointId = spline.pointIds[spline.pointIds.length - 1];
        
        if (pointStepValues[firstPointId] !== undefined) {
            // Start from the first point
            startingStep = pointStepValues[firstPointId];
            direction = 1;
            startPointId = firstPointId;
        } else if (pointStepValues[lastPointId] !== undefined) {
            // Start from the last point
            startingStep = pointStepValues[lastPointId];
            direction = -1; // Process points in reverse
            startPointId = lastPointId;
        } else {
            // No accumulated step values yet, use the first point
            startPointId = firstPointId;
            direction = 1;
            pointStepValues[firstPointId] = 0;
        }
        
        // Calculate light points along this spline
        const splineLightPoints = calculateSplineLightPoints(spline, startingStep, direction, pointStepValues);
        
        // Add light points to the collection
        lightPoints.push(...splineLightPoints);
        
        // Queue any connected splines that haven't been processed
        for (let i = 0; i < spline.pointIds.length; i++) {
            const pointId = spline.pointIds[i];
            
            // Find connected splines
            for (const connectedSplineId of network.splineIds) {
                if (processedSplines.has(connectedSplineId)) continue;
                
                const connectedSpline = state.dataStructure.splines[connectedSplineId];
                if (!connectedSpline) continue;
                
                // Check if this spline contains the point
                if (connectedSpline.pointIds.includes(pointId)) {
                    queue.push(connectedSplineId);
                }
            }
        }
    }
    
    return lightPoints;
}

// Calculates light points along a spline, maintaining step values at junctions
function calculateSplineLightPoints(spline, startingStep, direction, pointStepValues) {
    if (!spline || spline.pointIds.length < 2) return [];
    
    const points = [];
    
    // Apply density factor to threshold for light placement
    const baseThreshold = 5;
    const THRESHOLD = baseThreshold / state.densityFactor;
    const STEP_SIZE = 1; // Step size in pixels
    
    // Ensure valid direction
    direction = direction === -1 ? -1 : 1;
    
    // Get spline points in the right order
    const orderedPointIds = direction === 1 ? 
        [...spline.pointIds] : 
        [...spline.pointIds].reverse();
    
    // Accumulator for the step value
    let stepAccumulator = startingStep;
    let depthAccumulator = 0;
    
    // Process each segment of the spline
    for (let i = 0; i < orderedPointIds.length - 1; i++) {
        const startPointId = orderedPointIds[i];
        const endPointId = orderedPointIds[i + 1];
        
        const startPoint = state.dataStructure.points[startPointId];
        const endPoint = state.dataStructure.points[endPointId];
        
        if (!startPoint || !endPoint) continue;
        
        // Calculate segment properties
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        
        // Skip very short segments
        if (segmentLength < 5) continue;
        
        // Calculate number of steps for this segment
        const steps = Math.ceil(segmentLength / STEP_SIZE);
        
        // Track where the last light was placed
        let lastLightPosition = -1;
        
        // Special case: ensure light at the start point if needed
        if (i === 0 && pointStepValues[startPointId] === startingStep) {
            // Add light at the start of this segment
            points.push({ 
                x: startPoint.x, 
                y: startPoint.y,
                step: stepAccumulator
            });
            lastLightPosition = 0;
			
			state.depthSamples.push(getDepthAtPoint(startPoint.x, startPoint.y))
            
            // Offset accumulator to avoid placing another light immediately
            depthAccumulator = -THRESHOLD * 0.5;
        }

        // Traverse the segment step by step
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            
            // Calculate current position along the segment
            const x = startPoint.x + dx * t;
            const y = startPoint.y + dy * t;
            
            // Sample depth at current position
			const baseDepth = getDepthAtPoint(x, y)
            const depth = 1 - baseDepth;
            
            // Determine if we're near endpoints for special handling
            const isNearEndpoint = (i === 0 && step < 3) || (i === orderedPointIds.length - 2 && step > steps - 3);
            
            // Accumulate depth with adaptive factors
            const depthFactor = isNearEndpoint ? 
                2 + (depth * 1.5) : // Higher factor near endpoints
                0.5 + (depth * 1.5); // Normal factor ranges from 0.5-2.0
            
            depthAccumulator += depthFactor * (STEP_SIZE / 10);
            
            // Check if we should place a light based on accumulated depth
            if (depthAccumulator >= THRESHOLD) {
                // Skip if too close to previous light
                if (lastLightPosition !== -1 && (step - lastLightPosition) < 3) {
                    continue;
                }
                
                // Place a light at this position
                points.push({ 
                    x, 
                    y,
                    step: stepAccumulator
                });
				
				state.depthSamples.push(baseDepth)
                
                // Increment step value for color cycling
                stepAccumulator += 1;
                
                // Subtract threshold for next light placement
                depthAccumulator -= THRESHOLD;
                lastLightPosition = step;
            }
        }
        
        // Special case: ensure light at the end point
        if (i === orderedPointIds.length - 2 && 
            (lastLightPosition === -1 || lastLightPosition < steps - 5)) {
            points.push({ 
                x: endPoint.x, 
                y: endPoint.y,
                step: stepAccumulator
            });
			
			state.depthSamples.push(getDepthAtPoint(endPoint.x, endPoint.y))
            
            // Increment step value
            stepAccumulator += 1;
        }
        
        // Store the accumulated step value at the end point
        pointStepValues[endPointId] = stepAccumulator;
    }
    
    // Return light points for this spline
    return points;
}

function getDepthAtPoint(x, y) {
    // Convert canvas coordinates to depth map coordinates
    // Scale from canvas size to 400x400 depth map size
    const depthX = Math.floor((x / elements.canvas.width) * 400);
    const depthY = Math.floor((y / elements.canvas.height) * 400);
    
    // If we have actual depth data from server
    if (state.depthMap && state.depthMap.depth && Array.isArray(state.depthMap.depth)) {
        // Make sure coordinates are within bounds
        if (depthX >= 0 && depthX < 400 && depthY >= 0 && depthY < 400) {
            // Get depth value from array (assuming row-major order)
            const index = depthY * 400 + depthX;
            if (index >= 0 && index < state.depthMap.depth.length) {
                return state.depthMap.depth[index];
            }
        }
    }
    
    // Fallback to default depth (1)
    return 1;
}