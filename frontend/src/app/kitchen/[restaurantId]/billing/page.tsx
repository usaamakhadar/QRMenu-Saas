'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Printer, CheckCircle, CreditCard, Clock, X, AlertCircle, BellRing } from 'lucide-react';
import { useSocket } from '../layout';
import toast from 'react-hot-toast';
import ReceiptModal, { LastSaleData } from '@/components/ReceiptModal';

interface MenuItem {
    id: string;
    name: string;
    price: number;
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
    status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
    paymentStatus: 'UNPAID' | 'PAID';
    specialInstructions: string;
    totalAmount: number;
    orderItems: OrderItem[];
    createdAt: string;
}

interface GroupedSession {
    tableNumber: string;
    orders: Order[];
    totalAmount: number;
    orderIds: string[];
}

export default function BillingPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;

interface ServiceAlert {
    id: string;
    tableNumber: string;
    requestType: 'WAITER' | 'BILL';
    createdAt: string;
}

    const [orders, setOrders] = useState<Order[]>([]);
    const [serviceAlerts, setServiceAlerts] = useState<ServiceAlert[]>([]);
    const [restaurantName, setRestaurantName] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('qrmenu_name') || 'Burger House';
        }
        return 'Burger House';
    });
    const [loading, setLoading] = useState(true);
    const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
    const [printingGroup, setPrintingGroup] = useState<GroupedSession | null>(null);
    const [restaurantDetails, setRestaurantDetails] = useState<{
        address: string | null;
        phone: string | null;
        zaadNumber: string | null;
        edahabNumber: string | null;
        receiptFooter: string | null;
        taxRate: number;
        exchangeRate: number;
        logoUrl: string | null;
    } | null>(null);

    // Payment & Receipt Modal State
    const [selectedGroup, setSelectedGroup] = useState<GroupedSession | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH_USD' | 'CASH_SLSH' | 'ZAAD' | 'EDAHAB' | 'CARD' | 'PREMIER_WALLET'>('CASH_USD');
    const [isClosingSession, setIsClosingSession] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<LastSaleData | null>(null);

    const socket = useSocket();

    const fetchBillingData = () => {
        const dbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        if (!dbId) return;

        setLoading(true);
        const token = localStorage.getItem('qrmenu_token');
        
        fetch(`/api/restaurants/${dbId}/orders/history?take=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load orders');
                return res.json();
            })
            .then((data: Order[]) => {
                setOrders(data);
            })
            .catch((err) => {
                console.error('Error loading orders:', err);
                toast.error('Failed to load active orders');
            })
            .finally(() => {
                setLoading(false);
            });

        fetch(`/api/restaurants/by-id/${dbId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then((res) => res.json())
            .then((resData) => {
                if (resData.name) setRestaurantName(resData.name);
                setRestaurantDetails({
                    address: resData.address || null,
                    phone: resData.phone || null,
                    zaadNumber: resData.zaadNumber || null,
                    edahabNumber: resData.edahabNumber || null,
                    receiptFooter: resData.receiptFooter || null,
                    taxRate: resData.taxRate !== undefined && resData.taxRate !== null ? Number(resData.taxRate) : 0,
                    exchangeRate: resData.exchangeRate || 8500,
                    logoUrl: resData.logoUrl || null,
                });
            })
            .catch(() => { });
    };

    useEffect(() => {
        fetchBillingData();

        if (!socket) return;

        socket.on('newOrder', (newOrder: Order) => {
            setOrders((prev) => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
        });

        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
        });

        socket.on('orderPaymentUpdated', (updatedOrder: Order) => {
            setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
        });

        socket.off('serviceRequestAlert');
        socket.on('serviceRequestAlert', (payload: { tableNumber: string, requestType: 'WAITER' | 'BILL' }) => {
            const alertItem: ServiceAlert = {
                id: Math.random().toString(36).substring(2, 9),
                tableNumber: payload.tableNumber,
                requestType: payload.requestType,
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setServiceAlerts((prev) => [
                alertItem,
                ...prev.filter(a => !(a.tableNumber === payload.tableNumber && a.requestType === payload.requestType))
            ]);
        });

        return () => {
            socket.off('newOrder');
            socket.off('orderStatusUpdated');
            socket.off('orderPaymentUpdated');
            socket.off('serviceRequestAlert');
        };
    }, [restaurantId, socket]);

    const handleUpdatePayment = async (orderId: string, paymentStatus: 'UNPAID' | 'PAID', method: string) => {
        const token = localStorage.getItem('qrmenu_token');
        const res = await fetch(`/api/orders/${orderId}/payment`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ paymentStatus, paymentMethod: method }),
        });
        if (!res.ok) throw new Error('Failed to update payment');
        return res.json();
    };

    const handleCloseTableSession = async () => {
        if (!selectedGroup) return;
        setIsClosingSession(true);
        const actionToast = toast.loading(`Closing Session for Table #${selectedGroup.tableNumber}...`);

        try {
            // Update all orders in the session concurrently
            const results = await Promise.all(
                selectedGroup.orderIds.map(id => handleUpdatePayment(id, 'PAID', paymentMethod))
            );

            // Update local state dynamically
            const lastUpdatedOrder = results[results.length - 1];
            setOrders((prev) => 
                prev.map((o) => {
                    const match = results.find(r => r.id === o.id);
                    return match ? match : o;
                })
            );

            toast.success(`Table #${selectedGroup.tableNumber} Session Closed successfully!`, { id: actionToast });

            // Prepare receipt modal data
            const items = selectedGroup.orders.flatMap(o => o.orderItems).map(i => ({
                name: i.menuItem.name,
                qty: i.quantity,
                price: i.menuItem.price
            }));
            const subtotal = selectedGroup.totalAmount;
            const taxRate = restaurantDetails?.taxRate || 0;
            const total = subtotal * (1 + taxRate);

            // Parse sequence numbers from all orders in this session
            const seqNumbers = selectedGroup.orders
                .map(o => o.id.split('-')[0])
                .filter((v, i, self) => self.indexOf(v) === i)
                .sort((a, b) => Number(a) - Number(b));
            
            const allSeqs = seqNumbers.join(',');
            const firstOrder = selectedGroup.orders[0];
            const datePart = (firstOrder && firstOrder.id.split('-')[1]) || '';
            const hashPart = (firstOrder && firstOrder.id.split('-')[2]) || '';
            const combinedId = allSeqs && datePart ? `${allSeqs}-${datePart}-${hashPart}` : (selectedGroup.orderIds[0] || 'SALE-' + Date.now().toString().slice(-6));

            setLastSaleData({
                id: combinedId,
                date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                items,
                subtotal,
                total,
                paymentMethod: paymentMethod
            });
            setShowReceipt(true);
            setSelectedGroup(null);
        } catch (error) {
            console.error('Close session failed', error);
            toast.error('Failed to close session', { id: actionToast });
        } finally {
            setIsClosingSession(false);
        }
    };

    const triggerThermalPrint = (data: {
        tableNumber: number | string;
        date: string;
        items: { name: string; quantity: number; price: number }[];
        subtotal: number;
    }) => {
        const taxRate = restaurantDetails?.taxRate || 0;
        const tax = data.subtotal * taxRate;
        const totalAmount = data.subtotal + tax;
        const localExchangeRate = restaurantDetails?.exchangeRate || 8500;
        const footerText = restaurantDetails?.receiptFooter || 'THANK YOU FOR YOUR VISIT!';
        const rName = restaurantName || 'BURGER HOUSE';
        const address = restaurantDetails?.address || '';
        const phone = restaurantDetails?.phone || '';
        const zaad = restaurantDetails?.zaadNumber || '';
        const edahab = restaurantDetails?.edahabNumber || '';

        const receiptHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Print Receipt</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0 !important;
                }
                @media print {
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    height: auto !important;
                    min-height: 0 !important;
                    background: #ffffff !important;
                  }
                  .receipt {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                  }
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 80mm !important;
                  background: #ffffff !important;
                  font-family: 'Courier New', Courier, monospace !important;
                  color: #000000 !important;
                  font-size: 12px !important;
                  line-height: 1.25 !important;
                }
                .receipt {
                  width: 74mm;
                  padding: 2mm 2mm 0mm 2mm;
                  margin: 0 auto;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                .dashed-line {
                  border-bottom: 1px dashed #000;
                  margin: 4px 0;
                }
                .solid-line {
                  border-bottom: 2px solid #000;
                  margin: 4px 0;
                }
                .item-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                }
                .item-name {
                  width: 55%;
                  word-break: break-word;
                  text-align: left;
                }
                .item-qty {
                  width: 15%;
                  text-align: center;
                }
                .item-total {
                  width: 30%;
                  text-align: right;
                }
                .flex-between {
                  display: flex;
                  justify-content: space-between;
                  margin: 2px 0;
                }
                .italic { font-style: italic; }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="text-center bold uppercase" style="font-size: 15px;">${rName}</div>
                ${address ? `<div class="text-center" style="font-size: 10px;">${address}</div>` : ''}
                ${phone ? `<div class="text-center" style="font-size: 10px;">Tel: ${phone}</div>` : ''}
                
                <div class="dashed-line"></div>
                
                <div class="text-center bold">ORDER RECEIPT: TABLE #${data.tableNumber}</div>
                <div class="text-right" style="font-size: 10px; margin-top: 2px;">Date: ${data.date}</div>
                
                <div class="dashed-line"></div>
                
                <div class="item-row bold">
                  <span class="item-name">Item</span>
                  <span class="item-qty">Qty</span>
                  <span class="item-total">Total</span>
                </div>
                
                <div class="dashed-line"></div>
                
                ${data.items.map(item => `
                  <div class="item-row">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty">${item.quantity}</span>
                    <span class="item-total">$${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                `).join('')}
                
                <div class="dashed-line"></div>
                
                <div class="flex-between">
                  <span>Subtotal:</span>
                  <span>$${data.subtotal.toFixed(2)}</span>
                </div>
                <div class="flex-between">
                  <span>Tax (${(taxRate * 100).toFixed(0)}%):</span>
                  <span>$${tax.toFixed(2)}</span>
                </div>
                
                <div class="solid-line"></div>
                
                <div class="flex-between bold" style="font-size: 14px;">
                  <span>TOTAL DUE:</span>
                  <span>$${totalAmount.toFixed(2)}</span>
                </div>
                <div class="flex-between italic" style="font-size: 11px;">
                  <span>In Shilin:</span>
                  <span class="bold">${Math.round(totalAmount * localExchangeRate).toLocaleString()} Sl.Sh</span>
                </div>
                
                <div class="dashed-line"></div>
                
                <div class="text-center bold uppercase" style="margin-top: 8px; font-size: 11px; padding-bottom: 0;">
                  ${zaad ? `<div style="font-size: 9px; font-weight: normal;">ZAAD: *220*1* ${zaad}*Amount#</div>` : ''}
                  ${edahab ? `<div style="font-size: 9px; font-weight: normal;">EDAHAB: *101* ${edahab}*Amount#</div>` : ''}
                  <div style="margin-top: 4px;">${footerText}</div>
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                };
              </script>
            </body>
          </html>
        `;

        const printWindow = window.open('', '_blank', 'width=450,height=600');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(receiptHtml);
            printWindow.document.close();
        }
    };

    const handlePrintGroup = (group: GroupedSession) => {
        const items = group.orders.flatMap(o => o.orderItems).map(i => ({
            name: i.menuItem.name,
            qty: i.quantity,
            price: i.menuItem.price
        }));
        const subtotal = group.totalAmount;
        const taxRate = restaurantDetails?.taxRate || 0;
        const total = subtotal * (1 + taxRate);
        const dateStr = new Date(group.orders[0].createdAt).toLocaleDateString() + ' ' + new Date(group.orders[0].createdAt).toLocaleTimeString();

        // Parse sequence numbers from all orders in this session
        const seqNumbers = group.orders
            .map(o => o.id.split('-')[0])
            .filter((v, i, self) => self.indexOf(v) === i)
            .sort((a, b) => Number(a) - Number(b));
        
        const allSeqs = seqNumbers.join(',');
        const firstOrder = group.orders[0];
        const datePart = (firstOrder && firstOrder.id.split('-')[1]) || '';
        const hashPart = (firstOrder && firstOrder.id.split('-')[2]) || '';
        const combinedId = allSeqs && datePart ? `${allSeqs}-${datePart}-${hashPart}` : (group.orderIds[0] || 'SALE-' + Date.now().toString().slice(-6));

        setLastSaleData({
            id: combinedId,
            date: dateStr,
            items,
            subtotal,
            total,
            paymentMethod: 'PAID'
        });
        setShowReceipt(true);
    };

    const handlePrintOrder = (order: Order) => {
        const items = order.orderItems.map(i => ({
            name: i.menuItem.name,
            qty: i.quantity,
            price: i.menuItem.price
        }));
        const subtotal = order.totalAmount;
        const taxRate = restaurantDetails?.taxRate || 0;
        const total = subtotal * (1 + taxRate);
        const dateStr = new Date(order.createdAt).toLocaleDateString() + ' ' + new Date(order.createdAt).toLocaleTimeString();

        setLastSaleData({
            id: order.id,
            date: dateStr,
            items,
            subtotal,
            total,
            paymentMethod: 'PAID'
        });
        setShowReceipt(true);
    };

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full min-h-screen bg-background">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-container" />
            </div>
        );
    }

    const unpaidOrders = orders.filter((o) => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED');

    // Group Unpaid Orders into sessions by Table Number
    const groupedSessions = Object.values(
        unpaidOrders.reduce((acc, order) => {
            const tableNo = order.table?.tableNumber || '??';
            if (!acc[tableNo]) {
                acc[tableNo] = {
                    tableNumber: tableNo,
                    orders: [],
                    totalAmount: 0,
                    orderIds: []
                };
            }
            acc[tableNo].orders.push(order);
            acc[tableNo].totalAmount += order.totalAmount;
            acc[tableNo].orderIds.push(order.id);
            return acc;
        }, {} as Record<string, GroupedSession>)
    );

    return (
        <>
            <div className="flex-1 p-3 sm:p-6 md:p-8 pb-32 sm:pb-16 overflow-y-auto print:hidden bg-background w-full max-w-full overflow-x-hidden">
                <header className="mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-on-background flex items-center gap-2.5">
                        <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                        Cashier &amp; Billing Desk
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-snug">
                        Manage active table sessions, process payments, and print thermal receipts
                    </p>
                </header>

                <div className="space-y-6 sm:space-y-10 w-full max-w-6xl">
                    {/* ── Active Service Requests (Call Waiter & Bill Alerts) ── */}
                    {serviceAlerts.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 border-2 border-amber-500/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base sm:text-lg font-black text-on-surface flex items-center gap-2">
                                    <BellRing className="w-5 h-5 text-amber-500 animate-bounce" />
                                    <span>Active Table Calls &amp; Bill Requests</span>
                                    <span className="px-2.5 py-0.5 bg-amber-500 text-white text-xs rounded-full font-bold">
                                        {serviceAlerts.length} Active
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setServiceAlerts([])}
                                    className="text-xs font-bold text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                >
                                    Clear All Alerts
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {serviceAlerts.map((alert) => {
                                    const isWaiter = alert.requestType === 'WAITER';
                                    return (
                                        <div
                                            key={alert.id}
                                            className={`p-3.5 rounded-2xl border-2 flex items-center justify-between shadow-sm transition-all ${
                                                isWaiter ? 'bg-amber-100 border-amber-300' : 'bg-emerald-100 border-emerald-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`p-2.5 rounded-xl text-white font-black shrink-0 ${isWaiter ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                                                    {isWaiter ? '🔔' : '💳'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-base leading-tight text-zinc-900">
                                                        MIISKA #{alert.tableNumber}
                                                    </h4>
                                                    <p className="text-xs font-bold text-zinc-700 mt-0.5">
                                                        {isWaiter ? 'Shaqaale Yeedhadh (Waiter)' : 'Dalbaday Bill (Request Bill)'} • {alert.createdAt}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setServiceAlerts(prev => prev.filter(a => a.id !== alert.id))}
                                                className="ml-3 px-4 py-2 rounded-xl text-xs font-black bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-300 shadow-sm transition-colors shrink-0 cursor-pointer"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-surface-container-lowest p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-outline-variant/30 w-full max-w-full overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-outline-variant/50">
                            <h3 className="text-base sm:text-xl font-bold text-on-surface flex items-center flex-wrap gap-2">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-error animate-pulse shrink-0" />
                                Active Table Sessions
                                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-error/10 text-error text-xs sm:text-sm rounded-full font-bold">
                                    {groupedSessions.length} Table(s)
                                </span>
                            </h3>
                        </div>

                        {groupedSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-3 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/50 w-full">
                                <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                                    <CheckCircle className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
                                </div>
                                <h4 className="text-lg sm:text-xl font-bold text-on-surface mb-1 sm:mb-2">All Checked Out!</h4>
                                <p className="text-on-surface-variant max-w-xs sm:max-w-sm text-xs sm:text-sm leading-normal">
                                    There are currently no active unpaid table sessions. When customers scan QR codes and place orders, active sessions will render here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {groupedSessions.map((group) => (
                                    <div key={group.tableNumber} className="bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-outline-variant hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                                <div>
                                                    <h4 className="font-headline-md text-base sm:text-lg font-bold text-on-surface">
                                                        Table #{group.tableNumber}
                                                    </h4>
                                                    {(() => {
                                                        const tableAlerts = serviceAlerts.filter(a => a.tableNumber === group.tableNumber);
                                                        if (tableAlerts.length === 0) return null;
                                                        return (
                                                            <div className="flex flex-wrap gap-1 mt-1 mb-1">
                                                                {tableAlerts.map(a => (
                                                                    <span
                                                                        key={a.id}
                                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider animate-pulse ${
                                                                            a.requestType === 'WAITER' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                                                                        }`}
                                                                    >
                                                                        {a.requestType === 'WAITER' ? '🔔 Waiter Called' : '💳 Bill Requested'}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                    <span className="text-[11px] sm:text-xs text-on-surface-variant font-semibold mt-0.5 block">
                                                        {group.orders.length} Order(s) grouped
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {(() => {
                                                        const taxRate = restaurantDetails?.taxRate || 0;
                                                        const subtotal = group.totalAmount;
                                                        const tax = subtotal * taxRate;
                                                        const totalWithTax = subtotal + tax;
                                                        const rate = restaurantDetails?.exchangeRate || 8500;
                                                        return (
                                                            <>
                                                                <span className="text-lg sm:text-xl font-black text-primary">
                                                                    ${totalWithTax.toFixed(2)}
                                                                </span>
                                                                <span className="text-[11px] sm:text-xs font-semibold text-on-surface-variant mt-0.5">
                                                                    {Math.round(totalWithTax * rate).toLocaleString()} Sl.Sh
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Item breakdown preview */}
                                            <div className="my-3 sm:my-4 p-2.5 sm:p-3 bg-surface-container rounded-xl text-xs space-y-1.5 border border-outline-variant/30 max-h-40 overflow-y-auto">
                                                {group.orders.flatMap(o => o.orderItems).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-on-surface-variant font-medium">
                                                        <span className="truncate pr-2">{item.quantity}x {item.menuItem.name}</span>
                                                        <span className="shrink-0">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-3 sm:mt-4">
                                            <button
                                                onClick={() => handlePrintGroup(group)}
                                                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                Print
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedGroup(group);
                                                    setPaymentMethod('CASH_USD');
                                                }}
                                                className="flex-2 bg-primary-container text-on-primary py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Checkout Session
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recently Completed / Paid Orders Section */}
                    <div className="bg-surface-container-lowest p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-outline-variant/30 w-full max-w-full overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-outline-variant/50">
                            <h3 className="text-base sm:text-xl font-bold text-on-surface flex items-center flex-wrap gap-2">
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 font-bold shrink-0" />
                                Recently Paid &amp; Completed Orders
                                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-green-100 text-green-700 text-xs sm:text-sm rounded-full font-bold">
                                    {orders.filter(o => o.paymentStatus === 'PAID').length} Paid Order(s)
                                </span>
                            </h3>
                        </div>

                        {orders.filter(o => o.paymentStatus === 'PAID').length === 0 ? (
                            <div className="py-8 sm:py-12 text-center text-on-surface-variant text-xs sm:text-sm bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/50 px-3">
                                No completed paid orders found yet. When active sessions are checked out, they will list here for receipt re-printing.
                            </div>
                        ) : (
                            <>
                                {/* Mobile Cards View (sm:hidden) */}
                                <div className="block sm:hidden space-y-3">
                                    {orders.filter(o => o.paymentStatus === 'PAID').map((order) => {
                                        const taxRate = restaurantDetails?.taxRate || 0;
                                        const subtotal = order.totalAmount;
                                        const tax = subtotal * taxRate;
                                        const totalWithTax = subtotal + tax;
                                        const rate = restaurantDetails?.exchangeRate || 8500;
                                        const totalSlsh = Math.round(totalWithTax * rate);

                                        return (
                                            <div key={order.id} className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40 flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-sm text-on-surface">Table #{order.table?.tableNumber || '-'}</span>
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 font-bold text-[11px] rounded-md inline-flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> PAID
                                                    </span>
                                                </div>
                                                <div className="text-xs text-on-surface-variant">
                                                    {order.orderItems.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30 mt-1">
                                                    <div>
                                                        <span className="font-bold text-sm text-primary">${totalWithTax.toFixed(2)}</span>
                                                        <span className="text-[10px] text-on-surface-variant block">{totalSlsh.toLocaleString()} Sl.Sh</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handlePrintOrder(order)}
                                                        className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-outline-variant/40"
                                                    >
                                                        <Printer className="w-3.5 h-3.5 text-primary" />
                                                        Print Receipt
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View (hidden sm:block) */}
                                <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                                    <table className="w-full text-left border-collapse min-w-[650px]">
                                        <thead>
                                            <tr className="bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant uppercase font-bold">
                                                <th className="p-3">Date &amp; Time</th>
                                                <th className="p-3">Order ID</th>
                                                <th className="p-3">Table</th>
                                                <th className="p-3">Items Purchased</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3 text-right">Total (USD)</th>
                                                <th className="p-3 text-right">Total (SLSH)</th>
                                                <th className="p-3 text-center">Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant/30 text-sm">
                                            {orders.filter(o => o.paymentStatus === 'PAID').map((order) => {
                                                const taxRate = restaurantDetails?.taxRate || 0;
                                                const subtotal = order.totalAmount;
                                                const tax = subtotal * taxRate;
                                                const totalWithTax = subtotal + tax;
                                                const rate = restaurantDetails?.exchangeRate || 8500;
                                                const totalSlsh = Math.round(totalWithTax * rate);

                                                return (
                                                    <tr key={order.id} className="hover:bg-surface-container-low transition-colors">
                                                        <td className="p-3 text-xs text-on-surface">
                                                            {new Date(order.createdAt).toLocaleString()}
                                                        </td>
                                                        <td className="p-3 text-xs font-mono text-on-surface-variant font-bold">
                                                            #{order.id.includes('-') ? order.id.split('-').slice(0,2).join('-') : order.id.slice(0, 8).toUpperCase()}
                                                        </td>
                                                        <td className="p-3 font-bold text-on-surface">
                                                            Table #{order.table?.tableNumber || '-'}
                                                        </td>
                                                        <td className="p-3 text-xs text-on-surface-variant">
                                                            {order.orderItems.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="px-2.5 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-lg inline-flex items-center gap-1">
                                                                <CheckCircle className="w-3.5 h-3.5" /> PAID
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-primary">
                                                            ${totalWithTax.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-right font-semibold text-on-surface-variant text-xs">
                                                            {totalSlsh.toLocaleString()} Sl.Sh
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                onClick={() => handlePrintOrder(order)}
                                                                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-outline-variant/40"
                                                            >
                                                                <Printer className="w-3.5 h-3.5 text-primary" />
                                                                Print Receipt
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Method Selector Modal */}
            {selectedGroup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-[6px] z-50 flex items-center justify-center p-3.5 sm:p-6 print:hidden">
                    <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-w-sm w-full border border-surface-container-high animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
                            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Close Table #{selectedGroup.tableNumber}
                            </h3>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-full flex items-center justify-center cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-xs text-on-surface-variant mb-4">
                                Confirm the payment details and close the active session. This will register all orders in this visit as paid.
                            </p>

                            <div className="bg-surface-container p-3 rounded-xl mb-4 flex justify-between items-center text-sm font-semibold">
                                <span className="text-on-surface-variant">Total Amount Due (incl. Tax)</span>
                                {(() => {
                                    const taxRate = restaurantDetails?.taxRate || 0;
                                    const subtotal = selectedGroup.totalAmount;
                                    const tax = subtotal * taxRate;
                                    const totalWithTax = subtotal + tax;
                                    const rate = restaurantDetails?.exchangeRate || 8500;
                                    const displayTotalUSD = Number(totalWithTax.toFixed(2));
                                    return (
                                        <div className="text-right">
                                            <span className="text-primary font-bold text-lg block leading-none mb-1">${displayTotalUSD.toFixed(2)}</span>
                                            <span className="text-xs text-on-surface-variant">
                                                {Math.round(displayTotalUSD * rate).toLocaleString()} Sl.Sh
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Payment Method
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as any)}
                                className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="CASH_USD">💵 Cash USD (Dollar)</option>
                                <option value="CASH_SLSH">💵 Cash SLSH (Shilin)</option>
                                <option value="ZAAD">📱 Zaad Service</option>
                                <option value="EDAHAB">📱 eDahab Service</option>
                                <option value="PREMIER_WALLET">🏦 Premier Wallet</option>
                                <option value="CARD">💳 Credit/Debit Card</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="flex-1 bg-surface-container-high text-on-surface font-label-bold py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCloseTableSession}
                                disabled={isClosingSession}
                                className="flex-1 bg-primary-container text-on-primary font-label-bold py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs font-bold flex items-center justify-center"
                            >
                                {isClosingSession ? 'Processing...' : 'Confirm & Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Thermal Receipt Print layout */}
            {(printingOrder || printingGroup) && (
                <div id="thermal-receipt-printable" className="hidden print:block print:p-0 bg-white text-black font-mono text-[11px] w-full max-w-[72mm] leading-tight">
                    <style type="text/css" media="print">
                        {`
                          @page {
                            size: 80mm auto;
                            margin: 0 !important;
                          }
                          html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                            height: auto !important;
                            min-height: 0 !important;
                          }
                          #thermal-receipt-printable {
                            display: block !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 72mm !important;
                            padding: 2mm 3mm 0mm 3mm !important;
                            margin: 0 !important;
                          }
                        `}
                    </style>

                    {/* Restaurant Title */}
                    <div className="text-center pt-1 pb-1">
                        <h2 className="text-sm font-bold uppercase tracking-wider">{restaurantName}</h2>
                        {restaurantDetails?.address && <p className="text-[9px]">{restaurantDetails.address}</p>}
                        {restaurantDetails?.phone && <p className="text-[9px]">Tel: {restaurantDetails.phone}</p>}
                    </div>

                    {/* Dashed Line 1 */}
                    <p className="font-mono text-[10px] tracking-tighter text-center my-0.5 overflow-hidden whitespace-nowrap">--------------------------------------------------</p>

                    {/* Receipt Subtitle & Date */}
                    <div className="py-0.5">
                        <p className="font-bold text-center text-xs tracking-wide">
                            {printingGroup 
                                ? `ORDER RECEIPT: TABLE #${printingGroup.tableNumber}`
                                : `ORDER RECEIPT: TABLE #${printingOrder?.table?.tableNumber || '??'}`
                            }
                        </p>
                        <p className="text-[9px] text-right mt-0.5 font-mono">
                            Date: {new Date(printingGroup ? printingGroup.orders[0].createdAt : (printingOrder?.createdAt || '')).toLocaleString()}
                        </p>
                    </div>

                    {/* Items Table Headers */}
                    <div className="flex justify-between items-center font-bold text-xs pt-1 pb-0.5">
                        <span className="w-[54%] text-left">Item</span>
                        <span className="w-[16%] text-center shrink-0">Qty</span>
                        <span className="w-[30%] text-right shrink-0">Total</span>
                    </div>

                    {/* Dashed Line 2 */}
                    <p className="font-mono text-[10px] tracking-tighter text-center my-0.5 overflow-hidden whitespace-nowrap">--------------------------------------------------</p>

                    {/* Item List */}
                    <div className="space-y-1 py-0.5 text-xs">
                        {printingGroup 
                            ? printingGroup.orders.flatMap(o => o.orderItems).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-xs font-mono">
                                    <span className="w-[54%] text-left pr-1 leading-tight break-words font-semibold">{item.menuItem.name}</span>
                                    <span className="w-[16%] text-center shrink-0 font-bold">{item.quantity}</span>
                                    <span className="w-[30%] text-right shrink-0 font-bold">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))
                            : printingOrder?.orderItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-xs font-mono">
                                    <span className="w-[54%] text-left pr-1 leading-tight break-words font-semibold">{item.menuItem.name}</span>
                                    <span className="w-[16%] text-center shrink-0 font-bold">{item.quantity}</span>
                                    <span className="w-[30%] text-right shrink-0 font-bold">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))
                        }
                    </div>

                    {/* Dashed Line 3 */}
                    <p className="font-mono text-[10px] tracking-tighter text-center my-0.5 overflow-hidden whitespace-nowrap">--------------------------------------------------</p>

                    {/* Totals Section */}
                    {(() => {
                        const subtotal = printingGroup 
                            ? printingGroup.totalAmount 
                            : (printingOrder?.totalAmount || 0);
                        const taxRate = restaurantDetails?.taxRate || 0;
                        const tax = subtotal * taxRate;
                        const totalAmount = subtotal + tax;
                        const localExchangeRate = restaurantDetails?.exchangeRate || 8500;
                        const displayTotalUSD = Number(totalAmount.toFixed(2));
                        
                        return (
                            <div className="space-y-0.5 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax ({ (taxRate * 100).toFixed(0) }%):</span>
                                    <span>${tax.toFixed(2)}</span>
                                </div>

                                {/* Solid Thick Line Divider */}
                                <div className="border-b-2 border-black my-1"></div>

                                <div className="flex justify-between font-bold text-sm">
                                    <span>TOTAL DUE:</span>
                                    <span>${displayTotalUSD.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs italic">
                                    <span>In Shilin:</span>
                                    <span className="font-semibold">{Math.round(displayTotalUSD * localExchangeRate).toLocaleString()} Sl.Sh</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Dashed Line 4 */}
                    <p className="font-mono text-[10px] tracking-tighter text-center my-1 overflow-hidden whitespace-nowrap">--------------------------------------------------</p>

                    {/* Footer Message */}
                    <div className="text-center pt-1 pb-0">
                        {restaurantDetails?.zaadNumber && <p className="text-[9px]">ZAAD: *220*1* {restaurantDetails.zaadNumber}*Amount#</p>}
                        {restaurantDetails?.edahabNumber && <p className="text-[9px]">EDAHAB: *101* {restaurantDetails.edahabNumber}*Amount#</p>}
                        <p className="mt-2 text-xs font-bold uppercase tracking-wider pb-0 mb-0">
                            {restaurantDetails?.receiptFooter || 'THANK YOU FOR YOUR VISIT!'}
                        </p>
                    </div>
                </div>
            )}

            {/* Authentic Somaliland Thermal Receipt Modal */}
            <ReceiptModal
                showReceipt={showReceipt}
                setShowReceipt={setShowReceipt}
                lastSaleData={lastSaleData}
                storeName={restaurantName}
                userName={typeof window !== 'undefined' ? (localStorage.getItem('qrmenu_cashier_name') || 'Cashier') : 'Cashier'}
                tenantSettings={{
                    logo_url: restaurantDetails?.logoUrl,
                    receipt_header: restaurantDetails?.address ? `Address: ${restaurantDetails.address}` : null,
                    receipt_footer: JSON.stringify({
                        phone1: restaurantDetails?.phone,
                        zaad: restaurantDetails?.zaadNumber,
                        edahab: restaurantDetails?.edahabNumber
                    }),
                    exchange_rate: restaurantDetails?.exchangeRate || 8500,
                    tax_rate: restaurantDetails?.taxRate !== undefined ? restaurantDetails.taxRate : 0,
                    footer_message: restaurantDetails?.receiptFooter || 'Hubso Alaabtaada intaanad labixin'
                }}
                lang="so"
            />
        </>
    );
}
