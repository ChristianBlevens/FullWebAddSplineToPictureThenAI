elements.fileInput.addEventListener('change', handleFileSelect);
        
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file || !file.type.match('image.*')) {
        alert('Please select a valid image file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        // Crop the image to square before showing the preview
        cropImageToSquare(event.target.result, (croppedImage) => {
            elements.previewImage.src = croppedImage;
            elements.previewImage.classList.remove('hidden');
            elements.fileUploadPlaceholder.classList.add('hidden');
            elements.useImageBtn.classList.remove('hidden');
        });
    };
    
    reader.readAsDataURL(file);
}

function useUploadedImage() {
    state.fullResImage = elements.previewImage.src;
    processImage(state.fullResImage);
}

elements.useImageBtn.addEventListener('click', useUploadedImage);

function useUploadedImage() {
	state.fullResImage = elements.previewImage.src;
	processImage(state.fullResImage);
}