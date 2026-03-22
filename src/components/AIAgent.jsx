import React, { useState, useRef } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('kyte_gemini_key') || '');
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hi! I'm the KYTE AI Agent. I can help you understand how this freelance marketplace works, from bidding to Razorpay escrow and AI auditing. How can I help?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const saveKey = (val) => {
    setApiKey(val);
    localStorage.setItem('kyte_gemini_key', val);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  };

  const fetchModel = async () => {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await res.json();
      const flash = data.models?.find(m => m.name.includes("gemini-2.5-flash") || m.name.includes("gemini-1.5-flash")) || data.models?.[0];
      return flash ? flash.name.split("/")[1] : "gemini-1.5-flash";
    } catch {
      return "gemini-1.5-flash";
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !apiKey) return;

    const userMsg = input.trim();
    setInput('');
    const newMsgs = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    scrollToBottom();

    try {
      const modelName = await fetchModel(); // Fetch available models dynamically
      
      const systemPrompt = "You are KYTE AI, the official assistant for KYTE, a freelance marketplace platform featuring AI code auditing, developer bidding, real-time chat, and secure fiat escrow via Razorpay. Help users navigate the platform, explain features, and answer questions concisely.";
      
      const promptText = `${systemPrompt}\n\nChat History:\n${newMsgs.map(m => `${m.role}: ${m.content}`).join('\n')}\nmodel:`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Generation failed");
      
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
      setMessages([...newMsgs, { role: 'model', content: reply }]);
    } catch (err) {
      setMessages([...newMsgs, { role: 'model', content: "Error: " + err.message }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', background: '#66d3ff',
          color: '#000', display: 'grid', placeItems: 'center', boxShadow: '0 10px 25px rgba(102, 211, 255, 0.4)',
          border: 'none', cursor: 'pointer', transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bot size={28} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: '6rem', left: '2rem', zIndex: 10000,
              width: 360, height: 500, background: 'rgba(10, 15, 30, 0.95)',
              backdropFilter: 'blur(20px)', border: '1px solid rgba(102, 211, 255, 0.2)',
              borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center' }}>
                  <Sparkles size={16} color="#66d3ff" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>KYTE AI Agent</h4>
                  <span style={{ fontSize: '0.7rem', color: '#66d3ff' }}>Powered by Gemini</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* API Key Input (if missing) */}
            {!apiKey ? (
              <div style={{ padding: '2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Key size={32} color="#66d3ff" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Enter Gemini API Key</h3>
                <input 
                  type="password"
                  placeholder="AIzaSy..."
                  onChange={(e) => saveKey(e.target.value)}
                  style={{ 
                    width: '100%', padding: '0.75rem', borderRadius: '8px', 
                    border: '1px solid rgba(102, 211, 255, 0.3)', background: 'rgba(0,0,0,0.2)', 
                    color: '#fff', outline: 'none', marginBottom: '1rem'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>This key is stored locally and used to power the platform agent directly from your browser.</p>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messages.map((m, i) => {
                    const isUser = m.role === 'user';
                    return (
                      <div key={i} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <div style={{ 
                          background: isUser ? '#66d3ff' : 'rgba(255,255,255,0.1)', 
                          color: isUser ? '#000' : '#fff', 
                          padding: '0.6rem 1rem', 
                          borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word'
                        }}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div style={{ alignSelf: 'flex-start' }}>
                      <Loader2 size={16} color="#66d3ff" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      value={input} 
                      onChange={e => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      style={{ 
                        width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', 
                        borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', 
                        background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none', fontSize: '0.9rem'
                      }} 
                    />
                    <button type="submit" disabled={!input.trim()} style={{ 
                      position: 'absolute', right: '0.3rem', top: '50%', transform: 'translateY(-50%)',
                      background: input.trim() ? '#66d3ff' : 'transparent',
                      color: input.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                      border: 'none', borderRadius: '50%', width: 34, height: 34, 
                      display: 'grid', placeItems: 'center', cursor: input.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}>
                      <Send size={14} style={{ marginLeft: 2 }} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </>
  );
}
