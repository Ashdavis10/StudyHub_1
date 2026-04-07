import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { getError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Edit2, Save, X, Clock, Flame, Trophy, Zap, BookOpen } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import styles from './ProfilePage.module.css';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','Computer Science','History','Literature','Languages','Economics','Other'];
const THEMES = ['default','ocean','forest','sunset'];

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const isMine = !id || id === me?._id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const endpoint = isMine ? '/auth/me' : `/users/${id}`;
        const { data } = await api.get(endpoint);
        const u = data.user || data;
        setProfile(u);
        setForm({
          bio: u.profile?.bio || '',
          displayName: u.profile?.displayName || u.username,
          subjects: u.profile?.subjects || [],
          studyGoal: u.preferences?.dailyGoal || 120,
          theme: u.preferences?.theme || 'default',
        });
      } catch (err) {
        toast.error(getError(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isMine]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', {
        profile: { bio: form.bio, displayName: form.displayName, subjects: form.subjects },
        preferences: { dailyGoal: Number(form.studyGoal), theme: form.theme },
      });
      setProfile(data.user);
      updateUser(data.user);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (s) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s],
    }));
  };

  if (loading) return (
    <div className={styles.loadWrap}><div className="spinner" /></div>
  );
  if (!profile) return null;

  const stats = profile.stats || {};

  // Radar chart data
  const radarData = [
    { subject: 'Consistency', value: Math.min(100, (stats.currentStreak || 0) * 10) },
    { subject: 'Focus',       value: Math.min(100, Math.round((stats.totalStudyTime || 0) / 360)) },
    { subject: 'Social',      value: Math.min(100, (stats.roomsJoined || 0) * 10) },
    { subject: 'Resources',   value: Math.min(100, (stats.resourcesShared || 0) * 20) },
    { subject: 'Badges',      value: Math.min(100, (stats.badges?.length || 0) * 15) },
  ];

  return (
    <div className={`${styles.page} page-enter`}>
      {/* Hero */}
      <div className={`card ${styles.hero}`}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <div className={styles.bigAvatar}>
            {(profile.profile?.displayName || profile.username)?.[0]?.toUpperCase()}
          </div>
          <div className={styles.heroInfo}>
            {editing ? (
              <input className={styles.nameInput} value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            ) : (
              <h1 className={styles.profileName}>
                {profile.profile?.displayName || profile.username}
              </h1>
            )}
            <div className={styles.username}>@{profile.username}</div>
            {editing ? (
              <textarea className={styles.bioInput} rows={2} placeholder="Write a bio…"
                value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            ) : (
              profile.profile?.bio && <p className={styles.bio}>{profile.profile.bio}</p>
            )}
          </div>
          {isMine && (
            <div className={styles.heroActions}>
              {editing ? (
                <>
                  <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                    <Save size={15} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setEditing(false)}>
                    <X size={15} />
                  </button>
                </>
              ) : (
                <button className={styles.editBtn} onClick={() => setEditing(true)}>
                  <Edit2 size={15} /> Edit Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {[
          { icon: Zap,     label: 'Total XP',     value: stats.totalXP || 0 },
          { icon: Flame,   label: 'Best Streak',   value: `${stats.longestStreak || 0}d` },
          { icon: Clock,   label: 'Study Hours',   value: `${Math.round((stats.totalStudyTime || 0) / 3600)}h` },
          { icon: Trophy,  label: 'Level',         value: stats.level || 1 },
          { icon: BookOpen,label: 'Sessions',       value: stats.totalSessions || 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className={styles.statItem}>
            <Icon size={16} className={styles.statIcon} />
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div className={styles.grid2}>
        {/* Radar chart */}
        <div className={`card ${styles.radarCard}`}>
          <h3 className={styles.cardTitle}>Study Profile</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Radar dataKey="value" stroke="#7c6af7" fill="#7c6af7" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Subjects + Goal */}
        <div className={`card ${styles.prefsCard}`}>
          <h3 className={styles.cardTitle}>Subjects</h3>
          <div className={styles.subjectGrid}>
            {SUBJECTS.map(s => {
              const isSelected = (editing ? form.subjects : profile.profile?.subjects || []).includes(s);
              return (
                <button
                  key={s}
                  className={`${styles.subjectChip} ${isSelected ? styles.selectedChip : ''}`}
                  onClick={() => editing && toggleSubject(s)}
                  disabled={!editing}
                  style={{ cursor: editing ? 'pointer' : 'default' }}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {isMine && (
            <>
              <h3 className={styles.cardTitle} style={{ marginTop: '1.25rem' }}>Daily Goal</h3>
              {editing ? (
                <div className={styles.goalEdit}>
                  <input type="range" min={15} max={480} step={15}
                    value={form.studyGoal}
                    onChange={e => setForm(f => ({ ...f, studyGoal: e.target.value }))} />
                  <span className={styles.goalVal}>{form.studyGoal} min/day</span>
                </div>
              ) : (
                <div className={styles.goalDisplay}>
                  <div className={styles.goalBar}>
                    <div className={styles.goalFill}
                      style={{ width: `${Math.min(100, ((stats.todayStudyTime || 0) / 60) / (profile.preferences?.dailyGoal || 120) * 100)}%` }}
                    />
                  </div>
                  <span className={styles.goalVal}>
                    {Math.round((stats.todayStudyTime || 0) / 60)} / {profile.preferences?.dailyGoal || 120} min today
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Badges */}
      {stats.badges?.length > 0 && (
        <div className={`card ${styles.badgesCard}`}>
          <h3 className={styles.cardTitle}>Badges</h3>
          <div className={styles.badges}>
            {stats.badges.map((b, i) => (
              <div key={i} className={styles.badge} title={b.description}>
                <span className={styles.badgeEmoji}>{b.icon || '🏅'}</span>
                <span className={styles.badgeName}>{b.name}</span>
                <span className={styles.badgeDesc}>{b.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
