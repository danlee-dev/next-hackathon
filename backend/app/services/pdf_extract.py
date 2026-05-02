"""IR pitch deck PDF text 추출."""

from __future__ import annotations

import io


def extract_pdf_text(pdf_bytes: bytes, max_chars: int = 8000) -> str:
    if not pdf_bytes:
        return ""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(pdf_bytes))
        chunks: list[str] = []
        for page in reader.pages:
            try:
                t = page.extract_text() or ""
            except Exception:
                t = ""
            if t.strip():
                chunks.append(t.strip())
        text = "\n\n".join(chunks)
        if len(text) > max_chars:
            text = text[:max_chars] + "\n…(truncated)"
        return text
    except Exception:
        return ""
