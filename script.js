        document.addEventListener('DOMContentLoaded', () => {
    const scrollIndicator = document.getElementById('scrollIndicator');
    const archiveSection = document.getElementById('archiveSection');

    // Smooth scroll on click
    scrollIndicator.addEventListener('click', () => {
        archiveSection.scrollIntoView({ behavior: 'smooth' });
    });

    // Hide indicator when scrolling down or if archive isn't fully visible/active
    window.addEventListener('scroll', () => {
        // If user scrolls down past 150px, hide the hint
        if (window.scrollY > 150) {
            scrollIndicator.classList.add('hidden');
        } else {
            // Only bring it back if the archive section itself is set to display block
            if (archiveSection.style.display !== 'none') {
                scrollIndicator.classList.remove('hidden');
            }
        }
    });

    // Optional: Hook this into your app logic. 
    // If your TaskManager script hides the archive when empty, run this check:
    function updateIndicatorVisibility() {
        if (archiveSection.style.display === 'none') {
            scrollIndicator.classList.add('hidden');
        } else if (window.scrollY <= 150) {
            scrollIndicator.classList.remove('hidden');
        }
    }
    
    // Run an interval check or append updateIndicatorVisibility() inside your save/render methods
    setInterval(updateIndicatorVisibility, 1000);
});
        class TaskManager {
            constructor() {
                this.tasks = this.loadTasks();
                this.completedTasks = this.loadCompletedTasks();
                this.deletedTasks = this.loadDeletedTasks();
                this.currentFilter = 'all';
                this.pendingDeleteId = null;
                this.draggedTaskId = null;
                this.clearingType = null;
                this.init();
            }

            init() {
                this.timerIntervals = new Map();
                this.setupEventListeners();
                this.render();
                this.startTimerUpdates();
            }

            setupEventListeners() {
                // Form submission
                document.getElementById('taskForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addTask();
                });

                // Energy level change to update timer defaults
                document.querySelectorAll('input[name="energy"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        this.updateTimerDefaults(e.target.value);
                    });
                });

                // Filter buttons
                document.querySelectorAll('[data-filter]').forEach(btn => {
                    btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
                });

                // Timer picker controls
                document.querySelectorAll('.time-picker-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleTimerPickerButton(btn);
                    });
                });

                // Timer input changes
                document.querySelectorAll('.time-picker-input').forEach(input => {
                    input.addEventListener('change', () => this.updateTimeDisplay());
                    input.addEventListener('input', () => this.updateTimeDisplay());
                });

                // Delete Modal
                document.getElementById('cancelDelete').addEventListener('click', () => {
                    this.closeDeleteModal();
                });

                document.getElementById('confirmDelete').addEventListener('click', () => {
                    this.confirmDelete();
                });

                document.getElementById('deleteModal').addEventListener('click', (e) => {
                    if (e.target.id === 'deleteModal') {
                        this.closeDeleteModal();
                    }
                });

                // Clear Modal
                document.getElementById('cancelClear').addEventListener('click', () => {
                    this.closeClearModal();
                });

                document.getElementById('confirmClear').addEventListener('click', () => {
                    this.confirmClear();
                });

                document.getElementById('clearModal').addEventListener('click', (e) => {
                    if (e.target.id === 'clearModal') {
                        this.closeClearModal();
                    }
                });

                // Clear buttons
                document.getElementById('clearCompletedBtn').addEventListener('click', () => {
                    this.openClearModal('completed');
                });

                document.getElementById('clearDeletedBtn').addEventListener('click', () => {
                    this.openClearModal('deleted');
                });

                // Request notification permission
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }

            updateTimerDefaults(energy) {
                let hours, minutes, seconds;

                if (energy === 'high') {
                    hours = 1;
                    minutes = 30;
                    seconds = 0;
                } else if (energy === 'medium') {
                    hours = 1;
                    minutes = 0;
                    seconds = 0;
                } else if (energy === 'low') {
                    hours = 0;
                    minutes = 30;
                    seconds = 0;
                }

                document.getElementById('timerHours').value = hours;
                document.getElementById('timerMinutes').value = minutes;
                document.getElementById('timerSeconds').value = seconds;
                this.updateTimeDisplay();
            }

            handleTimerPickerButton(btn) {
                const action = btn.dataset.action;
                const unit = btn.dataset.unit;
                const inputId = unit === 'hours' ? 'timerHours' : unit === 'minutes' ? 'timerMinutes' : 'timerSeconds';
                const input = document.getElementById(inputId);
                const max = inputId === 'timerHours' ? 23 : 59;
                
                let value = parseInt(input.value) || 0;
                
                if (action === 'inc') {
                    value = value >= max ? 0 : value + 1;
                } else if (action === 'dec') {
                    value = value <= 0 ? max : value - 1;
                }
                
                input.value = value;
                this.updateTimeDisplay();
            }

            updateTimeDisplay() {
                const hours = parseInt(document.getElementById('timerHours').value) || 0;
                const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
                const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
                
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                
                let display = '';
                if (hours > 0) {
                    display = `${hours}h ${minutes}m ${seconds}s`;
                } else if (minutes > 0) {
                    display = `${minutes}m ${seconds}s`;
                } else if (seconds > 0) {
                    display = `${seconds}s`;
                } else {
                    display = 'No time set';
                }
                
                document.getElementById('timeDisplay').textContent = display;
            }

            addTask() {
                const title = document.getElementById('taskTitle').value.trim();
                const description = document.getElementById('taskDescription').value.trim();
                const energy = document.querySelector('input[name="energy"]:checked').value;
                
                // Get time from picker
                const hours = parseInt(document.getElementById('timerHours').value) || 0;
                const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
                const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
                
                if (!title) return;

                // Calculate total milliseconds for timer
                const totalMs = hours * 3600 * 1000 + minutes * 60 * 1000 + seconds * 1000;

                const task = {
                    id: Date.now(),
                    title: title,
                    description: description || null,
                    energy: energy,
                    time: hours > 0 || minutes > 0 || seconds > 0 ? `${hours}h${minutes}m${seconds}s` : null,
                    completed: false,
                    timerRunning: false,
                    timerRemaining: totalMs > 0 ? totalMs : null,
                    createdAt: new Date().toISOString()
                };

                this.tasks.unshift(task);
                this.saveTasks();

                // Reset form
                document.getElementById('taskForm').reset();
                document.getElementById('energyMedium').checked = true;
                this.updateTimerDefaults('medium');

                this.render();
            }

            openDeleteModal(id) {
                this.pendingDeleteId = id;
                document.getElementById('deleteModal').classList.add('active');
            }

            closeDeleteModal() {
                this.pendingDeleteId = null;
                document.getElementById('deleteModal').classList.remove('active');
            }

            confirmDelete() {
                if (this.pendingDeleteId !== null) {
                    this.deleteTask(this.pendingDeleteId);
                }
                this.closeDeleteModal();
            }

            openClearModal(type) {
                this.clearingType = type;
                const title = type === 'completed' ? 'Clear Completed Tasks?' : 'Clear Deleted Tasks?';
                const body = type === 'completed' 
                    ? 'Are you sure you want to clear all completed tasks? This action cannot be undone.'
                    : 'Are you sure you want to clear all deleted tasks? This action cannot be undone.';
                
                document.getElementById('clearModalTitle').textContent = title;
                document.getElementById('clearModalBody').textContent = body;
                document.getElementById('clearModal').classList.add('active');
            }

            closeClearModal() {
                this.clearingType = null;
                document.getElementById('clearModal').classList.remove('active');
            }

            confirmClear() {
                if (this.clearingType === 'completed') {
                    this.clearCompletedTasks();
                } else if (this.clearingType === 'deleted') {
                    this.clearDeletedTasks();
                }
                this.closeClearModal();
            }

            clearCompletedTasks() {
                this.completedTasks = [];
                this.saveCompletedTasks();
                this.render();
            }

            clearDeletedTasks() {
                this.deletedTasks = [];
                this.saveDeletedTasks();
                this.render();
            }

            deleteTask(id) {
                const task = this.tasks.find(t => t.id === id);
                if (task) {
                    this.deletedTasks.unshift({ ...task, deletedAt: new Date().toISOString() });
                    this.saveDeletedTasks();
                    this.tasks = this.tasks.filter(t => t.id !== id);
                    this.saveTasks();
                    this.render();
                }
            }

            restoreTask(id) {
                const taskIndex = this.deletedTasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                    const task = this.deletedTasks[taskIndex];
                    const { deletedAt, ...taskData } = task;
                    this.tasks.unshift(taskData);
                    this.deletedTasks.splice(taskIndex, 1);
                    this.saveTasks();
                    this.saveDeletedTasks();
                    this.render();
                }
            }

            toggleComplete(id) {
                const task = this.tasks.find(t => t.id === id);
                if (task) {
                    task.completed = !task.completed;
                    
                    if (task.completed) {
                        // Show congratulations popup
                        this.showCongratsPopup(task.title);
                        
                        // Move to completed
                        this.completedTasks.unshift({ ...task, completedAt: new Date().toISOString() });
                        this.tasks = this.tasks.filter(t => t.id !== id);
                    }
                    
                    this.saveTasks();
                    this.saveCompletedTasks();
                    this.render();
                }
            }

            showCongratsPopup(taskName) {
                const popup = document.getElementById('congratsPopup');
                popup.classList.add('show');
                
                // Auto-hide after 3 seconds
                setTimeout(() => {
                    popup.classList.remove('show');
                }, 3000);
            }

            restoreCompleted(id) {
                const taskIndex = this.completedTasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                    const task = this.completedTasks[taskIndex];
                    const { completedAt, ...taskData } = task;
                    taskData.completed = false;
                    this.tasks.unshift(taskData);
                    this.completedTasks.splice(taskIndex, 1);
                    this.saveCompletedTasks();
                    this.saveTasks();
                    this.render();
                }
            }

            changeEnergy(id, newEnergy) {
                const task = this.tasks.find(t => t.id === id);
                if (task) {
                    task.energy = newEnergy;
                    this.saveTasks();
                    this.render();
                }
            }

            setFilter(filter) {
                this.currentFilter = filter;
                document.querySelectorAll('[data-filter]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filter === filter);
                });
                this.render();
            }

            getFilteredTasks() {
                if (this.currentFilter === 'all') {
                    return this.tasks;
                }
                return this.tasks.filter(task => task.energy === this.currentFilter);
            }

            render() {
                this.renderTasks();
                this.renderArchive();
            }

            renderTasks() {
                const taskList = document.getElementById('taskList');
                const emptyState = document.getElementById('emptyState');
                taskList.innerHTML = '';

                const filteredTasks = this.getFilteredTasks();

                if (filteredTasks.length === 0) {
                    emptyState.style.display = 'block';
                    taskList.style.display = 'none';
                    return;
                } else {
                    emptyState.style.display = 'none';
                    taskList.style.display = 'flex';
                }

                filteredTasks.forEach(task => {
                    const taskCard = this.createTaskCard(task, 'active');
                    taskList.appendChild(taskCard);
                });
            }

            renderArchive() {
                const completedList = document.getElementById('completedList');
                const deletedList = document.getElementById('deletedList');
                const archiveSection = document.getElementById('archiveSection');
                const emptyCompleted = document.getElementById('emptyCompleted');
                const emptyDeleted = document.getElementById('emptyDeleted');

                completedList.innerHTML = '';
                deletedList.innerHTML = '';

                // Always show archive section
                archiveSection.style.display = 'block';

                // Render completed tasks
                if (this.completedTasks.length > 0) {
                    emptyCompleted.style.display = 'none';
                    completedList.style.display = 'flex';
                    this.completedTasks.forEach(task => {
                        const taskCard = this.createTaskCard(task, 'completed');
                        completedList.appendChild(taskCard);
                    });
                } else {
                    emptyCompleted.style.display = 'block';
                    completedList.style.display = 'none';
                }

                // Render deleted tasks
                if (this.deletedTasks.length > 0) {
                    emptyDeleted.style.display = 'none';
                    deletedList.style.display = 'flex';
                    this.deletedTasks.forEach(task => {
                        const taskCard = this.createTaskCard(task, 'deleted');
                        deletedList.appendChild(taskCard);
                    });
                } else {
                    emptyDeleted.style.display = 'block';
                    deletedList.style.display = 'none';
                }
            }

            createTaskCard(task, type) {
                const taskCard = document.createElement('div');
                taskCard.className = `task-card ${type === 'completed' ? 'completed' : ''}`;
                taskCard.dataset.taskId = task.id;
                taskCard.draggable = type === 'active';

                const energyEmoji = {
                    high: '⚡',
                    medium: '🔋',
                    low: '💤'
                }[task.energy];

                const energyLabel = task.energy.charAt(0).toUpperCase() + task.energy.slice(1);

                const totalMs = this.parseTimeToMs(task.time);
                const remainingMs = task.timerRemaining != null ? task.timerRemaining : totalMs;
                const progressPercent = totalMs > 0 ? (remainingMs / totalMs) * 100 : 100;
                const isWarning = remainingMs > 0 && remainingMs <= (totalMs * 0.25);
                const isCritical = remainingMs > 0 && remainingMs <= (totalMs * 0.1);

                let checkboxHtml = '';
                let actionButtonHtml = '';

                if (type === 'active') {
                    checkboxHtml = `
                        <div class="task-checkbox-wrapper">
                            <input 
                                type="checkbox" 
                                class="task-checkbox" 
                                ${task.completed ? 'checked' : ''}
                                data-id="${task.id}"
                            >
                        </div>
                    `;
                    actionButtonHtml = `
                        <button class="task-delete" data-id="${task.id}" title="Delete task">✕</button>
                    `;
                } else if (type === 'completed') {
                    checkboxHtml = `
                        <div class="task-checkbox-wrapper">
                            <input 
                                type="checkbox" 
                                class="task-checkbox" 
                                checked
                                disabled
                            >
                        </div>
                    `;
                    actionButtonHtml = `
                        <button class="task-restore" data-id="${task.id}" title="Restore task">↺</button>
                    `;
                } else if (type === 'deleted') {
                    checkboxHtml = `
                        <div class="task-checkbox-wrapper">
                            <input 
                                type="checkbox" 
                                class="task-checkbox" 
                                disabled
                            >
                        </div>
                    `;
                    actionButtonHtml = `
                        <button class="task-restore" data-id="${task.id}" title="Restore task">↺</button>
                    `;
                }

                taskCard.innerHTML = `
                    <div class="task-header">
                        <div style="flex: 1; display: flex; gap: 12px; align-items: flex-start;">
                            ${checkboxHtml}
                            <div class="task-content">
                                <div class="task-title">${this.escapeHtml(task.title)}</div>
                                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                                <div class="task-meta">
                                    <div class="task-energy ${task.energy}" ${type === 'active' ? `data-id="${task.id}"` : ''} title="${type === 'active' ? 'Click to change energy level' : ''}">
                                        ${energyEmoji} ${energyLabel}
                                    </div>
                                    ${task.time ? `<span class="task-time">⏱ ${this.escapeHtml(task.time)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        ${actionButtonHtml}
                    </div>
                    ${type === 'active' && task.time ? `
                        <div class="task-timer-section">
                            <div class="task-timer-display">
                                <div class="timer-value ${isCritical ? 'critical' : isWarning ? 'warning' : ''}">${this.formatMs(remainingMs)}</div>
                                <div class="timer-controls">
                                    <button class="timer-btn ${task.timerRunning ? 'running' : ''}" data-id="${task.id}" data-action="${task.timerRunning ? 'pause' : 'start'}">
                                        ${task.timerRunning ? '⏸ Pause' : '▶ Start'}
                                    </button>
                                    <button class="timer-btn stop" data-id="${task.id}" data-action="stop">✕ Stop</button>
                                </div>
                            </div>
                            <div class="timer-progress">
                                <div class="timer-progress-bar ${isCritical ? 'critical' : isWarning ? 'warning' : ''}" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    ` : ''}
                `;

                // Add event listeners based on type
                if (type === 'active') {
                    // Checkbox
                    const checkbox = taskCard.querySelector('.task-checkbox');
                    if (checkbox) {
                        checkbox.addEventListener('change', () => {
                            this.toggleComplete(task.id);
                        });
                    }

                    // Delete button
                    const deleteBtn = taskCard.querySelector('.task-delete');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', () => {
                            this.openDeleteModal(task.id);
                        });
                    }

                    // Energy badge click
                    const energyBadge = taskCard.querySelector('.task-energy');
                    if (energyBadge) {
                        energyBadge.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.showEnergySwitcher(taskCard, task.id, task.energy);
                        });
                    }

                    // Timer events
                    if (task.time) {
                        taskCard.querySelectorAll('.timer-btn').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const action = btn.dataset.action;
                                const taskId = parseInt(btn.dataset.id);
                                this.handleTimerAction(taskId, action);
                            });
                        });
                    }

                    // Drag events
                    taskCard.addEventListener('dragstart', (e) => {
                        this.draggedTaskId = task.id;
                        taskCard.classList.add('dragging');
                    });

                    taskCard.addEventListener('dragend', () => {
                        taskCard.classList.remove('dragging');
                        document.querySelectorAll('.task-card').forEach(card => {
                            card.classList.remove('drag-over');
                        });
                    });

                    taskCard.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        if (this.draggedTaskId !== task.id) {
                            taskCard.classList.add('drag-over');
                        }
                    });

                    taskCard.addEventListener('dragleave', () => {
                        taskCard.classList.remove('drag-over');
                    });

                    taskCard.addEventListener('drop', (e) => {
                        e.preventDefault();
                        this.reorderTasks(this.draggedTaskId, task.id);
                        taskCard.classList.remove('drag-over');
                    });
                } else if (type === 'completed' || type === 'deleted') {
                    // Restore button
                    const restoreBtn = taskCard.querySelector('.task-restore');
                    if (restoreBtn) {
                        restoreBtn.addEventListener('click', () => {
                            if (type === 'completed') {
                                this.restoreCompleted(task.id);
                            } else {
                                this.restoreTask(task.id);
                            }
                        });
                    }
                }

                return taskCard;
            }

            showEnergySwitcher(taskCard, taskId, currentEnergy) {
                const energyBadge = taskCard.querySelector('.task-energy');
                const selector = document.createElement('div');
                selector.className = 'energy-selector';
                selector.innerHTML = `
                    <button class="energy-selector-btn high ${currentEnergy === 'high' ? 'active' : ''}" data-energy="high">⚡ High</button>
                    <button class="energy-selector-btn medium ${currentEnergy === 'medium' ? 'active' : ''}" data-energy="medium">🔋 Med</button>
                    <button class="energy-selector-btn low ${currentEnergy === 'low' ? 'active' : ''}" data-energy="low">💤 Low</button>
                `;

                selector.querySelectorAll('.energy-selector-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const newEnergy = btn.dataset.energy;
                        this.changeEnergy(taskId, newEnergy);
                        selector.remove();
                    });
                });

                energyBadge.replaceWith(selector);

                // Close on outside click
                document.addEventListener('click', function closeSelector(e) {
                    if (!selector.contains(e.target)) {
                        selector.remove();
                        document.removeEventListener('click', closeSelector);
                    }
                });
            }

            reorderTasks(draggedId, targetId) {
                const draggedIndex = this.tasks.findIndex(t => t.id === draggedId);
                const targetIndex = this.tasks.findIndex(t => t.id === targetId);

                if (draggedIndex !== -1 && targetIndex !== -1) {
                    const draggedTask = this.tasks[draggedIndex];
                    this.tasks.splice(draggedIndex, 1);
                    this.tasks.splice(targetIndex, 0, draggedTask);
                    this.saveTasks();
                    this.render();
                }
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            parseTimeToMs(timeStr) {
                if (!timeStr) return 0;
                
                let ms = 0;
                
                const hoursMatch = timeStr.match(/(\d+)h/);
                const minutesMatch = timeStr.match(/(\d+)m/);
                const secondsMatch = timeStr.match(/(\d+)s/);
                
                if (hoursMatch) ms += parseInt(hoursMatch[1]) * 3600 * 1000;
                if (minutesMatch) ms += parseInt(minutesMatch[1]) * 60 * 1000;
                if (secondsMatch) ms += parseInt(secondsMatch[1]) * 1000;
                
                return ms;
            }

            formatMs(ms) {
                const seconds = Math.floor((ms / 1000) % 60);
                const minutes = Math.floor((ms / (1000 * 60)) % 60);
                const hours = Math.floor(ms / (1000 * 60 * 60));

                if (hours > 0) {
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }

            handleTimerAction(taskId, action) {
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                if (action === 'start') {
                    task.timerRunning = true;
                    if (task.timerRemaining === null || task.timerRemaining === undefined) {
                        task.timerRemaining = this.parseTimeToMs(task.time);
                    }
                    this.startTaskTimer(taskId);
                } else if (action === 'pause') {
                    task.timerRunning = false;
                    this.stopTaskTimer(taskId);
                } else if (action === 'stop') {
                    task.timerRunning = false;
                    task.timerRemaining = this.parseTimeToMs(task.time);
                    this.stopTaskTimer(taskId);
                }

                this.saveTasks();
                this.render();
            }

            startTaskTimer(taskId) {
                if (this.timerIntervals.has(taskId)) {
                    return;
                }

                const task = this.tasks.find(t => t.id === taskId);
                if (!task || !task.timerRunning) return;

                const intervalId = setInterval(() => {
                    if (!task.timerRunning) {
                        this.stopTaskTimer(taskId);
                        return;
                    }

                    task.timerRemaining -= 100;

                    if (task.timerRemaining <= 0) {
                        task.timerRemaining = 0;
                        task.timerRunning = false;
                        this.stopTaskTimer(taskId);
                        this.playAlarm();
                        this.showNotification(task.title);
                        this.saveTasks();
                        this.render();
                        return;
                    }

                    this.saveTasks();
                    this.updateTimerDisplay(taskId);
                }, 100);

                this.timerIntervals.set(taskId, intervalId);
            }

            stopTaskTimer(taskId) {
                if (this.timerIntervals.has(taskId)) {
                    clearInterval(this.timerIntervals.get(taskId));
                    this.timerIntervals.delete(taskId);
                }
            }

            updateTimerDisplay(taskId) {
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                const totalMs = this.parseTimeToMs(task.time);
                const remainingMs = task.timerRemaining || totalMs;
                const progressPercent = totalMs > 0 ? (remainingMs / totalMs) * 100 : 100;
                const isWarning = remainingMs > 0 && remainingMs <= (totalMs * 0.25);
                const isCritical = remainingMs > 0 && remainingMs <= (totalMs * 0.1);

                const card = document.querySelector(`[data-task-id=\"${taskId}\"]`);
                if (card) {
                    const timerValue = card.querySelector('.timer-value');
                    const progressBar = card.querySelector('.timer-progress-bar');

                    if (timerValue) {
                        timerValue.textContent = this.formatMs(remainingMs);
                        timerValue.classList.toggle('warning', isWarning);
                        timerValue.classList.toggle('critical', isCritical);
                    }

                    if (progressBar) {
                        progressBar.style.width = progressPercent + '%';
                        progressBar.classList.toggle('warning', isWarning);
                        progressBar.classList.toggle('critical', isCritical);
                    }
                }
            }

            startTimerUpdates() {
                setInterval(() => {
                    this.timerIntervals.forEach((_, taskId) => {
                        const task = this.tasks.find(t => t.id === taskId);
                        if (task && !task.timerRunning) {
                            this.stopTaskTimer(taskId);
                        }
                    });
                }, 1000);
            }

            playAlarm() {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);

                    const osc2 = audioContext.createOscillator();
                    const gain2 = audioContext.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioContext.destination);
                    osc2.frequency.value = 1000;
                    osc2.type = 'sine';
                    gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.6);
                    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.1);
                    osc2.start(audioContext.currentTime + 0.6);
                    osc2.stop(audioContext.currentTime + 1.1);
                } catch (e) {
                    console.log('Audio context not available');
                }
            }

            showNotification(taskName) {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('⏱ Timer Complete!', {
                        body: `Task completed: ${taskName}`,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✓</text></svg>'
                    });
                }
            }

            saveTasks() {
                localStorage.setItem('energyTasks', JSON.stringify(this.tasks));
            }

            loadTasks() {
                const saved = localStorage.getItem('energyTasks');
                return saved ? JSON.parse(saved) : [];
            }

            saveCompletedTasks() {
                localStorage.setItem('energyCompletedTasks', JSON.stringify(this.completedTasks));
            }

            loadCompletedTasks() {
                const saved = localStorage.getItem('energyCompletedTasks');
                return saved ? JSON.parse(saved) : [];
            }

            saveDeletedTasks() {
                localStorage.setItem('energyDeletedTasks', JSON.stringify(this.deletedTasks));
            }

            loadDeletedTasks() {
                const saved = localStorage.getItem('energyDeletedTasks');
                return saved ? JSON.parse(saved) : [];
            }
        }

        // Initialize the app
        const app = new TaskManager();