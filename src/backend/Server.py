from fastapi import APIRouter, FastAPI, WebSocket, HTTPException, Depends, Header
from typing import Any, Dict
from DataHandler import load_data, save_data, update_data
import os

# --- Server Setup ---

router = APIRouter()

API_KEY = os.getenv("API_KEY")

async def verify_api_key(x_token: str = Header()):
    if x_token != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_token

### define routes

# 1. GET /data - Fetch current state
@router.get("/data/", tags=['data', 'json'], dependencies=[Depends(verify_api_key)])
async def read_data():
	try:
		data = load_data()
		return data
	except Exception as e:
		print(e)
		raise HTTPException(status_code=500, detail=str(e))

# 2. POST /data - Save data
@router.post("/data/", tags=['data', 'json'], dependencies=[Depends(verify_api_key)])
async def send_data(data: dict):

	try:
		# Optional: Add a timestamp to the data to help with conflict resolution later
		# data['last_modified'] = datetime.now() 
		save_data(data)
		return {"message": "Data saved!", "status": "success"}
	except Exception as e:
		print(f"Error saving data: {e}")
		return {"message": "Unable to save data.", "status": "error"}

# 3. WebSocket for Sync
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
	await websocket.accept()
	
	while True:
		try:
			# Receive the JSON message
			message = await websocket.receive_json()
			
			if not message.get("update_sync"):
				continue

			client_data = message["data_content"]
			source = message["client_or_server"]
			
			# Load current server state
			current_data = load_data()
			
			# --- CONFLICT RESOLUTION LOGIC ---
			updated_data = current_data.copy()
			
			for key, client_value in client_data.items():
				if key in current_data:
					# Check if values are different
					if current_data[key] != client_value:
						if source == "client":
							# Client changed it, accept the client's version
							updated_data[key] = client_value
							print(f"Accepted change from client for key: {key}")
						else:
							# Server changed it (or it's a conflict), 
							# we keep the server's version and notify the client
							print(f"Server has newer data for key: {key}, notifying client")
							# Send a notification back to the client about the conflict
							await websocket.send_json({
								"type": "conflict",
								"key": key,
								"server_value": current_data[key],
								"message": "Server has newer data. Please refresh."
							})
							# Keep the server's value
							updated_data[key] = current_data[key]
				else:
					# New key added by client
					updated_data[key] = client_value
			
			# Save the resolved data
			update_data(updated_data)
			
			# Acknowledge success
			await websocket.send_json({"type": "sync_complete", "data": updated_data})

		except Exception as e:
			print(f"WebSocket error: {e}")
			break
