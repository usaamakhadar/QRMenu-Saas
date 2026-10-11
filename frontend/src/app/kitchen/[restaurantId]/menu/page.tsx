'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { UtensilsCrossed, Plus, Edit2, Trash2, X, Upload, ImageIcon, FileText, Sparkles, Check, Loader2, AlertCircle, FolderPlus } from 'lucide-react';

interface Category {
    id: string;
    name: string;
}

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    imageUrl?: string;
    isAvailable: boolean;
}

interface ParsedPdfItem {
    name: string;
    description: string;
    price: number | string;
    imageUrl?: string;
}

interface ParsedPdfCategory {
    name: string;
    items: ParsedPdfItem[];
}

export default function MenuManagementPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbId, setDbId] = useState('');

    // Modal states
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    
    // PDF Modal states
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
    const [pastedMenuText, setPastedMenuText] = useState('');
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [parseError, setParseError] = useState('');
    const [parsedCategories, setParsedCategories] = useState<ParsedPdfCategory[]>([]);
    const [pdfStep, setPdfStep] = useState<'upload' | 'preview'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [categoryName, setCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

    const [itemName, setItemName] = useState('');
    const [itemDesc, setItemDesc] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemCategory, setItemCategory] = useState('');
    const [itemImageUrl, setItemImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleParsePdf = async () => {
        if (importTab === 'upload' && !pdfFile) return;
        if (importTab === 'paste' && !pastedMenuText.trim()) return;

        setIsParsingPdf(true);
        setParseError('');
        try {
            const token = localStorage.getItem('qrmenu_token');
            let res: Response;

            if (importTab === 'paste') {
                res = await fetch('/api/menu/parse-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ rawText: pastedMenuText })
                });
            } else {
                const formData = new FormData();
                formData.append('pdf', pdfFile!);
                res = await fetch('/api/menu/upload-pdf', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });
            }

            const contentType = res.headers.get('content-type');
            let data: any;

            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                if (res.status === 413 || text.includes('413') || text.includes('Payload Too Large')) {
                    throw new Error(`File size is too large. Please compress your PDF or choose a file under 4.5MB.`);
                }
                throw new Error(`Server returned status ${res.status}. Please check your PDF or paste menu text directly.`);
            }

            if (!res.ok) throw new Error(data.error || 'Failed to parse menu');

            if (!data.categories || data.categories.length === 0) {
                throw new Error('No items or categories could be automatically detected. Please verify your menu text contains dish names and prices.');
            }

            setParsedCategories(data.categories);
            setPdfStep('preview');
        } catch (err: any) {
            setParseError(err.message || 'Error processing menu');
        } finally {
            setIsParsingPdf(false);
        }
    };

    const handleSaveParsedMenu = async () => {
        if (!dbId || parsedCategories.length === 0) return;
        setIsImporting(true);
        try {
            const token = localStorage.getItem('qrmenu_token');
            const res = await fetch('/api/menu/import-bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    restaurantId: dbId,
                    categories: parsedCategories
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to import menu items');

            setIsPdfModalOpen(false);
            setPdfFile(null);
            setParsedCategories([]);
            setPdfStep('upload');
            fetchData();
            alert(`Successfully imported ${data.importedItemsCount} menu items across ${data.importedCategoriesCount} categories!`);
        } catch (err: any) {
            alert(err.message || 'Import failed. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    const updateParsedItem = (catIdx: number, itemIdx: number, field: keyof ParsedPdfItem, val: any) => {
        setParsedCategories(prev => {
            const next = [...prev];
            next[catIdx] = {
                ...next[catIdx],
                items: next[catIdx].items.map((it, idx) => idx === itemIdx ? { ...it, [field]: val } : it)
            };
            return next;
        });
    };

    const deleteParsedItem = (catIdx: number, itemIdx: number) => {
        setParsedCategories(prev => {
            const next = [...prev];
            const updatedItems = next[catIdx].items.filter((_, idx) => idx !== itemIdx);
            if (updatedItems.length === 0) {
                return next.filter((_, cIdx) => cIdx !== catIdx);
            }
            next[catIdx] = { ...next[catIdx], items: updatedItems };
            return next;
        });
    };

    const deleteParsedCategory = (catIdx: number) => {
        setParsedCategories(prev => prev.filter((_, idx) => idx !== catIdx));
    };

    const addParsedItem = (catIdx: number) => {
        setParsedCategories(prev => {
            const next = [...prev];
            next[catIdx] = {
                ...next[catIdx],
                items: [...next[catIdx].items, { name: 'New Dish', description: '', price: 5.00 }]
            };
            return next;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setItemImageUrl(data.url);
        } catch (err) {
            alert('Image upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            // reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const fetchData = () => {
        if (!restaurantId) return;
        const storedDbId = localStorage.getItem('qrmenu_restaurantId') || restaurantId;
        const token = localStorage.getItem('qrmenu_token');
        setLoading(true);
        fetch(`/api/restaurants/by-id/${storedDbId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setDbId(data.id);
                setCategories(data.categories || []);
                setMenuItems(data.menuItems || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };


    useEffect(() => {
        fetchData();
    }, [restaurantId]);

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) return;
        try {
            const method = editingCategoryId ? 'PUT' : 'POST';
            const url = editingCategoryId 
                ? `/api/categories/${editingCategoryId}` 
                : `/api/categories`;
            
            const token = localStorage.getItem('qrmenu_token');
            await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: categoryName, restaurantId: dbId })
            });
            setIsCategoryModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            const token = localStorage.getItem('qrmenu_token');
            await fetch(`/api/categories/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveItem = async () => {
        if (!itemName.trim() || !itemPrice || !itemCategory) return;
        try {
            const method = editingItemId ? 'PUT' : 'POST';
            const url = editingItemId 
                ? `/api/menu-items/${editingItemId}` 
                : `/api/menu-items`;
            
            const token = localStorage.getItem('qrmenu_token');
            await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    name: itemName, 
                    description: itemDesc, 
                    price: itemPrice, 
                    categoryId: itemCategory,
                    imageUrl: itemImageUrl || null,
                    restaurantId: dbId 
                })
            });
            setIsItemModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this menu item?')) return;
        try {
            const token = localStorage.getItem('qrmenu_token');
            await fetch(`/api/menu-items/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const toggleItemAvailability = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update for UI feel
            setMenuItems(prev => prev.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item));
            
            const token = localStorage.getItem('qrmenu_token');
            await fetch(`/api/menu-items/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isAvailable: !currentStatus })
            });
            // We don't strictly need to fetchData again since we optimistically updated, 
            // but we can to ensure consistency.
        } catch (error) {
            console.error(error);
            fetchData(); // revert on error
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-full min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 flex flex-col h-full min-h-screen overflow-y-auto bg-surface-container-lowest">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-headline-xl text-headline-xl text-on-background font-bold flex items-center gap-3">
                        <UtensilsCrossed className="w-8 h-8 text-primary" />
                        Menu Management
                    </h2>
                    <p className="font-body-md text-on-surface-variant mt-1">Manage your restaurant's menu sections, dishes, and beverages.</p>
                </div>
                <div className="flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
                    <button
                        onClick={() => {
                            setPdfFile(null);
                            setParsedCategories([]);
                            setParseError('');
                            setPdfStep('upload');
                            setIsPdfModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2.5 rounded-xl font-label-bold flex items-center justify-center gap-2 cursor-pointer transition-all text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Import PDF Menu</span>
                        <span className="bg-emerald-500/40 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase">AI</span>
                    </button>
                    <button 
                        onClick={() => {
                            setCategoryName('');
                            setEditingCategoryId(null);
                            setIsCategoryModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none bg-surface-container text-on-surface hover:bg-surface-container-highest px-3.5 py-2.5 rounded-xl font-label-bold flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs sm:text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Menu Section
                    </button>
                    <button 
                        onClick={() => {
                            setItemName('');
                            setItemDesc('');
                            setItemPrice('');
                            setItemImageUrl('');
                            if (categories.length > 0) setItemCategory(categories[0].id);
                            setEditingItemId(null);
                            setIsItemModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none bg-primary text-on-primary hover:bg-primary/90 px-3.5 py-2.5 rounded-xl font-label-bold flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs sm:text-sm shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Menu Item
                    </button>
                </div>
            </header>

            <div className="space-y-8 pb-12">
                {categories.length === 0 && (
                    <div className="text-center p-12 border-2 border-dashed border-outline-variant rounded-2xl">
                        <p className="text-on-surface-variant">No categories found. Add a category first.</p>
                    </div>
                )}
                
                {categories.map(category => (
                    <div key={category.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm">
                        <div className="bg-surface-container px-4 sm:px-6 py-3.5 flex justify-between items-center border-b border-outline-variant/60">
                            <h3 className="font-headline-md font-bold text-on-surface text-base sm:text-lg">{category.name}</h3>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => {
                                        setCategoryName(category.name);
                                        setEditingCategoryId(category.id);
                                        setIsCategoryModalOpen(true);
                                    }}
                                    className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-surface-container-high"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="p-2 text-on-surface-variant hover:text-error transition-colors cursor-pointer rounded-lg hover:bg-surface-container-high"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="divide-y divide-outline-variant/40">
                            {menuItems.filter(item => item.categoryId === category.id).map(item => (
                                <div key={item.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface-container-highest/60 transition-colors gap-3">
                                    {/* Left Side: Thumbnail + Info */}
                                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                                        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/60 flex items-center justify-center shadow-sm">
                                            {(item as any).imageUrl ? (
                                                <img
                                                    src={(item as any).imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <span className="text-xl sm:text-2xl">🍽️</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between sm:justify-start gap-2">
                                                <h4 className="font-bold text-sm sm:text-base text-on-surface leading-snug truncate">{item.name}</h4>
                                                <span className="sm:hidden font-black text-primary text-sm">${item.price.toFixed(2)}</span>
                                            </div>
                                            <p className="text-on-surface-variant text-xs sm:text-sm mt-0.5 line-clamp-2">{item.description}</p>
                                        </div>
                                    </div>

                                    {/* Right Side: Price & Actions */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-outline-variant/30">
                                        <span className="hidden sm:inline font-headline-sm font-black text-primary text-base sm:text-lg">${item.price.toFixed(2)}</span>
                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                                            <label className="relative inline-flex items-center cursor-pointer gap-2" title={item.isAvailable ? "Available" : "Unavailable"}>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={item.isAvailable} 
                                                    onChange={() => toggleItemAvailability(item.id, item.isAvailable)} 
                                                />
                                                <div className="w-10 h-5 sm:w-11 sm:h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                <span className="text-[11px] font-semibold text-on-surface-variant sm:hidden">
                                                    {item.isAvailable ? 'Available' : 'Sold Out'}
                                                </span>
                                            </label>

                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => {
                                                        setItemName(item.name);
                                                        setItemDesc(item.description || '');
                                                        setItemPrice(item.price.toString());
                                                        setItemCategory(item.categoryId);
                                                        setItemImageUrl((item as any).imageUrl || '');
                                                        setEditingItemId(item.id);
                                                        setIsItemModalOpen(true);
                                                    }}
                                                    className="p-1.5 sm:p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-xl bg-surface-container hover:bg-surface-container-high"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="p-1.5 sm:p-2 text-on-surface-variant hover:text-error transition-colors cursor-pointer rounded-xl bg-surface-container hover:bg-surface-container-high"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {menuItems.filter(item => item.categoryId === category.id).length === 0 && (
                                <div className="p-6 text-on-surface-variant text-sm italic">
                                    No items in this category.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-headline-md font-bold text-on-surface">{editingCategoryId ? 'Edit Menu Section' : 'New Menu Section'}</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-on-surface-variant hover:bg-surface-container rounded-full p-1 cursor-pointer"><X className="w-5 h-5"/></button>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Category Name" 
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            className="w-full bg-surface-container border border-outline-variant p-3 rounded-xl mb-4 text-on-surface focus:outline-none focus:border-primary"
                        />
                        <button 
                            onClick={handleSaveCategory}
                            className="w-full bg-primary-container text-white p-3 rounded-xl font-label-bold hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            Save Category
                        </button>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-headline-md font-bold text-on-surface">{editingItemId ? 'Edit Menu Item' : 'New Menu Item'}</h3>
                            <button onClick={() => setIsItemModalOpen(false)} className="text-on-surface-variant hover:bg-surface-container rounded-full p-1 cursor-pointer"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="space-y-4">
                            <input 
                                type="text" placeholder="Dish Name" value={itemName} onChange={(e) => setItemName(e.target.value)}
                                className="w-full bg-surface-container border border-outline-variant p-3 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                            />
                            <textarea 
                                placeholder="Description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)}
                                className="w-full bg-surface-container border border-outline-variant p-3 rounded-xl text-on-surface focus:outline-none focus:border-primary h-20"
                            />
                            <div className="flex gap-3">
                                <input 
                                    type="number" placeholder="Price" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)}
                                    className="w-1/2 bg-surface-container border border-outline-variant p-3 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                                />
                                <select 
                                    value={itemCategory} onChange={(e) => setItemCategory(e.target.value)}
                                    className="w-1/2 bg-surface-container border border-outline-variant p-3 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                                >
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* ── Image Section ── */}
                            <div>
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Dish Photo</label>

                                {/* Live preview */}
                                {itemImageUrl ? (
                                    <div className="mb-3 relative w-full h-36 rounded-xl overflow-hidden border border-outline-variant bg-surface-container">
                                        <img
                                            src={itemImageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setItemImageUrl('')}
                                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/90 cursor-pointer"
                                        >✕</button>
                                    </div>
                                ) : (
                                    /* Drop-zone / upload trigger */
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full h-32 mb-3 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container hover:bg-surface-container-highest hover:border-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                <span className="text-xs text-on-surface-variant">Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-7 h-7 text-on-surface-variant/50 group-hover:text-primary transition-colors" />
                                                <span className="text-xs text-on-surface-variant">
                                                    <span className="font-semibold text-primary">Click to upload</span> or drag &amp; drop
                                                </span>
                                                <span className="text-[10px] text-on-surface-variant/50">PNG, JPG, WEBP up to 5MB</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Hidden real file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />

                                {/* Also allow URL paste as alternative */}
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-px bg-outline-variant" />
                                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">or paste URL</span>
                                    <div className="flex-1 h-px bg-outline-variant" />
                                </div>
                                <input
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    value={itemImageUrl}
                                    onChange={(e) => setItemImageUrl(e.target.value)}
                                    className="w-full mt-2 bg-surface-container border border-outline-variant px-3 py-2 rounded-xl text-on-surface focus:outline-none focus:border-primary text-sm placeholder:text-on-surface-variant/40"
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveItem}
                            className="w-full bg-primary-container text-white p-3 rounded-xl font-label-bold hover:opacity-90 transition-opacity mt-6 cursor-pointer"
                        >
                            Save Menu Item
                        </button>
                    </div>
                </div>
            )}

            {/* ── PDF Menu Upload & Parser Modal ── */}
            {isPdfModalOpen && (
                <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl transition-all my-8 max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-outline-variant/40 shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-headline-md font-bold text-on-surface text-xl sm:text-2xl flex items-center gap-2.5">
                                        <FileText className="w-6 h-6 text-emerald-600" />
                                        Automatic PDF Menu Importer
                                    </h3>
                                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> AI Extraction
                                    </span>
                                </div>
                                <p className="text-on-surface-variant text-xs sm:text-sm mt-1">
                                    Upload your restaurant menu PDF. System will automatically categorize dishes, extract prices, group beverages/drinks, and build your digital menu in seconds.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    setPdfFile(null);
                                    setParsedCategories([]);
                                }}
                                className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 cursor-pointer transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step 1: Upload PDF or Paste Text */}
                        {pdfStep === 'upload' && (
                            <div className="py-6 flex flex-col items-center justify-center space-y-5 flex-1 overflow-y-auto">
                                {/* Mode Selector Tabs */}
                                <div className="flex bg-surface-container p-1 rounded-2xl border border-outline-variant/40 w-full max-w-xl">
                                    <button
                                        type="button"
                                        onClick={() => { setImportTab('upload'); setParseError(''); }}
                                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${importTab === 'upload' ? 'bg-surface-container-lowest text-emerald-600 shadow-sm border border-outline-variant/60' : 'text-on-surface-variant hover:text-on-surface'}`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>Upload PDF File</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setImportTab('paste'); setParseError(''); }}
                                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${importTab === 'paste' ? 'bg-surface-container-lowest text-emerald-600 shadow-sm border border-outline-variant/60' : 'text-on-surface-variant hover:text-on-surface'}`}
                                    >
                                        <Sparkles className="w-4 h-4 text-emerald-500" />
                                        <span>Paste Menu Text (Fast Backup)</span>
                                    </button>
                                </div>

                                {importTab === 'upload' ? (
                                    <div
                                        onClick={() => pdfInputRef.current?.click()}
                                        className="w-full max-w-xl p-8 sm:p-12 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <h4 className="font-bold text-on-surface text-base sm:text-lg mb-1">
                                            {pdfFile ? pdfFile.name : 'Select or Drop your PDF Menu'}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-on-surface-variant max-w-xs">
                                            {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB PDF selected` : 'Supports standard PDF files with menu formatting'}
                                        </p>
                                        <span className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors">
                                            {pdfFile ? 'Change File' : 'Browse Computer'}
                                        </span>
                                        <input
                                            ref={pdfInputRef}
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setPdfFile(file);
                                                    setParseError('');
                                                }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full max-w-xl space-y-2">
                                        <label className="text-xs font-bold text-on-surface-variant block">
                                            Paste your Menu Text below (Copy from PDF/Word/Canva):
                                        </label>
                                        <textarea
                                            rows={9}
                                            value={pastedMenuText}
                                            onChange={(e) => { setPastedMenuText(e.target.value); setParseError(''); }}
                                            placeholder="Paste menu text here... E.g:&#10;&#10;STARTERS&#10;Crispy Samosa - $2.50&#10;Chicken Wings - $6.00&#10;&#10;MAIN DISHES&#10;Somali Rice & Goat Meat - $9.50&#10;Grilled Chicken Burger - $7.00&#10;&#10;BEVERAGES&#10;Fresh Mango Juice - $3.00&#10;Somali Tea (Shaah Caday) - $1.50"
                                            className="w-full bg-surface-container border border-outline-variant/60 rounded-2xl p-4 text-xs sm:text-sm font-medium text-on-surface focus:outline-none focus:border-emerald-500 placeholder:text-on-surface-variant/40"
                                        />
                                    </div>
                                )}

                                {parseError && (
                                    <div className="w-full max-w-xl p-4 bg-error/10 border border-error/30 rounded-2xl flex items-center gap-3 text-error text-xs sm:text-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span>{parseError}</span>
                                    </div>
                                )}

                                <div className="flex gap-3 w-full max-w-xl pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPdfModalOpen(false)}
                                        className="flex-1 bg-surface-container hover:bg-surface-container-highest text-on-surface py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={(importTab === 'upload' && !pdfFile) || (importTab === 'paste' && !pastedMenuText.trim()) || isParsingPdf}
                                        onClick={handleParsePdf}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md"
                                    >
                                        {isParsingPdf ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Parsing Menu...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                <span>Extract &amp; Categorize</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Interactive Review & Editing */}
                        {pdfStep === 'preview' && (
                            <div className="flex-1 flex flex-col min-h-0 pt-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-4 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                            <Check className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-on-surface text-sm sm:text-base">
                                                Extracted {parsedCategories.reduce((acc, c) => acc + c.items.length, 0)} Items across {parsedCategories.length} Categories!
                                            </h4>
                                            <p className="text-xs text-on-surface-variant">
                                                Review detected items, update prices or descriptions, and click "Save &amp; Import All" when ready.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPdfStep('upload')}
                                        className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                                    >
                                        Re-upload PDF
                                    </button>
                                </div>

                                {/* Preview List */}
                                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                    {parsedCategories.map((cat, catIdx) => (
                                        <div key={catIdx} className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-sm">
                                            {/* Category Name Editable Header */}
                                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/40 gap-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">Category</span>
                                                    <input
                                                        type="text"
                                                        value={cat.name}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setParsedCategories(prev => {
                                                                const next = [...prev];
                                                                next[catIdx] = { ...next[catIdx], name: val };
                                                                return next;
                                                            });
                                                        }}
                                                        className="font-headline-md font-bold text-on-surface text-base sm:text-lg bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 flex-1 max-w-sm"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => addParsedItem(catIdx)}
                                                        className="text-xs bg-surface-container hover:bg-surface-container-highest text-on-surface px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Add Dish
                                                    </button>
                                                    <button
                                                        onClick={() => deleteParsedCategory(catIdx)}
                                                        className="text-xs text-error hover:bg-error/10 p-2 rounded-xl cursor-pointer transition-colors"
                                                        title="Delete category section"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Items Table / Cards */}
                                            <div className="space-y-3">
                                                {cat.items.map((item, itemIdx) => (
                                                    <div key={itemIdx} className="bg-surface-container p-3 sm:p-4 rounded-xl border border-outline-variant/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                                            {/* Photo + Item Name */}
                                                            <div className="sm:col-span-5 flex items-center gap-2.5">
                                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-container-lowest border border-outline-variant/60 shrink-0 flex items-center justify-center shadow-sm relative group" title="Auto-matched HD Photo">
                                                                    {item.imageUrl ? (
                                                                        <img
                                                                            src={item.imageUrl}
                                                                            alt={item.name}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <span className="text-base">🍽️</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block sm:hidden">Dish Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={item.name}
                                                                        onChange={(e) => updateParsedItem(catIdx, itemIdx, 'name', e.target.value)}
                                                                        placeholder="Dish Name"
                                                                        className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-1.5 text-sm font-semibold text-on-surface focus:outline-none focus:border-emerald-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {/* Description */}
                                                            <div className="sm:col-span-5">
                                                                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block sm:hidden">Description</label>
                                                                <input
                                                                    type="text"
                                                                    value={item.description}
                                                                    onChange={(e) => updateParsedItem(catIdx, itemIdx, 'description', e.target.value)}
                                                                    placeholder="Description (optional)"
                                                                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-1.5 text-xs text-on-surface-variant focus:outline-none focus:border-emerald-500"
                                                                />
                                                            </div>
                                                            {/* Price */}
                                                            <div className="sm:col-span-2">
                                                                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block sm:hidden">Price ($)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.price}
                                                                        onChange={(e) => updateParsedItem(catIdx, itemIdx, 'price', e.target.value)}
                                                                        placeholder="0.00"
                                                                        className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-6 pr-2 py-1.5 text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action */}
                                                        <button
                                                            onClick={() => deleteParsedItem(catIdx, itemIdx)}
                                                            className="text-on-surface-variant/60 hover:text-error hover:bg-surface-container-highest p-2 rounded-xl cursor-pointer transition-colors shrink-0 self-end sm:self-center"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer Action Bar */}
                                <div className="pt-4 mt-4 border-t border-outline-variant/40 flex items-center justify-between gap-4 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPdfModalOpen(false);
                                            setPdfFile(null);
                                            setParsedCategories([]);
                                        }}
                                        className="bg-surface-container hover:bg-surface-container-highest text-on-surface px-5 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isImporting || parsedCategories.length === 0}
                                        onClick={handleSaveParsedMenu}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                                    >
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Importing Menu to System...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                <span>Save &amp; Import All to System</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
