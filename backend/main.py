from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware  # IMPORT THIS
from ultralytics import YOLO
import cv2
import numpy as np
import json

app = FastAPI()

# --- FIX 1: Add CORS Middleware ---
# This allows the React app (port 5173) to talk to this Python app (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading YOLO model...")
model = YOLO('yolov8m.pt')
print("Model loaded successfully.")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Client connected to WebSocket!") # Debug print

    try:
        while True:
            # Receive data
            data = await websocket.receive_bytes()
            
            # --- FIX 2: Debug Print ---
            # Uncomment the next line if you want to see a flood of "Frame received"
            # print("Frame received, processing...") 

            # Decode
            nparr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # Detect
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
            
            # Send back
            # print(f"Sending {len(detections)} detections") # Debug print
            await websocket.send_json(detections)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"❌ Error: {e}")