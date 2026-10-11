'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Receipt, Clock, CheckCircle, XCircle, Download, Printer, CheckCircle2, DollarSign } from 'lucide-react';
import { useSocket } from '../layout';
import toast from 'react-hot-toast';
import ReceiptModal, { LastSaleData } from '@/components/ReceiptModal';

interface OrderItem {
    id: string;
    quantity: number;
    menuItem: { name: string; price: number };
}

interface Order {
    id: string;
    status: string;
    paymentStatus: 'UNPAID' | 'PAID';
    totalAmount: number;
    createdAt: string;
    specialInstructions?: string;
    table?: { tableNumber: string };
    orderItems: OrderItem[];
}

export default function OrdersHistoryPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurantName, setRestaurantName] = useState('Restaurant');
    const [tenantSettings, setTenantSettings] = useState<any>(null);

    // Receipt Modal State
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<LastSaleData | null>(null);

    const socket = useSocket();

    const fetchOrdersAndSettings = () => {
        const dbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        const token = localStorage.getItem('qrmenu_token');
        if (!dbId) return;

        setRestaurantName(localStorage.getItem('qrmenu_name') || 'Restaurant');

        // Fetch Tenant Settings
        fetch(`/api/restaurants/by-id/${dbId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setTenantSettings({
                        logo_url: data.logoUrl || null,
                        receipt_header: data.description || null,
                        receipt_footer: data.receiptFooter || null,
                        exchange_rate: data.exchangeRate || 8500,
                        tax_rate: data.taxRate || 0,
                    });
                }
            })
            .catch(() => {});

        // Fetch Orders History
        fetch(`/api/restaurants/${dbId}/orders/history?take=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch order history');
                return res.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    setOrders(data);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchOrdersAndSettings();
    }, [restaurantId]);

    useEffect(() => {
        if (!socket) return;

        socket.on('newOrder', (newOrder: Order) => {
            setOrders((prev) => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
        });

        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
        });

        return () => {
            socket.off('newOrder');
            socket.off('orderStatusUpdated');
        };
    }, [socket]);

    // Background polling backup (every 5 seconds)
    useEffect(() => {
        const dbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        const token = localStorage.getItem('qrmenu_token');
        if (!dbId) return;

        const interval = setInterval(() => {
            fetch(`/api/restaurants/${dbId}/orders/history?take=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then((res) => (res.ok ? res.json() : null))
                .then((data: Order[] | null) => {
                    if (Array.isArray(data)) {
                        setOrders(data);
                    }
                })
                .catch(() => {});
        }, 5000);

        return () => clearInterval(interval);
    }, [restaurantId]);

    const handlePrintReceipt = (order: Order) => {
        const items = order.orderItems.map(i => ({
            name: i.menuItem?.name || 'Item',
            qty: i.quantity,
            price: i.menuItem?.price || 0
        }));

        const saleData: LastSaleData = {
            id: order.id,
            date: new Date(order.createdAt).toLocaleString(),
            items,
            subtotal: order.totalAmount,
            total: order.totalAmount,
            paymentMethod: order.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID'
        };

        setLastSaleData(saleData);
        setShowReceipt(true);
    };

    const handleMarkPaid = async (orderId: string) => {
        const token = localStorage.getItem('qrmenu_token');
        const toastId = toast.loading('Marking order as paid...');
        try {
            const res = await fetch(`/api/orders/${orderId}/payment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CASH' })
            });

            if (!res.ok) throw new Error('Failed to update payment status');

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: 'PAID' } : o));
            toast.success('Order marked as PAID!', { id: toastId });
        } catch (error) {
            toast.error('Failed to update payment status', { id: toastId });
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'READY': return <Clock className="w-4 h-4 text-blue-500" />;
            case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    const handleExportExcel = () => {
        if (orders.length === 0) {
            toast.error('No orders available to export.');
            return;
        }

        const headers = ['Order ID', 'Date & Time', 'Table Number', 'Items', 'Status', 'Payment Status', 'Total Amount ($)'];
        const csvRows = [headers.join(',')];

        orders.forEach((order) => {
            const formattedDate = new Date(order.createdAt).toLocaleString();
            const tableNum = order.table?.tableNumber ? `Table #${order.table.tableNumber}` : 'N/A';
            const itemsSummary = order.orderItems
                ? order.orderItems.map(i => `${i.quantity}x ${i.menuItem?.name || 'Item'}`).join(' + ')
                : '';
            const row = [
                `"${order.id}"`,
                `"${formattedDate}"`,
                `"${tableNum}"`,
                `"${itemsSummary.replace(/"/g, '""')}"`,
                `"${order.status}"`,
                `"${order.paymentStatus || 'UNPAID'}"`,
                `"${order.totalAmount.toFixed(2)}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Order_History_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-8 flex flex-col h-full min-h-screen overflow-y-auto bg-surface-container-lowest pb-24">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-headline-xl text-headline-xl text-on-background font-bold flex items-center gap-3">
                        <Receipt className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        Order History &amp; Receipts
                    </h2>
                    <p className="font-body-md text-on-surface-variant mt-1 text-xs sm:text-sm">Review orders, print thermal receipts, and manage cashier billing</p>
                </div>

                <button
                    onClick={handleExportExcel}
                    disabled={orders.length === 0}
                    className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center"
                >
                    <Download className="w-4 h-4" />
                    <span>Export to Excel (CSV)</span>
                </button>
            </header>

            {/* Loading Indicator */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                </div>
            )}

            {!loading && orders.length === 0 && (
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-8 text-center text-on-surface-variant">
                    <p className="font-bold text-base">No orders found.</p>
                    <p className="text-xs mt-1">Customer orders will appear here automatically in real time.</p>
                </div>
            )}

            {/* ── MOBILE RESPONSIVE CARDS (Visible on Mobile / Below MD) ── */}
            <div className="block md:hidden space-y-4">
                {orders.map((order) => (
                    <div key={order.id} className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 shadow-sm space-y-3">
                        {/* Header: Table & Order ID */}
                        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2.5">
                            <div>
                                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-black">
                                    Table #{order.table?.tableNumber || '-'}
                                </span>
                                <p className="font-mono text-xs font-bold text-on-surface mt-1">
                                    {order.id.includes('-') ? `#${order.id.split('-').slice(0, 2).join('-')}` : order.id.slice(0, 10).toUpperCase()}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-primary block">
                                    ${order.totalAmount.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-on-surface-variant block">
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1 py-1">
                            {order.orderItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs font-medium text-on-surface">
                                    <span>{item.quantity}x {item.menuItem?.name || 'Item'}</span>
                                    <span className="font-bold text-on-surface-variant">${((item.menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 bg-surface-container py-1 px-2.5 rounded-lg">
                                {getStatusIcon(order.status)}
                                <span className="font-label-bold text-xs">{order.status}</span>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                order.paymentStatus === 'PAID' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}>
                                {order.paymentStatus === 'PAID' ? '✓ PAID' : '💳 UNPAID'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t border-outline-variant/40">
                            <button
                                onClick={() => handlePrintReceipt(order)}
                                className="flex-1 bg-surface-container text-on-surface hover:bg-surface-container-highest py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-outline-variant/60 cursor-pointer transition-colors shadow-sm"
                            >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Print Receipt</span>
                            </button>

                            {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
                                <button
                                    onClick={() => handleMarkPaid(order.id)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark Paid</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── DESKTOP TABLE VIEW (Visible on Desktop / MD and larger) ── */}
            <div className="hidden md:block bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                            <tr className="bg-surface-container border-b border-outline-variant">
                                <th className="p-4 font-label-bold text-on-surface-variant">Date &amp; Time</th>
                                <th className="p-4 font-label-bold text-on-surface-variant">Order ID</th>
                                <th className="p-4 font-label-bold text-on-surface-variant">Table</th>
                                <th className="p-4 font-label-bold text-on-surface-variant">Items</th>
                                <th className="p-4 font-label-bold text-on-surface-variant">Order Status</th>
                                <th className="p-4 font-label-bold text-on-surface-variant">Payment</th>
                                <th className="p-4 font-label-bold text-on-surface-variant text-right">Total</th>
                                <th className="p-4 font-label-bold text-on-surface-variant text-center">Receipt &amp; Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 && orders.map((order: any) => (
                                <tr key={order.id} className={`border-b border-outline-variant/50 transition-colors ${order.status === 'CANCELLED' ? 'bg-red-500/5 opacity-70' : 'hover:bg-surface-container-highest'}`}>
                                    <td className="p-4 font-body-sm text-on-surface">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-body-sm text-on-surface font-mono font-bold">
                                        {order.id.includes('-') ? `#${order.id.split('-').slice(0,2).join('-')}` : order.id.slice(0, 8).toUpperCase()}
                                    </td>
                                    <td className="p-4 font-label-bold text-on-surface">
                                        Table #{order.table?.tableNumber || '-'}
                                    </td>
                                    <td className="p-4 font-body-sm text-on-surface max-w-xs truncate" title={order.orderItems.map((i: any) => `${i.quantity}x ${i.menuItem?.name || 'Item'}`).join(', ')}>
                                        {order.orderItems.map((i: any) => `${i.quantity}x ${i.menuItem?.name || 'Item'}`).join(', ')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 bg-surface-container py-1 px-2.5 rounded-lg w-fit">
                                            {getStatusIcon(order.status)}
                                            <span className="font-label-bold text-xs">{order.status}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                            order.paymentStatus === 'PAID' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                        }`}>
                                            {order.paymentStatus === 'PAID' ? '✓ PAID' : '💳 UNPAID'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-headline-sm text-primary text-right font-bold">
                                        ${order.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handlePrintReceipt(order)}
                                                className="bg-surface-container text-on-surface hover:bg-surface-container-highest px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 border border-outline-variant/60 cursor-pointer transition-colors shadow-sm"
                                                title="Print Thermal Receipt / Save PDF"
                                            >
                                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Print</span>
                                            </button>

                                            {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
                                                <button
                                                    onClick={() => handleMarkPaid(order.id)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                                    title="Mark Order as Paid"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Pay</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Thermal Receipt & PDF Export Modal */}
            <ReceiptModal
                showReceipt={showReceipt}
                setShowReceipt={setShowReceipt}
                lastSaleData={lastSaleData}
                storeName={restaurantName}
                userName="Cashier"
                tenantSettings={tenantSettings}
                lang="so"
            />
        </div>
    );
}
