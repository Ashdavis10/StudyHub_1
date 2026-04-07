import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getError } from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Users, Lock, Globe, BookOpen, X } from 'lucide-react';
import styles from './RoomsPage.module.css';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','Computer Science','History','Literature','Languages','Economics','Other'];
const COLORS = ['#7c6af7','#4dd9ac','#f7a26a','#f76a8a','#6af7d9','#f7e26a','#a26af7','#6ab4f7'];

function CreateRoomModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', subject: '', description: '', isPrivate: false, maxMembers: 20, color: COLORS[0] });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/rooms', form);
      onCreate(data.room);
      toast.success('Room created!');
      onClose();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create Study Room</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label>Room Name *</label>
            <input name="name" required placeholder="e.g. Calculus Study Group" value={form.name} onChange={handleChange} />
          </div>
          <div className={styles.field}>
            <label>Subject *</label>
            <select name="subject" required value={form.subject} onChange={handleChange}>
              <option value="">Select subject</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Description</label>
            <textarea name="description" rows={2} placeholder="What will you study?" value={form.description} onChange={handleChange} />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label>Max Members</label>
              <input type="number" name="maxMembers" min={2} max={50} value={form.maxMembers} onChange={handleChange} />
            </div>
            <div className={styles.field}>
              <label>Color</label>
              <div className={styles.colorPicker}>
                {COLORS.map(c => (
                  <button type="button" key={c}
                    className={`${styles.colorDot} ${form.color === c ? styles.selectedColor : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <label className={styles.checkLabel}>
            <input type="checkbox" name="isPrivate" checked={form.isPrivate} onChange={handleChange} />
            <span>Private room (invite only)</span>
          </label>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.createBtn} disabled={loading}>
              {loading ? <span className="spinner" style={{width:16,height:16}} /> : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoomCard({ room, onJoin }) {
  const memberCount = room.members?.length || 0;
  const isFull = memberCount >= room.maxMembers;

  return (
    <div className={styles.roomCard}>
      <div className={styles.roomCardAccent} style={{ background: room.color || '#7c6af7' }} />
      <div className={styles.roomCardBody}>
        <div className={styles.roomCardTop}>
          <div className={styles.roomCardTitle}>{room.name}</div>
          {room.isPrivate
            ? <span className={styles.privBadge}><Lock size={11} /> Private</span>
            : <span className={styles.pubBadge}><Globe size={11} /> Public</span>
          }
        </div>
        <div className={styles.roomSubject}>{room.subject}</div>
        {room.description && <p className={styles.roomDesc}>{room.description}</p>}
        <div className={styles.roomCardFooter}>
          <div className={styles.memberCount}>
            <Users size={13} />
            <span>{memberCount}/{room.maxMembers}</span>
          </div>
          <button
            className={styles.joinBtn}
            style={{ '--room-color': room.color || '#7c6af7' }}
            onClick={() => onJoin(room)}
            disabled={isFull}
          >
            {isFull ? 'Full' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (subject) params.set('subject', subject);
      const { data } = await api.get(`/rooms?${params}`);
      setRooms(data.rooms || []);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, [search, subject]); // eslint-disable-line

  const handleJoin = async (room) => {
    try {
      await api.post(`/rooms/${room._id}/join`);
      navigate(`/rooms/${room._id}`);
    } catch (err) {
      // Already a member — just navigate
      if (err.response?.status === 400) {
        navigate(`/rooms/${room._id}`);
      } else {
        toast.error(getError(err));
      }
    }
  };

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Study Rooms</h1>
          <p className={styles.sub}>Find or create a room to study with others</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          <Plus size={17} /> New Room
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search rooms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.subjectFilter}
          value={subject}
          onChange={e => setSubject(e.target.value)}
        >
          <option value="">All subjects</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Rooms grid */}
      {loading ? (
        <div className={styles.loadWrap}><div className="spinner" /></div>
      ) : rooms.length === 0 ? (
        <div className={styles.empty}>
          <BookOpen size={40} />
          <h3>No rooms found</h3>
          <p>Be the first to create one!</p>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Room
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {rooms.map(r => <RoomCard key={r._id} room={r} onJoin={handleJoin} />)}
        </div>
      )}

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreate={(room) => { setRooms(prev => [room, ...prev]); }}
        />
      )}
    </div>
  );
}
