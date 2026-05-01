# ShipSplit — Project Overview

## What Is This?

ShipSplit is a **multi-platform seller management dashboard** built for Indian e-commerce sellers.
It lets sellers manage all their platforms (Amazon, Flipkart, Meesho, Myntra) from one place.

**Live URLs:**
- Frontend: https://shipsplitt.vercel.app
- Backend API: https://shipsplit.onrender.com
- GitHub: https://github.com/JenilSorathiya/shipsplit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (access token in localStorage) + Passport.js |
| File Upload | Multer |
| PDF Processing | pdf-lib (split) + pdf-parse (text extraction) |
| ZIP Creation | Archiver + AdmZip |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Features Built

### 1. Authentication
- Register / Login with email + password
- JWT stored in localStorage, sent via Authorization header
- Google OAuth (conditional — only if env vars set)
- Protected routes (dashboard requires login)
- Guest routes (login/register redirect to dashboard if already logged in)

### 2. Dashboard Home
- Stats cards: Total Orders, Pending Labels, Shipped Today, Monthly Revenue
- Area chart: Orders & Labels this week (Recharts)
- Platform split breakdown (Amazon, Flipkart, Meesho, Myntra)
- Recent orders table
- Status overview: To Process, In Transit, Delivered, Returned
- Alert banner for pending labels

### 3. Orders Page
- Table with all orders (mock data, ready for real API)
- Filters: Search, Platform, Status, Courier, Date Range
- Bulk select + actions (Generate Labels, Export CSV, Delete)
- Pagination
- Per-row actions: View, Delete

### 4. Label Generator Page
- Platform tabs: Amazon, Flipkart, Meesho, Myntra
- Courier partner selection
- Label size/format settings
- Generate labels (async job with progress polling)
- Download labels (PDF/ZIP)
- Merge multiple label jobs into one PDF

### 5. PDF Label Splitter (Key Feature)
- Upload any bulk label PDF (Meesho, Amazon, etc.)
- Auto-detect platform from PDF content
- Auto-detect courier per page (Delhivery, Shadowfax, Valmo, Ekart, Bluedart, DTDC, XpressBees, Ecom, Smartr, Shiprocket, Amazon)
- Auto-detect SKU/product per page
- Split into individual pages
- Create ZIP with structure:
  - by_courier / Courier / Product / Product.pdf (merged multi-page)
  - by_product / Product / Courier / Courier.pdf (merged multi-page)
  - all_labels / all_labels.pdf (all pages sorted courier A-Z → product A-Z)
- Three download buttons: By Courier, By Product, All Labels
- Results show courier count table + product count table

### 6. Returns Page (RTO/CTO)
- Stats: Total Returns, RTO count, CTO count, Refund Pending
- Filter tabs: All / RTO / CTO
- Filters: Status, Date Range, Search
- Table with return type badges (RTO = red, CTO = orange)
- Actions: Mark Received, Mark Refunded

### 7. Payments / COD Remittance Page
- Track COD payment cycles from Amazon/Meesho
- Timeline view of payment schedule
- Stats: Total Pending, This Week, Overdue, Received
- Filter by platform and status

### 8. Settings Page
- Profile tab: Update name, email, phone
- Platforms tab: Connect Amazon (OAuth), Flipkart, Meesho, Myntra
- Courier Partners tab: Enable/disable couriers
- Notifications tab: Toggle notification preferences
- Billing tab: Current plan, usage, upgrade

### 9. Billing Page
- Current subscription plan
- Usage stats
- Plan upgrade options

### 10. Privacy Policy Page
- Full privacy policy at /privacy
- Required for Amazon SP-API submission

---

## Platform Integrations

### Amazon SP-API
- OAuth flow built (redirect to Amazon → callback → save tokens)
- Status: Waiting for Amazon Public Developer approval
- Issue: Rejected once — appeal in progress
- App ID stored in AMAZON_APP_ID env var

### Flipkart, Meesho, Myntra
- UI built (connect buttons in Settings)
- Backend routes ready
- API integration: Not started yet

---

## Backend Structure

```
server/
├── controllers/
│   ├── auth.controller.js
│   ├── labels.controller.js     ← PDF splitter lives here
│   ├── orders.controller.js
│   ├── platforms.controller.js  ← Amazon OAuth
│   ├── reports.controller.js
│   ├── returns.controller.js
│   ├── remittances.controller.js
│   ├── settings.controller.js
│   └── subscription.controller.js
├── models/
│   ├── User.model.js
│   ├── Order.model.js
│   ├── Label.model.js
│   ├── Return.model.js
│   └── Remittance.model.js
├── routes/
│   ├── auth.routes.js
│   ├── labels.routes.js
│   ├── orders.routes.js
│   ├── platforms.routes.js
│   ├── returns.routes.js
│   ├── remittances.routes.js
│   ├── reports.routes.js
│   ├── settings.routes.js
│   └── subscription.routes.js
├── middleware/
│   ├── auth.middleware.js
│   ├── errorHandler.middleware.js
│   ├── passport.js
│   ├── rateLimiter.middleware.js
│   ├── upload.middleware.js
│   └── validate.middleware.js
├── services/
│   ├── amazon.service.js
│   ├── pdfService.js
│   └── syncJob.js
└── server.js
```

---

## Frontend Structure

```
client/src/
├── components/
│   └── dashboard/
│       └── DashboardLayout.jsx  ← sidebar + topbar + routing
├── context/
│   └── AuthContext.jsx
├── hooks/
│   └── useAuth.js
├── pages/
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx
│   ├── OrdersPage.jsx
│   ├── LabelGeneratorPage.jsx   ← includes PDF splitter UI
│   ├── ReturnsPage.jsx
│   ├── PaymentsPage.jsx
│   ├── ReportsPage.jsx
│   ├── SettingsPage.jsx
│   ├── BillingPage.jsx
│   └── PrivacyPage.jsx
└── utils/
    └── api.js                   ← axios instance with JWT interceptor
```

---

## Environment Variables

### Backend (Render)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=production
PORT=10000
AMAZON_APP_ID=...
AMAZON_CLIENT_ID=...
AMAZON_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=... (optional)
GOOGLE_CLIENT_SECRET=... (optional)
```

### Frontend (Vercel)
```
VITE_API_URL=https://shipsplit.onrender.com/api
```

---

## Key Bugs Fixed

| Bug | Fix |
|---|---|
| White screen on first load | Skip /auth/me if no token in localStorage |
| 401 on every page load | Don't redirect on /auth/me 401, let AuthContext handle it |
| PDF splitter 500 error | Create uploads/temp and uploads/splits dirs at startup |
| pdf-lib copyPagesFrom error | Correct API is copyPages() |
| Text extraction returning empty | Use pdf-parse v1.1.1 (not v2) |
| Meesho SKU not detected | Columns merged with no spaces — fixed regex |
| Amazon OAuth application_id=undefined | Use AMAZON_APP_ID env var (App ID, not Client ID) |
| Rate limiter X-Forwarded-For error | trust proxy=1 + validate.xForwardedForHeader=false |
| CORS blocking Vercel preview URLs | origin: true (reflect any origin) |
| Sidebar pushing content on mobile | Use lg:ml-60 instead of inline marginLeft |

---

## What Is Pending

| Feature | Status |
|---|---|
| Amazon SP-API approval | Appeal submitted — waiting |
| Real order data from Amazon | Blocked by SP-API approval |
| Flipkart API integration | Not started |
| Meesho API integration | Not started |
| Real orders in Orders page | Mock data currently |
| Real remittances data | Mock data currently |
| App name change | Deciding new name |
| Selling Partner Appstore listing | Required for Amazon approval |

---

## PDF Splitter — How It Works

1. User uploads bulk label PDF (e.g. Meesho Sub_Order_Labels.pdf)
2. Server loads PDF with pdf-lib, counts pages
3. For each page:
   - Creates single-page PDF buffer using pdf-lib copyPages()
   - Extracts text using pdf-parse (handles compressed streams)
   - Detects courier from text (regex patterns for 11 couriers)
   - Detects SKU from text (regex after "Order No." header line)
4. Groups pages: courier → product (nested)
5. Merges pages per group into one multi-page PDF using pdf-lib
6. Builds ZIP with archiver:
   - by_courier/Courier/Product/Product.pdf
   - by_product/Product/Courier/Courier.pdf
   - all_labels/all_labels.pdf (sorted courier A-Z → product A-Z)
7. Returns splitId + summary (courier counts, product counts)
8. Frontend shows download buttons → fetches filtered ZIP from server

---

## Business Context

- **Owner:** J P Enterprise
- **Product:** ShipSplit (software product)
- **Target users:** Indian e-commerce sellers on Amazon, Flipkart, Meesho, Myntra
- **Core value:** Manage all platforms from one dashboard — labels, orders, returns, payments
- **Monetization:** Subscription plans (Free / Pro / Business)
