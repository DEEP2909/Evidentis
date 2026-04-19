from unittest.mock import patch
from routers.ocr import preprocess_image
import numpy as np
from PIL import Image
import io

@patch('pytesseract.image_to_data')
def test_ocr_tesseract_direct(mock_tess_data):
    """Test Tesseract engine specifically"""
    from routers.ocr import ocr_with_tesseract
    mock_tess_data.return_value = {
        "text": ["Indemnification"],
        "conf": [95]
    }
    
    dummy_img = np.zeros((10, 10), dtype=np.uint8)
    text, conf = ocr_with_tesseract(dummy_img)
    assert text == "Indemnification"
    assert conf == 0.95

    # Generate a valid 1x1 black PNG
    img = Image.new('RGB', (1, 1), color='black')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    png = buf.getvalue()
    
    # This should run through grayscale and thresholding
    processed = preprocess_image(png)
    assert processed is not None
    assert len(processed.shape) == 2 # Grayscale/thresholded
