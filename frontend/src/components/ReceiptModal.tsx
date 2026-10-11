'use client';

import React from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

export interface LastSaleItem {
  name: string;
  qty: number;
  price: number;
}

export interface LastSaleData {
  id: string;
  date: string;
  items: LastSaleItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
}

export interface TenantSettings {
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  footer_message?: string | null;
  exchange_rate?: number;
  tax_rate?: number;
}

export interface ReceiptModalProps {
  showReceipt: boolean;
  setShowReceipt: (show: boolean) => void;
  lastSaleData: LastSaleData | null;
  storeName?: string;
  userName?: string;
  tenantSettings?: TenantSettings | null;
  lang?: 'en' | 'so';
  onDownloadReceipt?: (format: 'image' | 'pdf') => void;
}

const download = (dataUrl: string, filename: string, mimeType: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ReceiptModal({
  showReceipt,
  setShowReceipt,
  lastSaleData,
  storeName,
  userName,
  tenantSettings,
  lang = 'so',
  onDownloadReceipt,
}: ReceiptModalProps) {
  if (!showReceipt || !lastSaleData) return null;

  const handlePrint = () => {
    if (!lastSaleData) return;

    const taxRate = tenantSettings?.tax_rate || 0;
    const tax = lastSaleData.subtotal * taxRate;
    const totalAmount = lastSaleData.total;
    const localExchangeRate = tenantSettings?.exchange_rate || 8500;
    const storeTitle = storeName || 'RESTAURANT';
    const logoHtml = tenantSettings?.logo_url ? `<div class="text-center" style="margin-bottom: 6px;"><img src="${tenantSettings.logo_url}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: contain; border: 1px solid #ddd;" /></div>` : '';
    
    let headerText = '';
    if (tenantSettings?.receipt_header) {
      headerText = `<div class="text-center" style="font-size: 10px; margin-bottom: 6px; white-space: pre-wrap;">${tenantSettings.receipt_header}</div>`;
    }

    let footerInfoHtml = '';
    if (tenantSettings?.receipt_footer) {
      try {
        const parsedFooter = JSON.parse(tenantSettings.receipt_footer);
        const hasPhones = parsedFooter.phone1 || parsedFooter.phone2 || parsedFooter.phone3;
        const hasPayments = parsedFooter.zaad || parsedFooter.edahab;
        if (hasPhones || hasPayments) {
          footerInfoHtml += '<div style="font-size: 9px; margin-top: 4px; text-align: center; font-weight: bold;">';
          if (hasPhones) {
            footerInfoHtml += `<div>Tel: ${[parsedFooter.phone1, parsedFooter.phone2, parsedFooter.phone3].filter(Boolean).join(" | ")}</div>`;
          }
          if (hasPayments) {
            footerInfoHtml += `<div>${[
              parsedFooter.zaad ? `ZAAD: ${parsedFooter.zaad}` : null,
              parsedFooter.edahab ? `E-Dahab: ${parsedFooter.edahab}` : null
            ].filter(Boolean).join(" // ")}</div>`;
          }
          footerInfoHtml += '</div>';
        }
      } catch {
        footerInfoHtml = `<div style="font-size: 9px; margin-top: 4px; text-align: center;">${tenantSettings.receipt_footer}</div>`;
      }
    }

    const getPaymentMethodLabel = (method: string) => {
      const upper = (method || '').toUpperCase();
      if (upper === 'CASH_USD') return 'CASH (USD)';
      if (upper === 'CASH_SLSH') return 'CASH (SLSH)';
      if (upper === 'CASH') return 'CASH';
      if (upper === 'ZAAD') return 'ZAAD SERVICE';
      if (upper === 'EDAHAB') return 'EDAHAB SERVICE';
      if (upper === 'PREMIER_WALLET') return 'PREMIER WALLET';
      if (upper === 'CARD') return 'CARD';
      return upper;
    };

    const paymentLabel = getPaymentMethodLabel(lastSaleData.paymentMethod);
    const footerMsg = tenantSettings?.footer_message || 'Hubso Alaabtaada intaanad labixin';

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
                width: 80mm !important;
                height: auto !important;
                min-height: 0 !important;
                background: #ffffff !important;
              }
              .receipt {
                width: 76mm !important;
                padding: 4mm 4mm 0mm 4mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
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
              width: 76mm !important;
              padding: 4mm 4mm 0mm 4mm !important;
              margin: 0 !important;
              box-sizing: border-box !important;
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
            ${logoHtml}
            <h2 class="text-center bold uppercase" style="margin: 0 0 4px 0; font-size: 14px;">${storeTitle}</h2>
            ${headerText}
            ${footerInfoHtml}
            
            <div class="dashed-line"></div>
            
            <div style="font-size: 10px; font-weight: bold;">
              <div class="flex-between">
                <span>Date: ${lastSaleData.date}</span>
                <span>Order: #${lastSaleData.id.includes('-') ? lastSaleData.id.split('-')[0] : lastSaleData.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div>Cashier: ${userName || 'Cashier'}</div>
            </div>
            
            <div class="solid-line"></div>
            
            <div class="item-row bold" style="font-size: 10px; text-transform: uppercase;">
              <span class="item-name">Magaca Shayga</span>
              <span class="item-qty">Qty</span>
              <span class="item-total">Total</span>
            </div>
            
            <div class="dashed-line"></div>
            
            ${lastSaleData.items.map(item => `
              <div class="item-row">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.qty}</span>
                <span class="item-total">$${(item.price * item.qty).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="dashed-line"></div>
            
            <div class="flex-between">
              <span>Subtotal:</span>
              <span>$${lastSaleData.subtotal.toFixed(2)}</span>
            </div>
            ${taxRate > 0 && tax > 0 ? `
            <div class="flex-between">
              <span>Tax (${(taxRate * 100).toFixed(0)}%):</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            ` : ''}
            
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
            
            <div class="flex-between bold" style="font-size: 12px; margin-top: 4px;">
              <span>${paymentLabel}:</span>
              <span>$${totalAmount.toFixed(2)}</span>
            </div>

            <div class="dashed-line"></div>
            
            <div class="text-center bold uppercase" style="margin-top: 8px; font-size: 11px; padding-bottom: 0;">
              <div>${footerMsg}</div>
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

  const handleDownloadReceipt = async (type: 'pdf' | 'image') => {
    if (onDownloadReceipt) {
      onDownloadReceipt(type);
      return;
    }

    const element = document.getElementById('receipt-print-area');
    if (!element) return;

    toast.loading(lang === 'en' ? 'Generating file...' : 'Waa la diyaarinayaa...');

    try {
      const imgData = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        style: {
          width: '380px',
          height: 'auto',
          transform: 'none',
          margin: '0',
          position: 'relative',
        },
      });
      const fileName = `receipt-${lastSaleData.id.slice(0, 8)}.pdf`;

      if (type === 'image') {
        download(imgData, fileName.replace('.pdf', '.png'), 'image/png');
      } else {
        const tempImg = new window.Image();
        tempImg.src = imgData;
        await new Promise((resolve) => (tempImg.onload = resolve));

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, (tempImg.height * 80) / tempImg.width], // Standard 80mm thermal receipt size
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 80, (tempImg.height * 80) / tempImg.width);
        pdf.save(fileName);
      }

      toast.dismiss();
      toast.success(lang === 'en' ? 'Downloaded!' : 'Waa la soo dejiyay!');
    } catch (err) {
      console.error('Failed to generate download:', err);
      toast.dismiss();
      toast.error('Failed to generate download');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white text-[#141b2d] w-full max-w-[340px] shadow-2xl relative overflow-hidden font-mono text-[12px] border border-zinc-200 m-auto mx-auto my-12 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:my-0">
        
        {/* Close Button */}
        <button 
          onClick={() => setShowReceipt(false)} 
          className="absolute top-3 right-3 z-30 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 font-extrabold text-[12px] w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer print:hidden"
          title={lang === 'en' ? 'Close' : 'Xidh'}
        >
          ✕
        </button>

        {/* Thermal Printable Area */}
        <div id="receipt-print-area" className="p-5 overflow-y-auto custom-scrollbar bg-white print-target flex-1">
          
          {/* Thermal Header */}
          <div className="text-center space-y-1 mb-3">
            {tenantSettings?.logo_url && (
              <img
                src={tenantSettings.logo_url}
                alt="Logo"
                className="w-14 h-14 object-contain mx-auto mb-1.5 rounded-full border border-black/10 print:w-14 print:h-14"
              />
            )}
            <h2 className="text-base font-black uppercase leading-tight tracking-wide">{storeName || "RESTAURANT"}</h2>
            {tenantSettings?.receipt_header && (
              <p className="text-[10px] font-medium leading-tight whitespace-pre-wrap text-zinc-600">{tenantSettings.receipt_header}</p>
            )}

            {(() => {
              if (!tenantSettings?.receipt_footer) return null;
              try {
                const parsedFooter = JSON.parse(tenantSettings.receipt_footer);
                const hasPhones = parsedFooter.phone1 || parsedFooter.phone2 || parsedFooter.phone3;
                const hasPayments = parsedFooter.zaad || parsedFooter.edahab;
                
                return (
                  <div className="text-[9px] font-bold leading-tight font-mono space-y-0.5 mt-1 text-zinc-700">
                    {hasPhones && (
                      <p>
                        Tel: {[parsedFooter.phone1, parsedFooter.phone2, parsedFooter.phone3].filter(Boolean).join(" | ")}
                      </p>
                    )}
                    {hasPayments && (
                      <p>
                        {[
                          parsedFooter.zaad ? `ZAAD: ${parsedFooter.zaad}` : null,
                          parsedFooter.edahab ? `E-Dahab: ${parsedFooter.edahab}` : null
                        ].filter(Boolean).join(" // ")}
                      </p>
                    )}
                  </div>
                );
              } catch (e) {
                return (
                  <div className="text-[9px] font-bold leading-tight font-mono mt-1">
                    <p>{tenantSettings.receipt_footer}</p>
                  </div>
                );
              }
            })()}
          </div>

          {/* Transaction Metadata */}
          <div className="border-t border-b border-black py-1 mb-3 font-mono font-bold text-[9.5px] space-y-0.5">
            <div className="flex justify-between">
              <span>Date: {lastSaleData.date}</span>
              <span>Order ID: #{lastSaleData.id.includes('-') ? lastSaleData.id.split('-').slice(0, 2).join('-') : lastSaleData.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>Cashier: {userName || "Cashier"}</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="flex justify-between border-y border-black py-1 font-black text-[11px] mb-2 uppercase">
            <span className="w-1/2 text-left">Magaca Shayga</span>
            <span className="w-1/6 text-center">Qty</span>
            <span className="w-1/6 text-right">Price</span>
            <span className="w-1/6 text-right">Amount</span>
          </div>

          {/* Items */}
          <div className="space-y-1 mb-4 border-b border-zinc-100 pb-2">
            {lastSaleData.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start leading-tight">
                <span className="w-1/2 text-left font-bold uppercase text-[10px]">{item.name}</span>
                <span className="w-1/6 text-center">{item.qty}</span>
                <span className="w-1/6 text-right">${item.price.toFixed(2)}</span>
                <span className="w-1/6 text-right font-bold">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-0.5 border-b border-black pb-2 mb-2">
            <div className="flex justify-between">
              <span className="font-bold">Subtotal:</span>
              <span>${lastSaleData.subtotal.toFixed(2)}</span>
            </div>
            {(() => {
              const taxRate = tenantSettings?.tax_rate !== undefined ? tenantSettings.tax_rate : 0;
              const taxAmount = lastSaleData.subtotal * taxRate;
              if (taxRate <= 0 || taxAmount <= 0) return null;
              return (
                <div className="flex justify-between text-[10px]">
                  <span>Local Sales Tax ({(taxRate * 100).toFixed(0)}%):</span>
                  <span>+ ${taxAmount.toFixed(2)}</span>
                </div>
              );
            })()}
            <div className="flex justify-between font-black text-[14px] mt-1 pt-1 border-t border-zinc-100">
              <span>RECEIPT TOTAL:</span>
              <span>${lastSaleData.total.toFixed(2)}</span>
            </div>
            {(() => {
              const displayTotalUSD = Number(lastSaleData.total.toFixed(2));
              const rate = tenantSettings?.exchange_rate || 8500;
              const slshTotal = Math.round(displayTotalUSD * rate);
              return (
                <div className="flex justify-between font-bold text-[11px] text-zinc-500">
                  <span>TOTAL (SLSH):</span>
                  <span>{ slshTotal.toLocaleString() } SH</span>
                </div>
              );
            })()}
          </div>

          {/* Payment Method */}
          {(() => {
            const getPaymentMethodLabel = (method: string) => {
              const upper = (method || '').toUpperCase();
              if (upper === 'CASH_USD') return 'CASH (USD)';
              if (upper === 'CASH_SLSH') return 'CASH (SLSH)';
              if (upper === 'CASH') return 'CASH';
              if (upper === 'ZAAD') return 'ZAAD SERVICE';
              if (upper === 'EDAHAB') return 'EDAHAB SERVICE';
              if (upper === 'PREMIER_WALLET') return 'PREMIER WALLET';
              if (upper === 'CARD') return 'CARD';
              return upper;
            };
            return (
              <div className="mb-4">
                <p className="font-black text-[13px] uppercase">{getPaymentMethodLabel(lastSaleData.paymentMethod)}: ${lastSaleData.total.toFixed(2)}</p>
              </div>
            );
          })()}

          {/* Footer Message */}
          <div className="text-center space-y-1">
            <p className="italic text-[11px] font-black uppercase text-black tracking-wide">{tenantSettings?.footer_message || "Hubso Alaabtaada intaanad labixin"}</p>
          </div>

          {/* Dynamic Barcode */}
          <div className="flex flex-col items-center pt-2">
            <div className="w-full h-10 bg-zinc-100 border-x-2 border-black flex items-center justify-center relative">
              <div className="absolute inset-x-0 top-0 bottom-0 flex justify-between px-1 opacity-20">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className={`w-[1px] bg-black h-full ${i % 3 === 0 ? 'w-[2px]' : ''}`}></div>
                ))}
              </div>
              <span className="bg-white/80 px-2 text-[10px] font-black z-10">{lastSaleData.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Print & Download Action Buttons */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-2 shrink-0 print:hidden">
          <button onClick={handlePrint} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg h-11 shadow-sm text-sm cursor-pointer flex items-center justify-center gap-2">
            🖨️ {lang === 'en' ? 'Print Receipt' : 'Daabac Rasiidhka'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleDownloadReceipt('image')} className="bg-[#141b2d] hover:bg-black text-white font-bold rounded-lg h-10 shadow-sm text-xs cursor-pointer flex items-center justify-center gap-1">
              ⬇️ {lang === 'en' ? 'Save Image' : 'Soo deji (Sawir)'}
            </button>
            <button onClick={() => handleDownloadReceipt('pdf')} className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg h-10 shadow-sm text-xs cursor-pointer flex items-center justify-center gap-1">
              📄 {lang === 'en' ? 'Save PDF' : 'Soo deji (PDF)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
