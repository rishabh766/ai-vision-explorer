# backend/main.py

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles # Import StaticFiles
from ultralytics import YOLO
import cv2
import numpy as np
import google.generativeai as genai
from gtts import gTTS
import os
import uuid

app = FastAPI()

# 1. CORS Setup (Allows React to talk to Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. AI Configuration
# !!! PASTE YOUR API KEY HERE !!!
GOOGLE_API_KEY = "AIzaSyB1wOqyPzzAw9g5GF87wtjqJ0VwDrnr6co" 
genai.configure(api_key=GOOGLE_API_KEY)

# Gemini Model
gemini_model = genai.GenerativeModel('gemini-2.5-flash')

# YOLO Model
print("Loading YOLO model...")
model = YOLO('yolov8m.pt')
print("Model loaded successfully.")

# 3. Create a folder for audio files if it doesn't exist
if not os.path.exists("audio_store"):
    os.makedirs("audio_store")

# Mount the folder so React can access the MP3s via HTTP
app.mount("/audio", StaticFiles(directory="audio_store"), name="audio")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Run YOLO
            results = model(img, conf=0.5)
            
            detections = []
            for result in results:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    label = model.names[int(box.cls[0])]
                    confidence = float(box.conf[0])
                    detections.append({
                        "x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1,
                        "label": label, "confidence": confidence
                    })
            await websocket.send_json(detections)
    except Exception as e:
        print(f"Connection closed: {e}")

# backend/main.py (Partial update)

# 1. Make sure you added 'Form' to your imports at the top!
from fastapi import Form 

# ... (rest of your code remains the same until the narrate function) ...

@app.post("/narrate")
async def narrate_image(file: UploadFile = File(...), prompt: str = Form(None)):
    print("📸 Image received...")
    
    # Read Image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Convert to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    from PIL import Image
    pil_image = Image.fromarray(img_rgb)

    # Determine the Prompt
    # If user provided a question, use it. Otherwise, use default description.
    final_prompt = prompt if prompt else "Briefly describe the main object in this image. Keep it under 2 sentences."
    
    print(f"🤖 Asking Gemini: '{final_prompt}'")

    try:
        response = gemini_model.generate_content([final_prompt, pil_image])
        text_response = response.text
        print(f"🗣️ Gemini said: {text_response}")
    except Exception as e:
        print(f"Gemini Error: {e}")
        return JSONResponse(content={"text": "Error connecting to AI.", "audio_url": ""})

    # Generate Audio
    audio_filename = f"response_{uuid.uuid4()}.mp3"
    audio_path = os.path.join("audio_store", audio_filename)
    
    tts = gTTS(text=text_response, lang='en')
    tts.save(audio_path)

    return JSONResponse(content={
        "text": text_response,
        "audio_url": f"http://127.0.0.1:8000/audio/{audio_filename}"
    })