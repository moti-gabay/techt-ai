import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Status machine ──────────────────────────────────────────────────────────
// idle → listening → thinking → speaking → idle
const STATUS = {
  IDLE: "idle",
  LISTENING: "listening",
  THINKING: "thinking",
  SPEAKING: "speaking",
  ERROR: "error",
};

const STATUS_META = {
  [STATUS.IDLE]: { label: "Tap to speak", color: "#6ee7b7" },
  [STATUS.LISTENING]: { label: "Listening…", color: "#34d399" },
  [STATUS.THINKING]: { label: "Thinking…", color: "#a78bfa" },
  [STATUS.SPEAKING]: { label: "Speaking…", color: "#60a5fa" },
  [STATUS.ERROR]: { label: "Error — tap to retry", color: "#f87171" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const bottomRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Build SpeechRecognition once
  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      sendToAPI(text);
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setErrorMsg(`Microphone error: ${e.error}`);
      setStatus(STATUS.ERROR);
    };

    recognition.onend = () => {
      // If still "listening" with no result, revert
      setStatus((prev) => (prev === STATUS.LISTENING ? STATUS.IDLE : prev));
    };

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendToAPI = useCallback(async (text) => {
    setStatus(STATUS.THINKING);
    setAiResponse("");

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Server error");
      }

      const data = await res.json();
      const reply = data.response;
      setAiResponse(reply);

      // Add to history
      setHistory((prev) => [
        ...prev,
        { role: "user", text },
        { role: "ai", text: reply },
      ]);

      // Speak the reply
      speakText(reply);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus(STATUS.ERROR);
    }
  }, []);

  const speakText = (text) => {
    const synth = synthRef.current;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick a pleasant voice if available
    const voices = synth.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("natural")
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setStatus(STATUS.SPEAKING);
    utterance.onend = () => setStatus(STATUS.IDLE);
    utterance.onerror = () => setStatus(STATUS.IDLE);

    setStatus(STATUS.SPEAKING);
    synth.speak(utterance);
  };

  const handleMicClick = () => {
    if (status === STATUS.SPEAKING) {
      synthRef.current.cancel();
      setStatus(STATUS.IDLE);
      return;
    }

    if (status === STATUS.LISTENING) {
      recognitionRef.current?.stop();
      return;
    }

    if (status === STATUS.THINKING) return;

    // Start listening
    setErrorMsg("");
    setTranscript("");
    const SR = getSpeechRecognition();
    if (!SR) {
      setErrorMsg("Your browser doesn't support Speech Recognition. Try Chrome.");
      setStatus(STATUS.ERROR);
      return;
    }

    try {
      setStatus(STATUS.LISTENING);
      recognitionRef.current?.start();
    } catch (e) {
      setErrorMsg("Could not start microphone.");
      setStatus(STATUS.ERROR);
    }
  };

  const clearHistory = () => {
    synthRef.current.cancel();
    setHistory([]);
    setTranscript("");
    setAiResponse("");
    setErrorMsg("");
    setStatus(STATUS.IDLE);
  };

  const meta = STATUS_META[status];
  const isActive = status !== STATUS.IDLE && status !== STATUS.ERROR;

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-mark">
          <span className="logo-dot" />
          <span className="logo-text">VOXA</span>
        </div>
        {history.length > 0 && (
          <button className="clear-btn" onClick={clearHistory}>
            Clear
          </button>
        )}
      </header>

      {/* ── Chat history ── */}
      <main className="chat-area">
        {history.length === 0 && (
          <div className="empty-state">
            <p className="empty-hint">Tap the orb and start speaking.</p>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role}`}>
            <span className="bubble-label">{msg.role === "user" ? "You" : "AI"}</span>
            <p className="bubble-text">{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* ── Orb + status ── */}
      <footer className="controls">
        {/* Live transcript preview */}
        {status === STATUS.LISTENING && transcript && (
          <p className="transcript-preview">{transcript}</p>
        )}
        {status === STATUS.ERROR && (
          <p className="error-label">{errorMsg}</p>
        )}

        {/* Orb button */}
        <div className="orb-wrapper">
          {isActive && <div className="orb-ring ring-1" style={{ "--c": meta.color }} />}
          {isActive && <div className="orb-ring ring-2" style={{ "--c": meta.color }} />}

          <button
            className={`orb ${status}`}
            onClick={handleMicClick}
            aria-label={meta.label}
            style={{ "--orb-color": meta.color }}
          >
            {status === STATUS.THINKING ? (
              <ThinkingDots />
            ) : status === STATUS.SPEAKING ? (
              <WaveIcon />
            ) : (
              <MicIcon />
            )}
          </button>
        </div>

        <p className="status-label" style={{ color: meta.color }}>
          {meta.label}
        </p>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="2" y1="12" x2="2" y2="12" />
      <line x1="8" y1="6" x2="8" y2="18" className="wave-bar b1" />
      <line x1="14" y1="2" x2="14" y2="22" className="wave-bar b2" />
      <line x1="20" y1="8" x2="20" y2="16" className="wave-bar b3" />
      <line x1="26" y1="4" x2="26" y2="20" className="wave-bar b4" />
      <line x1="32" y1="9" x2="32" y2="15" className="wave-bar b5" />
      <line x1="38" y1="12" x2="38" y2="12" />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <div className="thinking-dots">
      <span /><span /><span />
    </div>
  );
}
