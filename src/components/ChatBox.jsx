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
      initial={{ opacity: 0, y: 50, scale: 0.95 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: 360,
        height: 500,
        background: 'rgba(10, 15, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(102, 211, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center' }}>
            <MessageSquare size={16} color="#66d3ff" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Project Chat</h4>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', display: 'block', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.title}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>
            <Loader2 size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginTop: 'auto', marginBottom: 'auto' }}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = currentUser?.id === m.sender_id;
            return (
              <div key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ 
                  background: isMe ? '#66d3ff' : 'rgba(255,255,255,0.1)', 
                  color: isMe ? '#000' : '#fff', 
                  padding: '0.6rem 1rem', 
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: '0.9rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word'
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: isMe ? 'right' : 'left', marginTop: '0.2rem', padding: '0 0.5rem' }}>
                  {formatTime(m.created_at)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'relative' }}>
          <input 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ 
              width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', 
              borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
              fontSize: '0.9rem'
            }} 
          />
          <button type="submit" disabled={!newMessage.trim()} style={{ 
            position: 'absolute', right: '0.3rem', top: '50%', transform: 'translateY(-50%)',
            background: newMessage.trim() ? '#66d3ff' : 'transparent',
            color: newMessage.trim() ? '#000' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: '50%', width: 34, height: 34, 
            display: 'grid', placeItems: 'center', cursor: newMessage.trim() ? 'pointer' : 'default',
            transition: 'all 0.2s'
          }}>
            <Send size={14} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </form>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </motion.div>
  );
}
