"""Icon upload route — allows changing the app icon from within the app."""

import os
import shutil
import subprocess
import tempfile

from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/api", tags=["upload"])

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static")
ICONS_DIR = os.path.join(STATIC_DIR, "icons")
DESKTOP_APP = os.path.expanduser("~/Desktop/日程规划.app")


def _resize(src: str, dst: str, size: int):
    """Resize an image to `size x size` using macOS sips."""
    subprocess.run(
        ["sips", "-z", str(size), str(size), src, "--out", dst],
        capture_output=True,
        timeout=15,
    )


@router.post("/upload-icon")
async def upload_icon(file: UploadFile = File(...)):
    """Upload a new icon image. Will be resized and applied everywhere."""

    # Save uploaded file
    suffix = os.path.splitext(file.filename or "icon.png")[1] or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Ensure icons directory exists
        os.makedirs(ICONS_DIR, exist_ok=True)

        # Generate all Web/PWA sizes
        _resize(tmp_path, os.path.join(ICONS_DIR, "icon-192.png"), 192)
        _resize(tmp_path, os.path.join(ICONS_DIR, "icon-512.png"), 512)
        _resize(tmp_path, os.path.join(ICONS_DIR, "icon-180.png"), 180)

        # Generate desktop .app icon (.icns)
        if os.path.exists(DESKTOP_APP):
            iconset = tempfile.mkdtemp(suffix=".iconset")
            try:
                for s in [16, 32, 128, 256, 512]:
                    _resize(tmp_path, os.path.join(iconset, f"icon_{s}x{s}.png"), s)
                    _resize(tmp_path, os.path.join(iconset, f"icon_{s}x{s}@2x.png"), s * 2)

                icns_path = os.path.join(tempfile.gettempdir(), "schedule.icns")
                subprocess.run(
                    ["iconutil", "-c", "icns", iconset, "-o", icns_path],
                    capture_output=True,
                    timeout=15,
                )

                # Save icns locally
                dest_icns = os.path.join(ICONS_DIR, "AppIcon.icns")
                shutil.copy(icns_path, dest_icns)

                # Apply to desktop app via osascript (has proper permissions)
                if os.path.exists(DESKTOP_APP):
                    target = os.path.join(DESKTOP_APP, "Contents", "Resources", "AppIcon.icns")
                    subprocess.run([
                        "osascript", "-e",
                        f'do shell script "cp -f \'{dest_icns}\' \'{target}\' && touch \'{DESKTOP_APP}\'"'
                    ], capture_output=True, timeout=10)
            finally:
                shutil.rmtree(iconset, ignore_errors=True)

        return {"ok": True, "message": "头像已更新，刷新页面后生效"}

    finally:
        os.unlink(tmp_path)
