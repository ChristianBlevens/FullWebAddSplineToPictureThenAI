// Christmas Lights animation and rendering module
const ChristmasLightsModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration
    const CONFIG = {
        // Light rendering parameters
        LIGHT_MIN_SIZE: 1.2,
        LIGHT_SIZE_FACTOR: 5.5,
        GLOW_BASE_SIZE: 100,
        GLOW_BASE_ALPHA: 0.85,
        GLOW_FADE_EXPONENT: 3.5,
        GLOW_GRADIENT_STEPS: 24,
        
        // Animation parameters
        PHASE_INCREMENT_FACTOR: 5,
        
        // Default colors in case no color markers are defined
        DEFAULT_COLORS: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
    };
    
    // Performance optimization - cached values
    const cache = {
        depthValues: {},
        lastAnimationTime: 0
    };
    
    // Start the Christmas lights animation
    const startLightsAnimation = () => {
        state.animatingLights = true;
        
        // Load original image
        const img = new Image();
        img.onload = () => {
            let phase = 0;
            cache.lastAnimationTime = performance.now();
            
            // Animation function
            const animate = () => {
                if (!state.animatingLights) return;
                
                // Calculate delta time for smooth animation regardless of frame rate
                const deltaTime = getDeltaTime();
                
                // Draw the lights on the overlay canvas
                renderFrame(phase);
                
                // Increment phase for animation, adjusted by animation speed
				if (window.state.playAnimations) {
					phase += deltaTime * state.animationSpeed * CONFIG.PHASE_INCREMENT_FACTOR;
				}
                
                // Continue animation
                state.animationId = requestAnimationFrame(animate);
            };
            
            // Start animation loop
            animate();
        };
        
        img.src = state.fullResImage;
    };
    
    // Calculate delta time between animation frames
    const getDeltaTime = () => {
        const currentTime = performance.now();
        const deltaTime = (currentTime - cache.lastAnimationTime) / 1000; // Convert to seconds
        cache.lastAnimationTime = currentTime;
        
        // Clamp delta time to avoid huge jumps if tab was inactive
        return Math.min(deltaTime, 0.1);
    };
    
    // Stop the animation loop
    const stopLightsAnimation = () => {
        state.animatingLights = false;
        
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }
    };
    
    // Render a single animation frame
    const renderFrame = (phase) => {
        if (!elements.lightsCtx) return;
        
        // Clear the lights overlay
        elements.lightsCtx.clearRect(0, 0, elements.lightsOverlayCanvas.width, elements.lightsOverlayCanvas.height);
        
        // Only draw editing visuals if not in enhance mode
        if (!state.inEnhanceMode && window.state.showSplines) {
            drawEditingVisuals();
        }
        
        // Draw the network lights with animation
        drawNetworkLights(phase);
    };
    
    // Draw editing interface elements like splines and control points
    const drawEditingVisuals = () => {
        if (!state.dataStructure) return;
        
        // Draw all splines with simple lines
        drawSplines();
        
        // Draw control points on top of splines
        drawControlPoints();
    };
    
    // Draw all splines
    const drawSplines = () => {
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
    };
    
    // Draw all control points
    const drawControlPoints = () => {
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
    };
    
    // Determine if a point is an endpoint (only belongs to one spline)
    const isPointEndpoint = (pointId) => {
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
    };
    
    // Draw Christmas lights for all spline networks
    const drawNetworkLights = (phase) => {
        // Reset depth samples array
        state.depthSamples = [];
        
        // Skip if no networks defined
        if (!state.dataStructure || !state.dataStructure.networks) return;
        
        // Process each network separately
        for (const network of state.dataStructure.networks) {
            // Calculate light positions across the entire network
            const networkLightPoints = calculateNetworkLightPoints(network);
            
            // Draw all light points with animations
            drawLightPoints(networkLightPoints, phase);
        }
    };
    
    // Draw all light points with animations
    const drawLightPoints = (lightPoints, phase) => {
        // Enable lighter composite operation for better blending
        elements.lightsCtx.globalCompositeOperation = 'lighter';
        
        lightPoints.forEach((point, index) => {
            // Calculate a consistent color position using the accumulated step
            const colorPosition = (point.step + phase) % state.cycleLength;
            const color = getColorFromMarkers(colorPosition);
            
            // Enhanced depth calculation for better 3D effect
            const depth = getDepthAtPoint(point.x, point.y);
            
            // Store depth samples for AI enhancement
            state.depthSamples.push(depth);
            
            // Size varies based on depth
            const size = CONFIG.LIGHT_MIN_SIZE + (depth * CONFIG.LIGHT_SIZE_FACTOR);
            
            // Draw the light with glow effect
            drawLightWithGlow(point.x, point.y, size, color, depth);
        });
        
        // Reset composite operation
        elements.lightsCtx.globalCompositeOperation = 'source-over';
    };
    
    // Draw a single light with glow effect
    const drawLightWithGlow = (x, y, size, color, depth) => {
        // Draw light core
        elements.lightsCtx.beginPath();
        elements.lightsCtx.arc(x, y, size, 0, Math.PI * 2);
        elements.lightsCtx.fillStyle = color;
        elements.lightsCtx.fill();
        
        // Add tiny bright center for more intensity
        elements.lightsCtx.beginPath();
        elements.lightsCtx.arc(x, y, size * 0.7, 0, Math.PI * 2);
        elements.lightsCtx.fillStyle = '#ffffff';
        elements.lightsCtx.globalAlpha = 1;
        elements.lightsCtx.fill();
        elements.lightsCtx.globalAlpha = 1.0;
        
        // Add glow effect
        drawGlowEffect(x, y, size, color, depth);
    };
    
    // Draw glow effect for a light
    const drawGlowEffect = (x, y, size, color, depth) => {
        // Extract RGB components from the color
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        
        // Create enhanced radial gradient
        const glowSize = (size + (CONFIG.GLOW_BASE_SIZE * state.glowSizeFactor)) * depth;
        const gradient = elements.lightsCtx.createRadialGradient(
            x, y, 0,
            x, y, glowSize
        );
        
        // Add color stops with improved distribution
        for (let i = 0; i <= CONFIG.GLOW_GRADIENT_STEPS; i++) {
            const position = i / CONFIG.GLOW_GRADIENT_STEPS;
            // Enhanced opacity calculation for better light falloff
            const opacity = CONFIG.GLOW_BASE_ALPHA * Math.pow(1 - position, CONFIG.GLOW_FADE_EXPONENT);
            
            // Add subtle color shift toward blue for distant lights
            const shift = 0.1 * position;
            const shiftedR = Math.max(0, r * (1 - shift));
            const shiftedG = Math.max(0, g * (1 - shift * 0.5));
            const shiftedB = Math.min(255, b * (1 + shift * 0.2));
            
            gradient.addColorStop(position, `rgba(${shiftedR}, ${shiftedG}, ${shiftedB}, ${opacity})`);
        }
        
        // Draw improved glow
        elements.lightsCtx.beginPath();
        elements.lightsCtx.arc(x, y, glowSize, 0, Math.PI * 2);
        elements.lightsCtx.fillStyle = gradient;
        elements.lightsCtx.fill();
    };
    
    // Calculates light points for an entire spline network
    const calculateNetworkLightPoints = (network) => {
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
        
        // Process each spline in the network with breadth-first traversal
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
            const {startingStep, direction, startPointId} = determineSplineStartingPoint(spline, pointStepValues);
            
            // Calculate light points along this spline
            const splineLightPoints = calculateSplineLightPoints(spline, startingStep, direction, pointStepValues);
            
            // Add light points to the collection
            lightPoints.push(...splineLightPoints);
            
            // Queue any connected splines that haven't been processed
            queueConnectedSplines(spline.pointIds, network.splineIds, processedSplines, queue);
        }
        
        return lightPoints;
    };
    
    // Determine the starting point, direction, and step value for a spline
    const determineSplineStartingPoint = (spline, pointStepValues) => {
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
        
        return {startingStep, direction, startPointId};
    };
    
    // Queue connected splines for processing
    const queueConnectedSplines = (pointIds, allSplineIds, processedSplines, queue) => {
        for (let i = 0; i < pointIds.length; i++) {
            const pointId = pointIds[i];
            
            // Find connected splines
            for (const connectedSplineId of allSplineIds) {
                if (processedSplines.has(connectedSplineId)) continue;
                
                const connectedSpline = state.dataStructure.splines[connectedSplineId];
                if (!connectedSpline) continue;
                
                // Check if this spline contains the point
                if (connectedSpline.pointIds.includes(pointId)) {
                    queue.push(connectedSplineId);
                }
            }
        }
    };
    
    // Calculates light points along a spline, maintaining step values at junctions
    const calculateSplineLightPoints = (spline, startingStep, direction, pointStepValues) => {
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
                
                // Get depth for this point
                state.depthSamples.push(getDepthAtPoint(startPoint.x, startPoint.y));
                
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
                const baseDepth = getDepthAtPoint(x, y);
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
                    
                    // Store depth sample for this light
                    state.depthSamples.push(baseDepth);
                    
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
                
                // Store depth sample for this light
                state.depthSamples.push(getDepthAtPoint(endPoint.x, endPoint.y));
                
                // Increment step value
                stepAccumulator += 1;
            }
            
            // Store the accumulated step value at the end point
            pointStepValues[endPointId] = stepAccumulator;
        }
        
        // Return light points for this spline
        return points;
    };
    
    // Get depth at a specific point with caching for performance
    const getDepthAtPoint = (x, y) => {
        // Check cache first
        const cacheKey = `${Math.floor(x)},${Math.floor(y)}`;
        if (cache.depthValues[cacheKey] !== undefined) {
            return cache.depthValues[cacheKey];
        }
        
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
                    const depth = state.depthMap.depth[index];
                    // Store in cache
                    cache.depthValues[cacheKey] = depth;
                    return depth;
                }
            }
        }
        
        // Fallback to default depth (1)
        cache.depthValues[cacheKey] = 1;
        return 1;
    };
    
    // Clear the depth value cache
    const clearDepthCache = () => {
        cache.depthValues = {};
    };
	
	// Initialize event listeners
    const initEventListeners = () => {
        // Toggle animation button
        if (elements.toggleAnimationBtn) {
            elements.toggleAnimationBtn.addEventListener('click', toggleAnimation);
        }
        
        // Toggle splines button
        if (elements.toggleSplinesBtn) {
            elements.toggleSplinesBtn.addEventListener('click', toggleSplines);
        }
    };
	
	// Function to toggle animation state
    const toggleAnimation = () => {
        // Toggle the animation state
        window.state.playAnimations = !window.state.playAnimations;
        
        // Update the button text
        if (elements.toggleAnimationBtn) {
            elements.toggleAnimationBtn.textContent = state.playAnimations ? "Pause Animation" : "Play Animation";
        }
    };
    
    // Function to toggle splines visibility
    const toggleSplines = () => {
        // Toggle the splines visibility state
        window.state.showSplines = !window.state.showSplines;
        
        // Update the button text
        if (elements.toggleSplinesBtn) {
            elements.toggleSplinesBtn.textContent = state.showSplines ? "Hide Splines" : "Show Splines";
        }
    };
    
    // Public API
    return {
		// Initialize the module
        init: function() {
            initEventListeners();
        },
		
        // Start and stop animation
        startLightsAnimation: startLightsAnimation,
        stopLightsAnimation: stopLightsAnimation,
        
        // Rendering functions
        redrawCanvas: function() {
            // Clear the cache when redrawing
            clearDepthCache();
            
            // Redraw the current frame
            if (state.animatingLights) {
                renderFrame(0); // Redraw with phase 0 for immediate update
            }
        },
        
        // Utility functions
        getDepthAtPoint: getDepthAtPoint,
        
        // For testing
        _clearCache: clearDepthCache
    };
})();

// Initialize and expose module
ChristmasLightsModule.init();
window.ChristmasLightsModule = ChristmasLightsModule;

// Expose the module to the global namespace for backwards compatibility
window.startLightsAnimation = ChristmasLightsModule.startLightsAnimation;
window.stopLightsAnimation = ChristmasLightsModule.stopLightsAnimation;
window.redrawCanvas = ChristmasLightsModule.redrawCanvas;
window.getDepthAtPoint = ChristmasLightsModule.getDepthAtPoint;