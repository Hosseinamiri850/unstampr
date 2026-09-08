"""Thin wrappers over remove-ai-watermarks (imported as raiw).

Visible-watermark removal is CPU-friendly and needs only the [visible]/[video]
extras. The invisible path requires CUDA and is intentionally NOT used in the
MVP worker (would need a GPU host + the [qwen-zimage] extra).
"""
from __future__ import annotations

import logging
from pathlib import Path

log = logging.getLogger("pakino.watermark")

try:
    import remove_ai_watermarks as raiw  # type: ignore
    from remove_ai_watermarks import api as _raiw_api
    from remove_ai_watermarks import video as _raiw_video
    from remove_ai_watermarks.identify import identify as _raiw_identify  # type: ignore
    _RAIW_AVAILABLE = True
except Exception as e:  # pragma: no cover - env dependent
    log.warning("remove_ai_watermarks not available: %s", e)
    raiw = None  # type: ignore
    _raiw_api = None  # type: ignore
    _raiw_video = None  # type: ignore
    _raiw_identify = None  # type: ignore
    _RAIW_AVAILABLE = False


# Map the library's "high"/"medium"/"none" provenance confidence to a float
# the web/DB layer can store (jobs.confidence is real).
_CONFIDENCE_MAP = {"high": 0.95, "medium": 0.6, "none": None}


class NoWatermarkError(Exception):
    pass


class UnsupportedWatermarkError(Exception):
    pass


def lib_ready() -> bool:
    return _RAIW_AVAILABLE


def detect_image(input_path: str) -> dict:
    """Identify the provenance / visible mark of an image.

    Raises NoWatermarkError when no AI signal and no known visible mark found.
    """
    if not _RAIW_AVAILABLE:
        raise UnsupportedWatermarkError("library missing")
    from pathlib import Path as _Path

    report = _raiw_identify(_Path(input_path))
    # A visible mark the remover knows about may exist even when metadata
    # provenance is silent; the removal pass is the ground truth for output.
    provider = report.platform or (report.watermarks[0] if report.watermarks else None)
    if report.is_ai_generated is None and provider is None:
        raise NoWatermarkError("no signal")
    return {
        "provider": str(provider) if provider else None,
        "confidence": _CONFIDENCE_MAP.get(report.confidence),
        "location": None,
    }


def detect_video(input_path: str) -> dict:
    if not _RAIW_AVAILABLE:
        raise UnsupportedWatermarkError("library missing")
    report = _raiw_video.identify_video(input_path)
    provider = report.platform or report.visible_mark
    if report.is_ai_generated is None and provider is None:
        raise NoWatermarkError("no signal")
    return {
        "provider": str(provider) if provider else None,
        "confidence": _CONFIDENCE_MAP.get(report.confidence),
        "location": None,
    }


def remove_image_visible(input_path: str, output_path: str) -> dict:
    if not _RAIW_AVAILABLE:
        raise UnsupportedWatermarkError("library missing")
    result, removed = _raiw_api.remove_visible(input_path, output_path)
    return {"result": result, "removed": removed}


def remove_video_visible(
    input_path: str, output_path: str, mark: str | None = None
) -> dict:
    if not _RAIW_AVAILABLE:
        raise UnsupportedWatermarkError("library missing")
    kwargs = {"mark": mark} if mark else {}
    out = _raiw_video.remove_video_visible(input_path, output_path, **kwargs)
    provider = getattr(out, "mark", None) if out is not None else None
    return {"provider": provider, "output": output_path}


def _normalize_identify(info) -> dict:
    """Best-effort coerce the library's identify result into a stable dict."""
    if info is None:
        raise NoWatermarkError("no signal")
    if isinstance(info, dict):
        provider = info.get("mark") or info.get("provider") or info.get("name")
        conf = info.get("confidence") or info.get("score")
        loc = info.get("location") or info.get("region")
        if not provider:
            raise NoWatermarkError("provider unknown")
        return {"provider": str(provider), "confidence": float(conf) if conf else None, "location": str(loc) if loc else None}
    # object with attributes
    provider = getattr(info, "mark", None) or getattr(info, "name", None) or getattr(info, "provider", None)
    if not provider:
        raise NoWatermarkError("provider unknown")
    conf = getattr(info, "confidence", None) or getattr(info, "score", None)
    loc = getattr(info, "location", None) or getattr(info, "region", None)
    return {"provider": str(provider), "confidence": float(conf) if conf else None, "location": str(loc) if loc else None}
