import cv2
import numpy as np

def denoise_xray(image_path):
    # Read X-ray in grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # 1️⃣ Median filter (removes salt & pepper noise)
    median = cv2.medianBlur(img, 5)

    # 2️⃣ Gaussian blur (smooths noise)
    gaussian = cv2.GaussianBlur(median, (5, 5), 0)

    # 3️⃣ CLAHE (enhance lung contrast)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gaussian)

    return enhanced
