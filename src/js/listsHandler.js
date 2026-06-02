// ListsHandler - Manages all list and item operations
// Uses event delegation for better performance
// Wired to backend FastAPI endpoints

// Debug: Log when script loads to track reloads
console.log('listsHandler.js loaded at:', new Date().toISOString());

const ListsHandler = (function() {
    'use strict';

    let listCounter = 0;
    let contextMenuTarget = null;
    let draggedList = null;
    let draggedItem = null;
    let currentSection = 'all'; // 'all' or section id
    let sections = []; // Array of {id, name}
    let scrollInterval = null;

    // DOM elements
    let listsContainer;
    let listTemplate;
    let listItemTemplate;
    let contextMenu;
    let addListBtn;
    let syncBtn;
    let sidebar;
    let sidebarButton;
    let mainLayout;
    let sectionsList;
    let addSectionBtn;

    // Backend API base URL (loaded from config.js)
    const API_BASE_URL = CLIENT_CONFIG.API_BASE_URL;

    // API Key for authentication (from config.js - must match API_KEY in src/backend/.env)
    const API_KEY = CLIENT_CONFIG.API_KEY;

    /*
        Initialize the lists handler
    */
    function init() {
        // Cache DOM elements
        listsContainer = document.getElementById('listsContainer');
        listTemplate = document.getElementById('listTemplate');
        listItemTemplate = document.getElementById('listItemTemplate');
        contextMenu = document.getElementById('contextMenu');
        addListBtn = document.getElementById('addListBtn');
        syncBtn = document.getElementById('syncBtn');
        sidebar = document.getElementById('sidebar');
        sidebarButton = document.getElementById('sidebarButton');
        mainLayout = document.querySelector('.main-layout');
        sectionsList = document.getElementById('sectionsList');
        addSectionBtn = document.getElementById('addSectionBtn');

        // Set up event listeners
        setupEventListeners();
        setupSidebar();
        setupDragAndDrop();

        // Load data from backend
        loadDataFromBackend();

        console.log('ListsHandler initialized');
    }

    /*
        Set up sidebar toggle
    */
    function setupSidebar() {
        if (sidebarButton) {
            sidebarButton.addEventListener('click', toggleSidebar);
        }

        if (addSectionBtn) {
            addSectionBtn.addEventListener('click', addSection);
        }

        // Set up event delegation for sections
        if (sectionsList) {
            sectionsList.addEventListener('click', handleSectionsClick);
            sectionsList.addEventListener('dblclick', handleSectionsDoubleClick);
            sectionsList.addEventListener('blur', handleSectionRename, true);
            sectionsList.addEventListener('keydown', handleSectionKeydown);

            // Set up drag and drop on sections
            sectionsList.addEventListener('dragover', handleSectionDragOver);
            sectionsList.addEventListener('dragleave', handleSectionDragLeave);
            sectionsList.addEventListener('drop', handleSectionDrop);
        }
    }

    /*
        Toggle sidebar visibility
    */
    function toggleSidebar() {
        if (sidebar && mainLayout) {
            sidebar.classList.toggle('open');
            mainLayout.classList.toggle('sidebar-open');
            const isOpen = sidebar.classList.contains('open');
            if (sidebarButton) {
                sidebarButton.textContent = isOpen ? '[ < ]' : '[ > ]';
            }
        }
    }

    /*
        Add a new section
    */
    function addSection() {
        const sectionId = 'section-' + Date.now();
        const section = {
            id: sectionId,
            name: 'New Section'
        };
        sections.push(section);
        renderSections();
        syncDataToBackend();

        // Focus the new section's input
        setTimeout(() => {
            const sectionItem = document.querySelector(`[data-section-id="${sectionId}"] .section-name`);
            if (sectionItem) {
                sectionItem.focus();
                sectionItem.select();
            }
        }, 50);
    }

    /*
        Handle section clicks (select section)
    */
    function handleSectionsClick(e) {
        const target = e.target;

        // Delete section button
        if (target.classList.contains('section-delete-btn')) {
            const sectionItem = target.closest('.section-item');
            if (sectionItem) {
                const sectionId = sectionItem.dataset.sectionId;
                deleteSection(sectionId);
            }
            return;
        }

        // Section item (select)
        const sectionItem = target.closest('.section-item');
        if (sectionItem && !target.classList.contains('section-name') && !target.classList.contains('section-delete-btn')) {
            const sectionId = sectionItem.dataset.sectionId;
            selectSection(sectionId);
        }
    }

    /*
        Handle section double-click for rename
    */
    function handleSectionsDoubleClick(e) {
        const sectionName = e.target.closest('.section-name');
        if (sectionName) {
            sectionName.focus();
            sectionName.select();
        }
    }

    /*
        Handle section rename on blur
    */
    function handleSectionRename(e) {
        if (e.target.classList.contains('section-name')) {
            const sectionItem = e.target.closest('.section-item');
            if (sectionItem) {
                const sectionId = sectionItem.dataset.sectionId;
                const newName = e.target.value.trim() || 'Untitled';
                renameSection(sectionId, newName);
            }
        }
    }

    /*
        Handle section keydown (Enter to save, Escape to cancel)
    */
    function handleSectionKeydown(e) {
        if (e.target.classList.contains('section-name')) {
            if (e.key === 'Enter') {
                e.target.blur();
            } else if (e.key === 'Escape') {
                const sectionItem = e.target.closest('.section-item');
                const sectionId = sectionItem.dataset.sectionId;
                const section = sections.find(s => s.id === sectionId);
                if (section) {
                    e.target.value = section.name;
                }
                e.target.blur();
            }
        }
    }

    /*
        Select a section and filter lists
    */
    function selectSection(sectionId) {
        currentSection = sectionId;
        renderSections();
        filterListsBySection();
    }

    /*
        Delete a section
    */
    function deleteSection(sectionId) {
        if (!sectionId || sectionId === 'all') return;

        if (confirm('Delete this section? Lists in this section will be moved to "All".')) {
            // Remove section
            sections = sections.filter(s => s.id !== sectionId);

            // Update lists that were in this section
            document.querySelectorAll('.list').forEach(list => {
                if (list.dataset.section === sectionId) {
                    list.dataset.section = '';
                }
            });

            // Select 'all' if current section was deleted
            if (currentSection === sectionId) {
                currentSection = 'all';
            }

            renderSections();
            filterListsBySection();
            syncDataToBackend();
        }
    }

    /*
        Rename a section and update all lists
    */
    function renameSection(sectionId, newName) {
        const section = sections.find(s => s.id === sectionId);
        if (section && section.name !== newName) {
            section.name = newName;
            renderSections();
            updateListSectionSelects();
            syncDataToBackend();
        }
    }

    /*
        Render sections in sidebar
    */
    function renderSections() {
        if (!sectionsList) return;

        // Count lists per section
        const listCounts = {};
        document.querySelectorAll('.list').forEach(list => {
            const sectionId = list.dataset.section || '';
            listCounts[sectionId] = (listCounts[sectionId] || 0) + 1;
        });

        let html = '';

        // "All" section
        const totalLists = Object.values(listCounts).reduce((a, b) => a + b, 0);
        html += `<div class="section-item ${currentSection === 'all' ? 'active' : ''}" data-section-id="all">
            <span class="section-name" style="font-weight: 600;">All Lists</span>
            <span class="section-count">${totalLists}</span>
        </div>`;

        // Custom sections
        sections.forEach(section => {
            const count = listCounts[section.id] || 0;
            const isActive = currentSection === section.id;
            html += `<div class="section-item ${isActive ? 'active' : ''}" data-section-id="${section.id}">
                <input type="text" class="section-name" value="${escapeHtml(section.name)}">
                <span class="section-count">${count}</span>
                <button class="section-delete-btn" title="Delete section">×</button>
            </div>`;
        });

        sectionsList.innerHTML = html;

        // Also update the section selects in all lists
        updateListSectionSelects();
    }

    /*
        Filter lists by selected section
    */
    function filterListsBySection() {
        if (!listsContainer) return;

        const lists = listsContainer.querySelectorAll('.list');
        lists.forEach(list => {
            const listSection = list.dataset.section || '';
            if (currentSection === 'all' || listSection === currentSection) {
                list.style.display = 'flex';
            } else {
                list.style.display = 'none';
            }
        });
    }

    /*
        Update section selects in all lists
    */
    function updateListSectionSelects() {
        if (!listsContainer) return;

        const lists = listsContainer.querySelectorAll('.list');
        lists.forEach(list => {
            const select = list.querySelector('.list-section-select');
            if (!select) return;

            const currentSection = list.dataset.section || '';

            // Save current selection
            const previousValue = select.value;

            // Clear and repopulate options
            select.innerHTML = '<option value="">No Section</option>';
            sections.forEach(section => {
                const option = document.createElement('option');
                option.value = section.id;
                option.textContent = section.name;
                select.appendChild(option);
            });

            // Restore selection
            select.value = previousValue;
            if (select.value !== previousValue) {
                // Previous section was deleted, reset to no section
                list.dataset.section = '';
            }
        });
    }

    /*
        Handle section select change
    */
    function handleSectionSelectChange(e) {
        if (e.target.classList.contains('list-section-select')) {
            const list = e.target.closest('.list');
            if (list) {
                const sectionId = e.target.value;
                list.dataset.section = sectionId;

                // Update the sections sidebar count
                renderSections();
                filterListsBySection();
                syncDataToBackend();
            }
        }
    }

    /*
        Handle drag over section (for dropping lists into sections)
    */
    function handleSectionDragOver(e) {
        e.preventDefault();
        const sectionItem = e.target.closest('.section-item');
        if (sectionItem && sectionItem.dataset.sectionId !== 'all') {
            sectionItem.classList.add('drag-over');
        }
    }

    /*
        Handle drag leave section
    */
    function handleSectionDragLeave(e) {
        const sectionItem = e.target.closest('.section-item');
        if (sectionItem) {
            sectionItem.classList.remove('drag-over');
        }
    }

    /*
        Handle drop on section (move list to section)
    */
    function handleSectionDrop(e) {
        e.preventDefault();
        const sectionItem = e.target.closest('.section-item');
        if (sectionItem && draggedList) {
            const sectionId = sectionItem.dataset.sectionId;
            if (sectionId !== 'all') {
                draggedList.dataset.section = sectionId;
                // Update the section name display
                const section = sections.find(s => s.id === sectionId);
                renderSections();
                filterListsBySection();
                syncDataToBackend();
            }
        }
        document.querySelectorAll('.section-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    /*
        Escape HTML for safe rendering
    */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /*
        Set up all event listeners using event delegation
    */
    function setupEventListeners() {
        // Add list button
        if (addListBtn) {
            addListBtn.addEventListener('click', addList);
        }

        // Sync button
        if (syncBtn) {
            syncBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                syncDataToBackend();
            });
        }

        // Event delegation for lists container
        if (listsContainer) {
            listsContainer.addEventListener('click', handleListsClick);
            listsContainer.addEventListener('dblclick', handleListsDoubleClick);
            listsContainer.addEventListener('contextmenu', handleContextMenu);

            // Horizontal scroll with mouse wheel
            listsContainer.addEventListener('wheel', handleHorizontalScroll, { passive: false });

            // Section select change
            listsContainer.addEventListener('change', handleSectionSelectChange);
        }

        // Hide context menu on click elsewhere
        document.addEventListener('click', (e) => {
            if (contextMenu && !contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });

        // Hide context menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideContextMenu();
            }
            // Ctrl+S to sync
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                syncDataToBackend();
            }
        });
    }

    /*
        Stop auto-scroll
    */
    function stopAutoScroll() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    /*
        Handle mouse wheel to scroll horizontally
    */
    function handleHorizontalScroll(e) {
        if (!listsContainer) return;

        // Check if container can scroll horizontally
        const canScrollLeft = listsContainer.scrollLeft > 0;
        const canScrollRight = listsContainer.scrollLeft < (listsContainer.scrollWidth - listsContainer.clientWidth);

        // Only handle if there's horizontal scroll available
        if (listsContainer.scrollWidth > listsContainer.clientWidth) {
            // If scrolling down and can scroll right, or scrolling up and can scroll left
            if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
                e.preventDefault();
                listsContainer.scrollLeft += e.deltaY;
            }
        }
    }

    /*
        Start auto-scroll when dragging near edges
    */
    function startAutoScroll(direction) {
        stopAutoScroll();
        const scrollAmount = 15;
        scrollInterval = setInterval(() => {
            if (direction === 'left' && listsContainer.scrollLeft > 0) {
                listsContainer.scrollLeft -= scrollAmount;
            } else if (direction === 'right' && listsContainer.scrollLeft < (listsContainer.scrollWidth - listsContainer.clientWidth)) {
                listsContainer.scrollLeft += scrollAmount;
            } else {
                stopAutoScroll();
            }
        }, 20); // Run every 20ms for smooth scrolling
    }

    /*
        Stop auto-scroll during drag
    */
    function stopDragAutoScroll() {
        stopAutoScroll();
    }

    /*
        Set up drag and drop for lists
    */
    function setupDragAndDrop() {
        if (!listsContainer) return;

        // Set up drag handles on lists
        setupListDragHandles();

        // Global drag and drop events on the container
        listsContainer.addEventListener('dragstart', (e) => {
            const list = e.target.closest('.list');
            if (!list) return;

            // Check if this list is marked as draggable (via the handle)
            if (list.dataset.draggable === 'true') {
                draggedList = list;
                list.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', list.id);
            } else {
                e.preventDefault();
            }
        });

        listsContainer.addEventListener('dragend', (e) => {
            const list = e.target.closest('.list');
            if (list) {
                list.classList.remove('dragging');
                list.dataset.draggable = 'false';
            }
            document.querySelectorAll('.list.drag-over').forEach(el => el.classList.remove('drag-over'));
            draggedList = null;
            stopDragAutoScroll();
        });

        listsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetList = e.target.closest('.list');
            if (targetList && draggedList && targetList !== draggedList) {
                document.querySelectorAll('.list.drag-over').forEach(el => {
                    if (el !== targetList) el.classList.remove('drag-over');
                });
                targetList.classList.add('drag-over');
            }

            // Auto-scroll when dragging towards edges
            if (draggedList && listsContainer) {
                const containerRect = listsContainer.getBoundingClientRect();
                const edgeThreshold = 60;

                if (e.clientX < containerRect.left + edgeThreshold) {
                    // Dragging near left edge - scroll left
                    startAutoScroll('left');
                } else if (e.clientX > containerRect.right - edgeThreshold) {
                    // Dragging near right edge - scroll right
                    startAutoScroll('right');
                } else {
                    // Not near edges - stop auto-scroll
                    stopDragAutoScroll();
                }
            }
        });

        listsContainer.addEventListener('dragleave', (e) => {
            const targetList = e.target.closest('.list');
            if (targetList && !targetList.contains(e.relatedTarget)) {
                targetList.classList.remove('drag-over');
            }
        });

        listsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetList = e.target.closest('.list');
            if (targetList && draggedList && targetList !== draggedList) {
                targetList.classList.remove('drag-over');

                const rect = targetList.getBoundingClientRect();
                const insertBefore = e.clientX < rect.left + rect.width / 2;

                if (insertBefore) {
                    listsContainer.insertBefore(draggedList, targetList);
                } else {
                    listsContainer.insertBefore(draggedList, targetList.nextSibling);
                }

                syncDataToBackend();
            }
        });
    }

    /*
        Set up drag handles for all lists
    */
    function setupListDragHandles() {
        if (!listsContainer) return;

        listsContainer.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.list-drag-handle');
            if (handle) {
                const list = handle.closest('.list');
                if (list) {
                    list.dataset.draggable = 'true';
                    list.setAttribute('draggable', 'true');
                }
            }
        });

        listsContainer.addEventListener('dragend', (e) => {
            const list = e.target.closest('.list');
            if (list) {
                list.dataset.draggable = 'false';
                list.setAttribute('draggable', 'false');
            }
        });
    }

    /*
        Load data from the backend API
    */
    async function loadDataFromBackend() {
        try {
            console.log('Loading data from backend...');

            // Use standard fetch
            const response = await fetch(`${API_BASE_URL}/api/data/`, {
                headers: {
                    'x-token': API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Loaded data:', data);

            // Render the data
            renderData(data);

        } catch (error) {
            console.error('Failed to load data from backend:', error);
            // Create test lists as fallback
            createTestLists(3);
        }
    }

    /*
        Render data from backend
    */
    function renderData(data) {
        // Clear existing lists
        if (listsContainer) {
            listsContainer.innerHTML = '';
        }
        listCounter = 0;

        // Load sections from data
        if (data.sections && Array.isArray(data.sections)) {
            sections = data.sections;
        } else {
            sections = [];
        }

        // Handle empty data
        if (!data || Object.keys(data).length === 0) {
            console.log('No data to render, creating test lists');
            createTestLists(3);
            renderSections();
            return;
        }

        // Check if data has a lists array or is in a different format
        if (data.lists && Array.isArray(data.lists)) {
            data.lists.forEach(listData => {
                createListFromData(listData);
            });
        } else if (data.tasks && Array.isArray(data.tasks)) {
            // Alternative format: tasks array
            const list = createListElement('My Tasks');
            listsContainer.appendChild(list);
            data.tasks.forEach(task => {
                addTaskToList(list, task);
            });
        } else {
            // Raw object format - create a default list
            const list = createListElement('My Tasks');
            listsContainer.appendChild(list);

            // Try to interpret other data
            Object.keys(data).forEach(key => {
                const value = data[key];
                if (typeof value === 'object' && value.name) {
                    addTaskToList(list, value);
                }
            });
        }

        // Render sections in sidebar
        renderSections();
        filterListsBySection();
    }

    /*
        Create a list from backend data
    */
    function createListFromData(listData) {
        const title = listData.name || listData.title || 'New List';
        const list = createListElement(title);
        list.id = listData.id || `list-${listCounter++}`;
        list.dataset.section = listData.section || '';

        // Also store section name if present
        if (listData.sectionName) {
            list.dataset.sectionName = listData.sectionName;
        }

        if (listsContainer) {
            listsContainer.appendChild(list);
        }

        // Add items if present
        if (listData.items && Array.isArray(listData.items)) {
            listData.items.forEach(itemData => {
                addTaskToList(list, itemData);
            });
        } else if (listData.tasks && Array.isArray(listData.tasks)) {
            listData.tasks.forEach(taskData => {
                addTaskToList(list, taskData);
            });
        }

        return list;
    }

    /*
        Add a task to a list with data
    */
    function addTaskToList(list, taskData) {
        const listItemsContainer = list.querySelector('.list-items');
        if (!listItemsContainer) return;

        const item = createListItem();
        const textInput = item.querySelector('.item-text');
        const notesTextarea = item.querySelector('.notes-textarea');
        const checkbox = item.querySelector('.item-checkbox');

        // Populate with data
        if (textInput && taskData.name) {
            textInput.value = taskData.name;
        }
        if (notesTextarea && taskData.notes) {
            notesTextarea.value = taskData.notes;
        }
        if (checkbox && taskData.completed) {
            checkbox.checked = taskData.completed;
        }

        listItemsContainer.appendChild(item);
    }

    /*
        Sync current data to the backend (silent - no UI updates)
    */
    async function syncDataToBackend() {
        if (!syncBtn) return;

        // Use a subtle visual indicator instead of text changes
        syncBtn.classList.add('syncing');

        try {
            const data = collectDataFromUI();
            console.log('Syncing data to backend:', data);

            // Use standard fetch - Neutralino doesn't have a web.fetch API
            const response = await fetch(`${API_BASE_URL}/api/data/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': API_KEY
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Sync result:', result);

        } catch (error) {
            console.error('Failed to sync data:', error);
            // Show error on button temporarily
            syncBtn.classList.add('sync-error');
            setTimeout(() => {
                syncBtn.classList.remove('sync-error');
            }, 2000);
        } finally {
            syncBtn.classList.remove('syncing');
        }
    }

    /*
        Collect all data from the UI for syncing
    */
    function collectDataFromUI() {
        const lists = [];

        if (!listsContainer) return { lists };

        listsContainer.querySelectorAll('.list').forEach(listEl => {
            const titleInput = listEl.querySelector('.list-title');
            const sectionId = listEl.dataset.section || '';

            // Get section name from sections array
            const section = sections.find(s => s.id === sectionId);
            const sectionName = section ? section.name : '';

            const listData = {
                id: listEl.id,
                name: titleInput ? titleInput.value : 'Untitled List',
                section: sectionId,
                sectionName: sectionName,
                items: []
            };

            // Collect items in this list
            listEl.querySelectorAll('.list-item').forEach(itemEl => {
                const textInput = itemEl.querySelector('.item-text');
                const notesTextarea = itemEl.querySelector('.notes-textarea');
                const checkbox = itemEl.querySelector('.item-checkbox');

                const itemData = {
                    name: textInput ? textInput.value : '',
                    notes: notesTextarea ? notesTextarea.value : '',
                    completed: checkbox ? checkbox.checked : false,
                    steps: [] // Steps can be added later
                };

                listData.items.push(itemData);
            });

            lists.push(listData);
        });

        return {
            lists: lists,
            sections: sections,
            last_modified: new Date().toISOString()
        };
    }

    /*
        Handle click events within the lists container
    */
    function handleListsClick(e) {
        const target = e.target;

        // Delete list button
        if (target.classList.contains('list-delete-btn')) {
            const list = target.closest('.list');
            if (list) {
                deleteList(list);
            }
            return;
        }

        // Delete item button
        if (target.classList.contains('item-action-btn')) {
            const listItem = target.closest('.list-item');
            if (listItem) {
                listItem.remove();
                syncDataToBackend();
            }
            return;
        }

        // Expand/collapse button
        if (target.classList.contains('item-expand-btn') || target.closest('.item-expand-btn')) {
            const btn = target.classList.contains('item-expand-btn') ? target : target.closest('.item-expand-btn');
            const listItem = btn.closest('.list-item');
            if (listItem) {
                listItem.classList.toggle('expanded');
                btn.classList.toggle('expanded');
            }
            return;
        }

        // Context menu item clicked
        if (target.classList.contains('context-menu-item')) {
            const action = target.dataset.action;
            if (action && contextMenuTarget) {
                handleContextMenuAction(action);
            }
            hideContextMenu();
        }
    }

    /*
        Handle double click events
    */
    function handleListsDoubleClick(e) {
        const target = e.target;

        // Double click on list body to add item
        if (target.classList.contains('list-items') || target.classList.contains('list-item')) {
            const list = target.closest('.list');
            if (list) {
                addItemToList(list);
            }
        }
    }

    /*
        Handle right-click context menu
    */
    function handleContextMenu(e) {
        const target = e.target;

        // Check if right-clicked on a list
        const list = target.closest('.list');
        const listItem = target.closest('.list-item');
        if (list && !listItem && !target.closest('.list-header')) {
            e.preventDefault();
            contextMenuTarget = { type: 'list', element: list };
            showContextMenu(e.clientX, e.clientY);
            return;
        }
    }

    /*
        Show context menu at position
    */
    function showContextMenu(x, y) {
        if (!contextMenu) return;
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.add('visible');
    }

    /*
        Hide context menu
    */
    function hideContextMenu() {
        if (!contextMenu) return;
        contextMenu.classList.remove('visible');
        contextMenuTarget = null;
    }

    /*
        Handle context menu action
    */
    function handleContextMenuAction(action) {
        if (!contextMenuTarget) return;

        const { type, element } = contextMenuTarget;

        if (action === 'delete') {
            if (type === 'list') {
                deleteList(element);
            }
        } else if (action === 'rename') {
            if (type === 'list') {
                const titleInput = element.querySelector('.list-title');
                if (titleInput) {
                    titleInput.focus();
                    titleInput.select();
                }
            }
        }
    }

    /*
        Create a new list element
    */
    function createListElement(title = 'New List') {
        const list = listTemplate.content.cloneNode(true).querySelector('.list');
        list.id = 'list-' + listCounter++;

        const titleInput = list.querySelector('.list-title');
        titleInput.value = title;

        return list;
    }

    /*
        Add a new list to the container
    */
    function addList() {
        if (!listsContainer) return;

        const newList = createListElement();

        // Set section if not "all"
        if (currentSection !== 'all') {
            newList.dataset.section = currentSection;
        }

        listsContainer.appendChild(newList);

        // Update sections AFTER adding the list to DOM so it gets populated too
        renderSections();

        // Set the section select value (after options are populated)
        const sectionSelect = newList.querySelector('.list-section-select');
        if (sectionSelect) {
            sectionSelect.value = newList.dataset.section || '';
        }

        // Scroll to the new list
        newList.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

        // Focus the title input
        const titleInput = newList.querySelector('.list-title');
        titleInput.focus();
        titleInput.select();

        // Sync to backend
        syncDataToBackend();

        console.log('Added new list:', newList.id);
    }

    /*
        Delete a list
    */
    function deleteList(list) {
        if (confirm('Delete this list and all its items?')) {
            list.remove();
            syncDataToBackend();
            console.log('Deleted list:', list.id);
        }
    }

    /*
        Create a new list item element
    */
    function createListItem() {
        const item = listItemTemplate.content.cloneNode(true).querySelector('.list-item');

        // Note: No auto-sync on input changes - user clicks Sync button or Ctrl+S
        // This prevents excessive sync calls and potential reload issues

        return item;
    }

    /*
        Add a new item to a list
    */
    function addItemToList(list) {
        const listItemsContainer = list.querySelector('.list-items');
        if (!listItemsContainer) return;

        const newItem = createListItem();
        listItemsContainer.appendChild(newItem);

        // Focus the text input
        const textInput = newItem.querySelector('.item-text');
        textInput.focus();

        // Auto-sync to backend after adding
        syncDataToBackend();

        console.log('Added new item to list:', list.id);
    }

    /*
        Create test lists for development/testing
    */
    function createTestLists(amount) {
        if (!listsContainer) return;

        const testTitles = ['My Tasks', 'Shopping', 'Ideas'];

        for (let i = 0; i < amount; i++) {
            const title = testTitles[i] || 'List ' + (i + 1);
            const newList = createListElement(title);
            listsContainer.appendChild(newList);

            // Add a sample item to the first list
            if (i === 0) {
                const item = createListItem();
                const textInput = item.querySelector('.item-text');
                textInput.value = 'Sample task - try editing me!';
                newList.querySelector('.list-items').appendChild(item);
            }
        }

        console.log('Created', amount, 'test lists');
    }

    // Public API
    return {
        init: init,
        addList: addList,
        addItemToList: addItemToList,
        syncData: syncDataToBackend,
        loadData: loadDataFromBackend
    };

})();
