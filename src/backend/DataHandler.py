import json
import datetime
import os

### handle data

# Use a data directory outside the project to avoid triggering Neutralino's file watcher
DATA_DIR = os.path.expanduser("~/.hella-simple-todo")

def _ensure_data_dir():
    """Ensure the data directory exists"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def save_data(data, filename="data.json"):
    _ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    # Using a context manager (with statement) is best practice here
    with open(filepath, "w") as f:
        json.dump(data, f)


def load_data(filename="data.json") -> dict:
    _ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return {}
    with open(filepath, "r") as f:
        return json.load(f)

def update_data(data):
    # Create a timestamp in the format: day_month_year_hour_min

    now = datetime.datetime.now()
    timestamp = f"{now.day}_{now.month}_{now.year}_{now.hour}_{now.minute}"

    backup_filename = f"data_backup_{timestamp}.json"

    save_data(data, backup_filename)

    save_data(data)
