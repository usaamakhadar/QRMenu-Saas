'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Volume2,
    VolumeX,
    Clock,
    Check,
    BellRing
} from 'lucide-react';
import { useSocket } from '../layout';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
}

interface OrderItem {
    id: string;
    quantity: number;
    menuItem: MenuItem;
}

interface Table {
    id: string;
    tableNumber: string;
}

interface Order {
    id: string;
    restaurantId: string;
    tableId: string;
    table: Table;
    status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED';
    specialInstructions: string;
    totalAmount: number;
    orderItems: OrderItem[];
    createdAt: string;
    isAddon: boolean;
}

export default function KDSPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [soundAlerts, setSoundAlerts] = useState(true);
    const [now, setNow] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);
    const [activeMobileTab, setActiveMobileTab] = useState<'PENDING' | 'IN_PROGRESS' | 'READY'>('PENDING');

    const socket = useSocket();

    const parseInstructions = (instructions: string) => {
        if (!instructions) return { customerName: '', cleanInstructions: '' };
        const match = instructions.match(/^Customer:\s*(.*?)(?:\s*\|\s*Instructions:\s*(.*))?$/i);
        if (match) {
            return {
                customerName: match[1]?.trim() || '',
                cleanInstructions: match[2]?.trim() || ''
            };
        }
        return { customerName: '', cleanInstructions: instructions };
    };

    // Time updater for tickets ("X minutes ago")
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 10000); // Update every 10 seconds
        return () => clearInterval(timer);
    }, []);

    // Play synthetic double-beep sound
    const playChime = () => {
        if (!soundAlerts) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;

            const audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }

            const playBeep = (frequency: number, startTime: number, duration: number) => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(frequency, startTime);

                gainNode.gain.setValueAtTime(0.5, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            const currentTime = audioCtx.currentTime;
            playBeep(880, currentTime, 0.15); // High A5 note
            playBeep(1109, currentTime + 0.18, 0.28); // High C#6 note
        } catch (e) {
            console.warn('Web Audio synthesis failed:', e);
        }
    };

    // Fetch initial orders
    useEffect(() => {
        const dbId = localStorage.getItem('qrmenu_restaurantId');
        const token = localStorage.getItem('qrmenu_token');
        if (!dbId) return;

        setLoading(true);
        fetch(`/api/restaurants/${dbId}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load orders');
                return res.json();
            })
            .then((data: Order[]) => {
                setOrders(data);
                setError(null);
            })
            .catch((err) => {
                console.error('Error loading orders:', err);
                setError('Failed to load orders. Please refresh.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

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
            console.error('Voice announcer error:', e);
        }
    };

    // Listen to shared Socket
    useEffect(() => {
        if (!socket) return;

        // Listen for new orders
        socket.on('newOrder', (newOrder: Order) => {
            console.log('Received new order via shared socket:', newOrder);
            setOrders((prev) => {
                if (prev.some((o) => o.id === newOrder.id)) return prev;
                return [...prev, newOrder];
            });
            playChime();

            if (soundAlerts) {
                const tableNum = newOrder.table?.tableNumber || '';
                const voiceText = tableNum ? `New order for Table ${tableNum}!` : `New order received!`;
                speakVoiceAlert(voiceText);
            }
        });

        // Listen for order status updates from other terminals/API calls
        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            console.log('Order status update received via shared socket:', updatedOrder);
            setOrders((prev) => {
                if (updatedOrder.status === 'COMPLETED') {
                    return prev.filter((o) => o.id !== updatedOrder.id);
                }

                if (!prev.some((o) => o.id === updatedOrder.id)) {
                    return [...prev, updatedOrder];
                }
                return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
            });
        });

        // Listen for cancellations
        socket.on('orderCancelled', (cancelledOrder: Order) => {
            console.log('Order cancelled via shared socket:', cancelledOrder);
            setOrders((prev) => prev.filter((o) => o.id !== cancelledOrder.id));
        });

        return () => {
            socket.off('newOrder');
            socket.off('orderStatusUpdated');
            socket.off('orderCancelled');
        };
    }, [socket, soundAlerts]);

    // Background polling backup (every 4 seconds) for real-time KDS updates without page refresh
    useEffect(() => {
        const dbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        const token = localStorage.getItem('qrmenu_token');
        if (!dbId) return;

        const interval = setInterval(() => {
            fetch(`/api/restaurants/${dbId}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then((res) => (res.ok ? res.json() : null))
                .then((data: Order[] | null) => {
                    if (!data || !Array.isArray(data)) return;
                    setOrders((prev) => {
                        const prevIds = new Set(prev.map((o) => o.id));
                        const hasNewOrder = data.some((o) => !prevIds.has(o.id) && (o.status as string) !== 'COMPLETED' && (o.status as string) !== 'CANCELLED');
                        if (hasNewOrder) {
                            playChime();
                        }
                        return data;
                    });
                })
                .catch(() => {});
        }, 4000);

        return () => clearInterval(interval);
    }, [restaurantId, soundAlerts]);

    // Update order status trigger
    const handleUpdateStatus = async (orderId: string, nextStatus: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED') => {
        try {
            const endpoint = nextStatus === 'CANCELLED'
                ? `/api/orders/${orderId}/cancel`
                : `/api/orders/${orderId}/status`;

            const token = localStorage.getItem('qrmenu_token');
            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: nextStatus !== 'CANCELLED' ? JSON.stringify({ status: nextStatus }) : undefined,
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            const updatedOrder = await response.json();
            setOrders((prev) => {
                if (nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED') {
                    return prev.filter((o) => o.id !== orderId);
                }
                return prev.map((o) => (o.id === orderId ? updatedOrder : o));
            });
        } catch (err) {
            console.error(err);
            alert('Failed to update status. Please try again.');
        }
    };

    // Helper: Get elapsed time formatted text
    const getElapsedTimeText = (createdAtStr: string) => {
        const elapsedMinutes = Math.floor(
            (now.getTime() - new Date(createdAtStr).getTime()) / 60000
        );
        if (elapsedMinutes <= 0) return 'Just now';
        if (elapsedMinutes === 1) return '1 min ago';
        return `${elapsedMinutes} mins ago`;
    };

    // Columns filter
    const pendingOrders = orders.filter((o) => o.status === 'PENDING');
    const inProgressOrders = orders.filter((o) => o.status === 'IN_PROGRESS');
    const readyOrders = orders.filter((o) => o.status === 'READY');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-background text-on-surface">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="font-body-md text-on-surface-variant">Loading Kitchen Display System...</p>
            </div>
        );
    }

    return (
        <div className="flex-grow p-4 md:p-6 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-background">
            {/* Header Controls */}
            <header className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h2 className="font-headline-xl text-headline-xl text-on-background font-bold">Kitchen Orders</h2>
                    <p className="font-body-sm text-on-surface-variant mt-0.5">
                        {pendingOrders.length + inProgressOrders.length} tickets active
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => {
                            setSoundAlerts(!soundAlerts);
                            playChime();
                        }}
                        className={`px-4 py-2 rounded-xl font-label-bold text-xs flex items-center space-x-2 transition-colors cursor-pointer ${soundAlerts
                            ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                            : 'bg-surface-container text-on-surface hover:bg-surface-container-highest'
                            }`}
                    >
                        {soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span>Alert Sounds: {soundAlerts ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </header>

            {/* Mobile Tab Selector (Visible only on smaller screens) */}
            <div className="md:hidden flex space-x-2 mb-4 bg-surface-container p-1 rounded-xl shrink-0">
                <button
                    onClick={() => setActiveMobileTab('PENDING')}
                    className={`flex-1 py-2 font-label-bold text-xs rounded-lg transition-all ${activeMobileTab === 'PENDING' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'
                        }`}
                >
                    New ({pendingOrders.length})
                </button>
                <button
                    onClick={() => setActiveMobileTab('IN_PROGRESS')}
                    className={`flex-1 py-2 font-label-bold text-xs rounded-lg transition-all ${activeMobileTab === 'IN_PROGRESS' ? 'bg-tertiary text-on-tertiary shadow-sm' : 'text-on-surface-variant'
                        }`}
                >
                    Cooking ({inProgressOrders.length})
                </button>
                <button
                    onClick={() => setActiveMobileTab('READY')}
                    className={`flex-1 py-2 font-label-bold text-xs rounded-lg transition-all ${activeMobileTab === 'READY' ? 'bg-green-600 text-white shadow-sm' : 'text-on-surface-variant'
                        }`}
                >
                    Ready ({readyOrders.length})
                </button>
            </div>

            {/* Kanban Board Area */}
            <div className="flex-1 overflow-x-auto pb-4 max-w-full">
                {/* On mobile, we only flex the active tab's column. On md+, we show all columns exactly like before without snapping. */}
                <div className="flex gap-4 md:gap-6 h-full items-stretch min-w-0 md:min-w-max pr-4 md:pr-6">

                    {/* Column: New Orders */}
                    <div className={`${activeMobileTab !== 'PENDING' ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col h-full bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-sm shrink-0 snap-center md:snap-none`}>
                        <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                            <h3 className="font-headline-md text-sm uppercase tracking-wider text-on-surface font-bold">New Orders</h3>
                            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-label-bold text-xs font-bold">
                                {pendingOrders.length}
                            </span>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-4 pr-1 no-scrollbar">
                            {pendingOrders.length > 0 ? (
                                pendingOrders.map((order) => {
                                    const { customerName, cleanInstructions } = parseInstructions(order.specialInstructions);
                                    return (
                                        <div key={order.id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm transition-transform hover:scale-[1.01]">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="font-headline-sm text-sm font-bold text-on-surface flex flex-wrap items-center gap-1.5 leading-none">
                                                        Table #{order.table?.tableNumber || '??'}
                                                        {customerName && ` (${customerName})`}
                                                    </h4>
                                                    {order.isAddon && (
                                                        <span className="bg-error text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded w-fit tracking-wide animate-pulse">
                                                            Add-On Order
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-error font-label-bold text-[10px] bg-error-container/20 px-2 py-0.5 rounded font-medium">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    <span>{getElapsedTimeText(order.createdAt)}</span>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <ul className="space-y-2 font-body-sm text-xs text-on-surface border-t border-b border-outline-variant/30 py-2.5">
                                                    {order.orderItems.map((item) => (
                                                        <li key={item.id} className="flex items-start gap-2">
                                                            <span className="font-label-bold text-primary w-5 text-right shrink-0">{item.quantity}x</span>
                                                            <div className="flex-grow text-xs font-semibold">
                                                                <span>{item.menuItem?.name || 'Menu Item'}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {cleanInstructions && (
                                                    <div className="text-on-surface-variant text-[11px] mt-2.5 border-l-2 border-primary/40 pl-2 italic">
                                                        "{cleanInstructions}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                                                    className="flex-grow border border-error/30 text-error font-bold text-xs py-2 rounded-xl hover:bg-error/10 transition-colors cursor-pointer"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'IN_PROGRESS')}
                                                    className="flex-grow bg-primary text-white font-bold text-xs py-2 rounded-xl hover:bg-primary/95 transition-all shadow-sm cursor-pointer"
                                                >
                                                    Start Cooking
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-on-surface-variant/40">
                                    <BellRing className="w-8 h-8 mb-2" />
                                    <p className="font-body-sm text-xs">No active orders</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column: Cooking */}
                    <div className={`${activeMobileTab !== 'IN_PROGRESS' ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col h-full bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-sm shrink-0 snap-center md:snap-none`}>
                        <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                            <h3 className="font-headline-md text-sm uppercase tracking-wider text-on-surface font-bold">Cooking</h3>
                            <span className="bg-tertiary/10 text-tertiary px-2.5 py-0.5 rounded-full font-label-bold text-xs font-bold">
                                {inProgressOrders.length}
                            </span>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-4 pr-1 no-scrollbar">
                            {inProgressOrders.length > 0 ? (
                                inProgressOrders.map((order) => {
                                    const { customerName, cleanInstructions } = parseInstructions(order.specialInstructions);
                                    return (
                                        <div key={order.id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm transition-transform hover:scale-[1.01]">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="font-headline-sm text-sm font-bold text-on-surface flex flex-wrap items-center gap-1.5 leading-none">
                                                        Table #{order.table?.tableNumber || '??'}
                                                        {customerName && ` (${customerName})`}
                                                    </h4>
                                                    {order.isAddon && (
                                                        <span className="bg-error text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded w-fit tracking-wide animate-pulse">
                                                            Add-On Order
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-tertiary font-label-bold text-[10px] bg-tertiary/10 px-2 py-0.5 rounded font-medium">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    <span>{getElapsedTimeText(order.createdAt)}</span>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <ul className="space-y-2 font-body-sm text-xs text-on-surface border-t border-b border-outline-variant/30 py-2.5">
                                                    {order.orderItems.map((item) => (
                                                        <li key={item.id} className="flex items-start gap-2">
                                                            <span className="font-label-bold text-primary w-5 text-right shrink-0">{item.quantity}x</span>
                                                            <div className="flex-grow text-xs font-semibold">
                                                                <span>{item.menuItem?.name || 'Menu Item'}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {cleanInstructions && (
                                                    <div className="text-on-surface-variant text-[11px] mt-2.5 border-l-2 border-tertiary/40 pl-2 italic">
                                                        "{cleanInstructions}"
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'READY')}
                                                className="w-full bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
                                            >
                                                Move to Ready
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex items-center justify-center py-20 text-on-surface-variant/40">
                                    <p className="font-body-sm text-xs">No orders in cooking</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column: Ready */}
                    <div className={`${activeMobileTab !== 'READY' ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col h-full bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-sm shrink-0 snap-center md:snap-none`}>
                        <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                            <h3 className="font-headline-md text-sm uppercase tracking-wider text-on-surface font-bold">Ready for Pickup</h3>
                            <span className="bg-green-500/10 text-green-600 px-2.5 py-0.5 rounded-full font-label-bold text-xs font-bold">
                                {readyOrders.length}
                            </span>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-4 pr-1 no-scrollbar">
                            {readyOrders.length > 0 ? (
                                readyOrders.map((order) => {
                                    const { customerName } = parseInstructions(order.specialInstructions);
                                    return (
                                        <div key={order.id} className="bg-surface-container-lowest rounded-xl p-4 border border-green-500/30 shadow-sm transition-transform hover:scale-[1.01]">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="font-headline-sm text-sm font-bold text-on-surface flex flex-wrap items-center gap-1.5 leading-none">
                                                        Table #{order.table?.tableNumber || '??'}
                                                        {customerName && ` (${customerName})`}
                                                    </h4>
                                                    {order.isAddon && (
                                                        <span className="bg-error text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded w-fit tracking-wide animate-pulse">
                                                            Add-On Order
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-green-600 font-label-bold text-[10px] bg-green-500/10 px-2 py-0.5 rounded font-medium">
                                                    <Check className="w-3 h-3 mr-1" />
                                                    <span>Ready</span>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <ul className="space-y-2 font-body-sm text-xs text-on-surface border-t border-b border-outline-variant/30 py-2.5">
                                                    {order.orderItems.map((item) => (
                                                        <li key={item.id} className="flex items-start gap-2">
                                                            <span className="font-label-bold text-primary w-5 text-right shrink-0">{item.quantity}x</span>
                                                            <div className="flex-grow text-xs font-semibold">
                                                                <span>{item.menuItem?.name || 'Menu Item'}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                                                className="w-full bg-green-600 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-green-600/95 transition-all shadow-sm cursor-pointer"
                                            >
                                                Serve & Complete
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex items-center justify-center py-20 text-on-surface-variant/40">
                                    <p className="font-body-sm text-xs">No orders waiting for pickup</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
