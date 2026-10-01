from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

app = FastAPI()

class ConnectionPayload(BaseModel):
    code: str = Field(..., min_length=4, max_length=4)

class ChatMessage(BaseModel):
    code: str
    message: str

@app.get("/", response_class=HTMLResponse)
async def chat_ui():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure Purple-Blue Chat</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-purple-950 via-indigo-950 to-blue-950 text-gray-100 h-screen flex flex-col justify-between font-sans">
        
        <!-- Connection Screen -->
        <div id="auth-screen" class="flex-1 flex items-center justify-center p-4">
            <div class="bg-gray-900/80 backdrop-blur-md border border-purple-500/30 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
                <div class="space-y-2">
                    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Secure Connection</h1>
                    <p class="text-sm text-gray-400">Enter a 4-digit numerical code to connect</p>
                </div>
                <form id="auth-form" class="space-y-4">
                    <input type="text" id="code-input" maxlength="4" pattern="[0-9]{4}" placeholder="0000" required
                        class="w-full text-center text-3xl tracking-widest bg-purple-950/50 border border-purple-500/50 rounded-xl py-3 focus:outline-none focus:border-blue-400 text-white placeholder-purple-800">
                    <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-semibold py-3 rounded-xl shadow-lg transition duration-200">
                        Connect to Room
                    </button>
                    <p id="error-msg" class="text-rose-400 text-sm hidden">Invalid code. Please enter 4 digits.</p>
                </form>
            </div>
        </div>

        <!-- Chat Screen (Hidden Initially) -->
        <div id="chat-screen" class="hidden flex-1 flex flex-col h-screen justify-between">
            <header class="bg-purple-900/40 backdrop-blur-md border-b border-purple-500/20 p-4 flex justify-between items-center max-w-4xl w-full mx-auto">
                <div class="font-bold text-lg bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    💜 Secure Chat Room
                </div>
                <div id="room-badge" class="bg-indigo-600/30 border border-indigo-400/40 px-3 py-1 rounded-full text-xs font-mono tracking-wider text-indigo-300">
                    Code: ----
                </div>
            </header>
            
            <div id="chat-box" class="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl w-full mx-auto">
                <div class="flex items-start">
                    <div class="bg-purple-900/50 border border-purple-500/30 text-purple-200 rounded-2xl p-4 max-w-md shadow-lg">
                        Successfully connected! You can now start messaging.
                    </div>
                </div>
            </div>

            <div class="bg-purple-900/40 backdrop-blur-md border-t border-purple-500/20 p-4">
                <form id="chat-form" class="max-w-4xl mx-auto flex gap-3">
                    <input type="text" id="message-input" autocomplete="off" placeholder="Type your message..." 
                        class="flex-1 bg-purple-950/60 border border-purple-500/40 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 text-white placeholder-purple-400">
                    <button type="submit" class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-6 py-3 rounded-xl font-semibold shadow-lg transition duration-200">
                        Send
                    </button>
                </form>
            </div>
        </div>

        <script>
            let currentCode = "";

            const authForm = document.getElementById('auth-form');
            const codeInput = document.getElementById('code-input');
            const errorMsg = document.getElementById('error-msg');
            const authScreen = document.getElementById('auth-screen');
            const chatScreen = document.getElementById('chat-screen');
            const roomBadge = document.getElementById('room-badge');
            
            const chatForm = document.getElementById('chat-form');
            const messageInput = document.getElementById('message-input');
            const chatBox = document.getElementById('chat-box');

            // Handle 4-digit code authentication
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = codeInput.value.trim();
                
                if (code.length !== 4 || isNaN(code)) {
                    errorMsg.classList.remove('hidden');
                    return;
                }

                try {
                    const res = await fetch('/api/connect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    
                    if (res.ok) {
                        currentCode = code;
                        roomBadge.innerText = `Code: ${code}`;
                        authScreen.classList.add('hidden');
                        chatScreen.classList.remove('hidden');
                    } else {
                        errorMsg.classList.remove('hidden');
                    }
                } catch (err) {
                    console.error(err);
                }
            });

            // Handle chat messaging
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = messageInput.value.trim();
                if (!text) return;

                // Append User Message
                chatBox.innerHTML += `
                    <div class="flex justify-end">
                        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-4 max-w-md shadow-lg">${text}</div>
                    </div>`;
                messageInput.value = '';
                chatBox.scrollTop = chatBox.scrollHeight;

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: currentCode, message: text })
                    });
                    const data = await response.json();

                    // Append Bot Reply
                    chatBox.innerHTML += `
                        <div class="flex items-start">
                            <div class="bg-purple-900/50 border border-purple-500/30 text-purple-200 rounded-2xl p-4 max-w-md shadow-lg">${data.reply}</div>
                        </div>`;
                    chatBox.scrollTop = chatBox.scrollHeight;
                } catch (err) {
                    console.error(err);
                }
            });
        </script>
    </body>
    </html>
    """

@app.post("/api/connect")
async def verify_code(payload: ConnectionPayload):
    # Accept any 4-digit numerical code for session entry
    if len(payload.code) == 4 and payload.code.isdigit():
        return {"status": "connected", "code": payload.code}
    return {"error": "Invalid code"}, 400

@app.post("/api/chat")
async def handle_chat(payload: ChatMessage):
    user_msg = payload.message.lower()
    room_code = payload.code
    
    if "hello" in user_msg:
        reply = f"Hello! Connected securely to room code #{room_code}."
    else:
        reply = f"Echo from Room #{room_code}: {payload.message}"
        
    return {"reply": reply}