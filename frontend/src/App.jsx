import React, { useState, useEffect, useRef } from 'react';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // 1. Start the Camera
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 } // Lower res for faster processing
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startWebcam();
  }, []);

  // 2. Setup WebSocket Connection
  useEffect(() => {
    // Connect to the Python backend
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onopen = () => {
      console.log("Connected to Backend");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      // When Python sends back coordinates, draw them
      const detections = JSON.parse(event.data);
      drawBoxes(detections);
    };

    return () => {
      ws.close();
    };
  }, []);

  // 3. Send Frames to Backend (Throttled)
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        // Create a temporary canvas to capture the frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 640;
        tempCanvas.height = 480;
        const ctx = tempCanvas.getContext('2d');
        
        // Draw video frame to temp canvas
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        
        // Convert to Blob (JPEG) and send
        tempCanvas.toBlob((blob) => {
          if (socket.readyState === WebSocket.OPEN) {
             socket.send(blob);
          }
        }, 'image/jpeg', 0.5); // 0.5 quality to save bandwidth
      }
    }, 100); // Send every 100ms (~10 FPS)

    return () => clearInterval(interval);
  }, [socket]);

  // 4. Helper to Draw Boxes
  const drawBoxes = (detections) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Styling
    ctx.strokeStyle = "#00FF00"; // Green Box
    ctx.lineWidth = 2;
    ctx.font = "18px Arial";
    ctx.fillStyle = "#00FF00";

    detections.forEach(obj => {
      // Draw Rectangle
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      
      // Draw Label
      ctx.fillText(`${obj.label} (${Math.round(obj.confidence * 100)}%)`, obj.x, obj.y - 5);
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white mb-6">AI Vision Explorer 👁️</h1>
      
      <div className="relative border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl">
        {/* The Video Feed (Hidden from view, but active) */}
        {/* We hide the video and show the canvas instead so we can draw on top */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-0" 
        />

        {/* The Canvas (The real display) */}
        {/* We actually need to DRAW the video onto this canvas first for the user to see it,
            OR we can stack them. Let's stack them for simplicity. */}
        <div className="relative w-[640px] h-[480px]">
           <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute top-0 left-0 w-[640px] h-[480px] object-cover" 
          />
          <canvas 
            ref={canvasRef} 
            width="640" 
            height="480"
            className="absolute top-0 left-0 w-full h-full z-10"
          />
        </div>
      </div>

      <div className="mt-6 text-gray-400">
        Pointing at: <span className="text-green-400 font-bold">Waiting for objects...</span>
      </div>
    </div>
  );
}

export default App;