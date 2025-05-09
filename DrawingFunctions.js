// Drawing functions module
const DrawingModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration
    const CONFIG = {
        POINT_SELECTION_THRESHOLD: 20,  // Distance threshold for selecting points
        EXACT_MATCH_THRESHOLD: 0.5,     // Threshold for exact point matching
        SNAP_THRESHOLD: 20,             // Threshold for snapping to lines
        MIN_SEGMENT_LENGTH: 5,          // Minimum length for a valid segment
        DRAG_THRESHOLD_TIME: 200,       // Time to determine drag vs. click (ms)
        CLICK_THRESHOLD_TIME: 200       // Max time for a click (ms)
    };
    
    // Action types for history
    const ActionTypes = {
        CREATE_POINT: 'CREATE_POINT',
        CREATE_SPLINE: 'CREATE_SPLINE',
        ADD_POINT_TO_SPLINE: 'ADD_POINT_TO_SPLINE',
        MOVE_POINT: 'MOVE_POINT'
    };
    
    // Variables to track interaction
    let interactionState = {
        startTime: 0,
        isDragging: false,
        draggedPointId: null,
        originalPointPosition: null
    };
    
    // Initialize the drawing functionality
    const initialize = () => {
        // Initialize data structures if needed
        initializeDataStructures();
        
        // Set up canvas event listeners
        setupCanvasListeners();
        
        // Set up button event listeners
        setupButtonListeners();
    };
    
    // Initialize data structures
    const initializeDataStructures = () => {
        // Make sure state.dataStructure exists
        if (!state.dataStructure) {
            state.dataStructure = {
                nextPointId: 1,       // Auto-incrementing ID for points
                nextSplineId: 1,      // Auto-incrementing ID for splines
                points: {},           // Map of pointId -> {id, x, y}
                splines: {},          // Map of splineId -> {id, pointIds: []}
                networks: [],         // Array of spline network objects
                pointsInUse: {},      // Map of pointId -> count of splines using the point
                selectedPointId: null // Currently selected point
            };
        }
        
        // Action history for undo functionality
        if (!state.actionHistory) {
            state.actionHistory = [];
        }
        
        // Spline creation state
        if (!state.splineCreation) {
            state.splineCreation = {
                activeSplineId: null,        // Currently active spline for addition
                justCreatedNewSpline: false  // Flag to track if we just created a new spline
            };
        }
    };
    
    // Ensure canvas and context are properly initialized
    const ensureCanvasContext = () => {
        if (!elements.canvas) {
            console.warn('Canvas element not found in elements object');
            return false;
        }
        
        if (!elements.ctx) {
            console.log('Canvas context not initialized. Getting context from canvas.');
            elements.ctx = elements.canvas.getContext('2d');
            if (!elements.ctx) {
                console.error('Failed to get canvas context');
                return false;
            }
        }
        
        return true;
    };
    
    // Set up canvas event listeners
    const setupCanvasListeners = () => {
        if (!elements.canvas || !elements.lightsOverlayCanvas) {
            console.error('Canvas elements not available for event setup');
            return;
        }
        
        const canvases = [elements.canvas, elements.lightsOverlayCanvas];
        
        // Add same events to both canvases
        canvases.forEach(canvas => {
            canvas.addEventListener('mousedown', handleInteractionStart);
            canvas.addEventListener('mousemove', handleInteractionMove);
            canvas.addEventListener('mouseup', handleInteractionEnd);
            canvas.addEventListener('touchstart', handleInteractionStart);
            canvas.addEventListener('touchmove', handleInteractionMove);
            canvas.addEventListener('touchend', handleInteractionEnd);
        });
        
        console.log('Canvas event listeners set up');
    };
    
    // Set up button listeners
    const setupButtonListeners = () => {
        if (elements.undoBtn) {
            elements.undoBtn.addEventListener('click', undoLastAction);
        }
        
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', clearPoints);
        }
    };
    
    // Get coordinates from mouse or touch event
    const getEventCoordinates = (e, elementRect) => {
        const scaleX = elements.canvas.width / elementRect.width;
        const scaleY = elements.canvas.height / elementRect.height;
        
        let x, y;
        if (e.type.startsWith('touch')) {
            if (e.type === 'touchend') {
                // For touchend, use changedTouches
                if (e.changedTouches && e.changedTouches.length > 0) {
                    const touch = e.changedTouches[0];
                    x = (touch.clientX - elementRect.left) * scaleX;
                    y = (touch.clientY - elementRect.top) * scaleY;
                } else {
                    return null;
                }
            } else {
                // For touchstart and touchmove
                if (e.touches && e.touches.length > 0) {
                    e.preventDefault(); // Prevent scrolling
                    const touch = e.touches[0];
                    x = (touch.clientX - elementRect.left) * scaleX;
                    y = (touch.clientY - elementRect.top) * scaleY;
                } else {
                    return null;
                }
            }
        } else {
            // Mouse events
            x = (e.clientX - elementRect.left) * scaleX;
            y = (e.clientY - elementRect.top) * scaleY;
        }
        
        return {x, y};
    };
    
    // Handle interaction start (mousedown or touchstart)
    function handleInteractionStart(e) {
        if (state.inEnhanceMode) return;
        
        // Get position from event
        const rect = e.currentTarget.getBoundingClientRect();
        const coords = getEventCoordinates(e, rect);
        if (!coords) return;
        
        // Record start time and check for existing point
        interactionState.startTime = Date.now();
        const existingPointId = findExistingPointId(coords.x, coords.y);
        
        if (existingPointId) {
            // Prepare for drag operation
            interactionState.draggedPointId = existingPointId;
            const point = state.dataStructure.points[existingPointId];
            interactionState.originalPointPosition = { x: point.x, y: point.y };
        } else {
            interactionState.draggedPointId = null;
            interactionState.originalPointPosition = null;
        }
    }
    
    // Handle interaction move (mousemove or touchmove)
    function handleInteractionMove(e) {
        if (state.inEnhanceMode) return;
        
        // Check if we should start dragging
        const interactionDuration = Date.now() - interactionState.startTime;
        
        // Start dragging after threshold time and if we have a valid point
        if (interactionDuration > CONFIG.DRAG_THRESHOLD_TIME && 
            interactionState.draggedPointId && 
            !interactionState.isDragging) {
            interactionState.isDragging = true;
        }
        
        // If dragging, update point position
        if (interactionState.isDragging && interactionState.draggedPointId) {
            // Get current position
            const rect = e.currentTarget.getBoundingClientRect();
            const coords = getEventCoordinates(e, rect);
            if (!coords) return;
            
            // Snap to line
            const snappedPoint = snapToLine(coords.x, coords.y);
            
            // Update point position
            const point = state.dataStructure.points[interactionState.draggedPointId];
            if (point) {
                point.x = snappedPoint.x;
                point.y = snappedPoint.y;
                
                // Record action for undo
                if (!state.actionHistory.find(action => 
                    action.type === ActionTypes.MOVE_POINT && 
                    action.pointId === interactionState.draggedPointId)) {
                    
                    state.actionHistory.push({
                        type: ActionTypes.MOVE_POINT,
                        pointId: interactionState.draggedPointId,
                        fromX: interactionState.originalPointPosition.x,
                        fromY: interactionState.originalPointPosition.y,
                        toX: snappedPoint.x,
                        toY: snappedPoint.y
                    });
                }
                
                // Redraw
                redrawCanvas();
            }
        }
    }
    
    // Handle interaction end (mouseup or touchend)
    function handleInteractionEnd(e) {
        if (state.inEnhanceMode) return;
        
        // Get position from event
        const rect = e.currentTarget.getBoundingClientRect();
        const coords = getEventCoordinates(e, rect);
        if (!coords) return;
        
        // Calculate interaction duration
        const interactionDuration = Date.now() - interactionState.startTime;
        
        // If dragging, end drag operation
        if (interactionState.isDragging) {
            interactionState.isDragging = false;
            interactionState.draggedPointId = null;
            interactionState.originalPointPosition = null;
            
            // Update networks and redraw
            buildSplineNetworks();
            redrawCanvas();
            return;
        }
        
        // If not dragging, process as click
        const isShortPress = interactionDuration < CONFIG.CLICK_THRESHOLD_TIME;
        
        if (isShortPress) {
            const existingPointId = findExistingPointId(coords.x, coords.y);
            
            let finalPoint;
            if (existingPointId) {
                // Use existing point
                const point = state.dataStructure.points[existingPointId];
                finalPoint = { 
                    id: existingPointId,
                    x: point.x, 
                    y: point.y 
                };
            } else {
                // Create new point with snapping
                const snappedCoords = snapToLine(coords.x, coords.y);
                const newPointId = createPoint(snappedCoords.x, snappedCoords.y);
                finalPoint = {
                    id: newPointId,
                    x: snappedCoords.x,
                    y: snappedCoords.y
                };
            }
            
            // Handle the point placement
            handlePointPlacement(finalPoint);
        }
        
        // Reset tracking variables
        interactionState.startTime = 0;
        interactionState.isDragging = false;
        interactionState.draggedPointId = null;
    }
    
    // Find existing point near coordinates
    function findExistingPointId(x, y) {
        const threshold = CONFIG.POINT_SELECTION_THRESHOLD;
        
        for (const pointId in state.dataStructure.points) {
            const point = state.dataStructure.points[pointId];
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            
            if (distance <= threshold) {
                return pointId;
            }
        }
        
        return null;
    }
    
    // Find exact point match
    function findExactPointMatch(x, y) {
        const EXACT_THRESHOLD = CONFIG.EXACT_MATCH_THRESHOLD;
        
        for (const pointId in state.dataStructure.points) {
            const point = state.dataStructure.points[pointId];
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            
            if (distance <= EXACT_THRESHOLD) {
                return pointId;
            }
        }
        
        return null;
    }
    
    // Create a new point
    function createPoint(x, y) {
        // Check for existing point at same location
        const existingPointId = findExactPointMatch(x, y);
        if (existingPointId) {
            return existingPointId;
        }
        
        // Create new point
        const pointId = `p${state.dataStructure.nextPointId++}`;
        state.dataStructure.points[pointId] = {
            id: pointId,
            x: x,
            y: y
        };
        
        // Initialize usage count
        state.dataStructure.pointsInUse[pointId] = 0;
        
        // Record action
        state.actionHistory.push({
            type: ActionTypes.CREATE_POINT,
            pointId: pointId,
            x: x,
            y: y
        });
        
        return pointId;
    }
    
    // Create a new spline
    function createSpline(pointIds) {
        const splineId = `s${state.dataStructure.nextSplineId++}`;
        
        state.dataStructure.splines[splineId] = {
            id: splineId,
            pointIds: [...pointIds]
        };
        
        // Update point usage counts
        pointIds.forEach(pointId => {
            if (state.dataStructure.pointsInUse[pointId] === undefined) {
                state.dataStructure.pointsInUse[pointId] = 0;
            }
            state.dataStructure.pointsInUse[pointId]++;
        });
        
        // Record action
        state.actionHistory.push({
            type: ActionTypes.CREATE_SPLINE,
            splineId: splineId,
            pointIds: [...pointIds]
        });
        
        return splineId;
    }
    
    // Add a point to an existing spline
    function addPointToSpline(splineId, pointId, atStart = false) {
        const spline = state.dataStructure.splines[splineId];
        if (!spline) return false;
        
        // Add the point
        if (atStart) {
            spline.pointIds.unshift(pointId);
        } else {
            spline.pointIds.push(pointId);
        }
        
        // Update point usage count
        if (state.dataStructure.pointsInUse[pointId] === undefined) {
            state.dataStructure.pointsInUse[pointId] = 0;
        }
        state.dataStructure.pointsInUse[pointId]++;
        
        // Record action
        state.actionHistory.push({
            type: ActionTypes.ADD_POINT_TO_SPLINE,
            splineId: splineId,
            pointId: pointId,
            atStart: atStart
        });
        
        return true;
    }
    
    // Handle point placement for spline creation
	function handlePointPlacement(pointObj) {
		const pointId = pointObj.id;
		
		// Check if user clicked an existing point
		const existingPoint = state.dataStructure.points[pointId];
		if (existingPoint && state.dataStructure.pointsInUse[pointId] > 0) {
			// Select this point
			state.dataStructure.selectedPointId = pointId;
			state.splineCreation.justCreatedNewSpline = false;
			
			// Find a spline containing this point to make active
			for (const splineId in state.dataStructure.splines) {
				const spline = state.dataStructure.splines[splineId];
				if (spline.pointIds.includes(pointId)) {
					state.splineCreation.activeSplineId = splineId;
					break;
				}
			}
			
			// Update colorbar display for the active network if in independent mode
			if (state.allowIndependentColors && typeof updateColorBarForActiveNetwork === 'function') {
				updateColorBarForActiveNetwork();
			}
			
			redrawCanvas();
			updateButtonStates();
			return;
		}
		
		// User created a new point
		
		// If we have a selected point, connect to it
		if (state.dataStructure.selectedPointId) {
			handleConnectToSelectedPoint(pointId);
		} 
		// If we just created a new spline and this is the next point, continue that spline
		else if (state.splineCreation.justCreatedNewSpline && 
				 state.splineCreation.activeSplineId) {
			
			continueActiveSpline(pointId);
		} 
		// Create a new spline
		else {
			createSpline([pointId]);
			state.splineCreation.activeSplineId = `s${state.dataStructure.nextSplineId - 1}`;
			state.splineCreation.justCreatedNewSpline = true;
		}
		
		// Build spline networks
		buildSplineNetworks();
		
		// Update colorbar display for the active network if in independent mode
		if (state.allowIndependentColors && typeof updateColorBarForActiveNetwork === 'function') {
			updateColorBarForActiveNetwork();
		}
		
		redrawCanvas();
		updateButtonStates();
	}
    
    // Handle connecting a new point to a selected point
    function handleConnectToSelectedPoint(pointId) {
        const selectedPointId = state.dataStructure.selectedPointId;
        
        // Find splines containing the selected point
        const connectedSplines = [];
        for (const splineId in state.dataStructure.splines) {
            const spline = state.dataStructure.splines[splineId];
            if (spline.pointIds.includes(selectedPointId)) {
                connectedSplines.push({
                    splineId: splineId,
                    spline: spline,
                    isStart: spline.pointIds[0] === selectedPointId,
                    isEnd: spline.pointIds[spline.pointIds.length - 1] === selectedPointId
                });
            }
        }
        
        // Check if the selected point is an endpoint of any spline
        const endpointSplines = connectedSplines.filter(info => info.isStart || info.isEnd);
        
        if (endpointSplines.length > 0) {
            // Extend an existing spline
            const splineInfo = endpointSplines[0];
            if (splineInfo.isStart) {
                addPointToSpline(splineInfo.splineId, pointId, true);
            } else {
                addPointToSpline(splineInfo.splineId, pointId, false);
            }
            
            state.splineCreation.activeSplineId = splineInfo.splineId;
        } else {
            // Create a new branching spline
            createSpline([selectedPointId, pointId]);
            state.splineCreation.activeSplineId = `s${state.dataStructure.nextSplineId - 1}`;
            state.splineCreation.justCreatedNewSpline = true;
        }
        
        // Clear the selected point
        state.dataStructure.selectedPointId = null;
    }
    
    // Continue adding points to the active spline
    function continueActiveSpline(pointId) {
        const splineId = state.splineCreation.activeSplineId;
        const spline = state.dataStructure.splines[splineId];
        
        if (spline) {
            // Add to end of the active spline
            addPointToSpline(splineId, pointId, false);
            
            // Reset the auto-continuation flag
            state.splineCreation.justCreatedNewSpline = false;
        }
    }
    
    // Snap to line function
    function snapToLine(x, y) {
        if (!state.lineData || !state.lineData.lines || !Array.isArray(state.lineData.lines)) {
            return { x, y }; // Return original if no line data
        }
        
        // Scale for canvas
        const canvasWidth = elements.canvas.width;
        const canvasHeight = elements.canvas.height;
        const origWidth = state.lineData.width || 400;
        const origHeight = state.lineData.height || 400;
        const scaleX = canvasWidth / origWidth;
        const scaleY = canvasHeight / origHeight;
        
        let closestDistance = Infinity;
        let closestPoint = { x, y };
        
        // Distance threshold for snapping
        const SNAP_THRESHOLD = CONFIG.SNAP_THRESHOLD;
        
        // Check each line
        for (let i = 0; i < state.lineData.lines.length; i++) {
            const line = state.lineData.lines[i];
            
            // Scale line points
            const x1 = line.x1 * scaleX;
            const y1 = line.y1 * scaleY;
            const x2 = line.x2 * scaleX;
            const y2 = line.y2 * scaleY;
            
            // Skip very short lines
            const segLenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
            if (segLenSq < 0.1) continue;
            
            // Project point onto line
            const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / segLenSq;
            
            // Calculate closest point on line
            let closestX, closestY;
            
            if (t < 0) {
                closestX = x1;
                closestY = y1;
            } else if (t > 1) {
                closestX = x2;
                closestY = y2;
            } else {
                closestX = x1 + t * (x2 - x1);
                closestY = y1 + t * (y2 - y1);
            }
            
            // Calculate distance
            const distance = Math.sqrt((x - closestX) * (x - closestX) + (y - closestY) * (y - closestY));
            
            // If closest so far and within threshold
            if (distance <= SNAP_THRESHOLD && distance < closestDistance) {
                closestDistance = distance;
                closestPoint = { x: closestX, y: closestY };
            }
        }
        
        return closestPoint;
    }
    
    // Redraw the canvas
    function redrawCanvas() {
        // First, ensure canvas and context are available
        if (!ensureCanvasContext()) {
            console.error('Cannot redraw: canvas or context not available');
            return;
        }
        
        // Check if we have complete splines (with at least 2 points)
        const hasCompleteSplines = Object.values(state.dataStructure.splines).some(
            spline => spline.pointIds.length >= 2
        );
        
        // If we have complete splines, let the animation loop handle rendering
        if (!hasCompleteSplines) {
            // Draw directly on the main canvas
            elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            
            // Draw the original image if available
            if (state.fullResImage) {
                const img = new Image();
                img.onload = () => {
                    elements.ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
                };
                img.src = state.fullResImage;
            }
        }
    }
    
    // Update button states based on current data
    function updateButtonStates() {
        // Check if buttons exist before updating them
        const buttonsAvailable = elements.clearBtn && elements.undoBtn && elements.enhanceBtn;
        if (!buttonsAvailable) {
            console.warn('Button elements not available for state update');
            return;
        }
        
        // Count total points in use
        const totalPointsInUse = Object.values(state.dataStructure.pointsInUse)
            .reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);
        
        // Clear button enabled if we have any points in use
        elements.clearBtn.disabled = totalPointsInUse === 0;
        
        // Undo button enabled if we have any history
        elements.undoBtn.disabled = state.actionHistory.length === 0;
        
        // Enhance button enabled if we have at least one spline with 2+ points
        const hasCompleteSpline = Object.values(state.dataStructure.splines).some(
            spline => spline.pointIds.length >= 2
        );
        elements.enhanceBtn.disabled = !hasCompleteSpline;
    }
    
    // Undo the last action
	function undoLastAction() {
		if (state.actionHistory.length === 0) return;
		
		// Get the last action
		const lastAction = state.actionHistory.pop();
		
		switch (lastAction.type) {
			case ActionTypes.CREATE_POINT:
				undoCreatePoint(lastAction);
				break;
				
			case ActionTypes.CREATE_SPLINE:
				undoCreateSpline(lastAction);
				break;
				
			case ActionTypes.ADD_POINT_TO_SPLINE:
				undoAddPointToSpline(lastAction);
				break;
				
			case ActionTypes.MOVE_POINT:
				undoMovePoint(lastAction);
				break;
		}
		
		// Clear selected point
		state.dataStructure.selectedPointId = null;
		
		// Update networks
		buildSplineNetworks();
		
		// Check if any networks exist and update colorbar mode if needed
		if (state.allowIndependentColors && 
			(!state.dataStructure.networks || state.dataStructure.networks.length === 0)) {
			// No networks left, switch back to central colorbar mode
			state.allowIndependentColors = false;
			
			// Update UI
			if (elements.toggleIndependentColorsBtn) {
				elements.toggleIndependentColorsBtn.textContent = "Use Independent Colors";
			}
			
			// Display the central colorbar
			if (typeof displayCentralColorbar === 'function') {
				displayCentralColorbar();
			}
		} else if (state.allowIndependentColors) {
			// Update colorbar display for the active network
			if (typeof updateColorBarForActiveNetwork === 'function') {
				updateColorBarForActiveNetwork();
			}
		}
		
		// Update UI
		redrawCanvas();
		updateButtonStates();
	}
    
    // Undo a CREATE_POINT action
    function undoCreatePoint(action) {
        // Remove point if not in use
        if (state.dataStructure.pointsInUse[action.pointId] === 0) {
            delete state.dataStructure.points[action.pointId];
            delete state.dataStructure.pointsInUse[action.pointId];
        }
    }
    
    // Undo a CREATE_SPLINE action
    function undoCreateSpline(action) {
        // Remove the spline
        const spline = state.dataStructure.splines[action.splineId];
        if (spline) {
            // Decrease usage count for each point
            spline.pointIds.forEach(pointId => {
                if (state.dataStructure.pointsInUse[pointId] > 0) {
                    state.dataStructure.pointsInUse[pointId]--;
                }
            });
            
            // Remove the spline
            delete state.dataStructure.splines[action.splineId];
            
            // Clear active spline if needed
            if (state.splineCreation.activeSplineId === action.splineId) {
                state.splineCreation.activeSplineId = null;
                state.splineCreation.justCreatedNewSpline = false;
            }
        }
    }
    
    // Undo an ADD_POINT_TO_SPLINE action
    function undoAddPointToSpline(action) {
        // Remove the point from the spline
        const targetSpline = state.dataStructure.splines[action.splineId];
        if (targetSpline) {
            // Remove from the beginning or end
            if (action.atStart) {
                targetSpline.pointIds.shift();
            } else {
                targetSpline.pointIds.pop();
            }
            
            // Decrease usage count
            if (state.dataStructure.pointsInUse[action.pointId] > 0) {
                state.dataStructure.pointsInUse[action.pointId]--;
            }
            
            // Remove entire spline if fewer than 2 points
            if (targetSpline.pointIds.length < 2) {
                // Decrease usage count for remaining point
                const remainingPointId = targetSpline.pointIds[0];
                if (state.dataStructure.pointsInUse[remainingPointId] > 0) {
                    state.dataStructure.pointsInUse[remainingPointId]--;
                }
                
                // Remove the spline
                delete state.dataStructure.splines[action.splineId];
                
                // Clear active spline if needed
                if (state.splineCreation.activeSplineId === action.splineId) {
                    state.splineCreation.activeSplineId = null;
                    state.splineCreation.justCreatedNewSpline = false;
                }
            }
        }
    }
    
    // Undo a MOVE_POINT action
    function undoMovePoint(action) {
        // Restore original position
        const point = state.dataStructure.points[action.pointId];
        if (point) {
            point.x = action.fromX;
            point.y = action.fromY;
        }
    }
    
    // Clear all points and splines
	function clearPoints() {
		// Reset data structures
		state.dataStructure.points = {};
		state.dataStructure.splines = {};
		state.dataStructure.pointsInUse = {};
		state.dataStructure.selectedPointId = null;
		state.splineCreation.activeSplineId = null;
		state.splineCreation.justCreatedNewSpline = false;
		
		// Reset networks
		state.dataStructure.networks = [];
		
		// Clear action history
		state.actionHistory = [];
		
		// If using independent colors, switch back to central colorbar
		if (state.allowIndependentColors) {
			state.allowIndependentColors = false;
			
			// Update UI
			if (elements.toggleIndependentColorsBtn) {
				elements.toggleIndependentColorsBtn.textContent = "Use Independent Colors";
			}
			
			// Display the central colorbar
			if (typeof displayCentralColorbar === 'function') {
				displayCentralColorbar();
			}
		}
		
		// Update UI
		redrawCanvas();
		updateButtonStates();
	}
    
    // Build networks of connected splines
	function buildSplineNetworks() {
		// Store old networks to preserve colorbar data
		const oldNetworks = state.dataStructure.networks || [];
		
		// Reset networks
		state.dataStructure.networks = [];
		
		// Create point-to-splines map
		const pointToSplines = createPointToSplinesMap();
		
		// Track processed splines
		const processedSplines = new Set();
		
		// Process each spline to build networks
		for (const splineId in state.dataStructure.splines) {
			// Skip if already processed
			if (processedSplines.has(splineId)) continue;
			
			// Create a new network
			const network = createNewNetwork();
			
			// Use queue for breadth-first traversal
			processNetworkSplines(splineId, network, pointToSplines, processedSplines);
			
			// Finish network processing
			finalizeNetwork(network);
			
			// Try to find a matching old network to copy colorbar data
			if (state.allowIndependentColors) {
				// Try to find a match by splineIds
				const matchingOldNetwork = oldNetworks.find(oldNetwork => {
					// Check if any splines in the new network were also in the old network
					return network.splineIds.some(splineId => 
						oldNetwork.splineIds && oldNetwork.splineIds.includes(splineId)
					);
				});
				
				// If we found a matching old network with colorbar data, copy it
				if (matchingOldNetwork && matchingOldNetwork.colorMarkers) {
					network.colorMarkers = [];
					// Deep copy the colorbar markers (without DOM elements)
					matchingOldNetwork.colorMarkers.forEach(marker => {
						network.colorMarkers.push({
							y: marker.y,
							color: marker.color,
							element: null // We'll recreate DOM elements when needed
						});
					});
				}
			}
			
			// Add the network
			state.dataStructure.networks.push(network);
		}
		
		// Ensure any new networks have colorbar data if in independent mode
		if (state.allowIndependentColors && typeof ensureNetworksHaveColorMarkers === 'function') {
			ensureNetworksHaveColorMarkers();
		}
	}
    
    // Create mapping from points to splines that use them
    function createPointToSplinesMap() {
        const pointToSplines = {};
        
        for (const splineId in state.dataStructure.splines) {
            const spline = state.dataStructure.splines[splineId];
            
            for (const pointId of spline.pointIds) {
                if (!pointToSplines[pointId]) {
                    pointToSplines[pointId] = [];
                }
                pointToSplines[pointId].push(splineId);
            }
        }
        
        return pointToSplines;
    }
    
    // Create a new network object
	function createNewNetwork() {
		const newNetwork = {
			id: `n${state.dataStructure.networks.length + 1}`,
			splineIds: [],
			pointIds: new Set(),
			totalLength: 0,
			startPointId: null,
			endPointIds: []
		};
		
		// Initialize colorMarkers if in independent colors mode
		if (state.allowIndependentColors) {
			newNetwork.colorMarkers = [];
			
			// Create a deep copy of central colorbar markers
			state.colorMarkers.forEach(marker => {
				newNetwork.colorMarkers.push({
					y: marker.y,
					color: marker.color,
					// DOM element will be created when needed
					element: null
				});
			});
		}
		
		return newNetwork;
	}
    
    // Process all splines in a network using breadth-first traversal
    function processNetworkSplines(startSplineId, network, pointToSplines, processedSplines) {
        // Use queue for breadth-first traversal
        const queue = [startSplineId];
        
        while (queue.length > 0) {
            const currentSplineId = queue.shift();
            
            // Skip if already processed
            if (processedSplines.has(currentSplineId)) continue;
            
            // Mark as processed
            processedSplines.add(currentSplineId);
            
            // Add to network
            network.splineIds.push(currentSplineId);
            
            // Process spline points
            const currentSpline = state.dataStructure.splines[currentSplineId];
            if (currentSpline) {
                // Calculate spline length
                calculateSplineLength(currentSpline, network);
                
                // Add points to network
                addSplinePointsToNetwork(currentSpline, network, pointToSplines, queue, processedSplines);
            }
        }
    }
    
    // Calculate length of a spline and add to network total
    function calculateSplineLength(spline, network) {
        for (let i = 0; i < spline.pointIds.length - 1; i++) {
            const point1 = state.dataStructure.points[spline.pointIds[i]];
            const point2 = state.dataStructure.points[spline.pointIds[i + 1]];
            if (point1 && point2) {
                const segmentLength = Math.sqrt(
                    Math.pow(point2.x - point1.x, 2) + 
                    Math.pow(point2.y - point1.y, 2)
                );
                network.totalLength += segmentLength;
            }
        }
    }
    
    // Add spline points to network and queue connected splines
    function addSplinePointsToNetwork(spline, network, pointToSplines, queue, processedSplines) {
        for (const pointId of spline.pointIds) {
            network.pointIds.add(pointId);
            
            // Queue connected splines
            const connectedSplines = pointToSplines[pointId] || [];
            for (const connectedSplineId of connectedSplines) {
                if (!processedSplines.has(connectedSplineId)) {
                    queue.push(connectedSplineId);
                }
            }
        }
    }
    
    // Finalize network processing
    function finalizeNetwork(network) {
        // Convert pointIds Set to Array
        network.pointIds = Array.from(network.pointIds);
        
        // Determine start and end points
        determineNetworkEndpoints(network);
    }
    
    // Determine start and end points for a network
    function determineNetworkEndpoints(network) {
        if (network.splineIds.length > 0) {
            // Start point is first point of first spline
            const firstSpline = state.dataStructure.splines[network.splineIds[0]];
            if (firstSpline && firstSpline.pointIds.length > 0) {
                network.startPointId = firstSpline.pointIds[0];
            }
            
            // Create point-to-splines map for this network
            const networkPointToSplines = {};
            for (const splineId of network.splineIds) {
                const spline = state.dataStructure.splines[splineId];
                if (spline) {
                    for (const pointId of spline.pointIds) {
                        if (!networkPointToSplines[pointId]) {
                            networkPointToSplines[pointId] = [];
                        }
                        networkPointToSplines[pointId].push(splineId);
                    }
                }
            }
            
            // Find endpoints (points in only one spline)
            for (const pointId of network.pointIds) {
                const connectedSplines = networkPointToSplines[pointId] || [];
                if (connectedSplines.length === 1) {
                    // Check if it's an endpoint within its spline
                    const spline = state.dataStructure.splines[connectedSplines[0]];
                    const isFirst = spline.pointIds[0] === pointId;
                    const isLast = spline.pointIds[spline.pointIds.length - 1] === pointId;
                    if (isFirst || isLast) {
                        network.endPointIds.push(pointId);
                    }
                }
            }
        }
    }
    
    // Public API
    return {
        // Initialize the module
        init: initialize,
        
        // Exposed functions for other modules
        setupCanvasListeners: setupCanvasListeners,
        redrawCanvas: redrawCanvas,
        updateButtonStates: updateButtonStates,
        buildSplineNetworks: buildSplineNetworks,
        undoLastAction: undoLastAction,
        clearPoints: clearPoints,
        
        // Utility functions that might be needed elsewhere
        snapToLine: snapToLine,
        findExistingPointId: findExistingPointId,
        
        // Action types (exposed for potential use in other modules)
        ActionTypes: ActionTypes
    };
})();

// Initialize and expose module
DrawingModule.init();
window.DrawingModule = DrawingModule;

// Export functions to global namespace for compatibility
window.setupCanvasListeners = DrawingModule.setupCanvasListeners;
window.redrawCanvas = DrawingModule.redrawCanvas;
window.updateButtonStates = DrawingModule.updateButtonStates;
window.buildSplineNetworks = DrawingModule.buildSplineNetworks;
window.undoLastAction = DrawingModule.undoLastAction;
window.clearPoints = DrawingModule.clearPoints;
window.snapToLine = DrawingModule.snapToLine;
window.findExistingPointId = DrawingModule.findExistingPointId;