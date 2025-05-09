# Christmas Lights Photo App

Add festive Christmas lights to your photos with this interactive web application. Draw light paths on your images and enhance them with AI to create beautiful holiday displays.

Base Image           |     Edited Image           |  Enhanced Image
:-------------------------:|:-------------------------:|:-------------------------:
![Base Photo](https://i.imgur.com/pb87Imr.png)  |  ![Christmas Lights Photo](https://i.imgur.com/SMNiBJf.jpeg)  |  ![Christmas Lights Photo Enhanced](https://i.imgur.com/ppfNj0M.png)

## Table of Contents

- [Quick Start Guide](#quick-start-guide)
- [Detailed User Guide](#detailed-user-guide)
  - [Getting Started](#getting-started)
  - [Image Input Methods](#image-input-methods)
  - [Editing Interface](#editing-interface)
  - [Customizing Light Properties](#customizing-light-properties)
  - [Enhancing Your Image](#enhancing-your-image)
  - [Saving Your Creation](#saving-your-creation)
  - [Advanced Interactions](#advanced-interactions)
- [Technical Documentation](#technical-documentation)
  - [Core Files](#core-files)
  - [Input and Image Handling](#input-and-image-handling)
  - [Drawing and Interaction](#drawing-and-interaction)
  - [Enhancement and UI Control](#enhancement-and-ui-control)

## Quick Start Guide

### What It Does
Add animated Christmas lights to your photos and enhance them with AI.

### 5 Simple Steps

1. **Get a Photo**
   - Click "Use Camera" to take a photo
   - OR click "Upload Image" to use an existing photo

2. **Draw Light Paths**
   - Click on your image to place points
   - Points connect automatically to create light paths
   - Click existing points to branch or extend paths
   - Drag existing points to reposition them

3. **Customize Lights**
   - Use left sidebar sliders to adjust density, speed, and glow
   - Click color bar to add/change colors for your lights

4. **Enhance Your Image**
   - Click "Enhance Image" when you're happy with your design
   - Wait for AI processing (about 15-30 seconds)

5. **Download**
   - Click "Download Image" to save your creation

### Tips
- "Toggle Line Data" helps you place lights along edges of buildings
- "Undo" removes your last action
- "Clear All" removes all lights to start over

That's it! Enjoy creating your custom Christmas light display.

## Detailed User Guide

### Getting Started

When you first open the app, you'll see:
- The title "Christmas Lights Photo App" at the top
- Two tabs labeled "Use Camera" and "Upload Image"
- The "Use Camera" tab is selected by default

The interface is designed with a clean, modern aesthetic using a light color scheme with blue and green accent colors for buttons and interactive elements.

### Image Input Methods

#### Using Your Camera

1. **Starting the Camera**:
   - In the "Use Camera" tab, you'll see a camera icon placeholder with text "Camera inactive"
   - Click the green "Start Camera" button
   - Your browser will prompt for camera permissions - you must allow this for the app to function
   - If you deny permission, an error message will appear explaining the issue

2. **Camera View**:
   - Once permissions are granted, your device's camera feed will appear in the view
   - The app defaults to your rear-facing camera (if available) as it's typically better for photos
   - The "Start Camera" button is replaced with a blue "Take Photo" button

3. **Taking a Photo**:
   - Position your device to frame the area where you want to add Christmas lights
   - Click the "Take Photo" button to capture the image
   - The camera will immediately stop after capturing to save resources

#### Uploading an Image

1. **Selecting the Upload Tab**:
   - Click the "Upload Image" tab at the top of the screen
   - The interface changes to show an upload icon with "Upload an image" text

2. **Choosing a File**:
   - Click the "Choose Image" button
   - Your device's file browser will open
   - The app accepts standard image formats (JPG, PNG, GIF, etc.)
   - Select your desired image and confirm

3. **Image Preview**:
   - After selection, your image appears in the preview area
   - A green "Use This Image" button appears below the preview
   - Click this button to proceed to the editing phase

### Editing Interface

After providing an image through either method, the app transitions to the editing view where you'll create and customize your Christmas lights.

#### Layout Overview

The editing interface consists of:
- A main canvas showing your image where you'll draw light paths
- A sidebar on the left with control sliders and color settings
- A row of control buttons at the bottom
- An instruction text above the buttons
- Multiple invisible overlay canvases for different visualizations

#### Processing Stage

1. **Initial Processing**:
   - The app shows a "Processing image..." overlay with a progress bar
   - During this time, the app is:
     - Sending your image to servers for depth analysis (detecting 3D structure)
     - Detecting lines in the image to help with light placement
     - Preparing the canvas for drawing
   - This typically takes 3-10 seconds depending on your connection speed
   - If server connection fails, the app will enter a "basic mode" and notify you

2. **Canvas Preparation**:
   - Your image is resized to fit the square canvas area
   - Multiple canvas layers are initialized:
     - Base canvas with your image
     - Lights overlay for the animated lights
     - Depth overlay (hidden by default) showing 3D structure
     - Line overlay (hidden by default) showing detected edges

#### Drawing Light Paths

Once processing completes, you'll see the instruction "Click to add points for your Christmas lights" and can begin creating your light patterns.

1. **Basic Point Placement**:
   - Click anywhere on your image to place a light point
   - The first click creates a starting point
   - The second click creates another point and connects them with a line
   - Each subsequent click extends the path by adding more connected points
   - You're essentially drawing paths along which lights will be displayed

2. **Snapping to Lines**:
   - The app helps you align points to detected lines in the image
   - When clicking near a detected line (like a roof edge), your point will "snap" to it
   - This creates more natural-looking light placements along architectural features
   - You can see detected lines by clicking the "Toggle Line Data" button

3. **Creating Multiple Paths**:
   - To start a new, separate light path, click away from existing paths
   - To branch a path, click on an existing point and then click elsewhere
   - To connect separate paths, click on an endpoint of one path and then an endpoint of another

4. **Editing Points**:
   - Click and drag any existing point to move it
   - Points will still snap to detected lines when moved near them
   - The connected light paths update in real-time as you move points

5. **Visualizing Depth**:
   - Click the "Toggle Depth Map" button to see the depth analysis
   - Brighter areas are detected as closer to the camera
   - Darker areas are detected as farther away
   - This affects how lights are rendered (closer lights appear larger)

6. **Control Buttons**:
   - "Undo": Removes the last action (point placement, movement, etc.)
   - "Clear All": Removes all points and paths, letting you start over
   - "Start Over": Returns to the initial screen to choose a new image
   - "Toggle Depth Map": Shows/hides the depth visualization
   - "Toggle Line Data": Shows/hides the detected line visualization

#### Real-time Light Animation

As you draw paths, Christmas lights automatically animate along them:

1. **Light Placement**:
   - Lights appear as colored dots with glowing effects along your drawn paths
   - The lights are spaced according to the current density setting
   - They're sized according to the depth map (larger in foreground, smaller in background)
   - Lights animate with a twinkling motion along the paths

2. **Animation Controls**:
   - "Pause Animation" toggles the animation on/off (button text changes accordingly)
   - "Hide Splines" toggles the visibility of your drawn paths (button text changes accordingly)

#### Downloading The Current Canvas
At any time, you can download the current canvas state (with lights, splines, depthmap, etc) as a PNG image

### Customizing Light Properties

The sidebar provides controls to customize your Christmas lights:

#### Density Slider

Located at the top of the sidebar:
- Slide up to increase light density (more lights along each path)
- Slide down to decrease light density (fewer lights along each path)
- Default value is center position (1.0x density)
- Range is from 0.5x (sparse) to 2.0x (dense)
- Changes apply instantly to all lights

#### Color Bar

Located in the middle of the sidebar:
- The color bar shows the current color gradient used for lights
- By default, it's initialized with red at top, blue in middle, red at bottom
- Click anywhere on the color bar to add a new color marker
- When clicked:
  - A color picker overlay appears
  - Select your desired color
  - Click "Select" to apply the color at that position
  - Click "Cancel" to exit without changes

- **Managing Color Markers**:
  - Each marker appears as a colored dot on the right side of the bar
  - Click a marker to edit its color (picker will show current color)
  - Click the top-right of a marker (where an "×" appears on hover) to delete it
  - Colors between markers are automatically blended
  - Lights change color based on their position in the animation sequence

#### Speed Slider

Located below the color bar:
- Slide up to increase animation speed
- Slide down to decrease animation speed
- Default value is center position (1.0x speed)
- Range is from 0.1x (very slow) to 2.0x (very fast)
- Affects how quickly lights cycle through the pattern

#### Glow Size Slider

Located at the bottom of the sidebar:
- Slide up to increase the glow size around each light
- Slide down to decrease the glow size
- Default value is center position (1.0x size)
- Range is from 0.5x (subtle glow) to 3.0x (large glow)
- Changes apply instantly to all lights

### Enhancing Your Image

Once you're satisfied with your light setup, you can apply AI enhancement:

1. **Starting Enhancement**:
   - Click the green "Enhance Image" button (only active once you've created light paths)
   - A processing overlay appears with the message "Enhancing with AI... This may take a few seconds"
   - This process sends your image and light overlay to the Stability AI API
   - The enhancement process typically takes 15-30 seconds

2. **Enhancement Process**:
   - During enhancement, the app:
     - Creates a combined image with your photo and lights
     - Communicates with the Stability AI API
     - Uses the depth information to create a more realistic effect
     - Applies artistic enhancements to make the lights pop
     - Adjusts the scene lighting to create a nighttime effect

3. **Result View**:
   - When complete, the enhanced image replaces your original
   - The instruction text changes to "Your enhanced image is ready!"
   - Your original drawing tools and controls are hidden

### Saving Your Creation

1. **Downloading Your Image**:
   - Click the blue "Download Image" button
   - The enhanced image is saved to your device with the filename "christmas-lights-photo-enhanced.png"
   - If enhancement failed for any reason, you'll still be able to download the non-enhanced version

2. **Starting Over**:
   - To create another image, click the "Start Over" button
   - This resets the app completely and returns you to the initial screen

### Advanced Interactions

#### Touch Support
- The app fully supports touch interactions on mobile devices
- You can draw, move points, adjust sliders, and control all features via touch
- Sliders have special touch handling to prevent page scrolling while adjusting

#### Network Creation
- When drawing paths, you can create complex networks of connected lights
- Lights will flow through the entire network in a consistent pattern
- You can create loops, branches, and multiple isolated networks
- Color cycling is synchronized across connected paths

#### Error Handling
- If servers are unavailable, the app falls back to basic mode
- If camera access fails, detailed error messages explain the issue
- If enhancement fails, you can still download the non-enhanced version
- All error states provide actionable information to the user

#### Technical Details
- The app caches depth values for better performance
- Animations use request/cancelAnimationFrame for smooth rendering
- The light rendering uses "lighter" composite mode for better glow effects
- Depth and line data are downsized for faster server processing

#### Browser and Device Support
- The app works on modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices are fully supported with responsive layout adjustments
- Camera functionality requires a device with a camera and browser permissions
- Processing speed varies based on device capabilities and connection speed

## Technical Documentation

### Core Files

#### `index.html`
- **Purpose**: Defines the application's structure and UI components
- **Key Components**:
  - Tab navigation system
  - Camera and file upload views
  - Editor interface with canvas layers
  - Control sidebar with sliders
  - Button panels and overlays
- **Functionality**: Provides the visual structure and UI elements that all other JavaScript modules interact with
- **Integration**: Acts as the container for all visual elements and loads the main JavaScript file

#### `main.js`
- **Purpose**: Application entry point and core module
- **Key Functions**:
  - Initializes the global state object
  - Creates DOM element cache
  - Sets up data structures
  - Loads all other JavaScript modules in sequence
- **Implementation**: Uses an IIFE pattern for encapsulation
- **Integration**: Acts as the "glue" between modules, providing centralized state management

#### `styles.css`
- **Purpose**: Defines the visual styling for all UI components
- **Key Styles**:
  - Layout for different views and containers
  - Button styles and variants
  - Vertical slider controls
  - Canvas overlays and positioning
  - Responsive layouts for different screen sizes
- **Implementation**: Uses modern CSS with flexbox layouts
- **Integration**: Provides consistent visual styling across the application

### Input and Image Handling

#### `CameraFunctions.js`
- **Purpose**: Manages camera access and photo capture
- **Key Functions**:
  - `startCamera()`: Requests camera access with appropriate permissions
  - `stopCamera()`: Releases camera resources
  - `captureImage()`: Takes a photo from the video stream
- **Implementation**: Uses the MediaDevices API for camera access
- **Integration**: Provides camera-based image input for the application

#### `FileUpload.js`
- **Purpose**: Handles file selection and image upload
- **Key Functions**:
  - `handleFileSelect()`: Processes selected image files
  - `showImagePreview()`: Displays the selected image
  - `useUploadedImage()`: Passes the image to the main handler
- **Implementation**: Uses the File API for image handling
- **Integration**: Provides file-based image input for the application

#### `ImageHandler.js`
- **Purpose**: Centralizes image processing for both input methods
- **Key Functions**:
  - `handleImage()`: Main function that processes images from any source
  - `cropImageToSquare()`: Ensures consistent image dimensions
- **Implementation**: Uses canvas operations for image manipulation
- **Integration**: Creates a unified entry point for images regardless of source

#### `ImageProcessing.js`
- **Purpose**: Handles advanced image processing using server APIs
- **Key Functions**:
  - `processImage()`: Initiates server-based processing
  - `fetchDepthMap()`: Gets depth information from a server API
  - `fetchLineData()`: Gets line detection data from a server API
  - `initializeDepthMap()`: Visualizes the depth information
  - `initializeLineData()`: Visualizes the detected lines
- **Implementation**: Uses fetch API for server communication and canvas for visualization
- **Integration**: Adds intelligence to the image by retrieving depth and edge information

### Drawing and Interaction

#### `DrawingFunctions.js`
- **Purpose**: Manages user interaction for drawing light paths
- **Key Functions**:
  - `handleInteractionStart/Move/End()`: Processes user inputs
  - `handlePointPlacement()`: Places points based on user clicks
  - `snapToLine()`: Aligns points with detected lines
  - `createPoint()`, `createSpline()`: Manages data structures
  - `buildSplineNetworks()`: Connects multiple splines into networks
- **Implementation**: Uses a sophisticated state machine for interactions
- **Integration**: Creates the interactive drawing system for light paths

#### `ColorBar.js`
- **Purpose**: Manages color selection for the Christmas lights
- **Key Functions**:
  - `addColorMarker()`: Adds color positions to the gradient
  - `updateColorBarGradient()`: Updates the visual color bar
  - `getColorFromMarkers()`: Determines colors based on position
  - `interpolateColors()`: Blends between color markers
- **Implementation**: Uses DOM manipulation for the color bar and color pickers
- **Integration**: Provides the color management system for the lights

#### `ChristmasLights.js`
- **Purpose**: Handles animation and rendering of the Christmas lights
- **Key Functions**:
  - `startLightsAnimation()`: Begins the animation loop
  - `renderFrame()`: Draws each frame of the animation
  - `drawLightWithGlow()`: Creates the light effect with glow
  - `calculateNetworkLightPoints()`: Determines light positions along paths
  - `getDepthAtPoint()`: Uses depth data for 3D-like effects
- **Implementation**: Uses requestAnimationFrame for smooth animation
- **Integration**: Creates the visual light effects along user-drawn paths

### Enhancement and UI Control

#### `EnhanceImage.js`
- **Purpose**: Handles AI-based image enhancement
- **Key Functions**:
  - `enhanceImage()`: Main entry point for enhancement
  - `sendToStabilityRelight()`: Communicates with the Stability AI API
  - `pollForResults()`: Checks for completed enhancements
  - `displayEnhancedImage()`: Shows the final result
- **Implementation**: Uses fetch API for API communication
- **Integration**: Provides the final enhancement step using AI

#### `ResetApp.js`
- **Purpose**: Handles application reset functions
- **Key Functions**:
  - `resetApp()`: Reloads the application
  - `handleColorPickerCancel()`: Cancels color selection
- **Implementation**: Simple utility functions
- **Integration**: Provides essential reset functionality

#### `Sliders.js`
- **Purpose**: Manages the control sliders for light properties
- **Key Functions**:
  - Handlers for density, speed, and glow size sliders
  - Touch event handling for mobile use
- **Implementation**: Uses input range elements with custom styling
- **Integration**: Provides interactive controls for fine-tuning lights

#### `TabNavigation.js`
- **Purpose**: Manages switching between camera and file upload views
- **Key Functions**:
  - `switchToCameraTab()`: Activates camera view
  - `switchToFileTab()`: Activates file upload view
- **Implementation**: Simple tab switching with state updates
- **Integration**: Handles the navigation between different input methods