import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { getError } from '../utils/api';
import { Link } from 'react-router-dom';
import {
  Clock, Flame, BookOpen, Trophy, TrendingUp, Users, Target, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';
import styles from './DashboardPage.module.css';
import PomodoroWidget from '../components/pomodoro/PomodoroWidget';

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => (
  <div className={`${styles.statCard} ${styles[`stat_${color}`]}`}>
    <div className={styles.statIcon}><Icon size={20} /></div>
    <div className={styles.statBody}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [sessRes, roomsRes] = await Promise.all([
          api.get('/sessions/analytics'),
          api.get('/rooms?limit=3&sort=members'),
        ]);
        setSessions(sessRes.data.sessions || []);
        setActiveRooms(roomsRes.data.rooms || []);

        // Build 7-day chart data
        const map = {};
        (sessRes.data.sessions || []).forEach(s => {
          const key = format(new Date(s.startTime), 'MMM d');
          map[key] = (map[key] || 0) + Math.round((s.duration || 0) / 60);
        });
        const data = Array.from({ length: 7 }, (_, i) => {
          const d = format(subDays(new Date(), 6 - i), 'MMM d');
          return { date: d, minutes: map[d] || 0 };
        });
        setChartData(data);
      } catch (err) {
        console.error(getError(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalToday = sessions
    .filter(s => new Date(s.startTime).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  const totalWeek = sessions
    .filter(s => new Date(s.startTime) >= subDays(new Date(), 7))
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  const stats = user?.stats || {};

  if (loading) return (
    <div className={styles.loading}><div className="spinner" /></div>
  );

  return (
    <div className={`${styles.page} page-enter`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>
            Hey, {user?.username} 👋
          </h1>
          <p className={styles.greetingSub}>
            {stats.currentStreak > 0
              ? `You're on a ${stats.currentStreak}-day streak 🔥 Keep it up!`
              : 'Start a study session to build your streak!'}
          </p>
        </div>
        <div className={styles.xpBadge}>
          <Zap size={14} />
          <span>{stats.totalXP || 0} XP</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={Clock} label="Today" color="primary"
          value={`${Math.round(totalToday / 60)}m`}
          sub="study time"
        />
        <StatCard
          icon={TrendingUp} label="This Week" color="teal"
          value={`${Math.round(totalWeek / 60)}m`}
          sub="total focus"
        />
        <StatCard
          icon={Flame} label="Streak" color="warm"
          value={stats.currentStreak || 0}
          sub="days in a row"
        />
        <StatCard
          icon={Trophy} label="Rank" color="rose"
          value={`#${stats.rank || '—'}`}
          sub="on leaderboard"
        />
      </div>

      <div className={styles.grid2}>
        {/* Chart */}
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h3>Study Activity</h3>
            <span className={styles.cardSub}>Last 7 days (minutes)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c6af7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Area type="monotone" dataKey="minutes" stroke="#7c6af7" strokeWidth={2} fill="url(#studyGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pomodoro Widget */}
        <div className={`card ${styles.pomodoroCard}`}>
          <div className={styles.cardHeader}>
            <h3>Quick Focus</h3>
            <span className={styles.cardSub}>Pomodoro Timer</span>
          </div>
          <PomodoroWidget />
        </div>
      </div>

      {/* Active Rooms */}
      <div className={`card ${styles.roomsCard}`}>
        <div className={styles.cardHeader}>
          <h3>Active Study Rooms</h3>
          <Link to="/rooms" className={styles.viewAll}>View all →</Link>
        </div>
        {activeRooms.length === 0 ? (
          <div className={styles.empty}>
            <BookOpen size={32} />
            <p>No active rooms. <Link to="/rooms">Create or join one!</Link></p>
          </div>
        ) : (
          <div className={styles.roomsList}>
            {activeRooms.map(room => (
              <Link to={`/rooms/${room._id}`} key={room._id} className={styles.roomRow}>
                <div className={styles.roomDot} style={{ background: room.color || '#7c6af7' }} />
                <div className={styles.roomInfo}>
                  <span className={styles.roomName}>{room.name}</span>
                  <span className={styles.roomSub}>{room.subject}</span>
                </div>
                <div className={styles.roomMembers}>
                  <Users size={13} />
                  <span>{room.members?.length || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Goals / Badges */}
      {stats.badges?.length > 0 && (
        <div className={`card ${styles.badgesCard}`}>
          <div className={styles.cardHeader}>
            <h3>Recent Badges</h3>
          </div>
          <div className={styles.badges}>
            {stats.badges.slice(0, 6).map((b, i) => (
              <div key={i} className={styles.badge} title={b.description}>
                <span className={styles.badgeIcon}>{b.icon || '🏅'}</span>
                <span className={styles.badgeLabel}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
