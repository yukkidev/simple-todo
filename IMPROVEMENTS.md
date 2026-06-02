# Improvement Suggestions

## Priority Features

### Auto-save on blur
Currently syncing requires manual button/Ctrl+S. Add debounced auto-save when users stop typing.

### Priority/due dates
Add support for task priorities and due dates.

### Search/filter
Global search across all lists would improve usability.

### Data backup rotation
`DataHandler.py` creates infinite backups. Add cleanup for old backups (keep last N or 7 days).

### Keyboard shortcuts
Add shortcuts like `N` for new list, `Tab` to cycle lists.

### Dark mode
No theme toggle exists.

### Item reordering
Items within a list can be dragged to reorder (currently only lists can be dragged).

### Subtasks/steps
The data model has `steps: []` but it's not implemented in the UI.

### Better error handling
Backend connection failures silently create test data. Show user feedback.

### Unit tests
No tests exist for the Python backend or JS handlers.
