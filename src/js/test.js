// --- 1. Load Data on Startup ---
async function loadTasks() {
    try {
        const response = await neutralino.web.fetch('/api/data/');
        const data = await response.json();
        renderTasks(data);
    } catch (error) {
        console.error("Failed to load tasks:", error);
    }
}

// --- 2. Render Tasks ---
function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = ''; 

    // Handle your specific data structure
    if (tasks && tasks.steps) {
        const taskName = tasks.name;
        const li = document.createElement('li');
        li.className = 'task-item';
        li.textContent = `${taskName}: ${tasks.steps.length} steps`;
        list.appendChild(li);
    } else if (Array.isArray(tasks)) {
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.textContent = task.name;
            list.appendChild(li);
        });
    }
}

// --- 3. Add Task Logic ---
async function addTask() {
    const input = document.getElementById('new-task-name');
    const name = input.value;
    if (!name) return;

    const newTask = {
        name: name,
        notes: "",
        steps: [
            { name: "Start", completed_at: null },
            { name: "Finish", completed_at: null }
        ]
    };

    try {
        const response = await neutralino.web.fetch('/api/data/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            alert("Task Saved!");
            input.value = "";
            loadTasks(); 
        } else {
            alert("Error saving task.");
        }
    } catch (error) {
        console.error(error);
    }
}
