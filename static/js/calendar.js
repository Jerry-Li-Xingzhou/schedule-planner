// FullCalendar integration

let calendar = null;
let savedView = 'dayGridMonth';

function initCalendar(events, tasks) {
    const el = document.getElementById('calendar-view');
    if (calendar) {
        savedView = calendar.view?.type || savedView;
        calendar.destroy();
    }

    // Merge events and tasks (tasks show as all-day on due date)
    const eventSources = events.map(e => {
        const prio = e.priority || 0;
        return {
            id: 'ev-' + e.id,
            title: (prio >= 3 ? '🔴 ' : prio >= 2 ? '🟡 ' : '') + e.title,
            start: e.start_time,
            end: e.end_time,
            allDay: e.all_day,
            backgroundColor: e.category?.color || '#007AFF',
            borderColor: prio >= 3 ? '#FF3B30' : (e.category?.color || '#007AFF'),
            classNames: ['fc-event-schedule', prio >= 3 ? 'event-high-prio' : ''],
            extendedProps: { type: 'event', data: e },
        };
    });

    const taskSources = (tasks || []).map(t => {
        // Look up color: category first, then project
        let taskColor = '#AF52DE';
        const app = window.AlpineApp;
        if (app) {
            if (t.category_id && app.categories) {
                const cat = app.categories.find(c => c.id === t.category_id);
                if (cat) taskColor = cat.color;
            } else if (app.projects) {
                const proj = app.projects.find(p => p.id === t.project_id);
                if (proj) taskColor = proj.color;
            }
        }
        const isDone = t.status === 'done';
        const prio = t.priority || 0;
        const prioPrefix = prio >= 3 ? '🔴' : prio >= 2 ? '🟡' : '';
        return {
            id: 'tk-' + t.id + '-' + (t.due_date || ''),
            title: prioPrefix + ' ' + t.title,
            start: t.due_date,
            allDay: true,
            backgroundColor: isDone ? '#34C759' : taskColor,
            borderColor: isDone ? '#34C759' : (prio >= 3 ? '#FF3B30' : taskColor),
            classNames: ['fc-event-task', t.status === 'done' ? 'task-done' : '', prio >= 3 ? 'event-high-prio' : ''],
            extendedProps: { type: 'task', data: t },
        };
    });

    calendar = new FullCalendar.Calendar(el, {
        initialView: savedView,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'zh-cn',
        firstDay: 1,
        height: 'auto',
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        navLinks: true,

        events: [...eventSources, ...taskSources],

        eventClick(info) {
            const props = info.event.extendedProps;
            if (props.type === 'task') {
                // Switch to task view and select the project
                const app = window.AlpineApp;
                app.view = 'gantt';
                app.selectedProject = props.data.project_id;
                app.refreshProjects();
            } else {
                window.AlpineApp.openEditModal(props.data);
            }
        },

        eventDrop(info) {
            const props = info.event.extendedProps;
            if (props.type !== 'event') { info.revert(); return; }
            const ev = props.data;
            const delta = info.delta;
            const start = new Date(new Date(ev.start_time).getTime() + delta);
            const end = new Date(new Date(ev.end_time).getTime() + delta);
            API.events.update(ev.id, {
                start_time: start.toISOString(),
                end_time: end.toISOString(),
            }).then(() => window.AlpineApp.refreshAll())
              .catch(err => { alert('更新失败: ' + err.message); info.revert(); });
        },

        eventResize(info) {
            const props = info.event.extendedProps;
            if (props.type !== 'event') return;
            const ev = props.data;
            API.events.update(ev.id, {
                end_time: new Date(info.event.end).toISOString(),
            }).then(() => window.AlpineApp.refreshAll())
              .catch(err => alert('更新失败: ' + err.message));
        },

        select(info) {
            window.AlpineApp.openCreateModal({
                start_time: info.startStr,
                end_time: info.endStr,
                all_day: info.allDay,
            });
        },

        // Track view changes
        viewDidMount(info) {
            if (window.AlpineApp) {
                window.AlpineApp.calendarViewType = info.view.type;
            }
        },

        // Date click → go to day view
        dateClick(info) {
            calendar.changeView('timeGridDay', info.dateStr);
        },

        // Show lunar date + festivals + solar terms
        dayCellDidMount(info) {
            try {
                const app = window.AlpineApp;
                if (!app) return;
                const d = info.date;
                const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

                // Weather — week and day views only
                if (app.showWeather && app.weatherData && info.view.type !== 'dayGridMonth') {
                    const w = getWeatherForDate(app.weatherData, dateStr);
                    if (w) {
                        if (info.view.type === 'timeGridDay') {
                            // Day view: summary + hourly
                            const wel = document.createElement('div');
                            wel.style.cssText = 'font-size:10px;line-height:1.3;pointer-events:none;';
                            wel.textContent = w.icon + ' ' + w.min + '°~' + w.max + '°';
                            info.el.appendChild(wel);
                            const hours = getHourlyForDate(app.weatherData, dateStr);
                            if (hours.length > 0) {
                                const hwrap = document.createElement('div');
                                hwrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;margin-top:2px;pointer-events:none;';
                                hwrap.innerHTML = hours.filter(h => h.hour >= 6 && h.hour <= 22).map(h =>
                                    '<span style="font-size:9px;text-align:center;min-width:30px;">' + h.hour + '时<br>' + h.icon + '<br>' + h.temp + '°</span>'
                                ).join('');
                                info.el.appendChild(hwrap);
                            }
                        } else {
                            // Week view: temp range
                            const wel = document.createElement('div');
                            wel.style.cssText = 'font-size:10px;line-height:1.3;pointer-events:none;';
                            wel.textContent = w.icon + ' ' + w.min + '°~' + w.max + '°';
                            info.el.appendChild(wel);
                        }
                    }
                }

                // Lunar — month view only
                if (app.showLunar && info.view.type === 'dayGridMonth') {
                    const li = getLunarInfo(d.getFullYear(), d.getMonth() + 1, d.getDate());
                    const wrap = document.createElement('div');
                    wrap.style.cssText = 'font-size:10px;line-height:1.3;margin-top:-2px;pointer-events:none;';
                    if (li.festival) {
                        wrap.innerHTML = '<span style="color:#FF3B30;font-weight:600;">' + li.festival + '</span>';
                    } else if (li.term) {
                        wrap.innerHTML = '<span style="color:#34C759;font-weight:600;">' + li.term + '</span>';
                    } else if (li.lunar) {
                        wrap.textContent = li.lunar;
                    }
                    info.el.appendChild(wrap);
                }
            } catch(e) {}
        },
    });

    calendar.render();
}
