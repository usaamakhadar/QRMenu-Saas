'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChefHat, CreditCard, LayoutDashboard, Utensils, ArrowRight, ShieldAlert, Lock, Eye, EyeOff, X, AlertCircle } from 'lucide-react';

export default function StaffPortalPage() {
    const params = useParams();
    const router = useRouter();
    const restaurantId = params?.restaurantId as string;

    const [restaurantName, setRestaurantName] = useState('My Restaurant');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [dbId, setDbId] = useState('');

    // Owner password gate
    const [showOwnerGate, setShowOwnerGate] = useState(false);
    const [ownerPassword, setOwnerPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [gateError, setGateError] = useState('');
    const [shakeError, setShakeError] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedDbId = localStorage.getItem('qrmenu_restaurantId');
        const token = localStorage.getItem('qrmenu_token');

        if (!storedDbId || !token) {
            router.replace('/login');
            return;
        }

        // Auto-redirect directly to Cashier & Billing Desk (bypassing redundant portal landing page)
        router.replace(`/kitchen/${restaurantId}/billing`);
    }, [restaurantId, router]);

    // Focus input when gate opens
    useEffect(() => {
        if (showOwnerGate) {
            setTimeout(() => passwordRef.current?.focus(), 100);
        }
    }, [showOwnerGate]);

    const handleOwnerGateOpen = () => {
        setOwnerPassword('');
        setGateError('');
        setShowOwnerGate(true);
    };

    const handleOwnerGateClose = () => {
        setShowOwnerGate(false);
        setOwnerPassword('');
        setGateError('');
    };

    const handleVerifyOwner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ownerPassword.trim()) return;

        setVerifying(true);
        setGateError('');

        const token = localStorage.getItem('qrmenu_token');
        try {
            const res = await fetch(`/api/restaurants/${dbId}/verify-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: ownerPassword }),
            });

            if (res.ok) {
                // Password correct — navigate to analytics/owner dashboard
                router.push(`/kitchen/${restaurantId}/analytics`);
            } else {
                const data = await res.json();
                setGateError(data.error || 'Incorrect password. Access denied.');
                setShakeError(true);
                setTimeout(() => setShakeError(false), 600);
                setOwnerPassword('');
                passwordRef.current?.focus();
            }
        } catch {
            setGateError('Connection error. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-background text-on-surface">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="font-body-md text-on-surface-variant">Loading Staff Portal...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-surface-container-lowest flex flex-col justify-center items-center px-4 py-12 md:py-20 min-h-[calc(100vh-65px)]">

            {/* ── Owner Password Gate Modal ── */}
            {showOwnerGate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`bg-surface-container w-full max-w-sm rounded-3xl shadow-2xl border border-outline-variant/50 overflow-hidden transition-all ${shakeError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                        
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-outline-variant/30 px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/15 rounded-xl">
                                    <ShieldAlert className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-on-surface text-base">Management Access</h2>
                                    <p className="text-xs text-on-surface-variant mt-0.5">Owner verification required</p>
                                </div>
                            </div>
                            <button
                                onClick={handleOwnerGateClose}
                                className="p-2 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleVerifyOwner} className="p-6">
                            <p className="text-sm text-on-surface-variant mb-5 leading-relaxed">
                                This area is restricted to <span className="text-primary font-semibold">restaurant owners</span> only. Enter your account password to continue.
                            </p>

                            {/* Password Field */}
                            <div className="relative mb-4">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Lock className="w-4 h-4 text-on-surface-variant" />
                                </div>
                                <input
                                    ref={passwordRef}
                                    type={showPassword ? 'text' : 'password'}
                                    value={ownerPassword}
                                    onChange={(e) => { setOwnerPassword(e.target.value); setGateError(''); }}
                                    placeholder="Enter owner password"
                                    className="w-full bg-surface-container-low border border-outline-variant rounded-2xl pl-11 pr-11 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Error Message */}
                            {gateError && (
                                <div className="flex items-center gap-2 text-error text-xs mb-4 bg-error/10 border border-error/20 rounded-xl px-3 py-2.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{gateError}</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleOwnerGateClose}
                                    className="flex-1 py-3 rounded-2xl border border-outline-variant/60 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={verifying || !ownerPassword.trim()}
                                    className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {verifying ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Verifying...
                                        </span>
                                    ) : 'Unlock Access'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Portal Header ── */}
            <div className="max-w-4xl w-full text-center mb-12">
                <div className="flex justify-center mb-6">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={restaurantName}
                            className="w-20 h-20 rounded-3xl object-cover shadow-lg border-2 border-outline-variant"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-md">
                            <Utensils className="w-10 h-10 text-primary" />
                        </div>
                    )}
                </div>
                <span className="text-xs font-bold text-primary tracking-widest uppercase bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20">
                    {restaurantName}
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mt-4 tracking-tight">
                    Welcome to the Staff Portal
                </h1>
                <p className="text-sm md:text-base text-on-surface-variant mt-2 max-w-lg mx-auto">
                    Select a dedicated view to continue your daily restaurant operations.
                </p>
            </div>

            {/* ── Portal Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">

                {/* Kitchen Display (KDS) */}
                <a
                    href={`/kitchen/${restaurantId}/kds`}
                    className="group relative bg-surface-container-low border border-outline-variant/60 rounded-3xl p-6 md:p-8 flex flex-col justify-between hover:shadow-xl hover:border-[#ff6b00]/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#ff6b00] to-[#ff8e3c] opacity-0 group-hover:opacity-[0.06] rounded-bl-full transition-opacity duration-300" />
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#ff6b00] to-[#ff8e3c] text-white shadow-md">
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[#ff6b00]/10 text-[#ff6b00] border-[#ff6b00]/20">
                                Kitchen Staff
                            </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-on-surface group-hover:text-[#ff6b00] transition-colors duration-200">
                            Kitchen Display (KDS)
                        </h3>
                        <p className="text-xs md:text-sm text-on-surface-variant mt-2.5 leading-relaxed">
                            Real-time active order monitor for chefs. Update ticket statuses instantly.
                        </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-outline-variant/40 flex items-center justify-between text-xs font-bold text-[#ff6b00] group-hover:translate-x-1 transition-transform duration-300">
                        <span>Access View</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </a>

                {/* Cashier & Billing Desk */}
                <a
                    href={`/kitchen/${restaurantId}/billing`}
                    className="group relative bg-surface-container-low border border-outline-variant/60 rounded-3xl p-6 md:p-8 flex flex-col justify-between hover:shadow-xl hover:border-[#00ae7a]/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00ae7a] to-[#00cf91] opacity-0 group-hover:opacity-[0.06] rounded-bl-full transition-opacity duration-300" />
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00ae7a] to-[#00cf91] text-white shadow-md">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[#00ae7a]/10 text-[#00ae7a] border-[#00ae7a]/20">
                                Cashier
                            </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-on-surface group-hover:text-[#00ae7a] transition-colors duration-200">
                            Cashier &amp; Billing Desk
                        </h3>
                        <p className="text-xs md:text-sm text-on-surface-variant mt-2.5 leading-relaxed">
                            View unpaid tables, print customer receipts, and mark bills paid.
                        </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-outline-variant/40 flex items-center justify-between text-xs font-bold text-[#00ae7a] group-hover:translate-x-1 transition-transform duration-300">
                        <span>Access View</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </a>

                {/* Owner Dashboard — password-gated */}
                <button
                    onClick={handleOwnerGateOpen}
                    className="group relative bg-surface-container-low border border-outline-variant/60 rounded-3xl p-6 md:p-8 flex flex-col justify-between hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer text-left w-full"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary to-[#7a85f8] opacity-0 group-hover:opacity-[0.06] rounded-bl-full transition-opacity duration-300" />
                    {/* Lock badge top-left corner */}
                    <div className="absolute top-3 left-3">
                        <div className="flex items-center gap-1 bg-surface-container-high/80 border border-outline-variant/40 rounded-full px-2 py-0.5">
                            <Lock className="w-2.5 h-2.5 text-on-surface-variant" />
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Owner Only</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-start mb-6 mt-3">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-[#7a85f8] text-white shadow-md">
                                <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
                                Management
                            </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-on-surface group-hover:text-primary transition-colors duration-200">
                            Owner Dashboard
                        </h3>
                        <p className="text-xs md:text-sm text-on-surface-variant mt-2.5 leading-relaxed">
                            Modify digital menu items, configure exchange rates, and view daily sales.
                        </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-outline-variant/40 flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-1 transition-transform duration-300">
                        <span>Verify &amp; Access</span>
                        <ShieldAlert className="w-4 h-4" />
                    </div>
                </button>

            </div>

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-5px); }
                    80% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
}
