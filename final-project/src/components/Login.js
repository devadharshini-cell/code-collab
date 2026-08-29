import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const { login, signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || '/';

    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    const friendlyError = (err) => {
        const code = err?.code || '';
        if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
            return 'Incorrect email or password.';
        }
        if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
        if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
        if (code.includes('invalid-email')) return 'That email address looks invalid.';
        if (code.includes('popup-closed-by-user')) return 'Google sign-in was cancelled.';
        return err?.message || 'Something went wrong. Try again.';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            if (mode === 'signup') {
                if (!name.trim()) { toast.error('Enter your name'); setBusy(false); return; }
                await signup(email.trim(), password, name.trim());
                toast.success('Account created!');
            } else {
                await login(email.trim(), password);
                toast.success('Welcome back!');
            }
            navigate(redirectTo, { replace: true });
        } catch (err) {
            toast.error(friendlyError(err));
        } finally {
            setBusy(false);
        }
    };

    const handleGoogle = async () => {
        setBusy(true);
        try {
            await loginWithGoogle();
            toast.success('Welcome!');
            navigate(redirectTo, { replace: true });
        } catch (err) {
            toast.error(friendlyError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="login-root">
            <div className="login-bg-grid" />
            <div className="login-card">
                <Link to="/" className="login-logo">
                    <div className="login-logo-icon">&lt;/&gt;</div>
                    <span>Code<span className="login-brand-accent">Collab</span></span>
                </Link>

                <div className="login-tabs">
                    <button className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')} type="button">
                        Log In
                    </button>
                    <button className={`login-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')} type="button">
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'signup' && (
                        <div className="login-field">
                            <label>Your name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deva" autoFocus />
                        </div>
                    )}
                    <div className="login-field">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="login-field">
                        <label>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                    </div>
                    <button className="login-btn-primary" type="submit" disabled={busy}>
                        {busy ? 'Please wait…' : mode === 'signup' ? 'Create Account →' : 'Log In →'}
                    </button>
                </form>

                <div className="login-divider"><span>or</span></div>

                <button className="login-btn-google" onClick={handleGoogle} disabled={busy} type="button">
                    Continue with Google
                </button>
            </div>
        </div>
    );
};

export default Login;
