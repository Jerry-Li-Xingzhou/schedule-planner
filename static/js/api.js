// API helper functions for the Schedule Planner

const API = {
    async get(url, params = {}) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`/api${url}${qs ? '?' + qs : ''}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async post(url, data) {
        const res = await fetch(`/api${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async put(url, data) {
        const res = await fetch(`/api${url}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async del(url) {
        const res = await fetch(`/api${url}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },

    // --- Events ---
    events: {
        list: (params) => API.get('/events', params),
        get: (id) => API.get(`/events/${id}`),
        create: (data) => API.post('/events', data),
        update: (id, data) => API.put(`/events/${id}`, data),
        delete: (id) => API.del(`/events/${id}`),
    },

    // --- Categories ---
    categories: {
        list: () => API.get('/categories'),
        create: (data) => API.post('/categories', data),
        update: (id, data) => API.put(`/categories/${id}`, data),
        delete: (id) => API.del(`/categories/${id}`),
    },

    // --- Tags ---
    tags: {
        list: () => API.get('/tags'),
        create: (data) => API.post('/tags', data),
        delete: (id) => API.del(`/tags/${id}`),
    },

    // --- Projects & Tasks ---
    projects: {
        list: (params) => API.get('/projects', params),
        create: (data) => API.post('/projects', data),
        update: (id, data) => API.put(`/projects/${id}`, data),
        delete: (id) => API.del(`/projects/${id}`),
    },
    tasks: {
        list: (pid) => API.get(`/projects/${pid}/tasks`),
        create: (data) => API.post('/tasks', data),
        update: (id, data) => API.put(`/tasks/${id}`, data),
        delete: (id) => API.del(`/tasks/${id}`),
    },

    // --- Reminders ---
    reminders: {
        pending: () => API.get('/reminders/pending'),
        dismiss: (id) => API.put(`/reminders/${id}/dismiss`),
    },

    // --- Summary & Notes ---
    summary: {
        today: () => API.get('/summary/today'),
    },
    dailyNotes: {
        today: () => API.get('/daily-notes/today'),
        save: (data) => API.put('/daily-notes/today', data),
        list: () => API.get('/daily-notes'),
    },
};
