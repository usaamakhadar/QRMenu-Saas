'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { QrCode, Download, Printer, RefreshCw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface Table {
    id: string;
    tableNumber: string;
    qrCodeData: string;
}

export default function QRCodesPage() {
    const params = useParams();
    const restaurantId = params?.restaurantId as string;

    const [tables, setTables] = useState<Table[]>([]);
    const [restaurantName, setRestaurantName] = useState('Restaurant');
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

    const getEffectiveQrUrl = (qrCodeData: string) => {
        if (!qrCodeData) return '';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://qrmenu-digital.vercel.app');
        
        try {
            if (qrCodeData.startsWith('http://') || qrCodeData.startsWith('https://')) {
                const parsed = new URL(qrCodeData);
                return `${baseUrl}${parsed.pathname}${parsed.search}`;
            }
        } catch {
            // fallback
        }
        
        if (qrCodeData.startsWith('/')) {
            return `${baseUrl}${qrCodeData}`;
        }

        return `${baseUrl}/${qrCodeData}`;
    };

    useEffect(() => {
        if (!restaurantId) return;
        fetch(`/api/restaurants/${restaurantId}`)
            .then((res) => res.json())
            .then((data) => {
                setTables(data.tables || []);
                setRestaurantName(data.name || 'Restaurant');
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [restaurantId]);

    const handleDownloadPDF = async (table: Table) => {
        setDownloadingId(table.id);
        try {
            // Dynamically import to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const element = document.getElementById(`qr-card-${table.id}`);
            if (!element) return;

            const canvas = await html2canvas(element, {
                scale: 3, // 3x resolution for crisp printing
                backgroundColor: '#ffffff',
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5', // A5 is a perfect table tent size
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Center the QR card on the A5 page
            const imgWidth = 100;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save(`${restaurantName}_Table_${table.tableNumber}_QR.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadImage = async (table: Table) => {
        setDownloadingId(table.id);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const element = document.getElementById(`qr-card-${table.id}`);
            if (!element) return;

            const canvas = await html2canvas(element, {
                scale: 3, // High quality
                backgroundColor: '#ffffff',
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/png');
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                setModalImageUrl(imgData);
            } else {
                const link = document.createElement('a');
                link.download = `${restaurantName}_Table_${table.tableNumber}_QR.png`;
                link.href = imgData;
                link.click();
            }
        } catch (err) {
            console.error('Image generation failed:', err);
            alert('Failed to generate image. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-surface-container-lowest">
            {/* Header */}
            <header className="mb-8">
                <h2 className="font-headline-xl text-headline-xl text-on-background font-bold flex items-center gap-3">
                    <QrCode className="w-8 h-8 text-primary" />
                    QR Code Manager
                </h2>
                <p className="font-body-md text-on-surface-variant mt-1">
                    Download high-quality QR codes for each table. Print and place them on your tables.
                </p>
            </header>

            {tables.length === 0 ? (
                <div className="text-center p-16 border-2 border-dashed border-outline-variant rounded-2xl">
                    <QrCode className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                    <p className="text-on-surface-variant font-semibold">No tables found.</p>
                    <p className="text-on-surface-variant/60 text-sm mt-1">Add tables in your Settings to generate QR codes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map((table) => (
                        <div
                            key={table.id}
                            className="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Printable QR Card */}
                            <div
                                id={`qr-card-${table.id}`}
                                className="bg-white p-6 flex flex-col items-center"
                                style={{ fontFamily: 'sans-serif' }}
                            >
                                {/* Restaurant Name */}
                                <p
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        marginBottom: '4px',
                                    }}
                                >
                                    {restaurantName}
                                </p>

                                {/* Table Number */}
                                <p
                                    style={{
                                        fontSize: '32px',
                                        fontWeight: '900',
                                        color: '#111827',
                                        lineHeight: '1',
                                        marginBottom: '16px',
                                    }}
                                >
                                    Table #{table.tableNumber}
                                </p>

                                {/* QR Code */}
                                <div
                                    style={{
                                        padding: '12px',
                                        background: '#fff',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '12px',
                                    }}
                                >
                                    <QRCodeCanvas
                                        value={getEffectiveQrUrl(table.qrCodeData)}
                                        size={160}
                                        bgColor="#ffffff"
                                        fgColor="#111827"
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>

                                {/* Instruction Text */}
                                <p
                                    style={{
                                        fontSize: '11px',
                                        color: '#9ca3af',
                                        marginTop: '14px',
                                        textAlign: 'center',
                                        maxWidth: '160px',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    📱 Scan to view our menu &amp; order
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="p-4 bg-surface-container flex gap-2 border-t border-outline-variant">
                                <button
                                    onClick={() => handleDownloadPDF(table)}
                                    disabled={downloadingId === table.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary-container text-on-primary py-2.5 rounded-xl text-sm font-semibold hover:bg-primary transition-colors disabled:opacity-60 cursor-pointer"
                                >
                                    {downloadingId === table.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Download className="w-3.5 h-3.5" />
                                    )}
                                    PDF
                                </button>
                                <button
                                    onClick={() => handleDownloadImage(table)}
                                    disabled={downloadingId === table.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-surface-container-highest text-on-surface py-2.5 rounded-xl text-sm font-semibold hover:bg-outline/20 transition-colors disabled:opacity-60 cursor-pointer"
                                >
                                    {downloadingId === table.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Download className="w-3.5 h-3.5" />
                                    )}
                                    PNG
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tip */}
            <div className="mt-8 p-4 bg-surface-container border border-outline-variant/50 rounded-2xl flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                    <p className="font-semibold text-on-surface text-sm">Printing Tips</p>
                    <p className="text-on-surface-variant text-xs mt-0.5 leading-relaxed">
                        Download the PDF version for the best print quality. Place the printed QR code in a table tent holder or laminate it for durability.
                        The QR code links directly to your menu with the table number pre-filled.
                    </p>
                </div>
            </div>

            {/* Mobile save image modal */}
            {modalImageUrl && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl border border-outline-variant flex flex-col items-center p-6 gap-4">
                        <h3 className="font-bold text-on-surface text-sm">Save QR Code Card</h3>
                        <img 
                            src={modalImageUrl} 
                            alt="QR Code Card" 
                            className="w-full max-h-[55vh] object-contain rounded-2xl border border-outline-variant shadow-md select-none" 
                        />
                        <p className="text-[12px] font-semibold text-on-surface-variant text-center leading-relaxed px-2">
                            🔊 Tabo oo riix (Hold) sawirka si aad ugu kaydiso talefankaaga (Press and hold image to save).
                        </p>
                        <button 
                            onClick={() => setModalImageUrl(null)}
                            className="w-full bg-primary text-on-primary font-bold py-3 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all text-xs cursor-pointer mt-2"
                        >
                            Close (Xidh)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
