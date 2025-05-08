// App Reset module
const ResetAppModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Reset the entire application
    const resetApp = () => {
        // For more reliable reset, just reload the page
        // This is actually more efficient than trying to reset all state manually
        window.location.reload();
    };

    // Handle color picker cancel button
    const handleColorPickerCancel = () => {
        elements.colorPickerOverlay.classList.add('hidden');
        state.colorPickerPosition = null;
        state.activeColorMarkerIndex = -1;
        
        // Reset select button behavior
        elements.selectColorBtn.textContent = 'Select';
        elements.selectColorBtn.onclick = null;
    };
    
    // Initialize event listeners
    const initEventListeners = () => {
        // Reset button
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', resetApp);
        }
        
        // Color picker cancel button
        if (elements.cancelColorBtn) {
            elements.cancelColorBtn.addEventListener('click', handleColorPickerCancel);
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initEventListeners();
        },
        
        // Reset the app
        resetApp: resetApp
    };
})();

// Initialize and expose module
ResetAppModule.init();
window.ResetAppModule = ResetAppModule;