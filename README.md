# Hella Simple Todo

A Kanban-style todo app built with Neutralino.js and a Python FastAPI backend.

## Features

- Multiple todo lists displayed as horizontally scrollable cards
- Sections/categories with a collapsible sidebar for organizing lists
- Task items with checkboxes, inline editing, expandable notes, and delete
- Drag-and-drop reordering of lists and items
- Right-click context menus for list management
- Double-click to quickly add new items
- Timestamped data backups on every sync
- Responsive layout for mobile and desktop
- System tray support (non-macOS)

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript ([Neutralino.js](https://neutralino.js.org))
- **Backend:** Python, FastAPI, Uvicorn
- **Data Storage:** JSON file (`~/.hella-simple-todo/data.json`)

## API

All endpoints require an `x-token` header for authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/data/` | Load all todo data |
| `POST` | `/api/data/` | Save all todo data |
| `WebSocket` | `/api/ws` | Real-time sync (not yet wired up) |

## Getting Started

### Backend

```bash
cd src/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

Open the project with [Neutralino.js](https://neutralino.js.org/docs/getting-started/quick-start).

## License

[MIT](LICENSE)
