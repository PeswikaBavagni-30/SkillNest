import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

export default function SkillNestAIChat() {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "👋 Hi there! I'm **SkillNest AI**, your personal service assistant. How can I help you today? Ask about finding local services, KYC verification, booking tracking, or creating custom service requests!",
      actions: [
        "Find tailoring services",
        "How does verification work?",
        "Show my bookings",
        "How do I switch to Provider mode?"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    // Add user message
    const newMessages = [...messages, { sender: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-6).map((m) => ({
            role: m.sender === "ai" ? "assistant" : "user",
            content: m.text
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to get AI response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply,
          actions: data.suggested_actions || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ Sorry, I encountered a temporary connection issue. Please check your internet or try asking again.",
          isError: true,
          actions: ["Retry", "How do I book a service?"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "ai",
        text: "Conversation cleared. Feel free to ask me anything about SkillNest!",
        actions: [
          "Find tailoring services",
          "How does verification work?",
          "How do I book a service?"
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
            color: "#ffffff",
            border: "none",
            borderRadius: "30px",
            padding: "12px 22px",
            fontSize: "14px",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 8px 24px rgba(201, 142, 27, 0.45)",
            cursor: "pointer",
            zIndex: 9990,
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ fontSize: "18px" }}>💬</span>
          <span>SkillNest AI</span>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 6px #4ade80"
            }}
          />
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            height: "560px",
            maxHeight: "calc(100vh - 48px)",
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            border: "1px solid #ebd08d",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9995
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #2b220d, #423516)",
              color: "#ffffff",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(235, 208, 141, 0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}
              >
                🤖
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
                  SkillNest Assistant
                </h4>
                <span style={{ fontSize: "11px", color: "#86efac", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#86efac" }} />
                  Knowledgeable · Online
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={clearChat}
                title="Clear conversation"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  color: "#fef08a",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              background: "#faf8f5",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%"
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: m.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    background: m.sender === "user"
                      ? "linear-gradient(135deg, #e4a62b, #c98e1b)"
                      : m.isError
                      ? "#fee2e2"
                      : "#ffffff",
                    color: m.sender === "user" ? "#ffffff" : m.isError ? "#991b1b" : "#382d12",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: m.sender === "user" ? "none" : "1px solid #ebd08d",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {m.text}
                </div>

                {/* Prompt Chips / Action Buttons */}
                {m.actions && m.actions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {m.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleSend(act)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #ebd08d",
                          borderRadius: "14px",
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#835b0a",
                          cursor: "pointer",
                          transition: "background 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef3c7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                      >
                        {act} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 16px",
                  borderRadius: "16px 16px 16px 2px",
                  background: "#ffffff",
                  border: "1px solid #ebd08d",
                  color: "#8a7536",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>Thinking</span>
                <span className="dot-flashing" style={{ animation: "pulse 1s infinite" }}>● ● ●</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: "12px 14px",
              background: "#ffffff",
              borderTop: "1px solid #ebd08d",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <input
              type="text"
              placeholder="Ask anything about SkillNest..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "20px",
                border: "1px solid #ebd08d",
                fontSize: "13px",
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                flexShrink: 0
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
