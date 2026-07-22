"""Notification service — checks for due reminders and fires macOS notifications."""

import subprocess
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Reminder


def send_macos_notification(title: str, body: str):
    """Send a system notification on macOS via osascript."""
    script = f'''
    display notification "{body}" with title "{title}" sound name "default"
    '''
    try:
        subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            timeout=5,
        )
    except Exception:
        pass  # Silently ignore notification failures


def check_and_fire_reminders():
    """Check for due reminders and fire notifications. Called by scheduler."""
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        due = (
            db.query(Reminder)
            .filter(Reminder.remind_at <= now, Reminder.is_triggered == False)
            .all()
        )
        for reminder in due:
            event = reminder.event
            title = f"🔔 {event.title}"
            body = f"{event.start_time.strftime('%H:%M')} — {event.description or '日程提醒'}"
            send_macos_notification(title, body)
            reminder.is_triggered = True
        db.commit()
    finally:
        db.close()
