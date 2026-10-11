'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    Menu,
    Search,
    Bell,
    Hash,
    AlertTriangle,
    Plus,
    Minus,
    Utensils,
    ShoppingCart,
    X,
    CheckCircle2,
    Layers,
    CupSoda,
    Coffee,
    ArrowLeft,
    UserCircle,
    ConciergeBell,
    CreditCard,
    MessageSquare,
    Receipt
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface Table {
    id: string;
    tableNumber: string;
    qrCodeData: string;
}

interface Category {
    id: string;
    name: string;
}

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string | null;
    isAvailable: boolean;
    categoryId: string;
    restaurantId: string;
}

interface Restaurant {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
    openingHours: string | null;
    categories: Category[];
    menuItems: MenuItem[];
    tables: Table[];
    taxRate?: number;
}

interface CartItem {
    menuItem: MenuItem;
    quantity: number;
}

interface OrderItem {
    id: string;
    quantity: number;
    menuItem: MenuItem;
}

interface Order {
    id: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
    totalAmount: number;
    createdAt: string;
    orderItems: OrderItem[];
}

const translations = {
    EN: {
        noTable: "No Table Selected",
        specifyTable: "Please specify your table number to send order.",
        confirmTable: "Confirm Table",
        tableNoPlaceholder: "Table No. (e.g. 5)",
        orderingFor: "Ordering for Table",
        yourOrder: "Your Order",
        viewCart: "View Cart",
        sendingOrder: "Sending Order...",
        sendToKitchen: "Send Order to Kitchen",
        orderConfirmed: "Order Confirmed!",
        orderSuccessDesc: "Your order is sent to the kitchen. Chef has been notified and is preparing your meal.",
        close: "Close",
        new: "New",
        item: "Item",
        items: "Items",
        specialInstructions: "Special Instructions (Optional)",
        instructionsPlaceholder: "e.g. No onions, extra spicy...",
        searchPlaceholder: "Search menu items...",
        all: "All",
        food: "Food",
        drinks: "Drinks",
        coffeeTea: "Coffee & Tea",
        menuTitle: "Our Delicious Menu",
        aboutUs: "About Us",
        workingHours: "Hours: 8:00 AM - 10:00 PM",
        staffPortal: "Go to Staff Portal",
        restaurantInfo: "Digital Restaurant Menu powered by QRMenu SaaS.",
        notifWelcomeTitle: "Welcome to our Restaurant!",
        notifWelcomeDesc: "Select your table number and browse our fresh menu to order directly.",
        notifKitchenTitle: "Real-time Dispatch Active",
        notifKitchenDesc: "Our kitchen dashboard is online. Your orders will be processed instantly.",
        noItems: "No items match your search.",
        done: "Done",
        subtotal: "Subtotal",
        tax: "Tax",
        total: "Total"
    },
    SO: {
        noTable: "Miis la Dooran",
        specifyTable: "Fadlan geli lambarka miiskaaga si aad u dalbato.",
        confirmTable: "Xaqiiji Miiska",
        tableNoPlaceholder: "Lambar (tusaale: 5)",
        orderingFor: "Dalabka Miiska",
        yourOrder: "Dalabkaaga",
        viewCart: "Eeg Koorfada",
        sendingOrder: "Dalabka waa la dirayaa...",
        sendToKitchen: "U dir Dalabka Jikada",
        orderConfirmed: "Dalabka waa la Xaqiijiyey!",
        orderSuccessDesc: "Dalabkaaga waxaa loo diray jikada. Waa lagu soo adeegi doonaa dhowaan.",
        close: "Xidh",
        new: "Cusub",
        item: "Xabo",
        items: "Xabo",
        specialInstructions: "Tilmaamo Gaar ah (Optional)",
        instructionsPlaceholder: "tusaale: Basal la'aan, basbaas badan...",
        searchPlaceholder: "Raadi cunto ama cabitaan...",
        all: "Dhammaan",
        food: "Cunto",
        drinks: "Cabitaan",
        coffeeTea: "Shaah & Qaxwo",
        menuTitle: "Menu-ga Cuntooyinka & Cabitaannada",
        aboutUs: "Nagu Saabsan",
        workingHours: "Saacadaha: 8:00 Subaxnimo - 10:00 Habeenimo",
        staffPortal: "Aad Qaybta Shaqaalaha",
        restaurantInfo: "Menu-ga dhijitaalka ah oo ay awood siinayso QRMenu SaaS.",
        notifWelcomeTitle: "Ku soo dhowaw Maqaayadeena!",
        notifWelcomeDesc: "Geli lambarka miiskaaga si aad u doorato cuntooyinka iyo cabitaannada oo aad toos u dalbato.",
        notifKitchenTitle: "Jikada waa Diyaar",
        notifKitchenDesc: "Nidaamka jikada waa online. Dalabaadkaaga si toos ah ayaa loo diyaarinayaa.",
        noItems: "Ma jiraan cuntooyin u dhigma raadintaada.",
        done: "Dhammeeyay",
        subtotal: "Isu-geyn",
        tax: "Cashuur",
        total: "Wadar"
    }
};

export default function CustomerMenuPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const restaurantSlug = params?.restaurantSlug as string;
    const tableParam = searchParams.get('table');

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [tableInput, setTableInput] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'FOOD' | 'DRINKS' | 'COFFEE_TEA'>('ALL');

    // Interaction States
    const [language, setLanguage] = useState<'EN' | 'SO'>('EN');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(true);
    const [customerName, setCustomerName] = useState('');

    // Service Request State
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);

    // My Orders State
    const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
    const [myOrdersData, setMyOrdersData] = useState<Order[]>([]);

    // Addon states
    const [isAddonOrder, setIsAddonOrder] = useState(false);
    const [showActiveSessionModal, setShowActiveSessionModal] = useState(false);

    const checkActiveSession = async (tableId: string) => {
        try {
            const res = await fetch(`/api/tables/${tableId}/active-session`);
            if (res.ok) {
                const data = await res.json();
                if (data.hasActiveSession) {
                    setShowActiveSessionModal(true);
                }
            }
        } catch (e) {
            console.error('Error checking active session:', e);
        }
    };

    // Fetch active orders from local storage and/or active table session
    const fetchMyOrders = async () => {
        if (!restaurant) return;
        const storedIds: string[] = JSON.parse(localStorage.getItem(`qrmenu_orders_${restaurant.id}`) || '[]');
        const tableId = selectedTable && selectedTable.id !== 'url-table-id' && selectedTable.id !== 'manual-table-id' ? selectedTable.id : '';

        if (storedIds.length === 0 && !tableId) return;

        try {
            const queryParams = new URLSearchParams();
            if (storedIds.length > 0) queryParams.set('ids', storedIds.join(','));
            if (tableId) queryParams.set('tableId', tableId);

            const res = await fetch(`/api/orders/status?${queryParams.toString()}`);
            if (res.ok) {
                const activeOrders: Order[] = await res.json();

                // Persist fetched active order IDs into localStorage (prune COMPLETED/CANCELLED)
                if (Array.isArray(activeOrders) && activeOrders.length > 0) {
                    const activeIds = activeOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').map((o) => o.id);
                    localStorage.setItem(`qrmenu_orders_${restaurant.id}`, JSON.stringify(activeIds));
                }

                setMyOrdersData((prev) => {
                    activeOrders.forEach((newOrder) => {
                        const prevOrder = prev.find((o) => o.id === newOrder.id);
                        if (prevOrder && prevOrder.status !== 'READY' && newOrder.status === 'READY') {
                            toast.success(`🎉 Your order is READY!`, { duration: 5000, icon: '👏' });
                        }
                    });
                    return activeOrders;
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (!restaurant) return;
        fetchMyOrders();

        const pollInterval = setInterval(() => {
            fetchMyOrders();
        }, 3000);

        const handleOnline = () => {
            fetchMyOrders();
        };
        window.addEventListener('online', handleOnline);

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('online', handleOnline);
        };
    }, [restaurant, selectedTable]);

    const handleCancelOrder = async (orderId: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/cancel`, {
                method: 'PATCH',
            });
            if (res.ok) {
                toast.success('Order cancelled successfully.');
                fetchMyOrders();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to cancel order.');
            }
        } catch (e) {
            toast.error('Failed to cancel order.');
        }
    };

    // Initialize Socket with auto-reconnection & exponential backoff
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || '';
        const socketOptions = {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        };
        const newSocket = socketUrl ? io(socketUrl, socketOptions) : io(socketOptions);
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Socket listeners for real-time tracking
    useEffect(() => {
        if (!socket || !restaurant) return;

        socket.emit('joinRestaurantKitchen', restaurant.id);

        const handleStatusUpdate = (updatedOrder: Order) => {
            setMyOrdersData(prev => {
                const orderExists = prev.some(o => o.id === updatedOrder.id);
                // Also check if this device placed this order by verifying localStorage
                const storedIds = JSON.parse(localStorage.getItem(`qrmenu_orders_${restaurant.id}`) || '[]');
                if (!orderExists && !storedIds.includes(updatedOrder.id)) return prev;

                if (updatedOrder.status === 'READY') {
                    toast.success(`🎉 Your order is READY!`, { duration: 5000, icon: '👏' });
                }

                if (!orderExists) {
                    return [...prev, updatedOrder];
                }

                return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            });
        };

        socket.on('orderStatusUpdated', handleStatusUpdate);
        socket.on('orderCancelled', handleStatusUpdate);

        return () => {
            socket.off('orderStatusUpdated', handleStatusUpdate);
            socket.off('orderCancelled', handleStatusUpdate);
        };
    }, [socket, restaurant]);


    const handleServiceRequest = (type: 'WAITER' | 'BILL') => {
        if (!selectedTable || !selectedTable.tableNumber) {
            toast.error(translations[language].specifyTable);
            return;
        }
        if (restaurant) {
            if (socket) {
                socket.emit('customerServiceRequest', {
                    restaurantId: restaurant.id,
                    tableNumber: selectedTable.tableNumber,
                    requestType: type
                });
            }
            fetch(`/api/restaurants/${restaurant.id}/service-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableNumber: selectedTable.tableNumber,
                    requestType: type
                })
            }).catch(() => {});

            toast.success(type === 'WAITER' ? 'Waiter has been called.' : 'Bill requested.');
            setIsFabOpen(false);
        }
    };

    const getCategoryType = (name: string): 'FOOD' | 'DRINKS' | 'COFFEE_TEA' => {
        const lower = name.toLowerCase();
        if (lower.includes('coffee') || lower.includes('tea') || lower.includes('espresso') || lower.includes('latte')) return 'COFFEE_TEA';
        if (lower.includes('drink') || lower.includes('shake') || lower.includes('smoothie') || lower.includes('beverage') || lower.includes('juice')) return 'DRINKS';
        return 'FOOD';
    };

    // Auto-select the first category of the filtered type when tab changes
    useEffect(() => {
        if (!restaurant) return;

        const filteredCats = activeTab === 'ALL'
            ? restaurant.categories
            : restaurant.categories.filter(cat => getCategoryType(cat.name) === activeTab);

        if (filteredCats.length > 0) {
            setSelectedCategoryId(filteredCats[0].id);
        } else {
            setSelectedCategoryId(null);
        }
    }, [activeTab, restaurant]);

    // Cart & UI State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [isConfirmOrderOpen, setIsConfirmOrderOpen] = useState(false);

    // Fetch restaurant details
    useEffect(() => {
        if (!restaurantSlug) return;

        setLoading(true);
        fetch(`/api/restaurants/${restaurantSlug}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Restaurant not found');
                }
                return res.json();
            })
            .then((data: Restaurant) => {
                setRestaurant(data);
                if (data.categories && data.categories.length > 0) {
                    setSelectedCategoryId(data.categories[0].id);
                }

                // Try to match the table parameter
                if (tableParam) {
                    const matched = data.tables.find((t) => t.tableNumber === tableParam);
                    if (matched) {
                        setSelectedTable(matched);
                        checkActiveSession(matched.id);
                    } else {
                        setSelectedTable({ id: 'url-table-id', tableNumber: tableParam, qrCodeData: '' });
                    }
                    setTableInput(tableParam);
                }
                setError(null);
            })
            .catch((err) => {
                console.error(err);
                setError('Restaurant not found. Please verify the URL.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [restaurantSlug, tableParam]);

    // Handle choosing a table manually if not in URL
    const handleSelectTable = (tableNo: string) => {
        setTableInput(tableNo);
        if (!restaurant) return;
        const matched = restaurant.tables.find((t) => t.tableNumber === tableNo);
        if (matched) {
            setSelectedTable(matched);
            checkActiveSession(matched.id);
        } else {
            // If table doesn't exist, create/use mock on local state
            setSelectedTable({
                id: 'manual-table-id',
                tableNumber: tableNo,
                qrCodeData: ''
            });
        }
    };

    // Cart operations
    const addToCart = (item: MenuItem) => {
        setCart((prevCart) => {
            const existing = prevCart.find((c) => c.menuItem.id === item.id);
            if (existing) {
                return prevCart.map((c) =>
                    c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [...prevCart, { menuItem: item, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, amount: number) => {
        setCart((prevCart) => {
            return prevCart
                .map((c) => {
                    if (c.menuItem.id === itemId) {
                        const nextQuantity = c.quantity + amount;
                        return { ...c, quantity: nextQuantity };
                    }
                    return c;
                })
                .filter((c) => c.quantity > 0);
        });
    };

    // Calculations
    const taxRate = restaurant?.taxRate !== undefined && restaurant.taxRate !== null ? Number(restaurant.taxRate) : 0.0;
    const subtotal = cart.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    // Submit order to API
    const triggerPlaceOrder = () => {
        if (!selectedTable || !tableInput.trim()) {
            alert(language === 'EN' ? 'Please specify a table number to place an order.' : 'Fadlan geli lambarka miiska.');
            return;
        }
        if (!customerName.trim()) {
            alert(language === 'EN' ? 'Please enter your name.' : 'Fadlan geli magacaaga.');
            return;
        }
        if (!specialInstructions.trim()) {
            alert(language === 'EN'
                ? 'Please enter Special Instructions / Notes for your food or drinks (e.g. No sugar, extra ice, or None).'
                : 'Fadlan geli Faahfaahinta Cuntada/Cabitaanka (tusaale: Sonkor la\'aan, baraf badan, ama Waxba).');
            return;
        }
        if (cart.length === 0) return;

        setIsConfirmOrderOpen(true);
    };

    const executePlaceOrder = async () => {
        setIsConfirmOrderOpen(false);
        if (!restaurant) return;
        if (!selectedTable) return;
        if (cart.length === 0) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: restaurant.id,
                    tableId: selectedTable.id,
                    specialInstructions: `Customer: ${customerName.trim()}${specialInstructions.trim() ? ` | Instructions: ${specialInstructions.trim()}` : ''}`,
                    items: cart.map((item) => ({
                        menuItemId: item.menuItem.id,
                        quantity: item.quantity,
                    })),
                    isAddon: isAddonOrder,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit order');
            }

            setOrderSuccess(true);
            setCart([]);
            setSpecialInstructions('');
            setCustomerName('');
            setIsCartOpen(false);

            // Save order ID
            const createdOrder = await response.json();
            const storedIds = JSON.parse(localStorage.getItem(`qrmenu_orders_${restaurant.id}`) || '[]');
            storedIds.push(createdOrder.id);
            localStorage.setItem(`qrmenu_orders_${restaurant.id}`, JSON.stringify(storedIds));

            // Explicitly fetch orders to immediately show the tracker
            fetchMyOrders();

        } catch (err) {
            console.error(err);
            alert('Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-on-surface">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-container mb-4"></div>
                <p className="font-body-md">Loading dynamic menu...</p>
            </div>
        );
    }

    if (error || !restaurant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-on-surface px-6 text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                <h2 className="font-headline-lg text-headline-lg text-error mb-2">Error</h2>
                <p className="font-body-md text-on-surface-variant max-w-md">{error || 'Restaurant code could not be resolved.'}</p>
            </div>
        );
    }

    if (!selectedTable) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-on-surface px-6 text-center">
                <AlertTriangle className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
                <h2 className="font-headline-lg text-headline-lg text-primary mb-2">
                    {language === 'EN' ? 'QR Code Scan Required' : 'Skan-garee QR Code-ka'}
                </h2>
                <p className="font-body-md text-on-surface-variant max-w-md">
                    {language === 'EN'
                        ? 'Please scan the QR code on your table to access the menu.'
                        : 'Fadlan skan-garee QR code-ka miiskaaga si aad u aragto menu-ga.'}
                </p>
            </div>
        );
    }

    // Filter menu items by selected category AND search query AND availability
    const filteredMenuItems = restaurant.menuItems.filter((item) => {
        if (!item.isAvailable) return false;

        // Category filtering logic
        if (selectedCategoryId) {
            if (item.categoryId !== selectedCategoryId) return false;
        } else if (activeTab !== 'ALL') {
            // If we selected a tab (e.g. 'DRINKS') but there are no categories for it,
            // selectedCategoryId will be null. We should NOT show all items in this case.
            return false;
        }

        const matchesSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    return (
        <div className="bg-background text-on-surface antialiased min-h-screen pb-24 flex justify-center w-full">
            <div className="w-full max-w-md bg-surface-container-lowest min-h-screen relative shadow-2xl overflow-hidden flex flex-col">

                <header className="bg-surface dark:bg-surface-container-high fixed top-0 w-full max-w-md z-50 bg-surface-container-lowest border-b border-surface-container-highest flex items-center px-4 h-16 transition-all duration-200">
                    {isSearchOpen ? (
                        <div className="flex items-center w-full gap-2">
                            <button
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                }}
                                className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center cursor-pointer"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                autoFocus
                                placeholder={translations[language].searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-surface-container-low border border-surface-container-highest rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-full flex items-center justify-center cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsSideMenuOpen(true)}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center cursor-pointer"
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                                <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-container">
                                    {restaurant.name}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLanguage(language === 'EN' ? 'SO' : 'EN')}
                                    className="text-on-surface-variant hover:bg-surface-container-low px-2.5 py-1 rounded-lg flex items-center justify-center font-label-bold text-[12px] border border-surface-container-highest cursor-pointer active:scale-95 transition-all"
                                >
                                    <span className={language === 'EN' ? 'text-primary font-bold' : 'text-on-surface-variant'}>EN</span>
                                    <span className="mx-1 text-outline-variant">/</span>
                                    <span className={language === 'SO' ? 'text-primary font-bold' : 'text-on-surface-variant'}>SO</span>
                                </button>
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center cursor-pointer"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsMyOrdersOpen(true)}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center cursor-pointer relative"
                                >
                                    <Receipt className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsNotificationsOpen(!isNotificationsOpen);
                                        setUnreadNotifications(false);
                                    }}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center relative cursor-pointer"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadNotifications && (
                                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary-container rounded-full border border-surface-container-lowest animate-pulse"></span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                {isSideMenuOpen && (
                    <div className="fixed inset-0 z-50 flex justify-start">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setIsSideMenuOpen(false)}
                        ></div>
                        <div className="relative w-72 max-w-[80vw] h-full bg-surface-container-lowest shadow-2xl flex flex-col p-6 border-r border-surface-container-highest z-50 animate-in slide-in-from-left duration-250">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-headline-lg text-lg font-bold text-primary">{restaurant.name}</h2>
                                <button
                                    onClick={() => setIsSideMenuOpen(false)}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full cursor-pointer flex items-center justify-center"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="font-body-sm text-xs text-on-surface-variant mb-6 leading-relaxed">
                                {restaurant.description || `Welcome to ${restaurant.name}! Order directly from your table.`}
                            </p>
                            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                                {/* Opening Hours & Info */}
                                <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-high">
                                    <h3 className="font-label-bold text-[11px] uppercase tracking-wider mb-1 text-on-surface-variant font-bold">
                                        {translations[language].aboutUs}
                                    </h3>
                                    <p className="font-body-sm text-xs font-semibold text-on-surface">
                                        {restaurant.openingHours || 'Open Now'}
                                    </p>
                                </div>

                                {/* 3-Step Guide Card */}
                                <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-high space-y-3.5">
                                    <h3 className="font-headline-md text-xs font-bold text-primary flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
                                        <span>💡</span>
                                        <span>{language === 'EN' ? 'How to Use Our Menu' : 'Sida Loo Isticmaalo System-ka'}</span>
                                    </h3>

                                    {/* Step 1 */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-on-surface">
                                                {language === 'EN' ? 'Order & Add-on Items' : 'Dalbo Cuntada ama Kordhi'}
                                            </p>
                                            <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                                                {language === 'EN'
                                                    ? 'Select items to order. If friends join your table, add extra items to your active session anytime.'
                                                    : 'Dooroo cuntooyinka aad rabto. Hadii asxaab kula socoto ama aad cunto ku kordhinayso miiskaaga, si toos ah ayaad u kordhin kartaa.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-on-surface">
                                                {language === 'EN' ? 'Call a Waiter' : 'U Yeedh Shaqaalaha'}
                                            </p>
                                            <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                                                {language === 'EN'
                                                    ? 'Tap the floating bell icon at the bottom right to request a waiter directly to your table.'
                                                    : 'Taabo badhanka gambaleelka (Bell) ee hoose ku yaala si aad si toos ah ugu yeedho shaqaalaha miiskaaga.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-on-surface">
                                                {language === 'EN' ? 'Request Your Bill' : 'Dalbo Bill-kaaga'}
                                            </p>
                                            <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                                                {language === 'EN'
                                                    ? 'Finished eating? Tap Request Bill from the floating menu to get your receipt brought to your table.'
                                                    : 'Markaad dhameysato, badhanka bill-ka taabo si xisaabiyaha/shaqaaluhu rasiidhka miiskaaga ugu soo dhigaan.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isNotificationsOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div
                            className="absolute inset-0 bg-transparent"
                            onClick={() => setIsNotificationsOpen(false)}
                        ></div>
                        <div className="absolute top-16 right-4 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-highest p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                            <div className="flex justify-between items-center border-b border-surface-container-high pb-2">
                                <h3 className="font-label-bold text-sm font-bold text-on-surface">Notifications</h3>
                                <button
                                    onClick={() => setIsNotificationsOpen(false)}
                                    className="text-on-surface-variant hover:bg-surface-container-low p-1.5 rounded-full cursor-pointer flex items-center justify-center"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                                <div className="flex gap-2.5 p-2 rounded-xl bg-surface-container-low/50">
                                    <div className="w-2 h-2 rounded-full bg-primary-container shrink-0 mt-1.5"></div>
                                    <div className="flex flex-col">
                                        <span className="font-label-bold text-xs text-on-surface font-semibold">
                                            {translations[language].notifWelcomeTitle}
                                        </span>
                                        <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                                            {translations[language].notifWelcomeDesc}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 p-2 rounded-xl bg-surface-container-low/50">
                                    <div className="w-2 h-2 rounded-full bg-primary-container shrink-0 mt-1.5"></div>
                                    <div className="flex flex-col">
                                        <span className="font-label-bold text-xs text-on-surface font-semibold">
                                            {translations[language].notifKitchenTitle}
                                        </span>
                                        <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                                            {translations[language].notifKitchenDesc}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isMyOrdersOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[8px] z-[60] flex items-end justify-center transition-opacity duration-300 opacity-100">
                        <div className="bg-surface-container-lowest w-full max-h-[85vh] rounded-t-[24px] shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] flex flex-col pb-safe transform transition-transform duration-300 translate-y-0">
                            <div className="w-full flex justify-center pt-4 pb-2" onClick={() => setIsMyOrdersOpen(false)}>
                                <div className="w-12 h-1.5 bg-surface-variant rounded-full cursor-pointer"></div>
                            </div>
                            <div className="px-4 pb-6 pt-2 flex flex-col gap-4 overflow-y-auto">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">My Active Orders</h2>
                                    <button
                                        className="text-on-surface-variant p-2 -mr-2 cursor-pointer hover:bg-surface-container-low rounded-full flex items-center justify-center"
                                        onClick={() => setIsMyOrdersOpen(false)}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {myOrdersData.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Receipt className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
                                        <p className="text-on-surface-variant font-body-md">You have no active orders yet.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {myOrdersData.map(order => (
                                            <div key={order.id} className="border border-outline-variant rounded-xl p-4 flex flex-col gap-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-label-bold font-bold text-on-surface">Order #{order.id.includes('-') ? order.id.split('-').slice(0,2).join('-') : order.id.slice(0, 8).toUpperCase()}</span>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                            'bg-primary-container text-on-primary-container'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-on-surface-variant">
                                                    {order.orderItems.length} items • ${order.totalAmount.toFixed(2)}
                                                </div>

                                                {order.status === 'PENDING' ? (
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="mt-2 w-full bg-error-container text-error font-label-bold py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm"
                                                    >
                                                        Cancel Order
                                                    </button>
                                                ) : order.status === 'CANCELLED' ? (
                                                    <p className="text-xs text-error italic mt-2">This order was cancelled.</p>
                                                ) : order.status === 'COMPLETED' ? (
                                                    <p className="text-xs text-green-600 italic mt-2">This order is completed.</p>
                                                ) : (
                                                    <p className="text-xs text-on-surface-variant italic mt-2 text-center bg-surface-container-low p-2 rounded">
                                                        Food is being prepared. Call waiter to cancel.
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-grow pt-16 pb-20 overflow-y-auto">
                    {isAddonOrder && (
                        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-red-600 tracking-wide animate-pulse">
                            <span>📍 Adding items to active session for Table #{selectedTable.tableNumber}</span>
                        </div>
                    )}
                    {/* Table Verification Banner */}
                    <div className="px-4 pt-4">
                        <div
                            className="flex items-start gap-3 p-4 rounded-xl animate-in fade-in duration-200"
                            style={{
                                backgroundColor: '#fffbeb',
                                color: '#78350f',
                                border: '1.5px solid #f59e0b',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                        >
                            <span className="text-lg shrink-0">📍</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#b45309' }}>
                                    {language === 'EN' ? 'Verify Table' : 'Xaqiiji Miiska'}
                                </span>
                                <p className="text-xs leading-relaxed font-semibold">
                                    {language === 'EN'
                                        ? `Ordering for Table #${selectedTable.tableNumber}. Please verify your table number before ordering to avoid sending your food to the wrong table.`
                                        : `Waxaad u dalbaysaa Miiska #${selectedTable.tableNumber}. Fadlan xaqiiji lambarka miiskaaga kahor intaadan dalban si aad uga fogaato in cuntadaada loo diro miis kale.`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Real-Time Order Progress Tracker */}
                    {myOrdersData.filter(o => ['PENDING', 'IN_PROGRESS', 'READY'].includes(o.status) && (Date.now() - new Date(o.createdAt).getTime()) < 24 * 60 * 60 * 1000).length > 0 && (
                        <div className="px-4 pt-4">
                            <h3 className="font-label-bold text-sm mb-2 text-on-surface">Active Orders</h3>
                            {myOrdersData.filter(o => ['PENDING', 'IN_PROGRESS', 'READY'].includes(o.status) && (Date.now() - new Date(o.createdAt).getTime()) < 24 * 60 * 60 * 1000).map(order => (
                                <div key={order.id} className="bg-surface-container-low border border-outline-variant p-4 rounded-xl mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="font-label-bold text-sm font-bold text-on-surface">
                                            Order #{order.id.includes('-') ? order.id.split('-').slice(0,2).join('-') : order.id.slice(0, 8).toUpperCase()}
                                        </div>
                                        <div className="text-xs font-bold text-primary-container px-2 py-1 bg-primary/10 rounded">
                                            ${order.totalAmount.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="relative flex justify-between items-center">
                                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-outline-variant -translate-y-1/2 z-0"></div>
                                        <div className={`absolute top-1/2 left-4 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-out`}
                                            style={{ width: order.status === 'PENDING' ? '0%' : order.status === 'IN_PROGRESS' ? '50%' : '100%' }}></div>

                                        <div className="z-10 flex flex-col items-center gap-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${['PENDING', 'IN_PROGRESS', 'READY'].includes(order.status) ? 'bg-primary text-on-primary shadow shadow-primary/30' : 'bg-surface-container text-outline-variant'
                                                }`}>1</div>
                                            <span className="text-[10px] font-bold text-on-surface-variant">Pending</span>
                                        </div>

                                        <div className="z-10 flex flex-col items-center gap-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${['IN_PROGRESS', 'READY'].includes(order.status) ? 'bg-primary text-on-primary shadow shadow-primary/30' : 'bg-surface-container-highest text-on-surface-variant'
                                                }`}>2</div>
                                            <span className="text-[10px] font-bold text-on-surface-variant">Preparing</span>
                                        </div>

                                        <div className="z-10 flex flex-col items-center gap-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${order.status === 'READY' ? 'bg-green-500 text-white shadow shadow-green-500/40 animate-pulse' : 'bg-surface-container-highest text-on-surface-variant'
                                                }`}>3</div>
                                            <span className="text-[10px] font-bold text-on-surface-variant">Ready</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="sticky top-16 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-highest py-3 space-y-3">
                        <div className="flex px-4 gap-2">
                            {[
                                { id: 'ALL', label: translations[language].all, icon: Layers },
                                { id: 'FOOD', label: translations[language].food, icon: Utensils },
                                { id: 'DRINKS', label: translations[language].drinks, icon: CupSoda },
                                { id: 'COFFEE_TEA', label: translations[language].coffeeTea, icon: Coffee }
                            ].map((tab) => {
                                const isSelected = activeTab === tab.id;
                                const IconComponent = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95 border ${isSelected
                                            ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                                            : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-highest hover:bg-surface-container-low'
                                            }`}
                                    >
                                        <IconComponent className="w-3.5 h-3.5" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex overflow-x-auto no-scrollbar px-4 gap-3">
                            {restaurant.categories
                                .filter((category) => activeTab === 'ALL' || getCategoryType(category.name) === activeTab)
                                .map((category) => {
                                    const isActive = selectedCategoryId === category.id;
                                    return (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategoryId(category.id)}
                                            className={`whitespace-nowrap px-4 py-2 rounded-full font-label-bold text-label-bold transition-all active:scale-95 cursor-pointer ${isActive
                                                ? 'bg-primary-container text-on-primary shadow-[0_4px_6px_-2px_rgba(0,0,0,0.02)]'
                                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest'
                                                }`}
                                        >
                                            {category.name}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="px-4 py-4 flex flex-col gap-4">
                        {filteredMenuItems.length > 0 ? (
                            filteredMenuItems.map((item) => {
                                const quantityInCart = cart.find((c) => c.menuItem.id === item.id)?.quantity || 0;
                                return (
                                    <div key={item.id} onClick={() => addToCart(item)} className="bg-surface-container-lowest border border-surface-container-highest rounded-[24px] overflow-hidden flex shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
                                        <div className="flex-1 p-4 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-headline-md text-[18px] text-on-surface mb-1 leading-tight">{item.name}</h3>
                                                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-2">{item.description}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-auto">
                                                <span className="font-price-display text-[18px] text-on-surface">${item.price.toFixed(2)}</span>
                                                {quantityInCart > 0 ? (
                                                    <div className="flex items-center gap-2 bg-surface-container-high rounded-full px-2 py-1" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center active:scale-90 transition-transform"><Minus className="w-3.5 h-3.5" /></button>
                                                        <span className="font-headline-md text-sm px-1">{quantityInCart}</span>
                                                        <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ) : (
                                                    <button className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        </div>
                                        {item.imageUrl && (
                                            <div className="w-24 sm:w-28 self-stretch relative shrink-0">
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover absolute inset-0"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center font-body-sm text-on-surface-variant py-8">{translations[language].noItems}</p>
                        )}
                        <div className="h-12"></div>
                    </div>
                </main>

                {/* Service Request FAB */}
                <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
                    {isFabOpen && (
                        <div className="flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
                            <button
                                onClick={() => handleServiceRequest('WAITER')}
                                className="flex items-center gap-2 bg-surface-container-highest text-on-surface px-4 py-3 rounded-full shadow-lg font-label-bold active:scale-95 transition-all cursor-pointer"
                            >
                                <span className="text-sm">Call Waiter</span>
                                <div className="bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center">
                                    <ConciergeBell className="w-4 h-4" />
                                </div>
                            </button>
                            <button
                                onClick={() => handleServiceRequest('BILL')}
                                className="flex items-center gap-2 bg-surface-container-highest text-on-surface px-4 py-3 rounded-full shadow-lg font-label-bold active:scale-95 transition-all cursor-pointer"
                            >
                                <span className="text-sm">Request Bill</span>
                                <div className="bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsFabOpen(!isFabOpen)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer ${isFabOpen ? 'bg-surface-container-highest text-on-surface rotate-45' : 'bg-primary text-on-primary hover:bg-primary/90 hover:scale-105 active:scale-95'}`}
                    >
                        {isFabOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                    </button>
                </div>

                {cartItemCount > 0 && (
                    <div className="fixed bottom-0 left-0 w-full max-w-md bg-surface-container-lowest border-t border-surface-container-highest p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-50 rounded-t-2xl transform translate-y-0 transition-transform duration-300">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="font-body-sm text-body-sm text-on-surface-variant">{cartItemCount} {cartItemCount === 1 ? translations[language].item : translations[language].items}</span>
                                <span className="font-price-display text-price-display text-on-surface leading-none mt-1">${subtotal.toFixed(2)}</span>
                            </div>
                            <button onClick={() => setIsCartOpen(true)} className="flex-1 bg-primary-container text-on-primary font-headline-md text-[16px] py-3 px-6 rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                                <ShoppingCart className="w-5 h-5 text-white" />
                                {translations[language].viewCart}
                            </button>
                        </div>
                    </div>
                )}

                <div className={`fixed inset-0 bg-black/40 backdrop-blur-[8px] z-[60] flex items-end justify-center transition-opacity duration-300 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    {isCartOpen && (
                        <div className={`bg-surface-container-lowest w-full rounded-t-[24px] shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] flex flex-col pb-safe transform transition-transform duration-300 translate-y-0`}>
                            <div className="w-full flex justify-center pt-4 pb-2" onClick={() => setIsCartOpen(false)}>
                                <div className="w-12 h-1.5 bg-surface-variant rounded-full cursor-pointer"></div>
                            </div>
                            <div className="px-4 pb-6 pt-2 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
                                <div className="flex justify-between items-center">
                                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{translations[language].yourOrder}</h2>
                                    <button
                                        className="text-on-surface-variant p-2 -mr-2 cursor-pointer hover:bg-surface-container-low rounded-full flex items-center justify-center"
                                        onClick={() => setIsCartOpen(false)}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Order Items */}
                                <div className="flex flex-col gap-4">
                                    {cart.map((item) => (
                                        <div key={item.menuItem.id} className="flex items-start gap-4 border-b border-surface-container-high pb-4">
                                            <div className="flex-1">
                                                <h3 className="font-headline-md text-body-lg text-on-surface font-semibold">{item.menuItem.name}</h3>
                                                <div className="font-price-display text-price-display text-primary-container mt-1">
                                                    ${(item.menuItem.price * item.quantity).toFixed(2)}
                                                </div>
                                            </div>

                                            {/* Quantity Control */}
                                            <div className="flex items-center gap-3 bg-surface-container-low rounded-xl px-2 py-1">
                                                <button
                                                    onClick={() => updateQuantity(item.menuItem.id, -1)}
                                                    className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors active:scale-95"
                                                >
                                                    <Minus className="w-4 h-4 text-on-surface-variant" />
                                                </button>
                                                <span className="font-headline-md text-headline-md text-on-surface w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.menuItem.id, 1)}
                                                    className="w-8 h-8 flex items-center justify-center text-primary-container hover:bg-surface-container-high rounded-full transition-colors active:scale-95"
                                                >
                                                    <Plus className="w-4 h-4 text-primary-container" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Editable Table Number */}
                                <div className="flex flex-col gap-2 mt-2">
                                    <label className="text-label-bold text-on-surface-variant uppercase text-xs flex justify-between font-bold">
                                        <span>{language === 'EN' ? 'Table Number' : 'Lambarka Miiska'}</span>
                                        <span className="text-red-500 font-normal">{language === 'EN' ? '* Required' : '* Qasab'}</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Hash className="w-4 h-4 text-on-surface-variant/70" />
                                        </div>
                                        <input
                                            type="text"
                                            value={tableInput}
                                            onChange={(e) => !tableParam && handleSelectTable(e.target.value)}
                                            className={`w-full bg-surface-container-low border border-surface-container-high rounded-xl py-3 pl-9 pr-3 text-body-md text-on-surface focus:ring-primary focus:border-primary transition-all focus:outline-none ${tableParam ? 'opacity-70 cursor-not-allowed bg-surface-container-highest' : ''}`}
                                            placeholder={language === 'EN' ? 'e.g. 5' : 'tusaale: 5'}
                                            disabled={!!tableParam}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Customer Name */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-label-bold text-on-surface-variant uppercase text-xs flex justify-between font-bold">
                                        <span>{language === 'EN' ? 'Your Name' : 'Magacaaga'}</span>
                                        <span className="text-red-500 font-normal">{language === 'EN' ? '* Required' : '* Qasab'}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-surface-container-low border border-surface-container-high rounded-xl py-3 px-4 text-body-md text-on-surface focus:ring-primary focus:border-primary transition-all focus:outline-none"
                                        placeholder={language === 'EN' ? 'Enter your name' : 'Geli magacaaga'}
                                        required
                                    />
                                </div>

                                {/* Special Instructions */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-label-bold text-on-surface-variant uppercase text-xs flex justify-between font-bold">
                                        <span>{translations[language].specialInstructions}</span>
                                        <span className="text-red-500 font-normal">{language === 'EN' ? '* Required' : '* Qasab (Geli Faahfaahin)'}</span>
                                    </label>
                                    <textarea
                                        value={specialInstructions}
                                        onChange={(e) => setSpecialInstructions(e.target.value)}
                                        className="w-full bg-surface-container-low border border-surface-container-high rounded-xl py-3 px-4 text-body-md text-on-surface focus:ring-primary focus:border-primary transition-all focus:outline-none resize-none h-20"
                                        placeholder={language === 'EN' ? 'e.g. No sugar, extra ice, well done, or None...' : 'tusaale: Sonkor la\'aan, baraf badan, ama Waxba...'}
                                        required
                                    />
                                </div>

                                {/* Pricing Breakdown */}
                                <div className="flex flex-col gap-2 border-t border-surface-container-high pt-4">
                                    <div className="flex justify-between text-body-sm text-on-surface-variant">
                                        <span>{translations[language].subtotal}</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    {taxRate > 0 && (
                                        <div className="flex justify-between text-body-sm text-on-surface-variant">
                                            <span>{translations[language].tax} ({(taxRate * 100).toFixed(0)}%)</span>
                                            <span>${tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-body-lg text-on-surface font-bold border-t border-dashed border-surface-container-high pt-2 mt-1">
                                        <span>{translations[language].total}</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCartOpen(false)}
                                        className="flex-1 bg-surface-container-high text-on-surface font-headline-md py-3.5 rounded-xl active:scale-95 transition-all text-sm font-bold"
                                    >
                                        {translations[language].close}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={triggerPlaceOrder}
                                        className="flex-1 bg-primary-container text-on-primary font-headline-md py-3.5 rounded-xl active:scale-95 transition-all text-sm font-bold shadow-md"
                                    >
                                        {translations[language].sendToKitchen}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Order Dialogue Modal */}
                {isConfirmOrderOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-[8px] z-[70] flex items-center justify-center p-6">
                        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm w-full border border-surface-container-high animate-in fade-in zoom-in-95 duration-200">
                            <ShoppingCart className="w-12 h-12 text-primary-container mb-4" />
                            <h2 className="font-headline-lg text-[20px] font-bold text-on-surface mb-2">Confirm Your Order</h2>
                            <p className="font-body-sm text-on-surface-variant mb-6 text-sm">
                                You are about to place an order for Table #{selectedTable?.tableNumber}. Please check your order details.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setIsConfirmOrderOpen(false)}
                                    className="flex-1 bg-surface-container-high text-on-surface font-label-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executePlaceOrder}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-primary-container text-on-primary font-label-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-bold shadow-sm flex items-center justify-center"
                                >
                                    {isSubmitting ? translations[language].sendingOrder : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Success Modal overlay */}
                {orderSuccess && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-[8px] z-50 flex items-center justify-center p-6">
                        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm w-full border border-surface-container-high animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">{translations[language].orderConfirmed}</h2>
                            <p className="font-body-md text-on-surface-variant mb-6">
                                {translations[language].orderSuccessDesc}
                            </p>
                            <button
                                onClick={() => setOrderSuccess(false)}
                                className="w-full bg-primary-container text-on-primary font-headline-md text-body-lg py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold"
                            >
                                {translations[language].done}
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Session Dialog Modal */}
                {showActiveSessionModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-[8px] z-[80] flex items-center justify-center p-6">
                        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm w-full border border-surface-container-high animate-in fade-in zoom-in-95 duration-200">
                            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />
                            <h2 className="font-headline-lg text-[20px] font-bold text-on-surface mb-2">Active Session Found</h2>
                            <p className="font-body-sm text-on-surface-variant mb-6 text-sm leading-relaxed">
                                You already have an active order for this table. Do you want to continue adding items to this session, or start a new separate session?
                            </p>
                            <div className="flex flex-col gap-2.5 w-full">
                                <button
                                    onClick={() => {
                                        setIsAddonOrder(true);
                                        setShowActiveSessionModal(false);
                                        toast.success("Order set as Add-on to existing session.");
                                    }}
                                    className="w-full bg-primary-container text-on-primary font-label-bold py-3.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-bold shadow-md"
                                >
                                    Continue Ordering (Add-on Order)
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAddonOrder(false);
                                        setShowActiveSessionModal(false);
                                    }}
                                    className="w-full bg-surface-container-high text-on-surface font-label-bold py-3.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-medium"
                                >
                                    Start New Session
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
