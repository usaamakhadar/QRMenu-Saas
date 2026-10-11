'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Settings, Save, AlertTriangle, Plus, Trash2, TableProperties, CheckCircle, Users, ShieldCheck, UserCheck, ChefHat, CreditCard, Sliders } from 'lucide-react';

interface Table {
    id: string;
    tableNumber: string;
    qrCodeData: string;
}

interface StaffUser {
    id: string;
    name: string;
    email: string;
    role: 'OWNER' | 'KITCHEN' | 'CASHIER';
    createdAt: string;
}

export default function SettingsPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;

    // Restaurant settings state
    const [restaurantName, setRestaurantName] = useState('');
    const [restaurantUuid, setRestaurantUuid] = useState('');
    const [taxRateInput, setTaxRateInput] = useState('0');
    const [systemMode, setSystemMode] = useState<'FULL_POS' | 'QR_SERVICE_HUB'>('FULL_POS');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Staff Users state
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffEmail, setNewStaffEmail] = useState('');
    const [newStaffPassword, setNewStaffPassword] = useState('');
    const [newStaffRole, setNewStaffRole] = useState<'KITCHEN' | 'CASHIER' | 'OWNER'>('KITCHEN');
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
    const [staffMessage, setStaffMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Table management state
    const [tables, setTables] = useState<Table[]>([]);
    const [newTableNumber, setNewTableNumber] = useState('');
    const [isAddingTable, setIsAddingTable] = useState(false);
    const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
    const [tableMessage, setTableMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Receipt custom settings state
    const [cashierName, setCashierName] = useState('Cashier');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [zaadNumber, setZaadNumber] = useState('');
    const [edahabNumber, setEdahabNumber] = useState('');
    const [premierWalletNumber, setPremierWalletNumber] = useState('');
    const [description, setDescription] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [exchangeRateInput, setExchangeRateInput] = useState('8500');

    const fetchStaffUsers = (dbId: string, token: string) => {
        fetch(`/api/restaurants/${dbId}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setStaffUsers(data);
            })
            .catch(() => {});
    };

    const fetchData = () => {
        if (!restaurantId) return;
        const dbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        const token = localStorage.getItem('qrmenu_token') || '';
        setCashierName(localStorage.getItem('qrmenu_cashier_name') || 'Cashier');
        setLoading(true);

        fetchStaffUsers(dbId, token);

        fetch(`/api/restaurants/by-id/${dbId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then((res) => res.json())
            .then((data) => {
                setRestaurantName(data.name || '');
                setRestaurantUuid(data.id || '');
                setTaxRateInput(data.taxRate !== undefined && data.taxRate !== null ? (data.taxRate * 100).toString() : '0');
                setAddress(data.address || '');
                setPhone(data.phone || '');
                setZaadNumber(data.zaadNumber || '');
                setEdahabNumber(data.edahabNumber || '');
                setPremierWalletNumber(data.premierWalletNumber || '');
                setDescription(data.description || '');
                setOpeningHours(data.openingHours || '');
                setReceiptFooter(data.receiptFooter || '');
                setExchangeRateInput(data.exchangeRate !== undefined ? data.exchangeRate.toString() : '8500');
                setSystemMode(data.systemMode || 'FULL_POS');
                setTables(data.tables || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };


    useEffect(() => {
        fetchData();
    }, [restaurantId]);

    // ── Save Tax Rate ───────────────────────────────────────────
    const handleSaveSettings = async () => {
        const rate = parseFloat(taxRateInput) / 100;
        if (isNaN(rate) || rate < 0 || rate > 1) {
            setSettingsMessage({ type: 'error', text: 'Please enter a valid tax rate between 0 and 100.' });
            return;
        }
        const exRate = parseFloat(exchangeRateInput.replace(/,/g, ''));
        if (isNaN(exRate) || exRate <= 0) {
            setSettingsMessage({ type: 'error', text: 'Please enter a valid exchange rate (e.g. 8500 or 11,000.00).' });
            return;
        }
        setIsSaving(true);
        setSettingsMessage(null);
        try {
            const token = localStorage.getItem('qrmenu_token');
            const response = await fetch(`/api/restaurants/${restaurantUuid || restaurantId}/settings`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    name: restaurantName,
                    taxRate: rate.toString(),
                    exchangeRate: exRate.toString(),
                    systemMode,
                    address,
                    phone,
                    zaadNumber,
                    edahabNumber,
                    premierWalletNumber,
                    description,
                    openingHours,
                    receiptFooter
                }),
            });
            if (!response.ok) throw new Error('Failed');
            if (typeof window !== 'undefined') {
                localStorage.setItem('qrmenu_cashier_name', cashierName);
                localStorage.setItem('qrmenu_name', restaurantName);
                window.dispatchEvent(new CustomEvent('qrmenu_settings_updated', {
                    detail: { name: restaurantName, systemMode }
                }));
            }
            setSettingsMessage({ type: 'success', text: 'Settings saved successfully.' });
            setTimeout(() => setSettingsMessage(null), 3000);
        } catch (error) {
            setSettingsMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Add Table ───────────────────────────────────────────────
    const handleAddTable = async () => {
        if (!newTableNumber.trim()) return;

        const sanitized = newTableNumber.trim().replace(/^table[\s\-#]*/i, '').trim();
        if (!sanitized) {
            setTableMessage({ type: 'error', text: 'Please enter a table number or name.' });
            return;
        }

        setIsAddingTable(true);
        setTableMessage(null);
        try {
            const token = localStorage.getItem('qrmenu_token');
            const res = await fetch(`/api/restaurants/${restaurantUuid || restaurantId}/tables`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tableNumber: sanitized }),
            });
            const data = await res.json();
            if (!res.ok) {
                setTableMessage({ type: 'error', text: data.error || 'Failed to add table.' });
                return;
            }
            setTables((prev) => [...prev, data].sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
            setNewTableNumber('');
            setTableMessage({ type: 'success', text: `Table #${data.tableNumber} added successfully!` });
            setTimeout(() => setTableMessage(null), 3000);
        } catch {
            setTableMessage({ type: 'error', text: 'Failed to add table. Is the server running?' });
        } finally {
            setIsAddingTable(false);
        }
    };

    // ── Delete Table ────────────────────────────────────────────
    const handleDeleteTable = async (tableId: string, tableNumber: string) => {
        if (!confirm(`Are you sure you want to delete Table #${tableNumber}? This cannot be undone.`)) return;
        setDeletingTableId(tableId);
        try {
            const token = localStorage.getItem('qrmenu_token');
            const res = await fetch(`/api/tables/${tableId}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed');
            setTables((prev) => prev.filter((t) => t.id !== tableId));
            setTableMessage({ type: 'success', text: `Table #${tableNumber} deleted.` });
            setTimeout(() => setTableMessage(null), 3000);
        } catch {
            setTableMessage({ type: 'error', text: 'Failed to delete table.' });
        } finally {
            setDeletingTableId(null);
        }
    };

    // ── Add Staff User Account ────────────────────────────────────
    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
            setStaffMessage({ type: 'error', text: 'Please fill in all fields (name, email, password).' });
            return;
        }

        setIsAddingStaff(true);
        setStaffMessage(null);
        try {
            const token = localStorage.getItem('qrmenu_token');
            const res = await fetch(`/api/restaurants/${restaurantUuid || restaurantId}/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    name: newStaffName.trim(), 
                    email: newStaffEmail.trim().toLowerCase(), 
                    password: newStaffPassword.trim(),
                    role: newStaffRole
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setStaffMessage({ type: 'error', text: data.error || 'Failed to create staff account.' });
                return;
            }
            setStaffUsers((prev) => [...prev, data]);
            setNewStaffName('');
            setNewStaffEmail('');
            setNewStaffPassword('');
            setStaffMessage({ type: 'success', text: `Staff account (${data.email}) created successfully!` });
            setTimeout(() => setStaffMessage(null), 3000);
        } catch {
            setStaffMessage({ type: 'error', text: 'Failed to create staff account.' });
        } finally {
            setIsAddingStaff(false);
        }
    };

    // ── Delete Staff User Account ─────────────────────────────────
    const handleDeleteStaff = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to delete staff account (${email})?`)) return;
        setDeletingStaffId(userId);
        try {
            const token = localStorage.getItem('qrmenu_token');
            const res = await fetch(`/api/users/${userId}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to delete user.');
                return;
            }
            setStaffUsers((prev) => prev.filter((u) => u.id !== userId));
            setStaffMessage({ type: 'success', text: `Staff account (${email}) deleted.` });
            setTimeout(() => setStaffMessage(null), 3000);
        } catch {
            setStaffMessage({ type: 'error', text: 'Failed to delete staff account.' });
        } finally {
            setDeletingStaffId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-full min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 flex flex-col min-h-screen overflow-y-auto bg-surface-container-lowest">
            <header className="mb-8">
                <h2 className="font-headline-xl text-headline-xl text-on-background font-bold flex items-center gap-3">
                    <Settings className="w-8 h-8 text-primary" />
                    Restaurant Settings
                </h2>
                <p className="font-body-md text-on-surface-variant mt-1">Configure your restaurant's global options and manage your tables</p>
            </header>

            <div className="max-w-2xl space-y-6 pb-12">

                {/* ── System Operating Mode Selector Card ─────────────────── */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 shadow-sm">
                    <h3 className="font-bold text-on-surface text-lg mb-1 flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-primary" />
                        System Operating Mode (Habka Nidaamku u Shaqaynayo)
                    </h3>
                    <p className="text-xs text-on-surface-variant mb-4">
                        Choose whether this restaurant operates as a standalone POS or as a dedicated QR Service &amp; Order Tracking Hub for Odoo/ERP integration.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setSystemMode('QR_SERVICE_HUB')}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                systemMode === 'QR_SERVICE_HUB'
                                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                                    : 'bg-surface-container border-outline-variant hover:border-primary/50'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-sm text-on-surface">🧑‍🍳 QR Menu &amp; Order Hub</span>
                                    {systemMode === 'QR_SERVICE_HUB' && <CheckCircle className="w-4 h-4 text-primary" />}
                                </div>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Designed for restaurants using <strong>Odoo / QuickBooks</strong>! Focuses 100% on Customer QR Menu, Live Waiter Calls (🔔), Bill Alerts (💳), Order Progress Tracker, and KDS. Hides billing &amp; financial analytics.
                                </p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary mt-3 block">Odoo / ERP Friendly Mode</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSystemMode('FULL_POS')}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                systemMode === 'FULL_POS'
                                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                                    : 'bg-surface-container border-outline-variant hover:border-primary/50'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-sm text-on-surface">⚡ Full Standalone POS</span>
                                    {systemMode === 'FULL_POS' && <CheckCircle className="w-4 h-4 text-primary" />}
                                </div>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Complete end-to-end POS system. Includes Financial Analytics, Billing Desk, Receipts, Order History, Menu Management, and Staff Roles.
                                </p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary mt-3 block">All-in-One POS Mode</span>
                        </button>
                    </div>
                </div>

                {/* ── General Settings Card ─────────────────────────── */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 shadow-sm">
                    <h3 className="font-bold text-on-surface text-lg mb-5 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        General
                    </h3>

                    {settingsMessage && (
                        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-semibold ${
                            settingsMessage.type === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {settingsMessage.type === 'success'
                                ? <CheckCircle className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />}
                            {settingsMessage.text}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Restaurant / Store Name (Magaca Ganacsiga)
                            </label>
                            <input
                                type="text"
                                value={restaurantName}
                                onChange={(e) => setRestaurantName(e.target.value)}
                                className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                placeholder="e.g. Burger House"
                            />
                            <p className="text-xs text-on-surface-variant mt-1.5">
                                Name of your store displayed at the top of receipts and online menus.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Tax Rate (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={taxRateInput}
                                    onChange={(e) => setTaxRateInput(e.target.value)}
                                    className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 pr-10 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    placeholder="e.g. 10"
                                />
                                <span className="absolute right-4 top-3.5 text-on-surface-variant font-semibold text-sm">%</span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1.5">
                                Tax percentage applied to all customer orders (e.g. 10 = 10%).
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                USD to SLSH Exchange Rate (1 USD = ? SLSH)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={exchangeRateInput}
                                    onChange={(e) => setExchangeRateInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                                    className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 pr-16 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    placeholder="e.g. 8500 or 11,000.00"
                                  />
                                <span className="absolute right-4 top-3.5 text-on-surface-variant font-semibold text-sm">SLSH</span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1.5">
                                Exchange rate used to display Somaliland Shillings equivalent on receipts (e.g. 8500 or 11,000.00).
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Restaurant Description / Slogan
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                placeholder="e.g. Gourmet Burgers and Shakes"
                            />
                            <p className="text-xs text-on-surface-variant mt-1.5">
                                A brief description/slogan displayed under the name on the digital menu drawer.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Opening Hours (About Us)
                            </label>
                            <input
                                type="text"
                                value={openingHours}
                                onChange={(e) => setOpeningHours(e.target.value)}
                                className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                placeholder="e.g. 11:00 AM - 12:00 AM"
                            />
                            <p className="text-xs text-on-surface-variant mt-1.5">
                                Opening hours displayed inside the "About Us" section of the digital menu drawer.
                            </p>
                        </div>

                        <div className="border-t border-outline-variant/30 pt-4">
                            <h4 className="font-bold text-on-surface-variant text-sm mb-3">Receipt Configuration</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Cashier Name (Magaca Cashier-ka)
                                    </label>
                                    <input
                                        type="text"
                                        value={cashierName}
                                        onChange={(e) => setCashierName(e.target.value)}
                                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        placeholder="e.g. Cashier / Maxamed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Restaurant Address / Location
                                    </label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        placeholder="e.g. Calaamada, Hargeisa"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Telephone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        placeholder="e.g. 0634621940"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        ZAAD Merchant Number
                                    </label>
                                    <input
                                        type="text"
                                        value={zaadNumber}
                                        onChange={(e) => setZaadNumber(e.target.value)}
                                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        placeholder="e.g. 440000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        E-Dahab Merchant Number
                                    </label>
                                    <input
                                        type="text"
                                        value={edahabNumber}
                                        onChange={(e) => setEdahabNumber(e.target.value)}
                                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        placeholder="e.g. 711972"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Premier Wallet Merchant / Account Number
                                    </label>
                                    <input
                                        type="text"
                                        value={premierWalletNumber}
                                        onChange={(e) => setPremierWalletNumber(e.target.value)}
                                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        placeholder="e.g. 550000 / Account No"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Receipt Footer Message (Fariinta Hoose)
                                </label>
                                <textarea
                                    value={receiptFooter}
                                    onChange={(e) => setReceiptFooter(e.target.value)}
                                    rows={2}
                                    className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                                    placeholder="e.g. Hubso Alaabtaada intaanad labixin"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-outline-variant flex justify-end">
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary transition-colors disabled:opacity-50 cursor-pointer text-sm"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* ── Table Management Card ─────────────────────────── */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 shadow-sm">
                    <h3 className="font-bold text-on-surface text-lg mb-1 flex items-center gap-2">
                        <TableProperties className="w-5 h-5 text-primary" />
                        Table Management
                    </h3>
                    <p className="text-xs text-on-surface-variant mb-5">
                        Add or remove tables. Each table gets its own unique QR code automatically.
                    </p>

                    {tableMessage && (
                        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-semibold ${
                            tableMessage.type === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {tableMessage.type === 'success'
                                ? <CheckCircle className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />}
                            {tableMessage.text}
                        </div>
                    )}

                    {/* Add table input */}
                    <div className="flex gap-3 mb-5">
                        <div className="flex-1 flex items-center bg-surface-container border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <span className="px-3 py-2.5 text-sm font-bold text-on-surface-variant bg-surface-container-high border-r border-outline-variant whitespace-nowrap select-none">
                                Table #
                            </span>
                            <input
                                type="text"
                                placeholder="1, 2, VIP-1, Bar-3..."
                                value={newTableNumber}
                                onChange={(e) => setNewTableNumber(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
                                className="flex-1 bg-transparent px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none text-sm"
                            />
                        </div>
                        <button
                            onClick={handleAddTable}
                            disabled={isAddingTable || !newTableNumber.trim()}
                            className="bg-primary-container text-on-primary px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary transition-colors disabled:opacity-50 cursor-pointer text-sm whitespace-nowrap"
                        >
                            {isAddingTable ? (
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Add Table
                        </button>
                    </div>

                    {/* Tables list */}
                    {tables.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-outline-variant rounded-xl">
                            <TableProperties className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-2" />
                            <p className="text-on-surface-variant text-sm font-medium">No tables yet</p>
                            <p className="text-on-surface-variant/60 text-xs mt-0.5">Add your first table above to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {tables.map((table) => (
                                <div
                                    key={table.id}
                                    className="flex items-center justify-between bg-surface-container px-4 py-3 rounded-xl border border-outline-variant group"
                                >
                                    <div>
                                        <p className="font-bold text-on-surface text-sm">Table #{table.tableNumber}</p>
                                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5 truncate max-w-[90px]">QR Ready</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                                        disabled={deletingTableId === table.id}
                                        className="text-on-surface-variant/70 hover:text-error hover:bg-error/10 transition-all cursor-pointer p-1.5 rounded-xl shrink-0"
                                        title={`Delete Table #${table.tableNumber}`}
                                    >
                                        {deletingTableId === table.id ? (
                                            <div className="w-4 h-4 border-2 border-error/40 border-t-error rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-on-surface-variant/60 mt-4">
                        {tables.length} table{tables.length !== 1 ? 's' : ''} registered · Go to <span className="font-semibold text-primary">QR Codes</span> to download printable codes for each table.
                    </p>
                </div>

                {/* ── Staff User Accounts Management Card ─────────────────────────── */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 shadow-sm">
                    <h3 className="font-bold text-on-surface text-lg mb-1 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Staff Accounts &amp; Permissions (Maamulka Akoonada Shaqaalaha)
                    </h3>
                    <p className="text-xs text-on-surface-variant mb-5">
                        Create restricted login credentials for Kitchen Staff (KDS Only) and Cashiers. Kitchen staff will never be able to access owner settings or analytics.
                    </p>

                    {staffMessage && (
                        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-semibold ${
                            staffMessage.type === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {staffMessage.type === 'success'
                                ? <CheckCircle className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />}
                            {staffMessage.text}
                        </div>
                    )}

                    {/* Add Staff Form */}
                    <form onSubmit={handleAddStaff} className="bg-surface-container p-4 rounded-xl border border-outline-variant/60 space-y-4 mb-6">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Create New Staff Account</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="Staff Name (e.g. Kitchen Display / Chef Ahmed)"
                                value={newStaffName}
                                onChange={(e) => setNewStaffName(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                            <input
                                type="email"
                                placeholder="Email (e.g. kitchen@burgerhouse.com)"
                                value={newStaffEmail}
                                onChange={(e) => setNewStaffEmail(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                            <input
                                type="password"
                                placeholder="Password (e.g. kitchen123)"
                                value={newStaffPassword}
                                onChange={(e) => setNewStaffPassword(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                            <select
                                value={newStaffRole}
                                onChange={(e) => setNewStaffRole(e.target.value as any)}
                                className="bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                            >
                                <option value="KITCHEN">🧑‍🍳 Kitchen Staff (KDS View Only)</option>
                                <option value="CASHIER">💳 Cashier (Billing &amp; Orders Only)</option>
                                <option value="OWNER">👑 Restaurant Owner (Full Access)</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isAddingStaff || !newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()}
                            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                        >
                            {isAddingStaff ? 'Creating...' : '+ Add Staff Account'}
                        </button>
                    </form>

                    {/* Staff Accounts List */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">Active Staff Users ({staffUsers.length})</h4>
                        {staffUsers.length === 0 ? (
                            <p className="text-xs text-on-surface-variant italic">No staff users registered yet.</p>
                        ) : (
                            staffUsers.map((u) => (
                                <div key={u.id} className="flex items-center justify-between bg-surface-container px-3.5 py-2.5 rounded-xl border border-outline-variant/60">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 rounded-lg bg-surface-container-high shrink-0">
                                            {u.role === 'KITCHEN' ? <ChefHat className="w-4 h-4 text-amber-600" /> :
                                             u.role === 'CASHIER' ? <CreditCard className="w-4 h-4 text-emerald-600" /> :
                                             <ShieldCheck className="w-4 h-4 text-primary" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-xs text-on-surface truncate">{u.name}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                    u.role === 'KITCHEN' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                                    u.role === 'CASHIER' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                                    'bg-primary/10 text-primary border border-primary/20'
                                                }`}>
                                                    {u.role === 'KITCHEN' ? 'KDS Only' : u.role === 'CASHIER' ? 'Cashier' : 'Owner'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{u.email}</p>
                                        </div>
                                    </div>

                                    {u.role !== 'OWNER' && (
                                        <button
                                            onClick={() => handleDeleteStaff(u.id, u.email)}
                                            disabled={deletingStaffId === u.id}
                                            className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface-container-high cursor-pointer shrink-0"
                                            title="Delete staff account"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
