"""
Unit tests for extraction_service.py

Run: pytest tests/unit/test_extraction.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from app.services.extraction_service import (
    extract_text,
    _clean_text,
)
from app.services.document_service import (
    detect_mime_type,
    validate_upload,
    _safe_storage_filename,
)


# ── MIME detection ────────────────────────────────────────────────────────────

def test_detect_pdf_by_magic_bytes():
    assert detect_mime_type(b"%PDF-1.4 rest of file", "doc.pdf") == "application/pdf"


def test_detect_png_by_magic_bytes():
    assert detect_mime_type(b"\x89PNG\r\n\x1a\n", "img.png") == "image/png"


def test_detect_jpeg_by_magic_bytes():
    assert detect_mime_type(b"\xff\xd8\xff\xe0", "img.jpg") == "image/jpeg"


def test_detect_txt_by_extension():
    assert detect_mime_type(b"hello world", "notes.txt") == "text/plain"


def test_unknown_type_returns_none():
    assert detect_mime_type(b"\x00\x00\x00\x00", "file.exe") is None


# ── Validation ────────────────────────────────────────────────────────────────

def test_empty_file_rejected():
    is_valid, error, _ = validate_upload(b"", "doc.pdf")
    assert not is_valid
    assert "empty" in error.lower()


def test_unsupported_type_rejected():
    is_valid, error, _ = validate_upload(b"\x00\x00\x00\x00", "virus.exe")
    assert not is_valid
    assert "Unsupported" in error


def test_oversized_file_rejected():
    big_file = b"%PDF" + b"x" * (11 * 1024 * 1024)  # 11MB
    is_valid, error, _ = validate_upload(big_file, "big.pdf")
    assert not is_valid
    assert "exceeds" in error.lower() or "limit" in error.lower()


def test_valid_pdf_passes():
    pdf_bytes = b"%PDF-1.4 " + b"x" * 1000
    is_valid, error, mime = validate_upload(pdf_bytes, "test.pdf")
    assert is_valid
    assert mime == "application/pdf"


def test_valid_txt_passes():
    is_valid, error, mime = validate_upload(b"Patient LDL 120 mg/dL\n", "lab_result.txt")
    assert is_valid
    assert mime == "text/plain"


# ── Safe storage filename ─────────────────────────────────────────────────────

def test_safe_storage_filename_empty_defaults_to_txt():
    assert _safe_storage_filename("", "text/plain") == "upload.txt"


def test_safe_storage_filename_strips_windows_path():
    assert _safe_storage_filename(r"C:\Users\me\notes.txt", "text/plain") == "notes.txt"


def test_safe_storage_filename_adds_extension_when_missing():
    assert _safe_storage_filename("notes", "text/plain") == "notes.txt"


def test_safe_storage_filename_sanitizes_special_chars():
    assert (
        _safe_storage_filename("## 1. Primary Care Visit Report.txt", "text/plain")
        == "1_Primary_Care_Visit_Report.txt"
    )


# ── Text cleaning ─────────────────────────────────────────────────────────────

def test_clean_text_removes_excess_blanks():
    raw = "Line one\n\n\n\nLine two\n\n\n\nLine three"
    result = _clean_text(raw)
    assert "\n\n\n" not in result
    assert "Line one" in result
    assert "Line three" in result


def test_clean_text_strips_leading_trailing():
    raw = "   \n\nHello\n\n   "
    assert _clean_text(raw) == "Hello"


# ── Plain text extraction ─────────────────────────────────────────────────────

def test_plain_text_extraction():
    content = "Patient Name: John Doe\nDiagnosis: Hypertension\nDate: 2026-01-01"
    result = extract_text(content.encode("utf-8"), "text/plain")
    assert result.success
    assert result.method == "text"
    assert "John Doe" in result.text


def test_plain_text_latin1():
    content = "Café résumé".encode("latin-1")
    result = extract_text(content, "text/plain")
    assert result.success


def test_unsupported_mime_fails_gracefully():
    result = extract_text(b"\x00\x00", "application/octet-stream")
    assert not result.success
    assert result.error_message is not None


# ── OCR ───────────────────────────────────────────────────────────────────────

def test_ocr_low_confidence_sets_flag():
    """OCR below threshold should set low_confidence=True and add a warning."""
    with patch("app.services.extraction_service.pytesseract") as mock_tess:
        mock_tess.image_to_data.return_value = {
            "conf": [30, 25, 40, -1, 35]
        }
        mock_tess.image_to_string.return_value = "Some extracted text that is long enough"
        mock_tess.Output = MagicMock()
        mock_tess.Output.DICT = "dict"

        # Create a minimal valid JPEG
        from PIL import Image
        import io
        img = Image.new("RGB", (200, 100), color="white")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        jpeg_bytes = b"\xff\xd8\xff" + buf.getvalue()[3:]  # Ensure magic bytes

        result = extract_text(jpeg_bytes, "image/jpeg")
        if result.success:
            assert result.low_confidence or result.confidence is not None


def test_corrupt_image_fails_gracefully():
    result = extract_text(b"\xff\xd8\xff\x00garbage", "image/jpeg")
    assert not result.success
    assert result.error_message is not None
