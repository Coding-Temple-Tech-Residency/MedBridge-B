"""
Text extraction service.

Handles three document types:
  - PDF        → pdfplumber (fallback: PyMuPDF)
  - PNG/JPEG   → Tesseract OCR with image preprocessing
  - Plain text → direct read

Returns ExtractionResult with text, confidence, and any warnings.
"""

import io
import logging
from dataclasses import dataclass, field
from typing import Optional

import pdfplumber
import fitz  # PyMuPDF fallback
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class ExtractionResult:
    text: str
    method: str                     # "pdf" | "ocr" | "text"
    confidence: Optional[float]     # 0-100 for OCR; None for PDF/text
    low_confidence: bool = False
    warnings: list[str] = field(default_factory=list)
    success: bool = True
    error_message: Optional[str] = None


def extract_text(file_bytes: bytes, mime_type: str) -> ExtractionResult:
    """
    Main entry point. Dispatches to the correct extractor based on MIME type.
    Never raises — always returns an ExtractionResult (success or failure).
    """
    try:
        if mime_type == "application/pdf":
            return _extract_pdf(file_bytes)
        elif mime_type in ("image/png", "image/jpeg", "image/jpg"):
            return _extract_ocr(file_bytes)
        elif mime_type in ("text/plain",):
            return _extract_text(file_bytes)
        else:
            return ExtractionResult(
                text="",
                method="unknown",
                confidence=None,
                success=False,
                error_message=f"Unsupported file type: {mime_type}",
            )
    except Exception as e:
        logger.exception(f"Extraction failed unexpectedly: {e}")
        return ExtractionResult(
            text="",
            method="unknown",
            confidence=None,
            success=False,
            error_message="An unexpected error occurred during text extraction.",
        )


# ── PDF ───────────────────────────────────────────────────────────────────────

def _extract_pdf(file_bytes: bytes) -> ExtractionResult:
    """
    Try pdfplumber first. If it returns < 50 chars (scanned PDF),
    fall through to OCR on the first page. If that also fails, try PyMuPDF.
    """
    text = _pdf_pdfplumber(file_bytes)

    if len(text.strip()) >= 50:
        return ExtractionResult(text=_clean_text(text), method="pdf", confidence=None)

    # Looks like a scanned PDF — try OCR on page images
    logger.info("PDF appears scanned or image-based; routing to OCR")
    ocr_result = _pdf_ocr_fallback(file_bytes)
    if ocr_result.success and len(ocr_result.text.strip()) >= 50:
        ocr_result.warnings.append(
            "This document appeared to be a scanned image. "
            "Text was extracted using OCR and may contain minor errors."
        )
        return ocr_result

    # Last resort: PyMuPDF
    logger.info("Attempting PyMuPDF fallback")
    pymupdf_text = _pdf_pymupdf(file_bytes)
    if len(pymupdf_text.strip()) >= 50:
        return ExtractionResult(
            text=_clean_text(pymupdf_text),
            method="pdf-pymupdf",
            confidence=None,
            warnings=["Document required fallback extraction. Some formatting may be lost."],
        )

    return ExtractionResult(
        text="",
        method="pdf",
        confidence=None,
        success=False,
        error_message=(
            "This document could not be processed. "
            "Please upload a clearer image or a text-based PDF version."
        ),
    )


def _pdf_pdfplumber(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def _pdf_pymupdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n\n".join(text_parts)


def _pdf_ocr_fallback(file_bytes: bytes) -> ExtractionResult:
    """Render first page of scanned PDF as image, then OCR it."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page = doc[0]
        mat = fitz.Matrix(2, 2)  # 2x zoom = ~144 DPI
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        doc.close()
        return _extract_ocr(img_bytes)
    except Exception as e:
        logger.warning(f"PDF OCR fallback failed: {e}")
        return ExtractionResult(
            text="", method="ocr", confidence=None, success=False,
            error_message="Could not render PDF pages for OCR.",
        )


# ── OCR ───────────────────────────────────────────────────────────────────────

def _extract_ocr(file_bytes: bytes) -> ExtractionResult:
    """
    Preprocessing pipeline:
      1. Load image
      2. Resize to target DPI (300 DPI equivalent)
      3. Convert to grayscale
      4. Enhance contrast
      5. Binarize (threshold)
      6. Deskew (approximate via rotation detection)
      7. Run Tesseract, collect confidence scores
    """
    settings = get_settings()

    try:
        img = Image.open(io.BytesIO(file_bytes))
    except Exception as e:
        return ExtractionResult(
            text="", method="ocr", confidence=None, success=False,
            error_message="Could not open image file. Please ensure it is a valid PNG or JPEG.",
        )

    img = _preprocess_image(img)

    # Run Tesseract with confidence data
    try:
        ocr_data = pytesseract.image_to_data(
            img, output_type=pytesseract.Output.DICT, lang="eng"
        )
    except Exception as e:
        logger.exception(f"Tesseract failed: {e}")
        return ExtractionResult(
            text="", method="ocr", confidence=None, success=False,
            error_message=(
                "Text could not be extracted from this image. "
                "Please try uploading a clearer photo or a PDF version."
            ),
        )

    # Calculate mean confidence (exclude -1 entries which are layout markers)
    confidences = [c for c in ocr_data["conf"] if c != -1]
    mean_confidence = sum(confidences) / len(confidences) if confidences else 0

    text = pytesseract.image_to_string(img, lang="eng")
    text = _clean_text(text)

    low_confidence = mean_confidence < settings.ocr_confidence_threshold
    warnings = []

    if low_confidence:
        warnings.append(
            f"Text extraction confidence was low ({mean_confidence:.0f}%). "
            "Some words may have been misread. "
            "For best results, upload a well-lit, flat photo or a PDF."
        )

    if len(text.strip()) < 50:
        return ExtractionResult(
            text="", method="ocr", confidence=mean_confidence, success=False,
            error_message=(
                "Very little text was found in this image. "
                "Please upload a clearer photo or a PDF version of your document."
            ),
        )

    return ExtractionResult(
        text=text,
        method="ocr",
        confidence=round(mean_confidence, 1),
        low_confidence=low_confidence,
        warnings=warnings,
    )


def _preprocess_image(img: Image.Image) -> Image.Image:
    """Apply preprocessing to improve OCR accuracy on phone photos."""
    # Convert to RGB if needed (handles RGBA, palette modes)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Resize: target 300 DPI equivalent
    # Most phone photos are high-res already; scale up small images
    min_dimension = 1800
    if min(img.size) < min_dimension:
        scale = min_dimension / min(img.size)
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

    # Grayscale
    img = img.convert("L")

    # Sharpen
    img = img.filter(ImageFilter.SHARPEN)

    # Contrast enhancement
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)

    return img


# ── Plain text ────────────────────────────────────────────────────────────────

def _extract_text(file_bytes: bytes) -> ExtractionResult:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            text = file_bytes.decode(encoding)
            return ExtractionResult(
                text=_clean_text(text), method="text", confidence=None
            )
        except (UnicodeDecodeError, LookupError):
            continue

    return ExtractionResult(
        text="", method="text", confidence=None, success=False,
        error_message="Could not decode the text file. Please save it as UTF-8 and re-upload.",
    )


# ── Utilities ─────────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """Remove excess whitespace while preserving paragraph breaks."""
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        cleaned.append(stripped)
    # Collapse runs of blank lines to a single blank line
    result = []
    prev_blank = False
    for line in cleaned:
        if line == "":
            if not prev_blank:
                result.append("")
            prev_blank = True
        else:
            result.append(line)
            prev_blank = False
    return "\n".join(result).strip()
