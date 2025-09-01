
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './Spinner';

const MotionDiv = motion.div as any;

export const LoginPage = () => {
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

        if (mode === 'signUp') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                },
            });

            if (error) {
                setError(error.message);
            } else if (data.user && !data.session) {
                // User was created but needs to verify their email
                setMessage("Please check your email to complete your registration.");
            }
            // On successful login (if data.session exists), the onAuthStateChange
            // listener in App.tsx will handle navigation automatically. No message needed.

        } else { // signIn
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            }
            // On success, the onAuthStateChange listener in App.tsx will handle navigation.
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto py-12 px-4">
            <MotionDiv 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/80"
            >
                <div className="text-center">
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {mode === 'signIn' ? 'Welcome Back' : 'Create Your Account'}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {mode === 'signIn' 
                            ? "Sign in to access your projects." 
                            : "Get started by creating a free account."}
                    </p>
                </div>
                
                <form onSubmit={handleAuthAction} className="mt-8 space-y-4">
                     {mode === 'signUp' && (
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                placeholder="John Doe"
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-slate-700">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
                    {message && <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md border border-emerald-200">{message}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg shadow-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition disabled:bg-slate-400"
                    >
                        {loading && <Spinner />}
                        {mode === 'signIn' ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="font-medium text-brand-600 hover:text-brand-500">
                        {mode === 'signIn' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </MotionDiv>
        </div>
    );
};