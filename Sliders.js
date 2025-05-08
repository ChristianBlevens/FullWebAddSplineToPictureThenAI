// Sliders control module
const SlidersModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Configuration
    const SLIDER_CONFIG = {
        DENSITY: {
            element: 'densitySlider',
            stateProperty: 'densityFactor',
            defaultValue: 1.0,
            min: 0.5,
            max: 2
        },
        SPEED: {
            element: 'speedSlider',
            stateProperty: 'animationSpeed',
            defaultValue: 1.0,
            min: 0.1,
            max: 2
        },
        GLOW_SIZE: {
            element: 'glowSizeSlider',
            stateProperty: 'glowSizeFactor',
            defaultValue: 1.0,
            min: 0.5,
            max: 3
        }
    };
    
    // Handle slider value change
    const handleSliderChange = (sliderType, event) => {
        const config = SLIDER_CONFIG[sliderType];
        if (!config) return;
        
        // Update state with slider value
        const value = parseFloat(event.target.value);
        state[config.stateProperty] = value;
        
        // Redraw canvas if we have any ongoing light animations
        if (sliderType !== 'SPEED' && // Speed doesn't need immediate redraw
            state.animatingLights && 
            state.splines.some(spline => spline.length >= 2)) {
            if (typeof redrawCanvas === 'function') {
                redrawCanvas();
            }
        }
    };
    
    // Create handlers for each slider
    const createSliderHandlers = () => {
        // Density slider handler
        const handleDensityChange = (event) => handleSliderChange('DENSITY', event);
        
        // Speed slider handler
        const handleSpeedChange = (event) => handleSliderChange('SPEED', event);
        
        // Glow size slider handler
        const handleGlowSizeChange = (event) => handleSliderChange('GLOW_SIZE', event);
        
        return {
            densityHandler: handleDensityChange,
            speedHandler: handleSpeedChange,
            glowSizeHandler: handleGlowSizeChange
        };
    };
    
    // Handle touch start to prevent scrolling
    const handleTouchStart = (event) => {
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    };
    
    // Handle touch end to re-enable scrolling
    const handleTouchEnd = (event) => {
        document.body.style.overflow = ''; // Enable scrolling
    };
    
    // Initialize sliders with default values
    const initializeSliders = () => {
        // Set default values on elements
        Object.keys(SLIDER_CONFIG).forEach(key => {
            const config = SLIDER_CONFIG[key];
            const slider = elements[config.element];
            
            if (slider) {
                slider.value = config.defaultValue;
                state[config.stateProperty] = config.defaultValue;
            }
        });
    };
    
    // Initialize event listeners
    const initEventListeners = () => {
        // Create handlers
        const handlers = createSliderHandlers();
        
        // Density slider
        if (elements.densitySlider) {
            elements.densitySlider.addEventListener('input', handlers.densityHandler);
            elements.densitySlider.addEventListener('touchstart', handleTouchStart);
            elements.densitySlider.addEventListener('touchend', handleTouchEnd);
        }
        
        // Speed slider
        if (elements.speedSlider) {
            elements.speedSlider.addEventListener('input', handlers.speedHandler);
            elements.speedSlider.addEventListener('touchstart', handleTouchStart);
            elements.speedSlider.addEventListener('touchend', handleTouchEnd);
        }
        
        // Glow size slider
        if (elements.glowSizeSlider) {
            elements.glowSizeSlider.addEventListener('input', handlers.glowSizeHandler);
            elements.glowSizeSlider.addEventListener('touchstart', handleTouchStart);
            elements.glowSizeSlider.addEventListener('touchend', handleTouchEnd);
        }
    };
    
    // Reset all sliders to default values
    const resetSliders = () => {
        Object.keys(SLIDER_CONFIG).forEach(key => {
            const config = SLIDER_CONFIG[key];
            const slider = elements[config.element];
            
            if (slider) {
                slider.value = config.defaultValue;
                state[config.stateProperty] = config.defaultValue;
            }
        });
        
        // Redraw canvas if needed
        if (state.animatingLights && 
            state.splines.some(spline => spline.length >= 2) &&
            typeof redrawCanvas === 'function') {
            redrawCanvas();
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initializeSliders();
            initEventListeners();
        },
        
        // Reset sliders to default values
        resetSliders: resetSliders,
        
        // Get configuration for testing/debugging
        getConfig: () => SLIDER_CONFIG
    };
})();

// Initialize and expose module
SlidersModule.init();
window.SlidersModule = SlidersModule;