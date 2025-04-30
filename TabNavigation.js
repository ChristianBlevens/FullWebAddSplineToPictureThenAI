elements.cameraTab.addEventListener('click', () => {
	if (state.mode === 'camera') return;
	resetApp();
	state.mode = 'camera';
	elements.cameraTab.classList.add('active');
	elements.fileTab.classList.remove('active');
	elements.cameraView.classList.remove('hidden');
	elements.fileView.classList.add('hidden');
});

elements.fileTab.addEventListener('click', () => {
	if (state.mode === 'file') return;
	resetApp();
	// Stop camera if active
	stopCamera();
	
	state.mode = 'file';
	elements.fileTab.classList.add('active');
	elements.cameraTab.classList.remove('active');
	elements.fileView.classList.remove('hidden');
	elements.cameraView.classList.add('hidden');
});