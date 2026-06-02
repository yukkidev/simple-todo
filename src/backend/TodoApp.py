from fastapi import Depends, HTTPException, Header
from dotenv import load_dotenv
import os
from DataHandler import load_data, save_data, update_data
from Server import router
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from models import TaskItem, Step, SyncRequest

load_dotenv()

app = FastAPI(title="Hella Simple Todo >:)", version="0.67")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Neutralino uses random ports)
    allow_credentials=False,  # Must be False when using wildcard origins
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers including x-token
    expose_headers=["*"],  # Expose all headers to the client
)

API_KEY = os.getenv("API_KEY")

async def verify_api_key(x_token: str = Header()):
    if x_token != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_token

favicon_path = 'favicon.ico'

@app.get('/favicon.ico', include_in_schema=False)
async def favicon():
    return FileResponse(favicon_path)

@app.get("/", response_class=HTMLResponse)
async def root():
	html_content = """
	<!DOCTYPE html>
	<html>
	<head>
		<title>Hella Simple Todo</title>
		<style>
			body { font-family: sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
			h1 { color: #333; }
			p { color: #666; }
			.btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
		</style>
	</head>
	<body>
		<h1>Hella Simple Todo App >:)</h1>
		<a href="/api/data/" class="btn">View Data</a>
		<p><small>Powered by FastAPI</small></p>
	</body>
	</html>
	"""
	return HTMLResponse(content=html_content)

# Include router (auth is handled per-route in Server.py)
app.include_router(router, prefix="/api")