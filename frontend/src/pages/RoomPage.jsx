import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import { Send, LogOut, Users, Timer, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import PomodoroWidget from '../components/pomodoro/PomodoroWidget';
import styles from './RoomPage.module.css';

function ChatMessage({ msg, isOwn }) {
  return (
    <div className={`${styles.msg} ${isOwn ? styles.ownMsg : ''}`}>
      {!isOwn && (
        <div className={styles.msgAvatar}>
          {msg.sender?.username?.[0]?.toUpperCase()}
        </div>
      )}
      <div className={styles.msgContent}>
        {!isOwn && <span className={styles.msgName}>{msg.sender?.username}</span>}
        <div className={styles.msgBubble}>{msg.content}</div>
        <span className={styles.msgTime}>
          {format(new Date(msg.createdAt || Date.now()), 'HH:mm')}
        </span>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { emit, on, off, socket } = useSocket();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState([]);
  const [activePanel, setActivePanel] = useState('chat'); // 'chat' | 'timer' | 'members'
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load room data
  useEffect(() => {
    const load = async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          api.get(`/rooms/${id}`),
          api.get(`/rooms/${id}/messages`),
        ]);
        setRoom(roomRes.data.room);
        setMembers(roomRes.data.room.members || []);
        setMessages(msgRes.data.messages || []);
      } catch (err) {
        toast.error(getError(err));
        navigate('/rooms');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    emit('room:join', { roomId: id });

    const onMsg = (msg) => setMessages(prev => [...prev, msg]);
    const onTyping = ({ userId, username, isTyping }) => {
      setTyping(prev =>
        isTyping ? [...prev.filter(u => u.userId !== userId), { userId, username }]
                 : prev.filter(u => u.userId !== userId)
      );
    };
    const onJoin = ({ user: u }) => {
      setMembers(prev => prev.find(m => m._id === u._id) ? prev : [...prev, u]);
      toast(`${u.username} joined`, { icon: '👋', duration: 2000 });
    };
    const onLeave = ({ userId }) => {
      setMembers(prev => prev.filter(m => m._id !== userId));
    };

    socket.on('message:new', onMsg);
    socket.on('message:typing', onTyping);
    socket.on('room:user_joined', onJoin);
    socket.on('room:user_left', onLeave);

    return () => {
      emit('room:leave', { roomId: id });
      socket.off('message:new', onMsg);
      socket.off('message:typing', onTyping);
      socket.off('room:user_joined', onJoin);
      socket.off('room:user_left', onLeave);
    };
  }, [socket, id, emit]);

  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    emit('message:send', { roomId: id, content });
    // Optimistic
    setMessages(prev => [...prev, {
      _id: Date.now(),
      content,
      sender: user,
      createdAt: new Date().toISOString(),
      optimistic: true,
    }]);
    setInput('');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    emit('message:typing', { roomId: id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emit('message:typing', { roomId: id, isTyping: false });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleLeave = async () => {
    try {
      await api.post(`/rooms/${id}/leave`);
      navigate('/rooms');
    } catch { navigate('/rooms'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!room) return null;

  return (
    <div className={`${styles.page} page-enter`}>
      {/* Header */}
      <div className={styles.roomHeader}>
        <div className={styles.roomDot} style={{ background: room.color || '#7c6af7' }} />
        <div className={styles.roomHeaderInfo}>
          <h1 className={styles.roomName}>{room.name}</h1>
          <span className={styles.roomSubject}>{room.subject}</span>
        </div>
        <div className={styles.roomHeaderRight}>
          <div className={styles.membersBadge}>
            <Users size={13} />
            <span>{members.length}</span>
          </div>
          <button className={styles.leaveBtn} onClick={handleLeave}>
            <LogOut size={15} /> Leave
          </button>
        </div>
      </div>

      {/* Panel tabs (mobile) */}
      <div className={styles.panelTabs}>
        {['chat','timer','members'].map(p => (
          <button
            key={p}
            className={`${styles.panelTab} ${activePanel === p ? styles.activeTab : ''}`}
            onClick={() => setActivePanel(p)}
          >
            {p === 'chat' ? 'Chat' : p === 'timer' ? 'Timer' : 'Members'}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className={styles.layout}>
        {/* Chat */}
        <div className={`${styles.chatPanel} ${activePanel === 'chat' ? styles.panelVisible : ''}`}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                <p>No messages yet. Say hi! 👋</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg._id || i}
                msg={msg}
                isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
              />
            ))}
            {typing.length > 0 && (
              <div className={styles.typingIndicator}>
                <span>{typing.map(u => u.username).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.chatInput}
              placeholder="Type a message…"
              value={input}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
            />
            <button className={styles.sendBtn} onClick={sendMessage} disabled={!input.trim()}>
              <Send size={17} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Timer */}
          <div className={`card ${styles.timerCard} ${activePanel === 'timer' ? styles.panelVisible : ''}`}>
            <div className={styles.cardTitle}><Timer size={15} /> Pomodoro</div>
            <PomodoroWidget roomId={id} />
          </div>

          {/* Members */}
          <div className={`card ${styles.membersCard} ${activePanel === 'members' ? styles.panelVisible : ''}`}>
            <div className={styles.cardTitle}><Users size={15} /> Members ({members.length})</div>
            <div className={styles.memberList}>
              {members.map(m => (
                <div key={m._id} className={styles.memberRow}>
                  <div className={styles.memberAvatar} style={{ background: m._id === user?._id ? 'var(--accent-primary)' : 'var(--bg-elevated)' }}>
                    {m.username?.[0]?.toUpperCase()}
                  </div>
                  <div className={styles.memberName}>
                    {m.username}
                    {m._id === user?._id && <span className={styles.youTag}> (you)</span>}
                  </div>
                  <div className={styles.onlineDot} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
