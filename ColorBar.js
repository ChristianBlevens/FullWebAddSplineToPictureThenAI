// Color management module
const ColorBarModule = (function() {
    // Access the global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Private functions
    
    // Add a color marker at the specified position
    const addColorMarker = (percentage, color) => {
        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'color-marker';
        marker.style.top = `${percentage}%`;
        marker.style.backgroundColor = color;
        
        // Store in state
        state.colorMarkers.push({
            y: percentage,
            color: color,
            element: marker
        });
        
        // Sort markers by position (top to bottom)
        state.colorMarkers.sort((a, b) => a.y - b.y);
        
        // Add to DOM
        elements.colorBar.appendChild(marker);
        
        // Add click event to edit marker
        setupMarkerEvents(marker);
        
        // Update color bar gradient after adding a marker
        updateColorBarGradient();
    };
    
    // Setup click events for an individual marker
    const setupMarkerEvents = (marker) => {
        marker.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent triggering colorBar click
            
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
        // Remove this marker
        const index = state.colorMarkers.findIndex(m => m.element === marker);
        if (index !== -1) {
            state.colorMarkers.splice(index, 1);
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
        // Find index of this marker for editing
        const index = state.colorMarkers.findIndex(m => m.element === marker);
        if (index !== -1) {
            // Set color picker to the current color
            elements.colorPickerInput.value = state.colorMarkers[index].color;
            
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
        if (state.colorMarkers.length === 0) {
            elements.colorBar.style.background = '#f0f0f0'; // Neutral background
            return;
        }
        
        // If only one marker, solid color
        if (state.colorMarkers.length === 1) {
            elements.colorBar.style.background = state.colorMarkers[0].color;
            return;
        }
        
        // Build gradient based on markers
        let gradientStops = '';
        
        // Sort markers by position
        const sortedMarkers = [...state.colorMarkers].sort((a, b) => a.y - b.y);
        
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
        if (index >= 0 && index < state.colorMarkers.length) {
            state.colorMarkers[index].color = color;
            state.colorMarkers[index].element.style.backgroundColor = color;
            state.activeColorMarkerIndex = -1;
            
            // Update color bar gradient after changing a marker
            updateColorBarGradient();
        }
    };
    
    // Get color based on position in the animation sequence
    const getColorFromMarkers = (position) => {
        // Position is uncapped value representing where in the animation sequence we are
        
        // If no markers, use default colors
        if (state.colorMarkers.length === 0) {
            const defaultColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
            return defaultColors[Math.floor(position * defaultColors.length) % defaultColors.length];
        }
        
        // If only one marker, use that color
        if (state.colorMarkers.length === 1) {
            return state.colorMarkers[0].color;
        }
        
        // Apply cycle length to the position
        // This makes the colors reset after a certain number of lights
        // We use modulo to wrap around the position within the cycle length
        const cyclePosition = position / state.cycleLength;
        
        // Position is 0-1, but markers are stored as percentages (0-100)
        const targetPosition = (cyclePosition * 100) % 100;
        
        // Find markers that bound this position
        let lowerMarker = state.colorMarkers[0];
        let upperMarker = state.colorMarkers[state.colorMarkers.length - 1];
        
        for (let i = 0; i < state.colorMarkers.length - 1; i++) {
            if (state.colorMarkers[i].y <= targetPosition && state.colorMarkers[i + 1].y >= targetPosition) {
                lowerMarker = state.colorMarkers[i];
                upperMarker = state.colorMarkers[i + 1];
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
        // Add new color marker at the stored position
        if (state.colorPickerPosition !== null) {
            addColorMarker(state.colorPickerPosition, elements.colorPickerInput.value);
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
    
    // Initialize event listeners
    const initEventListeners = () => {
        // Color bar click event
        elements.colorBar.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const percentage = (y / rect.height) * 100;
            
            // Store position for color picker
            state.colorPickerPosition = percentage;
            
            // Show color picker
            elements.colorPickerOverlay.classList.remove('hidden');
        });
        
        // Color Picker Buttons
        elements.selectColorBtn.addEventListener('click', handleColorSelect);
        elements.cancelColorBtn.addEventListener('click', handleColorCancel);
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