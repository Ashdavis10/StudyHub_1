import React, { useState, useEffect, useRef } from 'react';
import api, { getError } from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Upload, FileText, Heart, Trash2, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import styles from './ResourcesPage.module.css';

function NoteModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', content: '', subject: '', tags: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        type: 'note',
      };
      const { data } = await api.post('/resources', payload);
      onSave(data.resource);
      toast.success('Note saved!');
      onClose();
    } catch (err) {
      toast.error(getError(err));
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>New Note</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label>Title *</label>
            <input required placeholder="Note title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Subject</label>
            <input placeholder="e.g. Mathematics" value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Content *</label>
            <textarea required rows={6} placeholder="Write your notes here…"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Tags (comma separated)</label>
            <input placeholder="calculus, integration, tips" value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? <span className={styles.spin} /> : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResourceCard({ resource, onLike, onDelete, currentUserId }) {
  const isOwner = resource.uploadedBy?._id === currentUserId;

  return (
    <div className={styles.resCard}>
      <div className={styles.resCardTop}>
        <div className={styles.resIcon}>
          {resource.type === 'note' ? <FileText size={18} /> : <Upload size={18} />}
        </div>
        <div className={styles.resInfo}>
          <div className={styles.resTitle}>{resource.title}</div>
          {resource.subject && <div className={styles.resSubject}>{resource.subject}</div>}
        </div>
      </div>

      {resource.type === 'note' && resource.content && (
        <p className={styles.resPreview}>{resource.content}</p>
      )}

      {resource.tags?.length > 0 && (
        <div className={styles.resTags}>
          {resource.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
        </div>
      )}

      <div className={styles.resFooter}>
        <div className={styles.resMeta}>
          <span>{resource.uploadedBy?.username}</span>
          <span>·</span>
          <span>{format(new Date(resource.createdAt), 'MMM d')}</span>
        </div>
        <div className={styles.resActions}>
          <button
            className={`${styles.likeBtn} ${resource.likedByMe ? styles.liked : ''}`}
            onClick={() => onLike(resource._id)}
          >
            <Heart size={14} fill={resource.likedByMe ? 'currentColor' : 'none'} />
            <span>{resource.likes?.length || 0}</span>
          </button>
          {isOwner && (
            <button className={styles.deleteBtn} onClick={() => onDelete(resource._id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNote, setShowNote] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Get current user id from token
  const userId = (() => {
    try {
      const token = localStorage.getItem('sh_token');
      if (!token) return null;
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch { return null; }
  })();

  const fetchResources = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('type', filter);
      const { data } = await api.get(`/resources?${params}`);
      setResources(data.resources || []);
    } catch (err) {
      toast.error(getError(err));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, [search, filter]); // eslint-disable-line

  const handleLike = async (id) => {
    try {
      await api.post(`/resources/${id}/like`);
      setResources(prev => prev.map(r =>
        r._id === id
          ? { ...r, likedByMe: !r.likedByMe, likes: r.likedByMe ? r.likes.filter(l => l !== userId) : [...(r.likes || []), userId] }
          : r
      ));
    } catch (err) { toast.error(getError(err)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      setResources(prev => prev.filter(r => r._id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error(getError(err)); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('type', 'file');
      const { data } = await api.post('/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResources(prev => [data.resource, ...prev]);
      toast.success('File uploaded!');
    } catch (err) { toast.error(getError(err)); } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Resources</h1>
          <p className={styles.sub}>Notes and files shared by the community</p>
        </div>
        <div className={styles.headerActions}>
          <input ref={fileRef} type="file" hidden onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
          <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload File'}
          </button>
          <button className={styles.addNoteBtn} onClick={() => setShowNote(true)}>
            <Plus size={15} /> New Note
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search resources…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.filterTabs}>
          {['all','note','file'].map(f => (
            <button key={f}
              className={`${styles.filterTab} ${filter === f ? styles.activeFilter : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'note' ? 'Notes' : 'Files'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadWrap}><div className="spinner" /></div>
      ) : resources.length === 0 ? (
        <div className={styles.empty}>
          <FileText size={40} />
          <h3>No resources yet</h3>
          <p>Upload files or create notes to share with the community</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {resources.map(r => (
            <ResourceCard key={r._id} resource={r}
              onLike={handleLike} onDelete={handleDelete}
              currentUserId={userId} />
          ))}
        </div>
      )}

      {showNote && (
        <NoteModal
          onClose={() => setShowNote(false)}
          onSave={(r) => setResources(prev => [r, ...prev])}
        />
      )}
    </div>
  );
}
