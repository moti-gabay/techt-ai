# VOXA — Voice AI App

A real-time voice assistant powered by **Gemini 1.5 Flash**, built with **React (Vite)** and **FastAPI**.

```
voice-ai-app/
├── backend/
│   ├── main.py            ← FastAPI server
│   ├── requirements.txt
│   └── .env               ← You create this
└── frontend/
    ├── src/
    │   ├── App.jsx        ← Main React component
    │   ├── index.css      ← All styles
    │   └── main.jsx       ← Entry point
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env               ← You create this (optional)
```

---

## 1. Get a Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"**
3. Copy the key

---

## 2. Backend Setup

```bash
cd voice-ai-app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Open .env and paste your key:
#   GEMINI_API_KEY=AIza...your_key_here
# AIzaSyAPb1-HFdXWsIPSyaqJ4LIb8QGXMIZRBS0
# Start the server
uvicorn main:app --reload --port 8000
```

The backend runs at **http://localhost:8000**
Test it: open [http://localhost:8000/health](http://localhost:8000/health) — you should see `{"status":"ok"}`

---

## 3. Frontend Setup

```bash
cd voice-ai-app/frontend

# Install dependencies
npm install

# (Optional) create .env if backend is on a different port
cp .env.example .env

# Start Vite dev server
npm run dev
```

Open **http://localhost:5173** in **Chrome** (or Edge).

> ⚠️ **Use Chrome or Edge** — Firefox has limited Web Speech API support.

---

## 4. Using the App

1. Click the **orb** button
2. **Speak** your question
3. Watch the orb pulse while AI **thinks**
4. The response appears in the chat and is **spoken aloud**
5. Click again anytime to ask another question
6. Click the orb while it's speaking to **stop** playback

---

## How It Works

```
Browser (Web Speech API)
    │  captures voice → transcribes to text
    ▼
React App (App.jsx)
    │  POST /chat  { text: "..." }
    ▼
FastAPI (main.py)
    │  calls Gemini 1.5 Flash
    ▼
Gemini API
    │  returns AI response text
    ▼
FastAPI  →  React App
    │  displays text + speechSynthesis reads it aloud
    ▼
User hears the response 🎉
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Microphone not working | Allow mic permission in browser; use HTTPS or localhost |
| `GEMINI_API_KEY not found` | Check your `backend/.env` file exists with the key |
| CORS error | Make sure backend is running on port 8000 |
| Speech not recognized | Speak clearly; Chrome works best |
| No voice output | Check system volume; browser may need a user gesture first |
