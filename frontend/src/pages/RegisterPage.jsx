import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getError } from '../utils/api';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './AuthPages.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}><BookOpen size={22} /></div>
          <span className={styles.logoText}>StudyHub</span>
        </div>
        <h1 className={styles.title}>Join StudyHub</h1>
        <p className={styles.sub}>Create your account and start studying smarter</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input type="text" name="username" required placeholder="your_username"
              value={form.username} onChange={handleChange} />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" name="email" required placeholder="you@example.com"
              value={form.email} onChange={handleChange} />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.pwWrap}>
              <input type={showPw ? 'text' : 'password'} name="password" required
                placeholder="Min. 8 characters"
                value={form.password} onChange={handleChange} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label>Confirm Password</label>
            <input type="password" name="confirmPassword" required placeholder="Repeat password"
              value={form.confirmPassword} onChange={handleChange} />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.btnSpinner} /> : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
