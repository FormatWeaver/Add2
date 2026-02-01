
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './Spinner';

// FIX: Cast motion to any for TS flexibility
const MotionDiv = motion.div as any;

interface LoginPageProps {
    onGuestLogin?: (name: string) => void;
}

export const LoginPage = ({ onGuestLogin }: LoginPageProps) => {
    const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signUp') {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                        },
                    },
                });

                if (signUpError) {
                    setError(signUpError.message);
                } else if (data.user && !data.session) {
                    setMessage("Success! Check your email to confirm your account.");
                } else if (data.user && data.session) {
                    setMessage("Account created and logged in!");
                }
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                
                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        setError("Invalid email or password. Please try again.");
                    } else if (signInError.message.includes('Email not confirmed')) {
                        setError("Please confirm your email address before logging in.");
                    } else {
                        setError(signInError.message);
                    }
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(err.message || "An unexpected error occurred during authentication.");
        } finally {
            setLoading(false);
        }
    };

    const handleGuestEntry = () => {
        if (onGuestLogin) {
            onGuestLogin('Guest Estimator');
        }
    };

    return (
        <div className="max-w-md mx-auto py-12 px-4">
            <MotionDiv 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80"
            >
                <div className="text-center">
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {mode === 'signIn' ? 'Welcome Back' : 'Create Your Account'}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {mode === 'signIn' 
                            ? "Sign in to manage your construction projects." 
                            : "Get started with your free AI conforming account."}
                    </p>
                </div>
                
                <form onSubmit={handleAuthAction} className="mt-8 space-y-4">
                     {mode === 'signUp' && (
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-slate-700">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="mt-1 block w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-slate-700">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-bold text-slate-700">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 animate-pulse">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-lg shadow-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all disabled:bg-slate-400"
                    >
                        {loading ? <Spinner /> : (mode === 'signIn' ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-8 border-t border-slate-100 pt-6">
                    <button 
                        onClick={handleGuestEntry}
                        className="w-full py-2.5 px-4 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                        Try Guest Mode (No Account)
                    </button>
                    <p className="mt-2 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Guest data is temporary
                    </p>
                </div>

                <div className="mt-6 text-center text-sm">
                    <button 
                        onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} 
                        className="font-bold text-brand-600 hover:text-brand-500 underline"
                    >
                        {mode === 'signIn' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </MotionDiv>
        </div>
    );
};
