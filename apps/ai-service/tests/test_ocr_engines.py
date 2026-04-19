from unittest.mock import patch
from routers.ocr import preprocess_image
import numpy as np

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

def test_preprocess_image_valid():
    """Test image preprocessing logic"""
    # 1x1 white PNG
    png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    
    # This should run through grayscale and thresholding
    processed = preprocess_image(png)
    assert processed is not None
    assert len(processed.shape) == 2 # Grayscale/thresholded
