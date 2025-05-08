// Tab Navigation module
const TabNavigationModule = (function() {
    // Access global state and elements for compatibility
    const state = window.state;
    const elements = window.elements;
    
    // Tab types
    const TAB_TYPES = {
        CAMERA: 'camera',
        FILE: 'file'
    };
    
    // Switch to camera tab
    const switchToCameraTab = () => {
        // Skip if already on camera tab
        if (state.mode === TAB_TYPES.CAMERA) return;
        
        // Update state
        state.mode = TAB_TYPES.CAMERA;
        
        // Update UI
        updateTabUI(TAB_TYPES.CAMERA);
    };
    
    // Switch to file upload tab
    const switchToFileTab = () => {
        // Skip if already on file tab
        if (state.mode === TAB_TYPES.FILE) return;
        
        // Stop camera if active
        if (typeof stopCamera === 'function') {
            stopCamera();
        }
        
        // Update state
        state.mode = TAB_TYPES.FILE;
        
        // Update UI
        updateTabUI(TAB_TYPES.FILE);
    };
    
    // Update UI when switching tabs
    const updateTabUI = (activeTab) => {
        // Update tab classes
        if (activeTab === TAB_TYPES.CAMERA) {
            elements.cameraTab.classList.add('active');
            elements.fileTab.classList.remove('active');
            
            // Show camera view, hide file view
            elements.cameraView.classList.remove('hidden');
            elements.fileView.classList.add('hidden');
        } else {
            elements.fileTab.classList.add('active');
            elements.cameraTab.classList.remove('active');
            
            // Show file view, hide camera view
            elements.fileView.classList.remove('hidden');
            elements.cameraView.classList.add('hidden');
        }
    };
    
    // Initialize event listeners
    const initEventListeners = () => {
        // Camera tab click event
        if (elements.cameraTab) {
            elements.cameraTab.addEventListener('click', switchToCameraTab);
        }
        
        // File tab click event
        if (elements.fileTab) {
            elements.fileTab.addEventListener('click', switchToFileTab);
        }
    };
    
    // Public API
    return {
        // Initialize the module
        init: function() {
            initEventListeners();
        },
        
        // Tab switching functions exposed for other modules
        switchToCameraTab: switchToCameraTab,
        switchToFileTab: switchToFileTab,
        
        // Tab types constant
        TAB_TYPES: TAB_TYPES
    };
})();

// Initialize and expose module
TabNavigationModule.init();
window.TabNavigationModule = TabNavigationModule;