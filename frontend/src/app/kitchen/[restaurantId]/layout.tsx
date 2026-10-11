'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Receipt,
    UtensilsCrossed,
    BarChart2,
    Settings,
    UserCircle,
    QrCode,
    LogOut,
    CreditCard,
    BellRing,
    Menu,
    X,
    RefreshCw
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

export const SocketContext = React.createContext<Socket | null>(null);

export function useSocket() {
    return React.useContext(SocketContext);
}

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const restaurantId = params?.restaurantId as string;

    const [restaurantName, setRestaurantName] = useState('My Restaurant');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [systemMode, setSystemMode] = useState<'FULL_POS' | 'QR_SERVICE_HUB'>('FULL_POS');
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-close mobile drawer when route changes
    useEffect(() => {
        setIsMobileDrawerOpen(false);
    }, [pathname]);

    // Listen for real-time settings updates (name, logo, mode) from Settings page
    useEffect(() => {
        const handleSettingsUpdated = (e: any) => {
            if (e.detail?.name) {
                setRestaurantName(e.detail.name);
                localStorage.setItem('qrmenu_name', e.detail.name);
            }
            if (e.detail?.logoUrl !== undefined) {
                setLogoUrl(e.detail.logoUrl);
            }
            if (e.detail?.systemMode) {
                setSystemMode(e.detail.systemMode);
            }
        };

        window.addEventListener('qrmenu_settings_updated', handleSettingsUpdated);
        return () => window.removeEventListener('qrmenu_settings_updated', handleSettingsUpdated);
    }, []);

    useEffect(() => {
        // Auth guard — redirect to login if no token found
        const token = localStorage.getItem('qrmenu_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        const storedName = localStorage.getItem('qrmenu_name');
        if (storedName) setRestaurantName(storedName);

        // Fetch restaurant and user profile details
        fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) {
                    // Token invalid or expired — force re-login
                    localStorage.removeItem('qrmenu_token');
                    localStorage.removeItem('qrmenu_slug');
                    localStorage.removeItem('qrmenu_restaurantId');
                    localStorage.removeItem('qrmenu_name');
                    router.replace('/login');
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setRestaurantName(data.name);
                    setLogoUrl(data.logoUrl || null);
                    setUserRole(data.user?.role || 'OWNER');
                    setSystemMode(data.systemMode || 'FULL_POS');
                    setCheckingAuth(false);
                }
            })
            .catch(() => {
                // Network error — still allow access with stored name as fallback
                const storedName = localStorage.getItem('qrmenu_name');
                if (storedName) setRestaurantName(storedName);
                setUserRole('OWNER'); // Fallback to OWNER if offline
                setCheckingAuth(false);
            });
    }, [router]);

let sharedAudioCtx: AudioContext | null = null;

const getSharedAudioCtx = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
};

    const speakVoiceAlert = (text: string) => {
        try {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('Voice alert failed:', e);
        }
    };

    const playBeepSound = (type: 'WAITER' | 'BILL' | 'ORDER' = 'WAITER') => {
        try {
            const ctx = getSharedAudioCtx();
            if (!ctx) return;

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            const now = ctx.currentTime;
            const isWaiter = type === 'WAITER';
            const isBill = type === 'BILL';
            const freq = isWaiter ? 960 : isBill ? 740 : 880;

            const delays = isBill ? [0] : [0, 0.16, 0.32, 0.48];

            delays.forEach((delay) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + delay);
                gain.gain.setValueAtTime(0.8, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + (isBill ? 0.25 : 0.14));
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + (isBill ? 0.25 : 0.14));
            });
        } catch (e) {
            console.error('Audio play failed:', e);
        }
    };

    // Unlock Web Audio API on user interaction
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
                const ctx = new AudioCtxClass();
                if (ctx.state === 'running') {
                    setAudioUnlocked(true);
                }
            }
        }

        const unlock = () => {
            const ctx = getSharedAudioCtx();
            if (ctx) {
                if (ctx.state === 'suspended') {
                    ctx.resume().then(() => setAudioUnlocked(true)).catch(() => {});
                } else {
                    setAudioUnlocked(true);
                }
            }
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);
        return () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
        };
    }, []);

    // Socket.io Service Requests Listener
    useEffect(() => {
        const dbId = localStorage.getItem('qrmenu_restaurantId');
        if (!dbId) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || '';
        const s = socketUrl ? io(socketUrl) : io();
        setSocket(s);

        const joinRoom = () => {
            s.emit('joinRestaurantKitchen', dbId);
        };

        if (s.connected) joinRoom();
        s.on('connect', joinRoom);

        s.off('serviceRequestAlert');
        s.on('serviceRequestAlert', (payload: { tableNumber: string, requestType: 'WAITER' | 'BILL' }) => {
            const isWaiter = payload.requestType === 'WAITER';

            // Mute Bill alerts on KDS (Kitchen) page — kitchen station only focuses on food tickets
            const isKdsPage = typeof window !== 'undefined' && window.location.pathname.endsWith('/kds');
            if (isKdsPage && payload.requestType === 'BILL') {
                return;
            }

            playBeepSound(payload.requestType);

            // Voice speech alert plays ONLY for Waiter call (speech disabled for BILL requests)
            if (isWaiter) {
                const voiceText = `Table ${payload.tableNumber} is calling a waiter!`;
                speakVoiceAlert(voiceText);
            }

            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-surface-container-highest shadow-2xl rounded-2xl pointer-events-auto flex border-2 ${isWaiter ? 'border-amber-500 bg-amber-500/10' : 'border-emerald-500 bg-emerald-500/10'} p-4 backdrop-blur-md`}>
                    <div className="flex-1 w-0 p-1">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl ${isWaiter ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'} shrink-0 shadow-lg animate-bounce`}>
                                <BellRing className="h-7 w-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-surface text-on-surface shadow-sm border border-outline-variant">
                                        {isWaiter ? '🔔 Waiter Alert' : '💳 Bill Alert'}
                                    </span>
                                </div>
                                <h4 className="text-xl font-black text-on-surface mt-1">
                                    MIISKA #{payload.tableNumber}
                                </h4>
                                <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                                    {isWaiter ? 'Macaamiilku wuxuu u yeedhayaa Shaqaale' : 'Macaamiilku wuxuu dalbaday Rasiidhka/Bill-ka'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center border-l border-outline-variant/40 ml-3 pl-3">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold ${isWaiter ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'} transition-all shadow-sm cursor-pointer`}
                        >
                            OK
                        </button>
                    </div>
                </div>
            ), { id: `alert-${payload.tableNumber}-${payload.requestType}`, duration: 15000 });
        });

        return () => {
            s.disconnect();
        };
    }, []);

    // Inactivity Timeout: 4 minutes of no interaction logs out the user
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        const TIMEOUT_DURATION = 120 * 60 * 1000; // 2 hours (120 minutes)

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleLogoutWithInactivity();
            }, TIMEOUT_DURATION);
        };

        const handleLogoutWithInactivity = () => {
            localStorage.removeItem('qrmenu_token');
            localStorage.removeItem('qrmenu_slug');
            localStorage.removeItem('qrmenu_restaurantId');
            localStorage.removeItem('qrmenu_name');
            toast.error('Session expired due to inactivity.', {
                duration: 6000,
                id: 'inactivity-logout-toast'
            });
            router.push('/login');
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('qrmenu_token');
        localStorage.removeItem('qrmenu_slug');
        localStorage.removeItem('qrmenu_restaurantId');
        localStorage.removeItem('qrmenu_name');
        router.push('/login');
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadToast = toast.loading('Uploading logo...');
        try {
            const formData = new FormData();
            formData.append('image', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();
            
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
            
            const newLogoUrl = uploadData.url;

            const token = localStorage.getItem('qrmenu_token');
            const updateRes = await fetch('/api/auth/logo', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ logoUrl: newLogoUrl })
            });

            if (!updateRes.ok) throw new Error('Failed to save logo');

            setLogoUrl(newLogoUrl);
            toast.success('Logo updated successfully!', { id: uploadToast });
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Failed to upload logo. Please try again.', { id: uploadToast });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const navItems = [
        { name: 'Billing Desk', path: `/kitchen/${restaurantId}/billing`, icon: CreditCard, roles: ['OWNER', 'CASHIER'] },
        { name: 'Orders', path: `/kitchen/${restaurantId}/orders`, icon: Receipt, roles: ['OWNER', 'CASHIER'] },
        { name: 'KDS', path: `/kitchen/${restaurantId}/kds`, icon: UtensilsCrossed, roles: ['OWNER', 'KITCHEN'] },
        { name: 'Analytics', path: `/kitchen/${restaurantId}/analytics`, icon: BarChart2, roles: ['OWNER'] },
        { name: 'Menu', path: `/kitchen/${restaurantId}/menu`, icon: UtensilsCrossed, roles: ['OWNER'] },
        { name: 'QR Codes', path: `/kitchen/${restaurantId}/qrcodes`, icon: QrCode, roles: ['OWNER'] },
        { name: 'Settings', path: `/kitchen/${restaurantId}/settings`, icon: Settings, roles: ['OWNER'] },
    ];

    // Strict Role-Based Navigation Guard
    useEffect(() => {
        if (checkingAuth || !userRole) return;
        
        // 1. KITCHEN Role: Strictly restricted to KDS ONLY
        if (userRole === 'KITCHEN') {
            if (pathname !== `/kitchen/${restaurantId}/kds`) {
                router.replace(`/kitchen/${restaurantId}/kds`);
            }
            return;
        }

        // 2. CASHIER Role: Restricted to Billing & Orders ONLY
        if (userRole === 'CASHIER') {
            const allowedPaths = [
                `/kitchen/${restaurantId}/billing`,
                `/kitchen/${restaurantId}/orders`
            ];
            if (!allowedPaths.includes(pathname)) {
                router.replace(`/kitchen/${restaurantId}/billing`);
            }
            return;
        }

        // 3. OWNER Role: Automatically bypass landing page and open Billing Desk
        if (userRole === 'OWNER' && pathname === `/kitchen/${restaurantId}`) {
            router.replace(`/kitchen/${restaurantId}/billing`);
            return;
        }
    }, [pathname, userRole, checkingAuth, router, restaurantId]);

    // Show loading spinner while verifying auth
    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-container" />
            </div>
        );
    }

    const isPortal = pathname === `/kitchen/${restaurantId}`;
    const isKDS = pathname === `/kitchen/${restaurantId}/kds`;
    const isBilling = pathname === `/kitchen/${restaurantId}/billing`;
    const isMinimalView = isKDS || userRole === 'KITCHEN';

    const getViewTitle = () => {
        if (isKDS) return 'Kitchen Display System (KDS)';
        if (isBilling) return 'Cashier & Billing Desk';
        if (isPortal) return 'Unified Staff Portal';
        return '';
    };

    // Filter navbar tabs by user role & system operating mode
    const visibleNavItems = navItems.filter((item) => {
        if (!userRole || !item.roles.includes(userRole)) return false;
        // CASHIER role MUST ALWAYS see both Billing Desk and Orders
        if (userRole === 'CASHIER') return true;
        if (systemMode === 'QR_SERVICE_HUB' && (item.name === 'Billing Desk' || item.name === 'Billing' || item.name === 'Analytics')) return false;
        return true;
    });

    return (
        <SocketContext.Provider value={socket}>
            <div className="bg-background text-on-background flex min-h-screen w-full max-w-full overflow-x-hidden">
                {/* Desktop SideNav */}
                {!isMinimalView && (
                    <nav className="hidden md:flex flex-col h-full p-4 space-y-2 bg-surface-container-low border-r border-outline-variant fixed left-0 top-0 w-64 z-50 print:hidden">
                        <div className="flex items-center space-x-3 mb-8 px-4 py-2">
                            {logoUrl && (
                                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                            )}
                            <div className="flex-1 min-w-0">
                                <h1 className="font-headline-lg text-headline-lg font-black text-primary leading-tight truncate">
                                    {restaurantName}
                                </h1>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">Active Service</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-1">
                            {visibleNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.path;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.path}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-label-bold text-label-bold transition-all ${
                                            isActive
                                                ? 'bg-secondary-container text-on-secondary-container'
                                                : 'text-on-surface-variant hover:bg-surface-container-highest'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-outline-variant mt-auto space-y-1">
                            <div 
                                className="flex items-center space-x-3 px-4 py-3 text-on-surface-variant cursor-pointer group hover:bg-surface-container-highest rounded-lg transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/png, image/jpeg, image/webp" 
                                    onChange={handleLogoUpload} 
                                />
                                <div className="relative shrink-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-full object-cover ring-2 ring-outline-variant" />
                                    ) : (
                                        <UserCircle className="w-9 h-9 bg-surface-container-high rounded-full p-1" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-[9px] text-white font-bold tracking-wider uppercase">Edit</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-label-bold text-label-bold text-on-surface truncate">{restaurantName}</p>
                                    <p className="font-body-sm text-[11px] text-on-surface-variant group-hover:text-primary transition-colors">Change Logo</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-all cursor-pointer font-label-bold text-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </nav>
                )}

                {/* Mobile Top Header */}
                {!isMinimalView && (
                    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container-low border-b border-outline-variant z-40 px-4 flex items-center justify-between print:hidden">
                        <div className="flex items-center space-x-3 min-w-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0" />
                            ) : (
                                <UserCircle className="w-8 h-8 text-primary shrink-0" />
                            )}
                            <div className="min-w-0">
                                <h1 className="font-bold text-sm text-primary leading-tight truncate">
                                    {restaurantName}
                                </h1>
                                <p className="text-[10px] text-on-surface-variant font-semibold">Staff Portal</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsMobileDrawerOpen(true)}
                            className="p-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest cursor-pointer transition-all active:scale-95 border border-outline-variant/40"
                        >
                            <Menu className="w-5 h-5 text-primary" />
                        </button>
                    </header>
                )}

                {/* Mobile Slide-over Drawer Menu (Hamburger Drawer) */}
                {isMobileDrawerOpen && (
                    <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => setIsMobileDrawerOpen(false)}
                        />

                        {/* Drawer Panel */}
                        <div className="relative w-4/5 max-w-xs bg-surface-container-lowest h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-outline-variant">
                            {/* Drawer Header */}
                            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                                <div className="flex items-center space-x-3 min-w-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover ring-2 ring-primary/20" />
                                    ) : (
                                        <UserCircle className="w-9 h-9 text-primary" />
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm text-on-surface truncate">{restaurantName}</h3>
                                        <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full inline-block">
                                            {userRole || 'STAFF'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileDrawerOpen(false)}
                                    className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Navigation Links */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {visibleNavItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.path;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.path}
                                            onClick={() => setIsMobileDrawerOpen(false)}
                                            className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl font-label-bold text-sm transition-all ${
                                                isActive
                                                    ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                                                    : 'text-on-surface hover:bg-surface-container-high'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5 text-primary" />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-4 border-t border-outline-variant bg-surface-container-low space-y-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full bg-error/10 hover:bg-error/20 text-error font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out / Log Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className={`flex-1 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden ${isMinimalView ? 'ml-0 md:ml-0' : 'ml-0 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0'} transition-all`}>
                    {!audioUnlocked && (
                        <div 
                            onClick={() => {
                                const ctx = getSharedAudioCtx();
                                if (ctx) ctx.resume().then(() => setAudioUnlocked(true)).catch(() => {});
                            }}
                            className="bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-black text-center py-2.5 px-4 flex items-center justify-center gap-2 shrink-0 animate-pulse print:hidden select-none cursor-pointer shadow-md"
                        >
                            <span>🔊 Fadlan guji meel kasta oo shaashada ah si aad u furto dhawaqa yeedhada (Click anywhere to enable alert sounds)</span>
                        </div>
                    )}
                    {isMinimalView && (
                        <header className="bg-surface-container border-b border-outline-variant px-3 py-2.5 sm:px-6 sm:py-4 flex justify-between items-center z-40 print:hidden shadow-sm w-full max-w-full">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                                {logoUrl && (
                                    <img src={logoUrl} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-sm shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <span className="font-bold text-xs sm:text-sm text-primary uppercase tracking-wide leading-none truncate block">{restaurantName}</span>
                                    <h2 className="text-[9px] sm:text-[10px] text-on-surface-variant font-bold leading-none mt-0.5 truncate">{getViewTitle()}</h2>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                                <button 
                                    onClick={handleLogout} 
                                    className="text-[11px] sm:text-xs font-semibold hover:bg-error/10 text-error px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-colors cursor-pointer"
                                >
                                    Log Out
                                </button>
                            </div>
                        </header>
                    )}
                    {children}
                </main>

                {/* Mobile Bottom Navigation Bar (Fixed for 1-tap switching & refresh on smartphones) */}
                {!isMinimalView && visibleNavItems.length > 0 && (
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/60 z-50 flex items-center justify-around px-2 shadow-2xl print:hidden">
                        {visibleNavItems.slice(0, 4).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
                                        isActive
                                            ? 'text-primary font-black scale-105'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    <div className={`p-1 rounded-xl ${isActive ? 'bg-primary/10 text-primary' : ''}`}>
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                                    </div>
                                    <span className="text-[10px] font-bold tracking-tight truncate max-w-[68px]">
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* 1-Tap Refresh / Sync Button for Mobile */}
                        <button
                            type="button"
                            onClick={() => {
                                toast.success('Refreshing data...', { duration: 1500, id: 'refresh-toast' });
                                window.location.reload();
                            }}
                            className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-on-surface-variant hover:text-primary transition-all cursor-pointer active:scale-90"
                            title="Refresh & Sync Data"
                        >
                            <div className="p-1 rounded-xl">
                                <RefreshCw className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] font-bold tracking-tight text-emerald-600">
                                Refresh
                            </span>
                        </button>
                    </nav>
                )}
            </div>
        </SocketContext.Provider>
    );
}
