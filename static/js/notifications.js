// Browser notification helpers

const Notifications = {
    enabled: false,

    async request() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') {
            this.enabled = true;
            return true;
        }
        const result = await Notification.requestPermission();
        this.enabled = result === 'granted';
        return this.enabled;
    },

    send(title, body) {
        if (!this.enabled) return;
        new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'schedule-reminder',
        });
    },

    startPolling(intervalMs = 30000) {
        setInterval(async () => {
            try {
                const pending = await API.reminders.pending();
                for (const r of pending) {
                    this.send('🔔 日程提醒', `提醒时间到了！`);
                    await API.reminders.dismiss(r.id);
                }
            } catch (e) {
                // Silently ignore polling errors
            }
        }, intervalMs);
    }
};
