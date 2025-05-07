const STABILITY_API_KEY = 'sk-F4Z3bZLTnnAjq5pzMOmtSyLo8uJjbO2wV59cDCcBX9Nk2I9z';

elements.enhanceBtn.addEventListener('click', enhanceImage);
        
function enhanceImage() {
    // Set enhance mode to disable further drawing
    state.inEnhanceMode = true;
    
    // Show processing overlay
    elements.processingOverlay.classList.remove('hidden');
    state.processing = true;
    
    // Adjust UI for enhance mode
    elements.undoBtn.classList.add('hidden');
    elements.clearBtn.classList.add('hidden');
    elements.enhanceBtn.classList.add('hidden');
    elements.depthToggleBtn.classList.add('hidden');
    elements.lineToggleBtn.classList.add('hidden');
    elements.downloadBtn.classList.remove('hidden');
    
    // Hide control sidebar
    document.querySelector('.control-sidebar').style.display = 'none';

    // Hide overlays
    elements.depthOverlayCanvas.classList.add('hidden');
    elements.lineOverlayCanvas.classList.add('hidden');
    elements.lightsOverlayCanvas.classList.add('hidden');

    // Remove crosshair cursor
    elements.canvas.classList.remove('crosshair');

    // Show processing for a short time
    setTimeout(() => {
        // Capture a frame with just the image and lights, no splines or control points
        // We do this by temporarily rendering a frame with inEnhanceMode true,
        // which will exclude the splines and control points
        applyEnhancements();
    }, 2000);
}

function applyEnhancements() {
    // Create a new canvas for combining the main canvas and lights overlay
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = elements.canvas.width;
    combinedCanvas.height = elements.canvas.height;
    const combinedCtx = combinedCanvas.getContext('2d');
    
    // First draw the main canvas image
    combinedCtx.drawImage(elements.canvas, 0, 0);
    
    // Then draw the lights overlay on top
    combinedCtx.drawImage(elements.lightsOverlayCanvas, 0, 0);
    
    // Get the combined image with lights
    const combinedImage = combinedCanvas.toDataURL('image/jpeg', 0.9);
    
    // Save the non-enhanced combined image
    state.combinedImage = combinedImage;
    
    // Show "Processing with AI" text in the processing overlay
    const processingText = elements.processingOverlay.querySelector('p');
    if (processingText) {
        processingText.textContent = 'Enhancing with AI... This may take a few seconds';
    }
    
    // Set a timeout to handle potential long delays
    const timeoutDuration = 30000; // 30 seconds timeout
    let timeoutId = setTimeout(() => {
        console.error('API request timed out');
        handleEnhancementFailure('Request timed out. You can still download the non-enhanced image.');
    }, timeoutDuration);
    
    // Variable to track if we're still processing
    let isProcessing = true;
    
    // Add a progress indicator update
    let progressCounter = 0;
    const progressInterval = setInterval(() => {
        if (!isProcessing) {
            clearInterval(progressInterval);
            return;
        }
        
        progressCounter++;
        const dots = '.'.repeat(progressCounter % 4);
        if (processingText) {
            processingText.textContent = `Enhancing with AI${dots} This may take a few seconds`;
        }
    }, 1000);
    
    // Send the image to the Stability AI Replace Background and Relight API
    sendToStabilityRelight(combinedImage)
        .then(enhancedImageUrl => {
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            isProcessing = false;
            clearInterval(progressInterval);
            
            // Once we get the enhanced image back, display it
            const img = new Image();
            img.onload = () => {
                // Clear the canvas entirely
                ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
                
                // Draw the enhanced image on the main canvas
                ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
                
                // Update instructions
                elements.instructions.textContent = 'Your enhanced image is ready!';
                
                // Hide processing overlay
                elements.processingOverlay.classList.add('hidden');
                state.processing = false;
                
                // Store the enhanced image for download
                state.enhancedImage = enhancedImageUrl;
                
                // Stop animation loop since we're replacing it
                stopLightsAnimation();
                
                // Now that we've captured and drawn the combined image, we can hide the overlay
                elements.lightsOverlayCanvas.classList.add('hidden');
            };
            img.src = enhancedImageUrl;
        })
        .catch(error => {
            // Clear the timeout since we got a response (even if it's an error)
            clearTimeout(timeoutId);
            isProcessing = false;
            clearInterval(progressInterval);
            
            console.error('AI enhancement failed:', error);
            handleEnhancementFailure('AI enhancement failed. You can still download the non-enhanced image.');
        });
}

// Function to send image to Stability Replace Background and Relight API
async function sendToStabilityRelight(imageDataUrl) {
    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    
    // Stability API settings for Replace Background and Relight
    const STABILITY_API_URL = 'https://api.stability.ai/v2beta/stable-image/edit/replace-background-and-relight';
    
    // API key directly in the code - replace with your key
    // NOTE: For production, this should be handled securely through a server
    const STABILITY_KEY = STABILITY_API_KEY;
    
    // Prepare the form data
    const formData = new FormData();
    
    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
    }
    const blob = new Blob([new Uint8Array(byteArrays)], { type: 'image/jpeg' });
    
    // Add FILES
    formData.append('subject_image', blob, 'christmas-lights-photo.jpg');
    
    // Fetch the light reference image
    try {
        const lightReferenceResponse = await fetch('https://i.imgur.com/yhFJRFc.png');
        if (!lightReferenceResponse.ok) {
            throw new Error(`Failed to fetch light reference: ${lightReferenceResponse.status}`);
        }
        const lightReferenceBlob = await lightReferenceResponse.blob();
        formData.append('light_reference', lightReferenceBlob, 'Enhancement8.png');
    } catch (error) {
        console.error('Error fetching light reference:', error);
        throw error;
    }
    
    // Add PARAMETERS
    formData.append('background_prompt', "Professional frontal photograph of a small single-story house filling most of the frame, perfect straight-on symmetrical view with no angle, bungalow style home, one floor only, nighttime scene, cloudy winter sky, fresh snow covering the ground, vibrant multicolored Christmas lights concentrated on the roof lines, equal distribution of red, blue, green, purple, and teal hues, no single dominant color, dramatic light play on the home's façade, windows showing warm yellow interior lighting, untouched snow reflecting colorful light patterns, empty foreground with clear unobstructed view, perfectly centered composition, low-height residential structure, cottage-like proportions, photorealistic composition with enhanced lighting post-processing, dramatic colorful lighting as main subject, architectural details clearly visible, high contrast between colorful illumination and dark snowy surroundings, perfectly level horizon");
    formData.append('foreground_prompt', '');
    formData.append('negative_prompt', '');
    formData.append('preserve_original_subject', '0.6');
    formData.append('original_background_depth', '0.5');
    formData.append('keep_original_background', 'true');
    formData.append('light_source_strength', '1');
    formData.append('output_format', 'png');
    formData.append('seed', '0');
    
    // Send initial request to Stability API
    const response = await fetch(STABILITY_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${STABILITY_KEY}`,
            'Accept': 'application/json'
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Parse the response to get the generation ID
    const responseData = await response.json();
    const generationId = responseData.id;
    
    if (!generationId) {
        throw new Error('No generation ID returned from API');
    }
    
    console.log(`Generation started with ID: ${generationId}`);
    
    // Now poll for results
    return pollForResults(generationId, STABILITY_KEY);
}

// Function to poll for results
async function pollForResults(generationId, apiKey) {
    const maxAttempts = 15;  // Maximum number of polling attempts
    const pollingInterval = 2000;  // 2 seconds between polls (to fit within 30 sec timeout)
    let attempts = 0;
    
    // Poll in a loop
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`Polling for results (attempt ${attempts}/${maxAttempts}): https://api.stability.ai/v2beta/results/${generationId}`);
        
        try {
            const response = await fetch(`https://api.stability.ai/v2beta/results/${generationId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': '*/*'
                }
            });
            
            // If response is 202, it means the generation is still processing
            if (response.status === 202) {
                console.log('Still processing, waiting to poll again...');
                await new Promise(resolve => setTimeout(resolve, pollingInterval));
                continue;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Result polling error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Generation complete, get the image data
            const imageBlob = await response.blob();
            return URL.createObjectURL(imageBlob);
            
        } catch (error) {
            console.error('Error polling for results:', error);
            throw error;
        }
    }
    
    throw new Error(`Timed out after ${maxAttempts} polling attempts`);
}

// Function to handle enhancement failures
function handleEnhancementFailure(message) {
    // Display alert with error message
    alert(message);
    
    // Use the non-enhanced combined image
    const img = new Image();
    img.onload = () => {
        // Clear the canvas entirely
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        
        // Draw the combined image on the main canvas
        ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);
        
        // Update instructions
        elements.instructions.textContent = 'Non-enhanced image is ready for download';
        
        // Hide processing overlay
        elements.processingOverlay.classList.add('hidden');
        state.processing = false;
        
        // Store the non-enhanced image for download
        state.enhancedImage = state.combinedImage;
        
        // Stop animation loop since we're replacing it
        stopLightsAnimation();
        
        // Hide the lights overlay
        elements.lightsOverlayCanvas.classList.add('hidden');
    };
    img.src = state.combinedImage;
}

elements.downloadBtn.addEventListener('click', downloadImage);
        
function downloadImage() {
    if (state.enhancedImage) {
        // Download enhanced image
        const link = document.createElement('a');
        link.href = state.enhancedImage;
        link.download = 'christmas-lights-photo-enhanced.png';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}