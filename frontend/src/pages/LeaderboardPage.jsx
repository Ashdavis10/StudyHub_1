import React, { useState, useEffect } from 'react';
import api, { getError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Flame, Clock, Zap, Medal } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './LeaderboardPage.module.css';

const TABS = [
  { key: 'xp',      label: 'XP',       icon: Zap },
  { key: 'streak',  label: 'Streak',    icon: Flame },
  { key: 'hours',   label: 'Study Time',icon: Clock },
];

const RANK_COLORS = ['#f7a26a', '#9b99b8', '#c08040'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('xp');
  const [data, setData] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: res } = await api.get(`/leaderboard?type=${tab}`);
        setData(res.leaderboard || []);
        setMyRank(res.myRank || null);
      } catch (err) {
        toast.error(getError(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  const formatValue = (entry) => {
    if (tab === 'xp')     return `${entry.stats?.totalXP || 0} XP`;
    if (tab === 'streak') return `${entry.stats?.longestStreak || 0} days`;
    if (tab === 'hours')  return `${Math.round((entry.stats?.totalStudyTime || 0) / 3600)}h`;
    return '—';
  };

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Leaderboard</h1>
          <p className={styles.sub}>Top studiers this month</p>
        </div>
        {myRank && (
          <div className={styles.myRankCard}>
            <Trophy size={14} />
            <span>Your rank: <strong>#{myRank}</strong></span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`${styles.tab} ${tab === key ? styles.activeTab : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadWrap}><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>
          <Trophy size={40} />
          <p>No data yet. Start studying to appear here!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 3 && (
            <div className={styles.podium}>
              {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
                const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                return (
                  <div
                    key={entry._id}
                    className={`${styles.podiumSpot} ${rank === 1 ? styles.first : ''}`}
                  >
                    <div className={styles.podiumIcon}>{RANK_ICONS[rank - 1]}</div>
                    <div
                      className={styles.podiumAvatar}
                      style={{ borderColor: RANK_COLORS[rank - 1] }}
                    >
                      {entry.username?.[0]?.toUpperCase()}
                    </div>
                    <div className={styles.podiumName}>{entry.username}</div>
                    <div className={styles.podiumValue} style={{ color: RANK_COLORS[rank - 1] }}>
                      {formatValue(entry)}
                    </div>
                    <div
                      className={styles.podiumBar}
                      style={{
                        height: rank === 1 ? 70 : rank === 2 ? 50 : 40,
                        background: RANK_COLORS[rank - 1],
                      }}
                    >#{rank}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className={`card ${styles.tableCard}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Level</th>
                  <th style={{ textAlign: 'right' }}>{TABS.find(t => t.key === tab)?.label}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => {
                  const isMe = entry._id === user?._id;
                  return (
                    <tr key={entry._id} className={`${styles.row} ${isMe ? styles.myRow : ''}`}>
                      <td className={styles.rankCell}>
                        {i < 3
                          ? <span className={styles.medal}>{RANK_ICONS[i]}</span>
                          : <span className={styles.rankNum}>#{i + 1}</span>
                        }
                      </td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.tableAvatar} style={{ background: isMe ? 'var(--accent-primary)' : 'var(--bg-elevated)' }}>
                            {entry.username?.[0]?.toUpperCase()}
                          </div>
                          <span className={styles.tableUsername}>
                            {entry.username}
                            {isMe && <span className={styles.youTag}> (you)</span>}
                          </span>
                        </div>
                      </td>
                      <td className={styles.levelCell}>Lv.{entry.stats?.level || 1}</td>
                      <td className={styles.valueCell}>{formatValue(entry)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
