import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Send, X, Loader2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatBox({ project, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let channel;

    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUser(session.user);

      // 1. Fetch historical messages
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data);
      setLoading(false);
      scrollToBottom();

      // 2. Subscribe to realtime inserts
      channel = supabase.channel(`chat_${project.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${project.id}` },
          (payload) => {
            setMessages(prev => [...prev, payload.new]);
            scrollToBottom();
          }
        )
        .subscribe();
    };

    initChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [project.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    const content = newMessage.trim();
    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from('messages').insert({
      project_id: project.id,
      sender_id: currentUser.id,
      content
    });

    if (error) {
      console.error("Error sending message:", error.message);
      alert("Failed to send message: " + error.message);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100, scale: 0.95 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: 100, scale: 0.95 }}
      className="dash-glass"
      style={{
        position: 'fixed',
        bottom: '2.5rem',
        right: '2.5rem',
        width: 400,
        height: 580,
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center', border: '1px solid rgba(102, 211, 255, 0.2)' }}>
            <MessageSquare size={20} color="#66d3ff" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>Protocol Channel</h4>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
              {project.title}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', borderRadius: '50%', width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>
            <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: 'auto', marginBottom: 'auto', padding: '0 2rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem', opacity: 0.5 }}>
               <MessageSquare size={28} />
            </div>
            Initialing secure channel. No packets recorded yet.
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = currentUser?.id === m.sender_id;
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  background: isMe ? 'var(--gradient-hero)' : 'rgba(255,255,255,0.03)', 
                  color: isMe ? '#fff' : '#e2e4f6', 
                  padding: '0.85rem 1.25rem', 
                  borderRadius: isMe ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isMe ? '0 8px 20px rgba(0,201,255,0.15)' : 'none'
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textAlign: isMe ? 'right' : 'left', marginTop: '0.4rem', padding: '0 0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {formatTime(m.created_at)}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'relative' }}>
          <input 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Secure transmission..."
            className="signin-input"
            style={{ 
              width: '100%', padding: '1rem 4rem 1rem 1.25rem', 
              borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', 
              background: 'rgba(255,255,255,0.03)', color: '#fff', outline: 'none',
              fontSize: '0.95rem'
            }} 
          />
          <button type="submit" disabled={!newMessage.trim()} style={{ 
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            background: newMessage.trim() ? 'var(--gradient-hero)' : 'rgba(255,255,255,0.05)',
            color: newMessage.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: '1rem', width: 44, height: 44, 
            display: 'grid', placeItems: 'center', cursor: newMessage.trim() ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <Send size={18} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </form>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </motion.div>
  );
}
