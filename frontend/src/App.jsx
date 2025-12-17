import React, { useState, useEffect, useRef } from 'react';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [description, setDescription] = useState("Waiting for request...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [question, setQuestion] = useState(""); // NEW: State for user question

  // 1. Start Camera
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    startWebcam();
  }, []);

  // 2. WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onopen = () => setSocket(ws);
    ws.onmessage = (event) => {
      const detections = JSON.parse(event.data);
      drawBoxes(detections);
    };
    return () => ws.close();
  }, []);

  // 3. Send Frames (Throttled)
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const interval = setInterval(() => {
      if (videoRef.current) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 640;
        tempCanvas.height = 480;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        tempCanvas.toBlob((blob) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(blob);
        }, 'image/jpeg', 0.5);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [socket]);

  // 4. Draw Boxes
  const drawBoxes = (detections) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.font = "18px Arial";
    ctx.fillStyle = "#00FF00";

    detections.forEach(obj => {
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.fillText(`${obj.label} (${Math.round(obj.confidence * 100)}%)`, obj.x, obj.y - 5);
    });
  };

  // --- UPDATED: Handle Question & Narrate ---
  const handleNarrate = async () => {
    setIsSpeaking(true);
    setDescription("Thinking...");
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 640;
    tempCanvas.height = 480;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    
    tempCanvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "snapshot.jpg");
      
      // NEW: Send the question if the user typed one
      if (question.trim() !== "") {
        formData.append("prompt", question);
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/narrate", {
          method: "POST",
          body: formData
        });
        const data = await response.json();
        
        setDescription(data.text);
        
        const audio = new Audio(data.audio_url);
        audio.play();
        audio.onended = () => setIsSpeaking(false);
        
      } catch (error) {
        console.error("Narration failed:", error);
        setIsSpeaking(false);
        setDescription("Error getting description.");
      }
    }, 'image/jpeg');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-6">
        AI Vision Assistant
      </h1>
      
      <div className="relative border-4 border-gray-700 rounded-xl overflow-hidden shadow-2xl mb-6">
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

      {/* NEW: Input Section */}
      <div className="w-full max-w-lg mb-4 flex gap-2">
        <input 
          type="text" 
          placeholder="Ask a question (e.g., 'Is the bottle empty?')" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Description Box */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg max-w-2xl w-full text-center border border-gray-700 min-h-[80px] flex items-center justify-center">
        <p className="text-gray-300 text-lg italic">
           "{description}"
        </p>
      </div>

      {/* The Button */}
      <button 
        onClick={handleNarrate}
        disabled={isSpeaking}
        className={`px-8 py-4 rounded-full font-bold text-xl transition-all transform hover:scale-105 shadow-xl ${
          isSpeaking 
            ? "bg-gray-600 cursor-not-allowed" 
            : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
        }`}
      >
        {isSpeaking ? "🔊 Speaking..." : (question ? "🤖 Ask AI" : "🔍 Describe Scene")}
      </button>

    </div>
  );
}

export default App;