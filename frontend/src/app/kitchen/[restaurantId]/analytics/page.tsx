'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart2, DollarSign, ShoppingBag, TrendingUp, Calendar, Calculator } from 'lucide-react';

interface TopItem {
    name: string;
    value: number;
}

interface AnalyticsData {
    period: string;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    exchangeRate: number;
    topItems: TopItem[];
}

type PeriodType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all_time';

export default function AnalyticsPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;
    const [period, setPeriod] = useState<PeriodType>('today');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchAnalytics = (selectedPeriod: PeriodType) => {
        const dbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        const token = localStorage.getItem('qrmenu_token');
        if (!dbId || !token) {
            setLoading(false);
            setError(true);
            return;
        }

        setLoading(true);
        fetch(`/api/restaurants/${dbId}/analytics?period=${selectedPeriod}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch analytics');
                return res.json();
            })
            .then(resData => {
                setData(resData);
                setError(false);
            })
            .catch(err => {
                console.error(err);
                setError(true);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAnalytics(period);
    }, [restaurantId, period]);

    const filterOptions: { id: PeriodType; label: string; subLabel: string }[] = [
        { id: 'today', label: 'Today', subLabel: 'Maanta' },
        { id: 'yesterday', label: 'Yesterday', subLabel: 'Shalay' },
        { id: 'this_week', label: 'This Week', subLabel: 'Toddobaadkan' },
        { id: 'this_month', label: 'This Month', subLabel: 'Bishan' },
        { id: 'all_time', label: 'All Time', subLabel: 'Dhammaan' },
    ];

    return (
        <div className="p-4 md:p-8 flex flex-col h-full min-h-screen overflow-y-auto bg-surface-container-lowest">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-headline-xl text-headline-xl text-on-background font-bold flex items-center gap-3">
                        <BarChart2 className="w-8 h-8 text-primary" />
                        Analytics Dashboard
                    </h2>
                    <p className="font-body-md text-on-surface-variant mt-1">
                        Track revenue, sales volume, and top items by timeframe
                    </p>
                </div>

                {/* Period Filter Tabs */}
                <div className="flex bg-surface-container p-1.5 rounded-2xl border border-outline-variant/40 overflow-x-auto no-scrollbar">
                    {filterOptions.map((opt) => {
                        const isActive = period === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setPeriod(opt.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex flex-col items-center cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-on-primary shadow-sm scale-105'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                                }`}
                            >
                                <span>{opt.label}</span>
                                <span className={`text-[10px] opacity-75 font-semibold ${isActive ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                                    {opt.subLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {loading ? (
                <div className="p-16 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : error || !data ? (
                <div className="p-8 text-on-surface-variant flex flex-col items-center justify-center gap-2">
                    <BarChart2 className="w-10 h-10 text-on-surface-variant/40" />
                    <p>Failed to load analytics data. Please refresh.</p>
                </div>
            ) : (
                <>
                    {/* Key Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                        {/* Revenue Card */}
                        <div className="bg-primary-container/10 border border-primary-container/30 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
                                <DollarSign className="w-7 h-7" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-on-surface-variant font-label-bold uppercase tracking-wider text-xs mb-1">
                                    Total Revenue ({period.replace('_', ' ').toUpperCase()})
                                </p>
                                <h3 className="font-headline-xl text-3xl font-black text-on-surface leading-none">
                                    ${Number(data.totalRevenue ?? 0).toFixed(2)}
                                </h3>
                                <p className="text-xs font-semibold text-primary mt-1">
                                    ≈ {Math.round(Number(data.totalRevenue ?? 0) * (data.exchangeRate || 8500)).toLocaleString()} Sl.Sh
                                </p>
                            </div>
                        </div>

                        {/* Orders Card */}
                        <div className="bg-secondary-container/10 border border-secondary-container/30 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-md">
                                <ShoppingBag className="w-7 h-7" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-on-surface-variant font-label-bold uppercase tracking-wider text-xs mb-1">
                                    Total Paid Orders
                                </p>
                                <h3 className="font-headline-xl text-3xl font-black text-on-surface leading-none">
                                    {data.totalOrders ?? 0}
                                </h3>
                                <p className="text-xs font-semibold text-on-surface-variant mt-1">
                                    Completed transactions
                                </p>
                            </div>
                        </div>

                        {/* Average Order Value (AOV) Card */}
                        <div className="bg-tertiary-container/10 border border-tertiary-container/30 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 shadow-md">
                                <Calculator className="w-7 h-7" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-on-surface-variant font-label-bold uppercase tracking-wider text-xs mb-1">
                                    Avg Order Value (AOV)
                                </p>
                                <h3 className="font-headline-xl text-3xl font-black text-on-surface leading-none">
                                    ${Number(data.averageOrderValue ?? 0).toFixed(2)}
                                </h3>
                                <p className="text-xs font-semibold text-on-surface-variant mt-1">
                                    Per ticket average
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Top Selling Items Section */}
                    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/50 p-6 shadow-sm">
                        <h3 className="font-headline-md text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Top Selling Items ({period.replace('_', ' ').toUpperCase()})
                        </h3>

                        {data.topItems && data.topItems.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant uppercase font-bold">
                                            <th className="p-3.5">Rank</th>
                                            <th className="p-3.5">Item Name</th>
                                            <th className="p-3.5 text-right">Quantity Sold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/30 text-sm">
                                        {data.topItems.map((item, index) => (
                                            <tr key={index} className="hover:bg-surface-container-highest/60 transition-colors">
                                                <td className="p-3.5 font-bold text-on-surface">
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                                        index === 0 ? 'bg-amber-500 text-white' :
                                                        index === 1 ? 'bg-slate-400 text-white' :
                                                        index === 2 ? 'bg-amber-700 text-white' :
                                                        'bg-surface-container-high text-on-surface'
                                                    }`}>
                                                        #{index + 1}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 font-semibold text-on-surface">{item.name}</td>
                                                <td className="p-3.5 font-black text-primary text-right text-base">
                                                    {item.value ?? 0}x
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-on-surface-variant text-sm">
                                No sales recorded for this date range ({period.replace('_', ' ')}).
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
