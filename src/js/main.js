// Main application initialization for Hella Simple Todo
// This file handles Neutralino.js setup and app lifecycle

/*
    Initialize the application after Neutralino is ready
*/
function initializeApp() {
    console.log('Initializing Hella Simple Todo...', 'Time:', Date.now());

    // Initialize the lists handler
    if (typeof ListsHandler !== 'undefined') {
        ListsHandler.init();
    }

    console.log('App initialized successfully');
}

/*
    Set up system tray menu (optional, for window mode)
*/
function setupTray() {
    // Tray menu is only available in window mode
    if (NL_MODE !== 'window') {
        console.log('INFO: Tray menu is only available in window mode.');
        return;
    }

    const trayConfig = {
        icon: '/src/icons/trayIcon.png',
        menuItems: [
            { id: 'VERSION', text: 'Get version' },
            { id: 'SEP', text: '-' },
            { id: 'QUIT', text: 'Quit' }
        ]
    };

    Neutralino.os.setTray(trayConfig);
}

/*
    Handle tray menu item clicks
*/
function onTrayMenuItemClicked(event) {
    switch (event.detail.id) {
        case 'VERSION':
            Neutralino.os.showMessageBox(
                'Version Information',
                `Neutralinojs server: v${NL_VERSION} | Client: v${NL_CVERSION}`
            );
            break;
        case 'QUIT':
            Neutralino.app.exit();
            break;
    }
}

/*
    Handle window close event
*/
function onWindowClose() {
    Neutralino.app.exit();
}

// ============================================
// Application Startup
// ============================================

// Initialize Neutralino
Neutralino.init();

// Register event listeners
Neutralino.events.on('trayMenuItemClicked', onTrayMenuItemClicked);
Neutralino.events.on('windowClose', onWindowClose);

// Set up tray (except on macOS due to known issue)
if (NL_OS !== 'Darwin') {
    setupTray();
}

// Debug: Log when the script loads (helps detect unwanted reloads)
console.log('main.js loaded at:', new Date().toISOString());

// Wait for DOM to be ready, then initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    // Small delay to ensure Neutralino is fully initialized
    setTimeout(initializeApp, 100);
});

// Debug: Log if a reload happens
window.addEventListener('beforeunload', (e) => {
    console.log('Page is about to unload/reload at:', new Date().toISOString());
});
