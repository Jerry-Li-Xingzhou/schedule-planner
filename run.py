#!/usr/bin/env python3
"""Launch the schedule planner: start server + open app window."""

import os
import subprocess
import time
import threading
import urllib.request

import uvicorn


def get_local_ip() -> str:
    """Get the local network IP for display."""
    import socket

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def kill_existing(port: int):
    """Kill any process already using the target port."""
    try:
        import signal

        result = subprocess.run(
            ["lsof", "-ti", f":{port}"], capture_output=True, text=True
        )
        pids = result.stdout.strip().split()
        if pids:
            for pid in pids:
                try:
                    os.kill(int(pid), signal.SIGTERM)
                except Exception:
                    pass
            time.sleep(0.5)
    except Exception:
        pass


def wait_for_server(url: str, timeout: float = 10) -> bool:
    """Poll until the server responds."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.3)
    return False


def open_app_window(url: str):
    """Open URL in a standalone app-like window (Chrome app mode), fallback to browser."""
    chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    for chrome in chrome_paths:
        if os.path.exists(chrome):
            subprocess.Popen(
                [chrome, f"--app={url}", "--window-size=1200,800"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return

    # Fallback: regular browser
    subprocess.Popen(["open", url])


def main():
    port = int(os.getenv("SCHEDULE_PORT", "8765"))
    host = os.getenv("SCHEDULE_HOST", "0.0.0.0")

    kill_existing(port)

    local_ip = get_local_ip()
    url = f"http://localhost:{port}"

    print("=" * 55)
    print("  📅  日程规划 Schedule Planner")
    print("=" * 55)
    print()
    print(f"  🖥  Mac 访问:    {url}")
    print(f"  📱 iPhone 访问:  http://{local_ip}:{port}")
    print(f"  📖 API 文档:     {url}/docs")
    print()
    print("  确保 iPhone 和 Mac 连接到同一个 WiFi")
    print("  在 iPhone Safari 中打开上方地址，点击「分享」→「添加到主屏幕」")
    print()
    print("=" * 55)

    # Start server in background thread
    server_thread = threading.Thread(
        target=lambda: uvicorn.run("app.main:app", host=host, port=port, reload=False),
        daemon=True,
    )
    server_thread.start()

    # Wait for server to be ready, then open app window
    # Only auto-open browser if not running as Launch Agent
    if not os.getenv("LAUNCHD_SERVICE"):
        if wait_for_server(url):
            open_app_window(url)
        else:
            time.sleep(2)
            if wait_for_server(url, timeout=5):
                open_app_window(url)
            else:
                print("  ⚠️  服务启动超时，请手动打开浏览器访问")
    else:
        print("  🔄 后台服务模式（Launch Agent）")

    # Keep main thread alive
    try:
        server_thread.join()
    except KeyboardInterrupt:
        print("\n  已退出")


if __name__ == "__main__":
    main()
