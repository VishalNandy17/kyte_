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
        className="animate-float"
        style={{
          position: 'fixed', bottom: '2.5rem', left: '2.5rem', zIndex: 9999,
          width: 64, height: 64, borderRadius: '1.25rem', background: 'var(--gradient-hero)',
          color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 15px 35px rgba(0, 201, 255, 0.4)',
          border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.3s ease'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; e.currentTarget.style.boxShadow = '0 20px 45px rgba(0, 201, 255, 0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 201, 255, 0.4)'; }}
      >
        <Bot size={32} />
        <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, background: '#4ade80', borderRadius: '50%', border: '4px solid #060912', boxShadow: '0 0 10px rgba(74,222,128,0.5)' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -25, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -25, scale: 0.95 }}
            className="dash-glass"
            style={{
              position: 'fixed', bottom: '7.5rem', left: '2.5rem', zIndex: 10000,
              width: 400, height: 580, boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center', border: '1px solid rgba(102, 211, 255, 0.2)' }}>
                  <Sparkles size={20} color="#66d3ff" className="animate-pulse" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>KYTE Intelligence</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Active Kernel</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', borderRadius: '50%', width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                <X size={18} />
              </button>
            </div>

            {/* API Key Input (if missing) */}
            {!apiKey ? (
              <div style={{ padding: '3rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '2rem', background: 'rgba(102, 211, 255, 0.05)', display: 'grid', placeItems: 'center', margin: '0 auto 2rem', border: '1px solid rgba(102, 211, 255, 0.1)' }}>
                  <Key size={36} color="#66d3ff" />
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Authorize Agent</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', lineHeight: 1.6 }}>Link your Google Gemini Key to activate the autonomous protocol assistant.</p>
                
                <div style={{ position: 'relative' }}>
                   <input 
                    type="password"
                    placeholder="Enter Provider Key..."
                    onChange={(e) => saveKey(e.target.value)}
                    className="signin-input"
                    style={{ 
                      width: '100%', padding: '1rem', paddingRight: '3.5rem', background: 'rgba(0,0,0,0.3)', marginBottom: '1.5rem', borderRadius: '1rem'
                    }}
                  />
                  <Sparkles size={18} color="rgba(102, 211, 255, 0.4)" style={{ position: 'absolute', right: '1rem', top: '1rem' }} />
                </div>
                
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Keys are stored in local secure vault only.</p>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {messages.map((m, i) => {
                    const isUser = m.role === 'user';
                    return (
                      <motion.div initial={{ opacity: 0, x: isUser ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} key={i} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                        <div style={{ 
                          background: isUser ? 'var(--gradient-hero)' : 'rgba(255,255,255,0.03)', 
                          color: isUser ? '#fff' : '#e2e4f6', 
                          padding: '1rem 1.25rem', 
                          borderRadius: isUser ? '1.5rem 1.5rem 0.25rem 1.5rem' : '1.5rem 1.5rem 1.5rem 0.25rem',
                          fontSize: '0.92rem', lineHeight: 1.5, wordBreak: 'break-word',
                          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          boxShadow: isUser ? '0 10px 20px rgba(0,201,255,0.2)' : 'none'
                        }}>
                          {m.content}
                        </div>
                      </motion.div>
                    );
                  })}
                  {loading && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '1rem' }}>
                      <Loader2 size={18} color="#66d3ff" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>
 
                {/* Input Area */}
                <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      value={input} 
                      onChange={e => setInput(e.target.value)}
                      placeholder="Consult the protocol agent..."
                      className="signin-input"
                      style={{ 
                        width: '100%', padding: '1rem 4rem 1rem 1.25rem', 
                        borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', 
                        background: 'rgba(255,255,255,0.03)', color: '#fff', outline: 'none', fontSize: '0.95rem'
                      }} 
                    />
                    <button type="submit" disabled={!input.trim()} style={{ 
                      position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                      background: input.trim() ? 'var(--gradient-hero)' : 'rgba(255,255,255,0.05)',
                      color: input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                      border: 'none', borderRadius: '1rem', width: 44, height: 44, 
                      display: 'grid', placeItems: 'center', cursor: input.trim() ? 'pointer' : 'default',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                      <Send size={18} style={{ marginLeft: 2 }} />
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
