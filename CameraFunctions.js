elements.startCameraBtn.addEventListener('click', startCamera);
        
async function startCamera() {
	try {
		state.stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: 'environment',
				width: { ideal: 1280 },
				height: { ideal: 720 }
			}
		});
		
		elements.video.srcObject = state.stream;
		elements.video.classList.remove('hidden');
		elements.cameraPlaceholder.classList.add('hidden');
		elements.takePictureBtn.classList.remove('hidden');
		elements.startCameraBtn.classList.add('hidden');
		
		// Play video
		await elements.video.play();
		
	} catch (err) {
		console.error('Camera error:', err);
		alert('Could not access camera: ' + err.message);
	}
}

function stopCamera() {
	if (state.stream) {
		state.stream.getTracks().forEach(track => track.stop());
		state.stream = null;
	}
	
	elements.video.srcObject = null;
	elements.video.classList.add('hidden');
	elements.cameraPlaceholder.classList.remove('hidden');
	elements.takePictureBtn.classList.add('hidden');
	elements.startCameraBtn.classList.remove('hidden');
}

elements.takePictureBtn.addEventListener('click', captureImage);

function captureImage() {
	// Create a temporary canvas to capture the video frame
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = elements.video.videoWidth;
	tempCanvas.height = elements.video.videoHeight;
	
	const tempCtx = tempCanvas.getContext('2d');
	tempCtx.drawImage(elements.video, 0, 0, tempCanvas.width, tempCanvas.height);
	
	// Get the full resolution image data
	state.fullResImage = tempCanvas.toDataURL('image/jpeg', 0.9);
	
	// Stop the camera
	stopCamera();
	
	// Process the captured image
	processImage(state.fullResImage);
}