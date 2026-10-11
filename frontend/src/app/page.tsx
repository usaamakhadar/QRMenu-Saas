'use client';

import React from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, 
  Zap, 
  QrCode, 
  ArrowRight, 
  LayoutDashboard, 
  Layers, 
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Clock,
  Tv,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090b11] text-gray-300 flex flex-col font-sans overflow-x-hidden selection:bg-[#ff6b00]/20 selection:text-[#ff6b00] relative">
      
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-gradient-to-br from-[#ff6b00]/10 to-transparent blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-gradient-to-tr from-[#006c4b]/10 to-transparent blur-[120px] pointer-events-none z-0"></div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-24 flex justify-between items-center z-50 shrink-0 relative">
        <div className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#ff6b00] to-[#ff8f40] flex items-center justify-center shadow-lg shadow-[#ff6b00]/25 transition-transform duration-300 group-hover:scale-105">
            <UtensilsCrossed className="text-white w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
          </div>
          <span className="font-headline-md text-lg sm:text-2xl font-black tracking-tight text-white transition-colors duration-300">
            QRMenu<span className="text-[#ff6b00]">SaaS</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-5">
          <Link
            href="/login"
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm text-gray-400 hover:text-white transition-all active:scale-95 whitespace-nowrap"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-3.5 sm:px-6 py-2 sm:py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-gray-100 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 active:scale-95 whitespace-nowrap"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-8 sm:pt-16 pb-12 sm:pb-24 max-w-5xl mx-auto w-full">
        
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-[#ff6b00] mb-6 sm:mb-8 animate-fade-in backdrop-blur-md shadow-inner">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest font-sans text-gray-200">Real-Time SaaS Platform</span>
        </div>

        {/* Main Heading */}
        <h1 className="font-headline-xl text-2xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] sm:leading-[1.05] mb-5 sm:mb-8 max-w-4xl px-1">
          The Intelligent QR Code Ordering Platform for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b00] via-[#ff8f40] to-[#00ae7a]">Modern Dining</span>
        </h1>

        {/* Subtitle */}
        <p className="font-body-lg text-sm sm:text-lg md:text-xl text-gray-400 max-w-3xl mb-8 sm:mb-14 leading-relaxed font-light px-2">
          Empower diners to scan table QR codes, browse menus, and order instantly. Stream tickets in real-time to your staff Kanban dashboard with immediate socket dispatch.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-5 w-full max-w-md sm:max-w-none justify-center mb-12 sm:mb-24 z-10 px-2">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-6 sm:px-9 py-3.5 sm:py-5 bg-gradient-to-r from-[#ff6b00] to-[#ff8526] hover:from-[#e05e00] hover:to-[#e07119] text-white font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-xl shadow-[#ff6b00]/15 hover:shadow-[#ff6b00]/25 transition-all duration-300 active:scale-98 flex items-center justify-center gap-2.5 sm:gap-3.5 group"
          >
            Create Restaurant Account
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 sm:px-9 py-3.5 sm:py-5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] text-white font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl transition-all duration-300 active:scale-98 flex items-center justify-center gap-2.5 sm:gap-3"
          >
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ae7a]" />
            Staff Kitchen Login
          </Link>
        </div>

        {/* Features / Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left max-w-6xl mt-8">
          
          {/* Card 1 */}
          <div className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-8 rounded-3xl transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#ff6b00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="w-12 h-12 rounded-2xl bg-[#ff6b00]/10 flex items-center justify-center mb-7 border border-[#ff6b00]/20">
              <Layers className="w-5.5 h-5.5 text-[#ff6b00]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Multi-Tenant Isolation</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
              Menus, QR codes, tables, and settings are fully isolated and served dynamic based on the restaurant's slug.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-8 rounded-3xl transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00ae7a]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="w-12 h-12 rounded-2xl bg-[#00ae7a]/10 flex items-center justify-center mb-7 border border-[#00ae7a]/20">
              <Zap className="w-5.5 h-5.5 text-[#00ae7a]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Live Kitchen Dispatch</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
              Order submission streams immediately via Socket.io with customizable staff sound alerts and Kanban status tracking.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-8 rounded-3xl transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-7 border border-blue-500/20">
              <QrCode className="w-5.5 h-5.5 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Zero App Friction</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
              Diners simply scan the table QR code with their mobile device to access the menu, customize orders, and submit.
            </p>
          </div>

        </div>

        {/* Demo Section */}
        <div className="w-full max-w-4xl mt-32 pt-16 border-t border-white/[0.08] relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white tracking-tight mb-3">
              Interactive System Demo
            </h2>
            <p className="text-sm text-gray-400 max-w-xl mx-auto font-light">
              Open the customer menu and the staff kitchen screen side-by-side to watch real-time dispatch in action.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            
            <Link
              href="/powergrill?table=5"
              target="_blank"
              className="group relative flex items-center gap-5 p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#ff6b00]/30 rounded-2xl transition-all duration-300 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-md group-hover:bg-[#ff6b00]/10 transition-colors">
                <QrCode className="w-5.5 h-5.5 text-[#ff6b00]" />
              </div>
              <div className="flex-grow">
                <span className="font-bold text-white block text-base group-hover:text-[#ff6b00] transition-colors mb-0.5">
                  Customer QR Menu
                </span>
                <span className="text-xs text-gray-400 font-light">
                  Demo Table #5 (PowerGrill Menu)
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/kitchen/powergrill"
              target="_blank"
              className="group relative flex items-center gap-5 p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#00ae7a]/30 rounded-2xl transition-all duration-300 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-md group-hover:bg-[#00ae7a]/10 transition-colors">
                <Tv className="w-5.5 h-5.5 text-[#00ae7a]" />
              </div>
              <div className="flex-grow">
                <span className="font-bold text-white block text-base group-hover:text-[#00ae7a] transition-colors mb-0.5">
                  Kitchen Dashboard
                </span>
                <span className="text-xs text-gray-400 font-light">
                  Staff Live Kanban Display
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </Link>

          </div>
        </div>

      </header>

      {/* Footer */}
      <footer className="w-full py-10 border-t border-white/[0.06] text-center text-xs text-gray-500 shrink-0 relative z-10 bg-[#090b11]/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-light">&copy; 2026 QRMenu-SaaS. All rights reserved.</p>
          <div className="flex gap-6 text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
