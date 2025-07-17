// State management
let tasks = [];
let currentEditTaskId = null;
let currentDetailTaskId = null;
let dragStartTime = 0;
let isDragging = false;

// DOM elements
const addTaskBtn = document.getElementById('add-task-btn');
const addModal = document.getElementById('add-modal');
const addTaskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescriptionInput = document.getElementById('task-description');
const cancelAddBtn = document.getElementById('cancel-add');

const editModal = document.getElementById('edit-modal');
const editTaskForm = document.getElementById('edit-task-form');
const editTitleInput = document.getElementById('edit-task-title');
const editDescriptionInput = document.getElementById('edit-task-description');
const cancelEditBtn = document.getElementById('cancel-edit');

const detailModal = document.getElementById('detail-modal');
const closeDetailBtn = document.getElementById('close-detail');
const detailEditBtn = document.getElementById('detail-edit-btn');
const detailDeleteBtn = document.getElementById('detail-delete-btn');

// Column elements
const todoColumn = document.getElementById('todo-column');
const workingColumn = document.getElementById('working-column');
const doneColumn = document.getElementById('done-column');

// Counter elements
const todoCount = document.getElementById('todo-count');
const workingCount = document.getElementById('working-count');
const doneCount = document.getElementById('done-count');

// API functions
async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        const config = await response.json();
        
        // Update page title and header
        const clientName = config.clientName || 'Prologue';
        document.getElementById('app-title').textContent = clientName;
        document.getElementById('page-title').textContent = `${clientName} - Project Management`;
    } catch (error) {
        console.error('Error fetching config:', error);
        // Keep default values if config fetch fails
    }
}

async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

async function createTask(title, description) {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description }),
        });
        
        if (!response.ok) throw new Error('Failed to create task');
        const newTask = await response.json();
        tasks.unshift(newTask);
        renderTasks();
        showNotification('Task created successfully', 'success');
    } catch (error) {
        console.error('Error creating task:', error);
        showNotification('Failed to create task', 'error');
    }
}

async function updateTaskStatus(taskId, newStatus, newPosition) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus, position: newPosition }),
        });
        
        if (!response.ok) throw new Error('Failed to update task status');
        
        // Update local state
        const task = tasks.find(t => t.id == taskId);
        if (task) {
            task.status = newStatus;
            task.position = newPosition || 0;
            task.updated_at = new Date().toISOString();
        }
        renderTasks();
    } catch (error) {
        console.error('Error updating task status:', error);
        showNotification('Failed to move task', 'error');
        // Revert the change by re-rendering
        renderTasks();
    }
}

async function updateTaskPositions(updatedTasks) {
    try {
        const response = await fetch('/api/tasks/reorder', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tasks: updatedTasks }),
        });
        
        if (!response.ok) throw new Error('Failed to update task positions');
        
        // Update local state
        updatedTasks.forEach(updatedTask => {
            const task = tasks.find(t => t.id == updatedTask.id);
            if (task) {
                task.status = updatedTask.status;
                task.position = updatedTask.position;
                task.updated_at = new Date().toISOString();
            }
        });
    } catch (error) {
        console.error('Error updating task positions:', error);
        showNotification('Failed to update task order', 'error');
        // Revert the change by re-rendering
        renderTasks();
    }
}

function updateTaskPositionsAfterDrop(draggedTaskId, newStatus, newPosition) {
    const draggedTask = tasks.find(t => t.id == draggedTaskId);
    if (!draggedTask) return;
    
    const oldStatus = draggedTask.status;
    const oldPosition = draggedTask.position || 0;
    
    // If status changed, we need to update positions in both columns
    if (oldStatus !== newStatus) {
        // Update positions in the old column (shift down tasks after the removed position)
        const oldColumnTasks = tasks
            .filter(t => t.status === oldStatus && t.id != draggedTaskId)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        // Update positions in the new column (shift up tasks at and after the new position)
        const newColumnTasks = tasks
            .filter(t => t.status === newStatus && t.id != draggedTaskId)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        const updatedTasks = [];
        
        // Reposition tasks in old column
        oldColumnTasks.forEach((task, index) => {
            const adjustedPosition = task.position > oldPosition ? task.position - 1 : task.position;
            if (adjustedPosition !== task.position) {
                updatedTasks.push({
                    id: task.id,
                    status: task.status,
                    position: adjustedPosition
                });
            }
        });
        
        // Reposition tasks in new column
        newColumnTasks.forEach((task, index) => {
            const adjustedPosition = index + 1 >= newPosition ? index + 2 : index + 1;
            if (adjustedPosition !== task.position) {
                updatedTasks.push({
                    id: task.id,
                    status: task.status,
                    position: adjustedPosition
                });
            }
        });
        
        // Add the dragged task with its new position and status
        updatedTasks.push({
            id: draggedTaskId,
            status: newStatus,
            position: newPosition
        });
        
        if (updatedTasks.length > 0) {
            updateTaskPositions(updatedTasks);
        }
    } else {
        // Same column, just reorder
        const columnTasks = tasks
            .filter(t => t.status === newStatus)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        const updatedTasks = [];
        
        columnTasks.forEach((task, index) => {
            let newPos;
            if (task.id == draggedTaskId) {
                newPos = newPosition;
            } else {
                // Calculate new position based on insertion point
                const currentPos = index + 1;
                if (oldPosition < newPosition) {
                    // Moving down: shift up tasks between old and new position
                    newPos = currentPos > oldPosition && currentPos <= newPosition ? currentPos - 1 : currentPos;
                } else {
                    // Moving up: shift down tasks between new and old position
                    newPos = currentPos >= newPosition && currentPos < oldPosition ? currentPos + 1 : currentPos;
                }
            }
            
            if (newPos !== (task.position || 0)) {
                updatedTasks.push({
                    id: task.id,
                    status: task.status,
                    position: newPos
                });
            }
        });
        
        if (updatedTasks.length > 0) {
            updateTaskPositions(updatedTasks);
        }
    }
}

async function updateTask(taskId, title, description) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description }),
        });
        
        if (!response.ok) throw new Error('Failed to update task');
        
        // Update local state
        const task = tasks.find(t => t.id == taskId);
        if (task) {
            task.title = title;
            task.description = description;
            task.updated_at = new Date().toISOString();
        }
        renderTasks();
        showNotification('Task updated successfully', 'success');
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
        
        // Remove from local state
        tasks = tasks.filter(t => t.id != taskId);
        renderTasks();
        showNotification('Task deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// UI functions
function createTaskCard(task) {
    const template = document.getElementById('task-template');
    const clone = template.content.cloneNode(true);
    
    const taskCard = clone.querySelector('.task-card');
    taskCard.setAttribute('data-task-id', task.id);
    
    clone.querySelector('.task-title').textContent = task.title;
    clone.querySelector('.task-description').innerHTML = task.description || '';
    clone.querySelector('.task-date').textContent = formatDate(task.created_at);
    
    // Set status indicator color
    const statusIndicator = clone.querySelector('.task-status-indicator');
    const statusColors = {
        'todo': 'bg-slate-500',
        'working': 'bg-yellow-500',
        'done': 'bg-green-500'
    };
    statusIndicator.className = `task-status-indicator w-2 h-2 rounded-full ${statusColors[task.status]}`;
    
    // Add event listeners
    const deleteBtn = clone.querySelector('.delete-task');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(task.id);
        }
    });
    
    const editBtn = clone.querySelector('.edit-task');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(task);
    });
    
    // Add click listener for task detail
    taskCard.addEventListener('mousedown', () => {
        dragStartTime = Date.now();
        isDragging = false;
    });
    
    taskCard.addEventListener('mouseup', (e) => {
        const clickDuration = Date.now() - dragStartTime;
        // If click duration is short and we weren't dragging, show detail
        if (clickDuration < 300 && !isDragging && !e.target.closest('button')) {
            openDetailModal(task);
        }
        isDragging = false;
    });
    
    return clone;
}

function renderTasks() {
    // Clear columns
    todoColumn.innerHTML = '';
    workingColumn.innerHTML = '';
    doneColumn.innerHTML = '';
    
    // Group tasks by status and sort by position
    const todoTasks = tasks.filter(task => task.status === 'todo').sort((a, b) => (a.position || 0) - (b.position || 0));
    const workingTasks = tasks.filter(task => task.status === 'working').sort((a, b) => (a.position || 0) - (b.position || 0));
    const doneTasks = tasks.filter(task => task.status === 'done').sort((a, b) => (a.position || 0) - (b.position || 0));
    
    // Render tasks in each column
    todoTasks.forEach(task => {
        todoColumn.appendChild(createTaskCard(task));
    });
    
    workingTasks.forEach(task => {
        workingColumn.appendChild(createTaskCard(task));
    });
    
    doneTasks.forEach(task => {
        doneColumn.appendChild(createTaskCard(task));
    });
    
    // Update counters
    todoCount.textContent = todoTasks.length;
    workingCount.textContent = workingTasks.length;
    doneCount.textContent = doneTasks.length;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openAddModal() {
    taskTitleInput.value = '';
    taskDescriptionInput.innerHTML = '';
    addModal.classList.remove('hidden');
    setTimeout(() => taskTitleInput.focus(), 100);
}

function closeAddModal() {
    taskTitleInput.value = '';
    taskDescriptionInput.innerHTML = '';
    addModal.classList.add('hidden');
}

function openEditModal(task) {
    currentEditTaskId = task.id;
    editTitleInput.value = task.title;
    editDescriptionInput.innerHTML = task.description || '';
    editModal.classList.remove('hidden');
    setTimeout(() => editTitleInput.focus(), 100);
}

function closeEditModal() {
    currentEditTaskId = null;
    editTitleInput.value = '';
    editDescriptionInput.innerHTML = '';
    editModal.classList.add('hidden');
}

function openDetailModal(task) {
    currentDetailTaskId = task.id;
    
    // Populate detail modal
    document.querySelector('.detail-task-title').textContent = task.title;
    document.querySelector('.detail-task-description').innerHTML = task.description || '<em>No description</em>';
    document.querySelector('.detail-task-created').textContent = formatDate(task.created_at);
    document.querySelector('.detail-task-updated').textContent = formatDate(task.updated_at);
    
    // Set status badge
    const statusBadge = document.querySelector('.detail-task-status');
    const statusConfig = {
        'todo': { text: 'To Do', class: 'bg-slate-100 text-slate-800' },
        'working': { text: 'Working', class: 'bg-yellow-100 text-yellow-800' },
        'done': { text: 'Done', class: 'bg-green-100 text-green-800' }
    };
    const config = statusConfig[task.status];
    statusBadge.textContent = config.text;
    statusBadge.className = `detail-task-status px-2 py-1 rounded-full text-xs font-medium ${config.class}`;
    
    detailModal.classList.remove('hidden');
}

function closeDetailModal() {
    currentDetailTaskId = null;
    detailModal.classList.add('hidden');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg border z-50 transition-all duration-300 ${
        type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
        type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
        'bg-blue-50 border-blue-200 text-blue-800'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Setup drag and drop
function setupDragAndDrop() {
    const columns = [
        { element: todoColumn, status: 'todo' },
        { element: workingColumn, status: 'working' },
        { element: doneColumn, status: 'done' }
    ];
    
    columns.forEach(column => {
        new Sortable(column.element, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'opacity-50',
            chosenClass: 'scale-105',
            dragClass: 'rotate-2',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            invertSwap: true,
            onStart: function(evt) {
                isDragging = true;
            },
            onEnd: function(evt) {
                const taskId = evt.item.getAttribute('data-task-id');
                
                // Determine the new status based on which column the item ended up in
                let newStatus = null;
                const parentColumn = evt.item.closest('[id$="-column"]');
                if (parentColumn) {
                    if (parentColumn.id === 'todo-column') newStatus = 'todo';
                    else if (parentColumn.id === 'working-column') newStatus = 'working';
                    else if (parentColumn.id === 'done-column') newStatus = 'done';
                }
                
                if (newStatus) {
                    // Calculate new position based on where it was dropped
                    const columnTasks = Array.from(parentColumn.children);
                    const newPosition = columnTasks.findIndex(el => el.getAttribute('data-task-id') == taskId) + 1;
                    
                    // Update positions for all tasks in the affected columns
                    updateTaskPositionsAfterDrop(taskId, newStatus, newPosition);
                }
                
                // Reset dragging state after a short delay
                setTimeout(() => {
                    isDragging = false;
                }, 100);
            }
        });
    });
}

// Event listeners
addTaskBtn.addEventListener('click', openAddModal);
cancelAddBtn.addEventListener('click', closeAddModal);

addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = taskTitleInput.value.trim();
    const description = sanitizeHtml(taskDescriptionInput.innerHTML.trim());
    
    if (!title) return;
    
    await createTask(title, description);
    closeAddModal();
});

editTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentEditTaskId) return;
    
    const title = editTitleInput.value.trim();
    const description = sanitizeHtml(editDescriptionInput.innerHTML.trim());
    
    if (!title) return;
    
    await updateTask(currentEditTaskId, title, description);
    closeEditModal();
});

cancelEditBtn.addEventListener('click', closeEditModal);

// Detail modal event listeners
closeDetailBtn.addEventListener('click', closeDetailModal);

detailEditBtn.addEventListener('click', () => {
    const task = tasks.find(t => t.id == currentDetailTaskId);
    if (task) {
        closeDetailModal();
        openEditModal(task);
    }
});

detailDeleteBtn.addEventListener('click', () => {
    if (currentDetailTaskId && confirm('Are you sure you want to delete this task?')) {
        deleteTask(currentDetailTaskId);
        closeDetailModal();
    }
});

// Close modals when clicking outside
addModal.addEventListener('click', (e) => {
    if (e.target === addModal) {
        closeAddModal();
    }
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        closeDetailModal();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!addModal.classList.contains('hidden')) {
            closeAddModal();
        } else if (!editModal.classList.contains('hidden')) {
            closeEditModal();
        } else if (!detailModal.classList.contains('hidden')) {
            closeDetailModal();
        }
    }
});

// WYSIWYG Editor Functions
function initWysiwyg() {
    // Setup toolbar buttons
    document.querySelectorAll('.wysiwyg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const command = btn.getAttribute('data-command');
            const target = btn.getAttribute('data-target');
            
            // Focus the correct editor
            if (target) {
                document.getElementById(target).focus();
            } else {
                taskDescriptionInput.focus();
            }
            
            // Execute the command
            document.execCommand(command, false, null);
        });
    });
    
    // Handle Enter key to create paragraphs
    document.querySelectorAll('.wysiwyg-editor').forEach(editor => {
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.execCommand('insertHTML', false, '<br><br>');
            }
        });
        
        // Clean up on paste
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    });
}

// Sanitize HTML to prevent XSS
function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove script tags and other dangerous elements
    const scripts = temp.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(script => script.remove());
    
    // Remove dangerous attributes
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(element => {
        // Keep only safe attributes
        const allowedAttrs = ['href', 'src', 'alt', 'title'];
        const attrs = [...element.attributes];
        attrs.forEach(attr => {
            if (!allowedAttrs.includes(attr.name) && !attr.name.startsWith('data-')) {
                element.removeAttribute(attr.name);
            }
        });
    });
    
    return temp.innerHTML;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    initWysiwyg();
    fetchConfig();
    fetchTasks();
}); 