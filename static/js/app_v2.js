// Main Alpine.js application

document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // ─── State ───
        view: 'calendar',
        events: [], calendarTasks: [], categories: [], tags: [],
        loading: false, showMenu: false, showLunar: false, showWeather: false, weatherData: null, weatherCity: '', weatherTime: '', calendarViewType: 'dayGridMonth', citySuggestions: [], showCitySuggestions: false,

        // Filters
        filterCategory: null, filterStatus: null, filterPriority: null, filterDate: null, taskStatusFilter: null,

        // Event modal
        showEventModal: false, editingEvent: null,
        eventForm: { title: '', description: '', location: '', start_time: '', end_time: '', all_day: false, priority: 0, status: 'todo', category_id: null, tag_ids: [], reminder_minutes: [] },

        // Category
        showCategoryModal: false,
        catForm: { name: '', color: '#3b82f6', icon: '📂' },
        showQuickCat: false,
        quickCat: { icon: '📂', name: '', color: '#3b82f6' },
        editingCatId: null,
        editCatName: '',

        // Project / Task
        projects: [], selectedProject: null, taskTree: [], collapsedPhases: {},
        showProjectModal: false, editingProjectId: null, showTaskModal: false, editingTask: null,
        projectForm: { name: '', description: '', color: '#6366f1', icon: '📁' },
        taskForm: { title: '', note: '', category_id: null, task_type: 'todo', status: 'todo', priority: 0, due_date: '', start_date: '', recurrence: '', is_recurring: false, parent_id: null, project_id: null },
        weekDays: [false, false, false, false, false, false, false],

        // Summary
        summary: { total: 0, done: 0, in_progress: 0, todo: 0, cancelled: 0, completion_rate: 0, events: [], notes: [] },
        noteContent: '', noteSavedTime: '', currentMood: '', pastNotes: [],
        editingPastNoteId: null, editPastNoteContent: '',

        // ─── Computed ───
        get filteredEvents() {
            let evs = this.events;
            if (this.filterCategory) evs = evs.filter(e => e.category_id === this.filterCategory);
            if (this.filterStatus) evs = evs.filter(e => e.status === this.filterStatus);
            if (this.filterPriority !== null && this.filterPriority !== '') evs = evs.filter(e => e.priority === this.filterPriority);
            if (this.filterDate) {
                const fd = this.filterDate;
                evs = evs.filter(e => e.start_time && e.start_time.slice(0, 10) === fd);
            }
            return evs.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        },
        get upcomingEvents() {
            const now = new Date();
            return this.filteredEvents.filter(e => new Date(e.end_time) >= now).slice(0, 10);
        },
        get todayDateStr() {
            return new Date().toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            });
        },
        get selectedProjectObj() {
            return this.projects.find(p => p.id === this.selectedProject) || null;
        },
        get filteredTaskTree() {
            let tree = this.taskTree;
            if (this.taskStatusFilter) {
                tree = tree.map(phase => ({
                    ...phase,
                    children: (phase.children || []).filter(t => t.status === this.taskStatusFilter)
                })).filter(phase => phase.children.length > 0 || phase.status === this.taskStatusFilter);
            }
            if (this.filterPriority !== null && this.filterPriority !== '') {
                tree = tree.map(phase => ({
                    ...phase,
                    children: (phase.children || []).filter(t => t.priority === this.filterPriority)
                })).filter(phase => phase.children.length > 0 || phase.priority === this.filterPriority);
            }
            return tree;
        },

        // ─── Init ───
        async init() {
            window.AlpineApp = this;
            this.loading = true;
            await Promise.all([this.refreshEvents(), this.refreshCategories(), this.refreshTags(), this.refreshProjects()]);
            this.loading = false;
            // Delay calendar init to ensure DOM is ready (WebView fix)
            setTimeout(() => this.renderCalendar(this.calendarTasks), 200);
            Notifications.request();
            Notifications.startPolling();
            this.$watch('view', v => { if (v === 'calendar') setTimeout(() => this.renderCalendar(this.calendarTasks), 100); if (v === 'gantt') this.refreshProjects(); });
            // Auto-refresh calendar when filters change
            this.$watch('filterCategory', () => this.refreshEvents());
            this.$watch('filterStatus', () => this.refreshEvents());
            this.$watch('filterPriority', () => this.refreshEvents());
        },

        // ─── Data ───
        get filteredEventsForCalendar() {
            let evs = this.events;
            if (this.filterCategory) evs = evs.filter(e => e.category_id === this.filterCategory);
            if (this.filterStatus) evs = evs.filter(e => e.status === this.filterStatus);
            if (this.filterPriority !== null && this.filterPriority !== '') evs = evs.filter(e => e.priority === this.filterPriority);
            return evs;
        },
        async refreshEvents() {
            try {
                const [events, tasks] = await Promise.all([
                    API.events.list(),
                    fetch('/api/tasks/all').then(r => r.json()),
                ]);
                this.events = events;

                // Filter tasks by sidebar filters
                let filteredTasks = tasks;
                if (this.filterCategory) filteredTasks = filteredTasks.filter(t => t.category_id === this.filterCategory);
                if (this.filterStatus) filteredTasks = filteredTasks.filter(t => t.status === this.filterStatus);
                if (this.filterPriority !== null && this.filterPriority !== '') filteredTasks = filteredTasks.filter(t => t.priority === this.filterPriority);

                // Expand recurring tasks: show future occurrences
                const expandedTasks = [];
                const today = new Date(); today.setHours(0,0,0,0);
                const fmtDate = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

                for (const t of filteredTasks) {
                    if (t.due_date) {
                        expandedTasks.push(t); // Has explicit date, use as-is
                    }
                    if (t.is_recurring) {
                        // Generate future occurrences for next 14 days
                        const r = t.recurrence || 'daily';
                        const start = t.start_date ? new Date(t.start_date + 'T00:00:00') : new Date(today);
                        const cursor = new Date(start);
                        const end = t.due_date ? new Date(t.due_date + 'T00:00:00') : new Date(start.getTime() + 14*86400000);

                        const matchesRecurrence = (d) => {
                            if (r === 'daily') return true;
                            if (r === 'weekdays') return d.getDay() >= 1 && d.getDay() <= 5;
                            if (r === 'weekly') return d.getDay() === today.getDay();
                            if (r.startsWith('weekly:')) {
                                // weekly:0,2,4 = Mon,Wed,Fri (0=Mon, 6=Sun)
                                const days = r.split(':')[1].split(',').map(Number);
                                const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                                return days.includes(idx);
                            }
                            if (r === 'monthly') {
                                const baseDate = t.due_date ? new Date(t.due_date + 'T00:00:00').getDate() : today.getDate();
                                return d.getDate() === baseDate;
                            }
                            return false;
                        };

                        while (cursor <= end) {
                            if (matchesRecurrence(cursor)) {
                                expandedTasks.push({ ...t, due_date: fmtDate(cursor) + 'T00:00:00' });
                            }
                            cursor.setDate(cursor.getDate() + 1);
                        }
                    }
                }
                this.calendarTasks = expandedTasks;
                this.renderCalendar(expandedTasks);
            } catch (e) { console.error(e); }
        },
        async refreshCategories() { try { this.categories = await API.categories.list(); } catch (e) {} },
        async refreshTags() { try { this.tags = await API.tags.list(); } catch (e) {} },
        async refreshAll() { await Promise.all([this.refreshEvents(), this.refreshCategories(), this.refreshTags(), this.refreshProjects()]); },

        async refreshProjects() {
            try { this.projects = await API.projects.list(); if (this.selectedProject) await this.loadTaskTree(this.selectedProject); } catch (e) {}
        },
        async selectProject(pid) { this.selectedProject = pid; this.taskTree = []; this.collapsedPhases = {}; await this.loadTaskTree(pid); },
        async loadTaskTree(pid) {
            try {
                this.taskTree = await API.tasks.list(pid);
            } catch (e) {}
        },

        // ─── Calendar ───
        renderCalendar(tasks) { this.$nextTick(() => { if (typeof FullCalendar !== 'undefined') initCalendar(this.filteredEventsForCalendar, tasks || []); }); },
        applyFilters() {
            this.$nextTick(() => this.renderCalendar(this.calendarTasks));
        },
        toggleLunar() {
            this.showLunar = !this.showLunar;
            this.$nextTick(() => this.renderCalendar(this.calendarTasks));
        },
        async toggleWeather() {
            this.showWeather = !this.showWeather;
            if (this.showWeather && !this.weatherData) {
                this.weatherData = await getWeatherData();
                this.weatherTime = getWeatherFetchTime();
            }
            this.$nextTick(() => this.renderCalendar(this.calendarTasks));
        },
        async suggestCities(query) {
            if (!query || query.length < 1) { this.citySuggestions = []; this.showCitySuggestions = false; return; }
            // Try local DB first (instant)
            let results = searchCitiesLocal(query);
            // If few results, also search API
            if (results.length < 3) {
                const apiResults = await searchCity(query, 3);
                // Merge, deduplicate by name
                const seen = new Set(results.map(r => r.name));
                for (const r of apiResults) {
                    if (!seen.has(r.name)) { results.push(r); seen.add(r.name); }
                }
            }
            this.citySuggestions = results;
            this.showCitySuggestions = results.length > 0;
        },
        async selectCity(city) {
            this.weatherCity = city.name;
            this.weatherData = await fetchWeather(city.lat, city.lon, true);
            this.weatherTime = getWeatherFetchTime();
            this.citySuggestions = [];
            this.showCitySuggestions = false;
            this.$nextTick(() => this.renderCalendar(this.calendarTasks));
        },
        async changeCity(name) {
            if (!name || !name.trim()) return;
            const results = await searchCity(name.trim(), 1);
            if (results.length > 0) {
                await this.selectCity(results[0]);
            } else {
                alert('未找到城市：「' + name + '」');
            }
        },
        async refreshWeather() {
            if (this.weatherData) {
                // Re-fetch for current city
                const result = await searchCity(this.weatherCity || '北京');
                if (result) {
                    this.weatherData = await fetchWeather(result.lat, result.lon, true);
                    this.weatherTime = getWeatherFetchTime();
                    this.$nextTick(() => this.renderCalendar(this.calendarTasks));
                }
            }
        },

        // ─── Event Modal ───
        openCreateModal(defaults = {}) {
            this.editingEvent = null;
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            this.eventForm = {
                title: '', description: '', location: '',
                start_time: defaults.start_time || fmt(new Date(now.getTime() + 3600000)),
                end_time: defaults.end_time || fmt(new Date(now.getTime() + 7200000)),
                all_day: defaults.all_day || false, priority: 0, status: 'todo', category_id: null, tag_ids: [], reminder_minutes: [],
            };
            this.showEventModal = true;
        },
        openEditModal(event) {
            this.editingEvent = event;
            this.eventForm = {
                title: event.title, description: event.description, location: event.location,
                start_time: event.start_time.slice(0, 16), end_time: event.end_time.slice(0, 16),
                all_day: event.all_day, priority: event.priority, status: event.status,
                category_id: event.category_id, tag_ids: event.tags?.map(t => t.id) || [], reminder_minutes: [],
            };
            this.showEventModal = true;
        },
        closeEventModal() { this.showEventModal = false; this.editingEvent = null; },
        async saveEvent() {
            try {
                const d = { ...this.eventForm };
                if (!d.title?.trim()) return alert('请输入标题');
                const ft = (v, ad, isEnd) => ad ? v + 'T' + (isEnd ? '23:59:59' : '00:00:00') : (v.includes('T') ? v + ':00' : v + 'T' + (isEnd ? '23:59:59' : '00:00:00'));
                d.start_time = ft(d.start_time, d.all_day, false);
                d.end_time = ft(d.end_time, d.all_day, true);
                if (this.editingEvent) await API.events.update(this.editingEvent.id, d);
                else await API.events.create(d);
                this.closeEventModal(); await this.refreshAll();
            } catch (e) { alert('保存失败: ' + e.message); }
        },
        async deleteEvent() {
            if (!this.editingEvent || !confirm('确定删除？')) return;
            await API.events.delete(this.editingEvent.id);
            this.closeEventModal(); await this.refreshAll();
        },
        handleAllDayToggle() {
            if (this.eventForm.all_day) {
                this.eventForm.start_time = (this.eventForm.start_time.includes('T') ? this.eventForm.start_time.split('T')[0] : this.eventForm.start_time.substring(0, 10));
                this.eventForm.end_time = (this.eventForm.end_time.includes('T') ? this.eventForm.end_time.split('T')[0] : this.eventForm.end_time.substring(0, 10));
            } else {
                if (this.eventForm.start_time && !this.eventForm.start_time.includes('T')) this.eventForm.start_time += 'T09:00';
                if (this.eventForm.end_time && !this.eventForm.end_time.includes('T')) this.eventForm.end_time += 'T10:00';
            }
        },
        toggleTag(tid) { const i = this.eventForm.tag_ids.indexOf(tid); i >= 0 ? this.eventForm.tag_ids.splice(i, 1) : this.eventForm.tag_ids.push(tid); },
        toggleReminder(m) { const i = this.eventForm.reminder_minutes.indexOf(m); i >= 0 ? this.eventForm.reminder_minutes.splice(i, 1) : this.eventForm.reminder_minutes.push(m); },
        async updateEventStatus(eid, s) { await API.events.update(eid, { status: s }); await this.refreshAll(); },

        // ─── Category ───
        openCategoryModal() { this.catForm = { name: '', color: '#3b82f6', icon: '📂' }; this.showCategoryModal = true; },
        closeCategoryModal() { this.showCategoryModal = false; this.editingCatId = null; },
        async saveCategory() { await API.categories.create(this.catForm); this.closeCategoryModal(); await this.refreshAll(); },
        async deleteCategory(id) {
            try {
                await API.categories.delete(id);
                await this.refreshAll();
            } catch (e) {
                alert('删除失败: ' + (e.message || '未知错误'));
            }
        },
        startEditCat(c) {
            this.editingCatId = c.id;
            this.editCatName = c.name;
        },
        async saveEditCat(c) {
            if (!this.editCatName.trim()) return;
            try {
                await API.categories.update(c.id, { name: this.editCatName.trim() });
                this.editingCatId = null;
                await this.refreshAll();
            } catch (e) { alert('修改失败'); }
        },
        async quickAddCategory() {
            const nc = await API.categories.create(this.quickCat);
            this.eventForm.category_id = nc.id; this.quickCat = { icon: '📂', name: '', color: '#3b82f6' }; this.showQuickCat = false;
            await this.refreshCategories();
        },

        // ─── Tags ───
        async createTag(name) { await API.tags.create({ name }); await this.refreshTags(); },
        async deleteTag(id) { if (!confirm('确定删除？')) return; await API.tags.delete(id); await this.refreshAll(); },

        // ─── Project & Task ───
        openProjectCreate() { this.editingProjectId = null; this.projectForm = { name: '', description: '', color: '#6366f1', icon: '📁' }; this.showProjectModal = true; },
        editProject(p) { this.editingProjectId = p.id; this.projectForm = { name: p.name, description: p.description || '', color: p.color, icon: p.icon }; this.showProjectModal = true; },
        closeProjectModal() { this.showProjectModal = false; this.editingProjectId = null; },
        async saveProject() {
            if (this.editingProjectId) { await API.projects.update(this.editingProjectId, this.projectForm); }
            else { const p = await API.projects.create(this.projectForm); this.selectedProject = p.id; }
            this.closeProjectModal(); await this.refreshProjects();
        },
        async deleteProject(pid) { if (!confirm('确定删除项目及所有任务？')) return; await API.projects.delete(pid); this.selectedProject = null; this.taskTree = []; await this.refreshProjects(); await this.refreshEvents(); },

        phaseDoneCount(p) { return p.children?.filter(t => t.status === 'done').length || 0; },
        togglePhase(pid) { this.collapsedPhases[pid] = !this.collapsedPhases[pid]; },
        statusColor(s) { return { todo: 'var(--gray)', in_progress: 'var(--orange)', done: 'var(--green)' }[s] || 'var(--gray)'; },
        priorityIcon(p) { return { 0: '', 1: '🟢', 2: '🟡', 3: '🔴' }[p] || ''; },
        taskTypeIcon(t) {
            if (t.is_recurring) {
                const labels = { daily: '每天', weekdays: '工作日', weekly: '每周', monthly: '每月' };
                if (t.recurrence && t.recurrence.startsWith('weekly:')) {
                    const dayNames = ['一','二','三','四','五','六','日'];
                    const days = t.recurrence.split(':')[1].split(',').map(d => dayNames[parseInt(d)]).join('');
                    return '🔄 周' + days;
                }
                return '🔄' + (labels[t.recurrence] || '');
            }
            return { habit: '🔄 习惯', todo: '☐ 待办', goal: '🎯 目标', memo: '📝 备忘' }[t.task_type] || '';
        },

        async toggleTaskStatus(task, checked) {
            task.status = checked ? 'done' : 'todo';
            await API.tasks.update(task.id, { status: task.status });
            await this.loadTaskTree(this.selectedProject); await this.refreshProjects(); await this.refreshEvents();
            if (checked && document.getElementById('pet-img').src) {
                window.petCheer(['哟，完成了！','不错嘛~','搞定！','继续加油！'][Math.floor(Math.random()*4)]);
            }
        },
        addPhase() { this.weekDays = [false,false,false,false,false,false,false]; this.editingTask = null; this.taskForm = { title: '', note: '', category_id: null, task_type: 'todo', status: 'todo', priority: 0, due_date: '', start_date: '', recurrence: '', is_recurring: false, parent_id: null, project_id: this.selectedProject }; this.showTaskModal = true; },
        addSubtask(pid) { this.weekDays = [false,false,false,false,false,false,false]; this.editingTask = null; this.taskForm = { title: '', note: '', category_id: null, task_type: 'todo', status: 'todo', priority: 0, due_date: '', start_date: '', recurrence: '', is_recurring: false, parent_id: pid, project_id: this.selectedProject }; this.showTaskModal = true; },
        editTask(task) {
            this.editingTask = task;
            this.taskForm = { title: task.title, note: task.note || '', category_id: task.category_id || null, task_type: task.task_type || 'todo', status: task.status, priority: task.priority, due_date: task.due_date ? task.due_date.slice(0,10) : "", start_date: task.start_date ? task.start_date.slice(0,10) : "", recurrence: task.recurrence || '', is_recurring: task.is_recurring || false, parent_id: task.parent_id, project_id: task.project_id };
            // Parse weekly days
            this.weekDays = [false, false, false, false, false, false, false];
            if (task.recurrence && task.recurrence.startsWith('weekly:')) {
                const days = task.recurrence.split(':')[1] || '';
                days.split(',').forEach(d => {
                    const idx = parseInt(d);
                    if (idx >= 0 && idx <= 6) this.weekDays[idx] = true;
                });
            }
            this.showTaskModal = true;
        },
        get recurrenceType() {
            const r = this.taskForm.recurrence;
            if (!r) return '';
            if (r.startsWith('weekly:')) return 'weekly';
            return r;
        },
        set recurrenceType(val) {
            if (val === 'weekly') {
                this.taskForm.recurrence = 'weekly';
            } else {
                this.taskForm.recurrence = val;
            }
            this.taskForm.is_recurring = !!val;
            if (val !== 'weekly') this.weekDays = [false, false, false, false, false, false, false];
        },
        onRecurrenceChange() {},
        updateWeekDays() {
            const days = [];
            this.weekDays.forEach((on, i) => { if (on) days.push(i); });
            this.taskForm.recurrence = days.length > 0 ? 'weekly:' + days.join(',') : 'weekly';
            this.taskForm.is_recurring = true;
        },
        closeTaskModal() { this.showTaskModal = false; this.editingTask = null; },
        async saveTask() {
            const d = { ...this.taskForm };
            if (d.due_date) d.due_date += 'T00:00:00'; else d.due_date = null;
            if (this.editingTask) await API.tasks.update(this.editingTask.id, d);
            else await API.tasks.create(d);
            this.closeTaskModal(); await this.loadTaskTree(this.selectedProject); await this.refreshProjects(); await this.refreshEvents();
        },
        async deleteTask(tid) { if (!confirm('确定删除？')) return; await API.tasks.delete(tid); await this.loadTaskTree(this.selectedProject); await this.refreshProjects(); await this.refreshEvents(); },

        // ─── Summary ───
        async refreshSummary() {
            try {
                const [s, notes] = await Promise.all([API.summary.today(), API.dailyNotes.list()]);
                this.summary = s; this.noteContent = ''; this.pastNotes = notes;
            } catch (e) {}
        },
        async saveNote() {
            if (!this.noteContent.trim()) return;
            await API.dailyNotes.save({ content: this.noteContent, mood: this.currentMood });
            this.noteContent = '';
            this.currentMood = '';
            this.noteSavedTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            await this.refreshSummary();
        },
        async deleteNote(id) {
            try {
                await API.del('/daily-notes/' + id);
                this.pastNotes = this.pastNotes.filter(n => n.id !== id);
                this.summary.notes = this.summary.notes.filter(n => n.id !== id);
            } catch (e) { alert('删除失败'); }
        },
        startEditPastNote(n) {
            this.editingPastNoteId = n.id;
            this.editPastNoteContent = n.content;
        },
        async saveEditPastNote(n) {
            try {
                await API.put('/daily-notes/' + n.id, { content: this.editPastNoteContent, mood: n.mood });
                n.content = this.editPastNoteContent;
                this.editingPastNoteId = null;
            } catch (e) { alert('保存失败'); }
        },

        // ─── Upload ───
        triggerIconUpload() { this.showMenu = false; setTimeout(() => { const i = document.querySelector('input[x-ref=\"iconInput\"]'); if (i) i.click(); }, 100); },
        triggerPetUpload() { this.showMenu = false; setTimeout(() => { const i = document.getElementById('petInput'); if (i) i.click(); else alert('找不到上传控件，请刷新页面'); }, 100); },
        uploadPet(event) {
            const f = event.target.files[0]; if (!f) return;
            const img = new Image();
            img.onload = () => {
                // Resize to max 200px (keeps aspect ratio)
                const maxW = 200;
                const scale = Math.min(1, maxW / img.width);
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/png');
                localStorage.setItem('pet_image', dataUrl);
                document.getElementById('pet-img').src = dataUrl;
                document.getElementById('pet-companion').style.display = 'block';
            };
            img.src = URL.createObjectURL(f);
            event.target.value = '';
        },
        async uploadIcon(event) {
            const f = event.target.files[0]; if (!f) return;
            const fd = new FormData(); fd.append('file', f);
            const r = await fetch('/api/upload-icon', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.ok) {
                const ts = Date.now();
                document.querySelector('link[rel="icon"]').href = '/icons/icon-192.png?t=' + ts;
                document.querySelector('link[rel="apple-touch-icon"]').href = '/icons/icon-180.png?t=' + ts;
                alert('✅ 头像已更新！Cmd+Shift+R 刷新查看');
            }
            event.target.value = '';
        },

        // ─── Export / Import ───
        async exportData() {
            const data = { events: this.events, categories: this.categories, tags: this.tags, projects: this.projects };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `schedule-${new Date().toISOString().slice(0,10)}.json`; a.click();
            URL.revokeObjectURL(url);
        },
        async importData() {
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
            input.onchange = async e => {
                const f = e.target.files[0]; if (!f) return;
                const data = JSON.parse(await f.text());
                for (const c of data.categories || []) { try { await API.categories.create(c); } catch {} }
                for (const t of data.tags || []) { try { await API.tags.create(t); } catch {} }
                for (const ev of data.events || []) { try { await API.events.create({ ...ev, tag_ids: [], reminder_minutes: [] }); } catch {} }
                for (const p of data.projects || []) { try { await API.projects.create(p); } catch {} }
                await this.refreshAll(); alert('导入成功！');
            };
            input.click();
        },

        // ─── Helpers ───
        getCategory(id) { return this.categories.find(c => c.id === id); },
        getCategoryName(id) { const c = this.getCategory(id); return c ? c.icon + ' ' + c.name : ''; },
        formatDate(d) { if (!d) return ''; return new Date(d).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); },
        formatDateOnly(d) { if (!d) return ''; return new Date(d).toLocaleDateString('zh-CN'); },
        formatNoteDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); },
        statusLabel(s) { return { todo: '待办', in_progress: '进行中', done: '已完成', cancelled: '已取消' }[s] || s; },
        priorityLabel(p) { return { 0: '无', 1: '低', 2: '中', 3: '高' }[p] || ''; },
        priorityColor(p) { return { 0: '#999', 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444' }[p] || '#999'; },
    }));
});
