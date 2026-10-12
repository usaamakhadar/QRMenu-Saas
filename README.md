# 🍽️ QRMenu SaaS — Real-Time Multi-Tenant Restaurant Ordering & KDS

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=vercel)](https://qrmenu-digital.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Live Production Deployment:** [🚀 Live Demo](https://qrmenu-digital.vercel.app/)

A modern, production-grade **Full-Stack SaaS platform** for contactless restaurant ordering, kitchen ticket execution, and real-time operations management. Built with high concurrency and instant synchronization in mind, QRMenu SaaS eliminates wait times, automates kitchen workflows, and gives restaurant owners actionable business intelligence.

---

## 🌟 Key Features

### 📱 Diner Self-Ordering Experience (Customer Menu)
- **Zero-Friction Access:** Diners scan a table QR code and instantly browse the branded digital menu—no mobile app download required.
- **Table-Aware Context:** Automatic table number binding (`?table=X`) ensuring zero order mix-ups.
- **Interactive Menu Browsing:** Fast category filtering, real-time search, allergen/dietary badges, and high-resolution dish photography.
- **Customizable Orders:** Special culinary notes, condiment selections, and portion modifiers.
- **Live Cart & Digital Receipt:** Instant cart drawer with auto-calculated subtotals, tax estimation, and printable HTML5/canvas digital receipts.

### 🍳 Real-Time Kitchen Display System (KDS) & Kanban
- **Zero-Latency Dispatch:** Customer orders emit via WebSockets directly onto the kitchen station within milliseconds.
- **Audio Chime Synthesizer:** Built-in Web Audio API synthesizer chimes on incoming tickets without external audio asset dependencies.
- **Status Progression Pipeline:** Intuitive Kanban board advancing tickets through `INCOMING` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`.
- **Dynamic Elapsed Timers:** Visual urgency indicators change color as order wait times increase.

### 🧾 Cashier & Billing Desk
- **Multi-Currency Engine:** Built-in conversion between USD ($) and local currencies (e.g., SLSH) with customizable daily exchange rates.
- **Split & Flexible Payments:** Handles Cash (USD/SLSH) alongside mobile money options (Zaad, e-Dahab) with change calculations.
- **PDF & Thermal Receipts:** Instant receipt generation via `jspdf` and `html2canvas` for physical and digital delivery.

### 📊 Owner Analytics & Management Portal
- **Financial Dashboards:** Real-time revenue telemetry, daily order counts, average check sizes, and hourly traffic peaks.
- **AI-Powered Menu Parser:** Integrated with **Google Gemini AI** for automatic extraction and cataloging of menu items from raw text or uploaded documents.
- **Cloudinary Asset Pipeline:** Cloud-optimized image uploads and CDN delivery for dish photos and restaurant logos.
- **QR Code Studio:** Dynamic printable QR codes with embedded restaurant branding and table IDs.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER (Next.js 16)                                  │
│                                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────────────┐  │
│  │   📱 Customer Menu    │  │   🍳 Kitchen KDS      │  │   🧾 Cashier & Billing     │  │
│  │   (/[slug]?table=N)   │  │   (/kitchen/kds)      │  │   (/kitchen/billing)       │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └─────────────┬──────────────┘  │
└──────────────┼──────────────────────────┼────────────────────────────┼─────────────────┘
               │ HTTP & WebSocket         │ Real-time WebSocket        │ HTTP & WebSocket
               ▼                          ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION TIER (Node.js & Express)                           │
│                                                                                        │
│  ┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │        🚀 REST API Services             │  │      ⚡ Socket.io Gateway           │  │
│  │   (Auth, Orders, Menu CRUD, Analytics)  │  │   (Real-Time Multi-Room Dispatch)   │  │
│  └────────────────────┬────────────────────┘  └──────────────────┬──────────────────┘  │
└───────────────────────┼──────────────────────────────────────────┼─────────────────────┘
                        │                                          │
                        ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         DATA & EXTERNAL CLOUD SERVICES TIER                            │
│                                                                                        │
│  ┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   🔷 Prisma ORM 5.14                    │  │   ☁️ Cloudinary (Asset CDN)         │  │
│  │   🐘 PostgreSQL (Neon / Local DB)       │  │   ✨ Google Gemini AI (Menu Parser) │  │
│  └─────────────────────────────────────────┘  └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
QRMenu-Saas/
├── backend/                  # Express REST API & Socket.io server
│   ├── prisma/
│   │   └── schema.prisma     # Multi-tenant database schema & models
│   ├── scripts/              # Database maintenance & utility scripts
│   │   ├── check-users.ts    # User validation & diagnostics
│   │   ├── fix-qr.ts         # Bulk QR URL re-indexer
│   │   └── sync-owner-names.ts # Restaurant owner name synchronizer
│   ├── src/
│   │   ├── index.ts          # Core Express server, REST endpoints & WebSocket handlers
│   │   └── seed.ts           # Database seeder (PowerGrill demo data)
│   ├── .env.example          # Backend environment variable template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Next.js 16 Web Application (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── [restaurantSlug]/    # Customer digital menu (?table=ID)
│   │   │   ├── kitchen/[restaurantId]/ # Staff portal (KDS, Orders, Billing, Analytics, Menu)
│   │   │   ├── login/               # Staff & Admin authentication
│   │   │   ├── signup/              # New restaurant onboarding
│   │   │   ├── globals.css          # Design tokens & Tailwind CSS v4 setup
│   │   │   └── page.tsx             # Interactive launcher landing page
│   │   └── components/
│   │       ├── ErrorBoundary.tsx    # Client-side fault tolerance
│   │       └── ReceiptModal.tsx     # Digital & printable receipt modal
│   ├── .env.example          # Frontend environment variable template
│   ├── package.json
│   └── tsconfig.json
│
├── package.json              # Monorepo workspaces launcher
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **PostgreSQL** instance (Local, or cloud providers such as [Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway)

---

### Step 1: Clone the Repository & Install Dependencies
The repository is configured with **npm workspaces**, allowing all dependencies across root, backend, and frontend to be installed with a single command:

```bash
git clone https://github.com/usaamakhadar/QRMenu-Saas.git
cd QRMenu-Saas

# Installs root, backend, and frontend dependencies simultaneously
npm install
```

---

### Step 2: Configure Environment Variables

1. **Backend Environment:**
   Create a `.env` file inside the `backend/` directory by copying the template:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Configure your PostgreSQL connection and secrets in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/qrmenu_db?schema=public"
   PORT=4000
   JWT_SECRET="your_strong_jwt_secret_key_here"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Optional: Media Hosting (Cloudinary)
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"

   # Optional: AI Menu Extraction (Google Gemini)
   GEMINI_API_KEY="your_gemini_api_key"
   ```

2. **Frontend Environment:**
   Create a `.env.local` file inside the `frontend/` directory:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
   Verify the endpoints in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

---

### Step 3: Initialize Database & Seed Demo Data
Push the Prisma schema to your PostgreSQL database and populate the demo restaurant (**PowerGrill**):

```bash
# Push schema and generate Prisma client
npm run prisma:push

# Seed demo categories, dishes, tables, and staff credentials
npm run prisma:seed
```

---

### Step 4: Run the Full-Stack Application
Start both the backend server and frontend application concurrently from the root directory:

```bash
npm run dev
```

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API & WebSockets:** [http://localhost:4000](http://localhost:4000)

---

## 🕹️ Interactive Demo Walkthrough

Experience the deployed application live at **[https://qrmenu-digital.vercel.app/](https://qrmenu-digital.vercel.app/)** or test locally:

1. **System Portal:** Open [https://qrmenu-digital.vercel.app/](https://qrmenu-digital.vercel.app/) (or local [http://localhost:3000](http://localhost:3000)).
2. **Customer Menu:** Click **Customer QR Menu** or visit [https://qrmenu-digital.vercel.app/powergrill?table=5](https://qrmenu-digital.vercel.app/powergrill?table=5).
   - Add items to the cart, select modifiers, and add kitchen notes.
   - Click **Send Order to Kitchen**.
3. **Live Kitchen KDS:** Open a second browser tab and visit the Kitchen Dashboard.
   - Watch the new order arrive instantly with a synthesized chime sound.
   - Advance the ticket from `Incoming` ➔ `Preparing` ➔ `Ready` ➔ `Served`.
4. **Billing Desk:** Navigate to the Cashier Billing tab to mark orders paid, calculate change in USD/SLSH, and print receipts.

---

## 📜 Monorepo NPM Scripts Reference

All primary workflows can be executed directly from the root workspace:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs backend (Express `:4000`) and frontend (Next.js `:3000`) concurrently |
| `npm run build` | Compiles backend TypeScript and builds the Next.js production bundle |
| `npm run prisma:push` | Generates Prisma client and synchronizes schema with PostgreSQL |
| `npm run prisma:seed` | Populates the database with the prebuilt PowerGrill demo restaurant |
| `npm run prisma:studio` | Launches Prisma Studio GUI for visual database inspection |
| `npm run lint` | Runs ESLint analysis across the frontend codebase |

---

## 🛡️ Security & Reliability Best Practices

- **Strict Environment Hygiene:** All sensitive secrets, credentials, and tokens are strictly excluded from git tracking.
- **Client-Side Fault Isolation:** React Error Boundaries safeguard the user experience against unexpected rendering faults.
- **Automated Self-Healing:** Backend background routines automatically clean up stale tickets and maintain WebSocket session integrity.
- **Role-Based Access Control:** Distinct `OWNER`, `KITCHEN`, and `CASHIER` roles enforced with JWT tokens and bcrypt password hashing.

---

## 👨‍💻 Author

**Usama Khadar Hersi**  
Full-Stack Software Engineer  
- **GitHub:** [@usaamakhadar](https://github.com/usaamakhadar)  
- **Email:** [Osamakhadar1@gmail.com](mailto:Osamakhadar1@gmail.com)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
