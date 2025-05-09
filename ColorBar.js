// Color management module
const ColorBarModule = (function() {
    // Access the global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Private functions
    
    // Add a color marker at the specified position
    const addColorMarker = (percentage, color, targetColorbar = null) => {
        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'color-marker';
        marker.style.top = `${percentage}%`;
        marker.style.backgroundColor = color;
        
        // Determine where to store the marker
        let colorMarkers;
        if (targetColorbar) {
            // Add to the specified network's colorbar
            colorMarkers = targetColorbar;
        } else {
            // Add to the central colorbar
            colorMarkers = state.colorMarkers;
        }
        
        // Store in state
        colorMarkers.push({
            y: percentage,
            color: color,
            element: marker
        });
        
        // Sort markers by position (top to bottom)
        colorMarkers.sort((a, b) => a.y - b.y);
        
        // Add to DOM
        elements.colorBar.appendChild(marker);
        
        // Add click event to edit marker
        setupMarkerEvents(marker);
        
        // Update color bar gradient after adding a marker
        updateColorBarGradient();
    };
    
    // Also modify setupMarkerEvents to unselect the point when clicking a marker
	const setupMarkerEvents = (marker) => {
		marker.addEventListener('click', function(e) {
			e.stopPropagation(); // Prevent triggering colorBar click
			
			// Unselect the currently selected point but keep active spline
			if (state.dataStructure && state.dataStructure.selectedPointId !== null) {
				state.dataStructure.selectedPointId = null;
				
				// Redraw canvas to update the UI
				if (typeof redrawCanvas === 'function') {
					redrawCanvas();
				}
			}
			
			// Check if we clicked on the delete button area (upper right corner)
			const rect = marker.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const clickY = e.clientY - rect.top;
			
			// If we clicked in the upper right quadrant (top 25% not 50%) (where the × appears on hover)
			if (clickX > rect.width/1.33 && clickY < rect.height/1.33) {
				handleMarkerDeletion(marker);
				return;
			}
			
			handleMarkerEdit(marker);
		});
	};
    
    // Handle marker deletion
    const handleMarkerDeletion = (marker) => {
        // Get active colorbar
        const activeColorMarkers = getActiveColorMarkersArray();
        
        // Remove this marker
        const index = activeColorMarkers.findIndex(m => m.element === marker);
        if (index !== -1) {
            activeColorMarkers.splice(index, 1);
            elements.colorBar.removeChild(marker);
            updateColorBarGradient();
            
            // If we have any ongoing light animations, update them
            if (state.animatingLights && state.splines.some(spline => spline.length >= 2)) {
                redrawCanvas();
            }
        }
    };
    
    // Handle marker editing
    const handleMarkerEdit = (marker) => {
        // Get active colorbar
        const activeColorMarkers = getActiveColorMarkersArray();
        
        // Find index of this marker for editing
        const index = activeColorMarkers.findIndex(m => m.element === marker);
        if (index !== -1) {
            // Set color picker to the current color
            elements.colorPickerInput.value = activeColorMarkers[index].color;
            
            // Store index for reference
            state.activeColorMarkerIndex = index;
            
            // Show color picker
            elements.colorPickerOverlay.classList.remove('hidden');
            
            // Update existing marker instead of adding new one
            elements.selectColorBtn.textContent = 'Update';
            
            // When updating, override the default behavior
            elements.selectColorBtn.onclick = function() {
                updateColorMarker(state.activeColorMarkerIndex, elements.colorPickerInput.value);
                elements.colorPickerOverlay.classList.add('hidden');
                
                // Reset button text and behavior
                elements.selectColorBtn.textContent = 'Select';
                elements.selectColorBtn.onclick = null;
                
                // If we have any ongoing light animations, update them
                if (state.animatingLights && state.splines.some(spline => spline.length >= 2)) {
                    redrawCanvas();
                }
            };
        }
    };
    
    // Update the color bar gradient based on current markers
    const updateColorBarGradient = () => {
        // Get active colorbar
        const activeColorMarkers = getActiveColorMarkersArray();
        
        if (activeColorMarkers.length === 0) {
            elements.colorBar.style.background = '#f0f0f0'; // Neutral background
            return;
        }
        
        // If only one marker, solid color
        if (activeColorMarkers.length === 1) {
            elements.colorBar.style.background = activeColorMarkers[0].color;
            return;
        }
        
        // Build gradient based on markers
        let gradientStops = '';
        
        // Sort markers by position
        const sortedMarkers = [...activeColorMarkers].sort((a, b) => a.y - b.y);
        
        // Create gradient stops for each marker
        sortedMarkers.forEach((marker, i) => {
            gradientStops += `${marker.color} ${marker.y}%`;
            
            // Add comma separator except for the last item
            if (i < sortedMarkers.length - 1) {
                gradientStops += ', ';
            }
        });
        
        // Apply the gradient
        elements.colorBar.style.background = `linear-gradient(to bottom, ${gradientStops})`;
    };
    
    // Update an existing color marker
    const updateColorMarker = (index, color) => {
        // Get active colorbar
        const activeColorMarkers = getActiveColorMarkersArray();
        
        if (index >= 0 && index < activeColorMarkers.length) {
            activeColorMarkers[index].color = color;
            activeColorMarkers[index].element.style.backgroundColor = color;
            state.activeColorMarkerIndex = -1;
            
            // Update color bar gradient after changing a marker
            updateColorBarGradient();
        }
    };
    
    // Get color based on position in the animation sequence
    const getColorFromMarkers = (position, networkId = null) => {
        // Position is uncapped value representing where in the animation sequence we are
        
        // Determine which colorbar to use
        let targetColorMarkers;
        
        if (state.allowIndependentColors && networkId && state.dataStructure && 
            state.dataStructure.networks) {
            // Find the network by ID
            const network = state.dataStructure.networks.find(n => n.id === networkId);
            if (network && network.colorMarkers) {
                targetColorMarkers = network.colorMarkers;
            } else {
                // Fallback to central colorbar
                targetColorMarkers = state.colorMarkers;
            }
        } else {
            // Use central colorbar
            targetColorMarkers = state.colorMarkers;
        }
        
        // If no markers, use default colors
        if (targetColorMarkers.length === 0) {
            const defaultColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
            return defaultColors[Math.floor(position * defaultColors.length) % defaultColors.length];
        }
        
        // If only one marker, use that color
        if (targetColorMarkers.length === 1) {
            return targetColorMarkers[0].color;
        }
        
        // Apply cycle length to the position
        // This makes the colors reset after a certain number of lights
        // We use modulo to wrap around the position within the cycle length
        const cyclePosition = position / state.cycleLength;
        
        // Position is 0-1, but markers are stored as percentages (0-100)
        const targetPosition = (cyclePosition * 100) % 100;
        
        // Find markers that bound this position
        let lowerMarker = targetColorMarkers[0];
        let upperMarker = targetColorMarkers[targetColorMarkers.length - 1];
        
        for (let i = 0; i < targetColorMarkers.length - 1; i++) {
            if (targetColorMarkers[i].y <= targetPosition && targetColorMarkers[i + 1].y >= targetPosition) {
                lowerMarker = targetColorMarkers[i];
                upperMarker = targetColorMarkers[i + 1];
                break;
            }
        }
        
        // If position is outside the range of markers, use the closest marker
        if (targetPosition <= lowerMarker.y) return lowerMarker.color;
        if (targetPosition >= upperMarker.y) return upperMarker.color;
        
        // Calculate interpolation factor between markers
        const range = upperMarker.y - lowerMarker.y;
        let factor = (targetPosition - lowerMarker.y) / range;
        
        // Interpolate colors (simple RGB interpolation)
        return interpolateColors(lowerMarker.color, upperMarker.color, factor);
    };
    
    // Helper function to interpolate between two colors
    const interpolateColors = (color1, color2, factor) => {
        // Convert hex to RGB
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        // Interpolate
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };
    
    // Handler for color picker "Select" button
	const handleColorSelect = () => {
		// Unselect the currently selected point but keep active spline
		if (state.dataStructure && state.dataStructure.selectedPointId !== null) {
			state.dataStructure.selectedPointId = null;
		}
		
		// Add new color marker at the stored position
		if (state.colorPickerPosition !== null) {
			// Get active colorbar
			const activeColorMarkers = getActiveColorMarkersArray();
			
			addColorMarker(state.colorPickerPosition, elements.colorPickerInput.value, activeColorMarkers);
			state.colorPickerPosition = null;
			elements.colorPickerOverlay.classList.add('hidden');
			
			// If we have any ongoing light animations, update them
			if (state.animatingLights && state.splines.some(spline => spline.length >= 2)) {
				redrawCanvas();
			}
		}
	};
    
    // Handler for color picker "Cancel" button
    const handleColorCancel = () => {
        state.colorPickerPosition = null;
        elements.colorPickerOverlay.classList.add('hidden');
    };
    
    // Toggle independent colors mode
    const toggleIndependentColors = () => {
        // Toggle the state
        state.allowIndependentColors = !state.allowIndependentColors;
        
        // Update button text
        if (elements.toggleIndependentColorsBtn) {
            elements.toggleIndependentColorsBtn.textContent = state.allowIndependentColors 
                ? "Use Shared Colors" 
                : "Use Independent Colors";
        }
        
        // If switching to independent mode, make sure networks have color markers
        if (state.allowIndependentColors) {
            ensureNetworksHaveColorMarkers();
        }
        
        // Update the colorbar display for the active network
        updateColorBarForActiveNetwork();
        
        // Redraw canvas to reflect changes
        if (typeof redrawCanvas === 'function') {
            redrawCanvas();
        }
    };
    
    // Ensure all networks have color markers
    const ensureNetworksHaveColorMarkers = () => {
        if (!state.dataStructure || !state.dataStructure.networks) return;
        
        state.dataStructure.networks.forEach(network => {
            // If this network doesn't have color markers, create a copy from the central colorbar
            if (!network.colorMarkers) {
                network.colorMarkers = [];
                
                // Create a deep copy of central colorbar markers, but don't include the DOM elements
                state.colorMarkers.forEach(marker => {
                    network.colorMarkers.push({
                        y: marker.y,
                        color: marker.color,
                        // Don't copy the DOM element, as we'll create new ones when needed
                        element: null
                    });
                });
            }
        });
    };
    
    // Create DOM elements for a network's colorbar
    const createElementsForNetworkColorbar = (network) => {
        if (!network || !network.colorMarkers) return;
        
        // First, remove any existing markers from the DOM
        clearColorBarDisplay();
        
        // Then, create new elements for each marker in this network's colorbar
        network.colorMarkers.forEach(marker => {
            const element = document.createElement('div');
            element.className = 'color-marker';
            element.style.top = `${marker.y}%`;
            element.style.backgroundColor = marker.color;
            elements.colorBar.appendChild(element);
            
            // Store the element reference in the marker object
            marker.element = element;
            
            // Add click event to edit marker
            setupMarkerEvents(element);
        });
        
        // Update the gradient display
        updateColorBarGradient();
    };
    
    // Update colorbar display for active network
    const updateColorBarForActiveNetwork = () => {
        // Clear the current display
        clearColorBarDisplay();
        
        if (state.allowIndependentColors && state.dataStructure) {
            // Find active network using the active spline ID
            let activeNetwork = null;
            
            if (state.splineCreation && state.splineCreation.activeSplineId) {
                const activeSplineId = state.splineCreation.activeSplineId;
                
                // Find the network containing this spline
                activeNetwork = state.dataStructure.networks.find(network => 
                    network.splineIds && network.splineIds.includes(activeSplineId)
                );
            }
            
            // If no active network found and we have a selected point, try finding by point
            if (!activeNetwork && state.dataStructure.selectedPointId) {
                // Find which network contains this point
                activeNetwork = state.dataStructure.networks.find(network => 
                    network.pointIds && Array.from(network.pointIds).includes(state.dataStructure.selectedPointId)
                );
            }
            
            // If no active network from selection, use the first network
            if (!activeNetwork && state.dataStructure.networks.length > 0) {
                activeNetwork = state.dataStructure.networks[0];
            }
            
            // If we found an active network, display its colorbar
            if (activeNetwork) {
                createElementsForNetworkColorbar(activeNetwork);
                return;
            }
        }
        
        // If we're not using independent colors or couldn't find an active network,
        // display the central colorbar
        displayCentralColorbar();
    };
    
    // Clear the colorbar display
    const clearColorBarDisplay = () => {
        // Remove all color markers from the DOM
        const markers = elements.colorBar.querySelectorAll('.color-marker');
        markers.forEach(marker => {
            elements.colorBar.removeChild(marker);
        });
    };
    
    // Display central colorbar
    const displayCentralColorbar = () => {
        // First clear any existing markers
        clearColorBarDisplay();
        
        // Add elements for each marker in the central colorbar
        state.colorMarkers.forEach(marker => {
            const element = document.createElement('div');
            element.className = 'color-marker';
            element.style.top = `${marker.y}%`;
            element.style.backgroundColor = marker.color;
            elements.colorBar.appendChild(element);
            
            // Store the element reference in the marker object
            marker.element = element;
            
            // Add click event to edit marker
            setupMarkerEvents(element);
        });
        
        // Update the gradient display
        updateColorBarGradient();
    };
    
    // Get the active color markers array to use
    const getActiveColorMarkersArray = () => {
        if (state.allowIndependentColors && state.dataStructure) {
            // Find active network using the active spline ID
            let activeNetwork = null;
            
            if (state.splineCreation && state.splineCreation.activeSplineId) {
                const activeSplineId = state.splineCreation.activeSplineId;
                
                // Find the network containing this spline
                activeNetwork = state.dataStructure.networks.find(network => 
                    network.splineIds && network.splineIds.includes(activeSplineId)
                );
            }
            
            // If no active network found and we have a selected point, try finding by point
            if (!activeNetwork && state.dataStructure.selectedPointId) {
                // Find which network contains this point
                activeNetwork = state.dataStructure.networks.find(network => 
                    network.pointIds && Array.from(network.pointIds).includes(state.dataStructure.selectedPointId)
                );
            }
            
            // If no active network from selection, use the first network
            if (!activeNetwork && state.dataStructure.networks.length > 0) {
                activeNetwork = state.dataStructure.networks[0];
            }
            
            // If we found an active network, use its colorbar
            if (activeNetwork && activeNetwork.colorMarkers) {
                return activeNetwork.colorMarkers;
            }
        }
        
        // Otherwise, use central colorbar
        return state.colorMarkers;
    };
    
    // Initialize event listeners
    const initEventListeners = () => {
        // Color bar click event
		elements.colorBar.addEventListener('click', function(e) {
			const rect = this.getBoundingClientRect();
			const y = e.clientY - rect.top;
			const percentage = (y / rect.height) * 100;
			
			// Unselect the currently selected point but keep active spline
			if (state.dataStructure && state.dataStructure.selectedPointId !== null) {
				state.dataStructure.selectedPointId = null;
				
				// Redraw canvas to update the UI
				if (typeof redrawCanvas === 'function') {
					redrawCanvas();
				}
			}
			
			// Store position for color picker
			state.colorPickerPosition = percentage;
			
			// Show color picker
			elements.colorPickerOverlay.classList.remove('hidden');
		});
        
        // Color Picker Buttons
        elements.selectColorBtn.addEventListener('click', handleColorSelect);
        elements.cancelColorBtn.addEventListener('click', handleColorCancel);
        
        // Toggle independent colors button
        if (elements.toggleIndependentColorsBtn) {
            elements.toggleIndependentColorsBtn.addEventListener('click', toggleIndependentColors);
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initEventListeners();
        },
        
        // Expose methods that need to be called from other modules
        addColorMarker: addColorMarker,
        updateColorBarGradient: updateColorBarGradient,
        getColorFromMarkers: getColorFromMarkers,
        interpolateColors: interpolateColors,
        toggleIndependentColors: toggleIndependentColors,
        updateColorBarForActiveNetwork: updateColorBarForActiveNetwork,
        ensureNetworksHaveColorMarkers: ensureNetworksHaveColorMarkers,
        displayCentralColorbar: displayCentralColorbar,
        
        // Add this function to expose it for other modules
        initializeDefaultColors: function() {
            // Add some default color markers
            addColorMarker(0, '#ff0000');     // Red at top
            addColorMarker(50, '#0000ff');    // Blue at middle
            addColorMarker(100, '#ff0000');   // Red at bottom
        }
    };
})();

// Initialize and expose module
ColorBarModule.init();
window.ColorBarModule = ColorBarModule;

// Expose the module to the global namespace for backwards compatibility
window.addColorMarker = ColorBarModule.addColorMarker;
window.getColorFromMarkers = ColorBarModule.getColorFromMarkers;
window.interpolateColors = ColorBarModule.interpolateColors;
window.toggleIndependentColors = ColorBarModule.toggleIndependentColors;
window.updateColorBarForActiveNetwork = ColorBarModule.updateColorBarForActiveNetwork;
window.displayCentralColorbar = ColorBarModule.displayCentralColorbar;