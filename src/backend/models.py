from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Step(BaseModel):
	name: str
	completed_at: Optional[datetime] = None

class TaskItem(BaseModel):
	name: str
	steps: List[Step]
	notes: str
	last_modified: Optional[datetime] = None

class SyncRequest(BaseModel):
	data_content: dict
	client_or_server: str
	update_sync: bool
