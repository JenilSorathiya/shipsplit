# ShipSplit

A SaaS shipping label management platform built for Indian ecommerce sellers on Amazon, Flipkart, Meesho, and Myntra. ShipSplit automates the process of splitting bulk shipping label PDFs, syncing orders across multiple marketplaces, and managing courier assignments — all behind a Razorpay-powered subscription model.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Environment Variables](#4-environment-variables)
5. [API Documentation](#5-api-documentation)
6. [Order Lifecycle](#6-order-lifecycle)
7. [Amazon MFN Label Flow](#7-amazon-mfn-label-flow)
8. [Subscription Plans](#8-subscription-plans)
9. [Amazon SP-API Setup Guide](#9-amazon-sp-api-setup-guide)
10. [Deployment Guide](#10-deployment-guide)
11. [PDF Splitting Engine](#11-pdf-splitting-engine)
12. [What Was Built — Session Log](#12-what-was-built--session-log)
13. [Contributing](#13-contributing)
14. [License](#14-license)

---

## 1. Project Overview

### What ShipSplit Does

ShipSplit solves a daily pain point for Indian ecommerce sellers: managing and printing shipping labels across multiple platforms at scale.

**Core capabilities:**

- **One-click order acceptance** — Click "Accept Order" on any pending order. ShipSplit automatically calls the Amazon MFN API (or compiles a label from order data), generates a PDF label, and makes it available for download — no wizard, no manual steps.
- **Shipping label splitting** — Upload a bulk PDF of shipping labels; ShipSplit splits each page into individual label files and organizes them by courier, SKU, product name, or order ID. Output is available as individual PDFs or a single ZIP archive.
- **Multi-platform order sync** — Connect your Amazon Seller Central account via SP-API. Pull orders automatically every hour or on demand.
- **Razorpay subscription billing** — Three-tier subscription plans (Free Trial, Standard, Pro) with Razorpay payment processing, webhook-based verification, and invoice history.
- **PDF overlays and transformations** — Stamp AWB numbers, SKU codes, and product names directly onto label pages. Resize pages to A4, A5, A6, or 4×6 inch formats. Remove blank pages automatically.
- **Analytics and reports** — Dashboard with order volume, courier breakdown, SKU performance, and CSV export.

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Backend framework | Express 4 |
| Database | MongoDB + Mongoose |
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS |
| PDF processing | pdf-lib |
| Payments | Razorpay |
| Marketplace integration | Amazon SP-API (Selling Partner API) |
| Authentication | JWT (access + refresh tokens), Google OAuth |

---

## 2. Project Structure

```
shipsplit/
├── client/                  # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── pages/           # Route-level page components
│   │   │   ├── OrdersPage.jsx          # Accept orders + download labels
│   │   │   ├── LabelGeneratorPage.jsx  # Label Splitter (upload flow)
│   │   │   └── DashboardPage.jsx
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # React Query data-fetching hooks
│   │   ├── context/         # AuthContext (user session state)
│   │   └── utils/           # api.js (axios instance + interceptors)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                  # Express backend
│   ├── controllers/
│   │   ├── orders.controller.js   # acceptOrder, syncOrders, uploadOrders, etc.
│   │   └── labels.controller.js   # uploadPdf, generate, download (w/ disk fallback)
│   ├── routes/
│   ├── models/
│   │   ├── Order.model.js         # labelId ref, status enum
│   │   └── Label.model.js         # splitType enum, files[], status
│   ├── services/
│   │   ├── amazon.service.js      # SP-API + MFN + sandbox label PDF
│   │   ├── pdfService.js          # compileLabelsIntoPdf, processLabels
│   │   └── syncJob.js             # Cron-based background sync
│   ├── middleware/
│   ├── utils/
│   ├── validations/
│   ├── server.js
│   └── package.json
│
├── shared/
│   └── constants.js
│
├── .env
├── .env.example
├── docker-compose.yml
└── package.json
```

---

## 3. Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- MongoDB (local installation or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- Git

### Step-by-Step Instructions

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/shipsplit.git
cd shipsplit

# 2. Install backend dependencies
cd server && npm install

# 3. Install frontend dependencies
cd ../client && npm install

# 4. Set up environment variables
cd ..
cp .env.example .env
# Open .env in your editor and fill in all required values
# See Section 4 for a full reference of every variable

# 5. Start MongoDB
# Option A — Local MongoDB
mongod --dbpath /data/db

# Option B — MongoDB Atlas
# No local setup needed; just set MONGODB_URI in .env to your Atlas connection string

# 6. Start the backend server
cd server
node server.js          # production mode
npx nodemon server.js   # development mode (auto-restarts on file changes)

# 7. Start the frontend (open a second terminal)
cd client
npm run dev             # starts on http://localhost:5173
```

Once both processes are running:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

---

## 4. Environment Variables

Create a `.env` file in the project root by copying `.env.example`. All variables listed below are required unless noted as optional.

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Port the Express server listens on | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/shipsplit` |
| `JWT_SECRET` | Secret key for signing access tokens (minimum 32 characters) | `a-random-32-character-string-here` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens (falls back to `JWT_SECRET` if unset) | `another-random-32-character-string` |
| `JWT_EXPIRES_IN` | Access token expiry duration | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry duration | `30d` |
| `CLIENT_URL` | Frontend URL used for CORS allow-list | `http://localhost:5173` |
| `ENCRYPT_KEY` | AES-256 encryption key for storing platform tokens (hex, 64 chars) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | `rzp_test_xxxxxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | `your-razorpay-secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for verifying Razorpay webhook signatures | `your-webhook-secret` |
| `AMAZON_APP_ID` | Amazon SP-API application ID | `amzn1.sp.solution.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AMAZON_CLIENT_ID` | Login with Amazon (LWA) OAuth client ID | `amzn1.application-oa2-client.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `AMAZON_CLIENT_SECRET` | LWA OAuth client secret | `your-lwa-client-secret` |
| `AMAZON_AWS_ACCESS_KEY_ID` | IAM user access key for SP-API request signing | `AKIAIOSFODNN7EXAMPLE` |
| `AMAZON_AWS_SECRET_ACCESS_KEY` | IAM user secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AMAZON_MARKETPLACE_ID` | Amazon marketplace identifier for India | `A21TJRUUN4KGV` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | `your-google-client-secret` |
| `SMTP_HOST` | SMTP server hostname for transactional email | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP authentication username | `your@email.com` |
| `SMTP_PASS` | SMTP password or app-specific password | `your-app-password` |
| `EMAIL_FROM` | Sender address shown in outgoing emails | `ShipSplit <noreply@shipsplit.in>` |

> **Security note:** Never commit `.env` to version control. The `.env.example` file (with placeholder values only) is safe to commit and should be kept up to date whenever new variables are added.

---

## 5. API Documentation

All endpoints are prefixed with `/api`. Authentication is via Bearer token in the `Authorization` header unless otherwise noted.

---

### Auth — `/api/auth`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/register` | No | Create a new user account |
| `POST` | `/login` | No | Authenticate and receive access + refresh tokens |
| `POST` | `/logout` | Yes | Invalidate the current session |
| `GET` | `/me` | Yes | Return the authenticated user's profile |
| `POST` | `/refresh-token` | No (uses refresh token) | Issue a new access token using a valid refresh token |
| `PUT` | `/profile` | Yes | Update display name, phone, business details |
| `PUT` | `/change-password` | Yes | Change the authenticated user's password |
| `GET` | `/google` | No | Redirect to Google OAuth consent screen |
| `GET` | `/google/callback` | No | Handle Google OAuth callback and issue tokens |

---

### Orders — `/api/orders`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/` | Yes | List orders with filters: `platform`, `status`, `courierPartner`, `search`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`, `page`, `limit` |
| `GET` | `/:id` | Yes | Fetch a single order by ID |
| `PATCH` | `/:id` | Yes | Update order fields: `status`, `courierPartner`, `awb`, `trackingUrl` |
| `DELETE` | `/:id` | Yes | Delete an order |
| `POST` | `/upload` | Yes | Import orders from a CSV file (platform specified in body) |
| `POST` | `/:id/accept` | Yes | **Accept a pending order — auto-generates label in background** |
| `POST` | `/:id/assign-courier` | Yes | Assign a courier to a single order |
| `POST` | `/bulk-assign-courier` | Yes | Assign a courier to multiple orders |
| `POST` | `/sync` | Yes | Trigger a manual sync of orders from a connected platform |

#### `POST /orders/:id/accept` — Accept Order

Transitions a `pending` order to `label_generated` and starts background label generation.

**Request:** No body required.

**Response `201`:**
```json
{
  "success": true,
  "message": "Order accepted — label generating",
  "data": {
    "orderId": "68abc123...",
    "labelId": "68def456..."
  }
}
```

After the response is sent, the server:
1. For Amazon orders: calls MFN API → `getEligibleShippingServices` → `createMFNShipment` → receives real label PDF + AWB
2. Fallback for non-Amazon or API failure: compiles a label PDF from order data using pdf-lib
3. Saves PDF to `uploads/output/:labelId/label_<orderId>.pdf`
4. Updates the Label record to `status: 'ready'` with the file URL

Poll `GET /labels/:labelId/status` every few seconds until `status === 'ready'`, then download via `GET /labels/:labelId/download/:filename`.

---

### Labels — `/api/labels`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/` | Yes | List all label jobs for the authenticated user |
| `GET` | `/:id` | Yes | Fetch metadata for a specific label job |
| `GET` | `/:id/status` | Yes | Poll the processing status (`pending` / `processing` / `ready` / `failed`) |
| `GET` | `/:id/download/:filename` | Yes | Download a generated label PDF (recompiles from DB if file was lost on disk) |
| `POST` | `/upload-pdf` | Yes | Upload a bulk label PDF to start a new split job |
| `POST` | `/generate` | Yes | Generate individual label PDFs from an existing job |
| `POST` | `/merge` | Yes | Merge selected label PDFs into a single combined PDF |
| `DELETE` | `/:id` | Yes | Delete a label job and its associated files |

---

### Platforms — `/api/platforms`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/amazon/oauth-url` | Yes | Generate the Amazon SP-API OAuth authorization URL |
| `GET` | `/amazon/callback` | No | Handle the Amazon OAuth redirect and store credentials |
| `GET` | `/` | Yes | List all connected platform integrations |
| `GET` | `/:name` | Yes | Fetch details for a specific platform (e.g. `amazon`) |
| `DELETE` | `/:name` | Yes | Disconnect and remove a platform integration |
| `POST` | `/:name/sync` | Yes | Trigger an immediate order sync for a platform |
| `PUT` | `/:name/settings` | Yes | Update sync settings (frequency, filters) |

---

### Subscription — `/api/subscription`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/` | Yes | Return the current user's active subscription details |
| `GET` | `/invoices` | Yes | List past invoices and payment history |
| `POST` | `/create-order` | Yes | Create a Razorpay order for a plan purchase or renewal |
| `POST` | `/verify` | Yes | Verify Razorpay payment signature and activate subscription |
| `POST` | `/cancel` | Yes | Cancel the active subscription at period end |

---

### Reports — `/api/reports`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/dashboard` | Yes | Summary metrics: order counts, label counts, top couriers, platform breakdown |
| `GET` | `/summary` | Yes | Aggregate totals filtered by date range |
| `GET` | `/orders-by-day` | Yes | Daily order volume time series |
| `GET` | `/courier-breakdown` | Yes | Order distribution across couriers |
| `GET` | `/sku-breakdown` | Yes | Order and label counts broken down by SKU |
| `GET` | `/export.csv` | Yes | Download a CSV export of order and label data |

---

## 6. Order Lifecycle

```
CSV Upload / API Sync
        │
        ▼
    [ pending ]
        │
        │  POST /orders/:id/accept
        ▼
[ label_generated ]  ◄── Label Job: status = processing
        │
        │  (background: MFN API or compiled PDF)
        ▼
        │                   Label Job: status = ready
        │  User downloads label
        ▼
   [ shipped ]   ◄── AWB + courierPartner assigned
        │
        ▼
  [ delivered ]
```

### Status Values

| Status | Meaning |
|---|---|
| `pending` | Order imported, awaiting acceptance |
| `label_generated` | Accepted; label PDF generating or ready |
| `shipped` | AWB assigned, dispatched to courier |
| `delivered` | Confirmed delivered |
| `cancelled` | Order cancelled |
| `returned` | Return initiated |

---

## 7. Amazon MFN Label Flow

When a seller accepts an Amazon order, ShipSplit uses the **Merchant Fulfillment Network (MFN) API** to create a real shipment on Amazon and receive an official label PDF.

### Production Flow

```
POST /orders/:id/accept
  │
  ├─ getEligibleShippingServices(platformDoc, order)
  │    → POST /mfn/v0/eligibleShippingServices
  │    → returns list of available couriers + service IDs
  │
  ├─ createMFNShipment(platformDoc, order, shippingServiceId)
  │    → POST /mfn/v0/shipments
  │    → returns { shipmentId, AWB, label: { FileContents: "<base64 PDF>" } }
  │
  └─ Decode base64 → pdfBuffer
       Save to disk → uploads/output/:labelId/label_<orderId>.pdf
       Update Order: awb, courierPartner = 'other', platformStatus = 'Shipped'
       Update Label: status = 'ready', files = [{ url, name }]
```

### Sandbox Behaviour

In sandbox mode, the MFN API requires specific static test order IDs to return label data. For all other cases, ShipSplit falls back to generating a realistic Amazon-style label using `pdf-lib`:

- **Format:** A5 landscape (302 × 453 pt)
- **Header:** Orange background with "amazon" logo + "Easy Ship" text
- **Order ID row:** Grey background showing the order ID
- **Ship To section:** Buyer name, full address
- **Product section:** Product name + SKU
- **AWB section:** Randomly generated `AMZL{timestamp}IN` number with a barcode simulation strip
- **Footer:** ShipSplit branding

### Fallback (Non-Amazon / API Error)

If the MFN API call fails or the platform is not Amazon, `pdfService.compileLabelsIntoPdf()` generates a label directly from the order data stored in MongoDB.

---

## 8. Subscription Plans

| Feature | Free Trial | Standard | Pro |
|---|---|---|---|
| **Price** | Free | ₹999 / month | ₹1,999 / month |
| **Duration** | 7 days | Monthly or Annual | Monthly or Annual |
| **Orders per month** | 500 | 2,000 | Unlimited |
| **Connected platforms** | 1 (Amazon only) | 3 | 4 (all platforms) |
| **Devices / sessions** | 1 | 3 | Unlimited |
| **API access** | No | No | Yes |
| **Custom branding on labels** | No | No | Yes |

Annual billing provides a discount equivalent to two months free compared to monthly billing.

---

## 9. Amazon SP-API Setup Guide

Follow these steps to connect ShipSplit to Amazon Seller Central via the Selling Partner API.

**Step 1 — Register as an SP-API developer**

Go to [https://developer.amazonservices.in/](https://developer.amazonservices.in/) and sign in with your Amazon Seller Central account. Complete the developer registration form.

**Step 2 — Create a new SP-API application**

In the Developer Console, create a new application. Select "Private Seller App" if you are building for your own account, or "Public App" if you plan to offer ShipSplit to other sellers.

**Step 3 — Record your application credentials**

After creating the application, note down:
- **App ID** → `AMAZON_APP_ID`
- **LWA Client ID** → `AMAZON_CLIENT_ID`
- **LWA Client Secret** → `AMAZON_CLIENT_SECRET`

**Step 4 — Create an IAM user**

In the [AWS IAM Console](https://console.aws.amazon.com/iam/), create a new IAM user. Attach the `AmazonSellingPartnerAPIRole` managed policy. This grants permissions required to sign SP-API requests.

**Step 5 — Generate IAM access keys**

Under the IAM user's Security Credentials tab, create an access key:
- **Access Key ID** → `AMAZON_AWS_ACCESS_KEY_ID`
- **Secret Access Key** → `AMAZON_AWS_SECRET_ACCESS_KEY`

**Step 6 — Configure the OAuth callback URL**

In your SP-API application settings, set the OAuth redirect URI to:

```
https://yourdomain.com/api/platforms/amazon/callback
```

For local development:

```
http://localhost:5000/api/platforms/amazon/callback
```

**Step 7 — Add all credentials to `.env`**

Populate all `AMAZON_*` variables in your `.env` file.

**Step 8 — Marketplace ID**

The Amazon marketplace ID for India (Amazon.in) is `A21TJRUUN4KGV`. Set this as `AMAZON_MARKETPLACE_ID`.

---

## 10. Deployment Guide

### Option A: Docker (Recommended)

```bash
docker-compose up -d
docker-compose logs -f backend
docker-compose down
```

### Option B: PM2 on a VPS

```bash
npm install -g pm2
cd client && npm run build
cd ../server && pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

`ecosystem.config.js` example:

```js
module.exports = {
  apps: [{
    name: 'shipsplit-api',
    script: 'server.js',
    cwd: '/var/www/shipsplit/server',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 5000 },
  }],
};
```

### Option C: Vercel (Frontend) + Render (Backend)

**Frontend — Vercel**

1. Import the repo into Vercel. Set root directory to `client/`.
2. Add `vercel.json` for SPA routing:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
3. Set `VITE_API_URL` to your Render backend URL.

**Backend — Render**

1. Create a new Web Service on Render, connect your GitHub repo.
2. Set root directory: `server/`, start command: `node server.js`.
3. Add all environment variables from Section 4 in the Render dashboard.

> **Important — Ephemeral Filesystem:** Render's free tier wipes `uploads/output/` on every redeploy. ShipSplit handles this automatically: if a label PDF is not found on disk, `downloadFile` recompiles the PDF on-the-fly from the order data stored in MongoDB. Label downloads always work, even after a redeploy.

---

## 11. PDF Splitting Engine

ShipSplit's PDF engine is built on [pdf-lib](https://pdf-lib.js.org/) and handles the full lifecycle of a label processing job.

### Ingestion

A bulk label PDF is uploaded via `POST /api/labels/upload-pdf`. The file is stored temporarily and a new label job is created in MongoDB with `status: 'pending'`.

### Page-to-Order Mapping

Each page in the uploaded PDF corresponds to exactly one order, mapped positionally (page 1 = order 1, etc.).

### Split Types

| Split Type | Behaviour |
|---|---|
| `courier` | One folder/archive per courier partner |
| `sku` | One folder/archive per SKU code |
| `product` | One folder/archive per product name |
| `order` | One file per order (individual labels) |

### Output

- Individual PDFs named by order ID.
- A ZIP archive for bulk download via `GET /api/labels/:id/download/:filename`.

### PDF Transformations

- AWB number overlay
- SKU overlay
- Product name overlay
- Blank page removal
- Page resize (A4, A5, A6, 4×6 inch)

### Limits

- Maximum **500 label pages per job**.
- Temporary files are cleaned up after download or after a configurable TTL.

---

## 12. What Was Built — Session Log

This section documents the features and fixes implemented during development sessions, in chronological order.

---

### Session 1 — Core Infrastructure

- Express server with JWT auth (access + refresh tokens), Google OAuth via Passport
- MongoDB models: User, Order, Label, Platform, Subscription, Returns, Remittances
- All base API routes wired up (auth, orders, labels, platforms, reports, subscription, returns, remittances)
- Razorpay subscription billing: create order → verify payment → webhook activation
- Rate limiting middleware, Helmet security headers, mongo-sanitize
- React frontend scaffold with Vite, Tailwind CSS, React Router v6
- Axios instance (`client/src/utils/api.js`) with JWT interceptors (auto-attach token, auto-refresh on 401)

---

### Session 2 — Orders Page & Dashboard Wired to Real API

**Problem:** The Orders page and Dashboard were showing hardcoded mock data instead of real API responses.

**Fixed:**

- `OrdersPage.jsx` — rewired all data fetching to `GET /api/orders` with filters (platform, status, search, date range, pagination). Pagination meta from `response.meta` now drives the page controls.
- `DashboardPage.jsx` — rewired to `GET /api/reports/dashboard` for real order counts, label counts, platform breakdown, courier stats.
- **Axios interceptor fix** (`client/src/utils/api.js`): the API returns `{ success, data, meta }` envelope. The interceptor was returning `response.data.data` (unwrapped), which dropped `meta`. Fixed by also storing `response.meta = body.meta` before returning, so components can read `response.meta.total` for pagination.

**Commit:** `a1c3d92` — "fix: wire Orders page and Dashboard to real API, fix axios meta unwrap"

---

### Session 3 — Amazon-Style Accept Order Flow

**Problem:** The app had a 5-step manual label generation wizard. Real shipping platforms (Amazon Seller Central) don't work this way — you accept an order and the label appears.

**What was built:**

#### Backend

**New route:** `POST /api/orders/:id/accept` (`server/routes/orders.routes.js`)

**New controller:** `acceptOrder` (`server/controllers/orders.controller.js`)

Flow:
1. Validates order exists and `status === 'pending'`
2. Creates a `Label` record with `status: 'processing'`, `splitType: 'order'`
3. Updates `order.status = 'label_generated'`, `order.labelId = labelJob._id`
4. Responds immediately with `{ orderId, labelId }` — frontend doesn't wait
5. Background (`setImmediate`):
   - **Amazon orders:** calls `getEligibleShippingServices` → `createMFNShipment` → gets real label PDF + AWB from Amazon
   - **Fallback:** `pdfSvc.compileLabelsIntoPdf()` generates label from order data
   - Saves PDF to `uploads/output/:labelId/label_<orderId>.pdf`
   - Updates Label to `status: 'ready'` with file info

**Bug fixed during development:** `Label.create({ splitType: 'none' })` crashed Mongoose validation because `'none'` is not in the enum `['courier', 'sku', 'product', 'order']`. Fixed by using `splitType: 'order'`.

**Commit:** `be8cde8` — "fix: use splitType 'order' (valid enum) in acceptOrder, not 'none'"

#### Frontend

**`OrdersPage.jsx`** — complete rewrite:

- Per-row contextual action buttons that change based on order state:
  - `pending` + no label → **"Accept Order"** (blue button)
  - Accepting in flight → spinner
  - Label processing → **"Generating…"** spinner
  - Label ready → **"Download Label"** (green button)
  - Label failed → **"Retry"** link
  - Other statuses → 3-dot row menu
- `labelStates` map (`{ [orderId]: { labelId, status, filename } }`) tracks per-order label state
- Pre-populates `labelStates` from `order.labelId` when orders load (already-accepted orders show Download immediately)
- Polling: `setInterval` every 3 seconds polls `GET /labels/:labelId/status` for any orders with `status: 'processing'`; fires a toast and updates button to "Download Label" when ready
- `handleDownloadLabel`: fetches status to get filename if needed, then downloads blob via `axios({ responseType: 'blob' })`
- How-it-works info banner at top of page

---

### Session 4 — Amazon MFN (Merchant Fulfillment Network) Label

**Problem:** The `acceptOrder` fallback was always using the compiled label. For Amazon orders, we should use Amazon's real label from the MFN API.

**What was built** (`server/services/amazon.service.js`):

**`getEligibleShippingServices(platform, order)`**
- Production: calls `POST /mfn/v0/eligibleShippingServices` (SP-API, AWS Sig v4 signed)
- Sandbox: returns static `{ ShippingServiceId: 'AMAZON_SHIPPING_SAMEDAY', ShippingServiceName: 'Amazon Easy Ship' }`

**`createMFNShipment(platform, order, shippingServiceId)`**
- Production: calls `POST /mfn/v0/shipments`, decodes `response.Label.FileContents` (base64 PDF) → `labelBuffer`
- Sandbox: calls `generateSandboxLabelPDF(order, awb)` to produce a realistic Amazon Easy Ship label

**`generateSandboxLabelPDF(order, awb)`** — internal function using pdf-lib:
- A5 size (302 × 453 pt)
- Orange header: "amazon" + "Easy Ship"
- Grey row: order ID
- "SHIP TO" section: buyer name + address
- Product + SKU section
- AWB number: `AMZL{timestamp}IN` + barcode strip simulation
- Footer: "ShipSplit • Powered by Amazon Easy Ship"

---

### Session 5 — Label Generator Simplification

**Problem:** `LabelGeneratorPage.jsx` (1109 lines) contained a 5-step wizard (step bar, split type selector, label size config, courier assignment, download). This workflow no longer made sense — orders now get labels automatically on accept.

**What was changed:**

- Removed: SPLIT_TYPES, COURIERS, LABEL_SIZES, PLATFORM_STYLE constants, STEPS array, StepBar component, Step1–Step5 components, the main multi-step wizard
- Kept: `UploadSplitSection` component (full upload flow for bulk PDF splitting — platform tabs, drag-and-drop, progress bar, results, download buttons)
- New page layout: 3-step how-it-works strip + UploadSplitSection + tip box pointing users to the Orders page for per-order labels
- Page title changed from "Label Generator" to **"Label Splitter"**
- File reduced from ~1109 lines to ~330 lines

---

### Session 6 — Ephemeral Disk Download Fallback

**Problem:** Render's free tier wipes the `uploads/output/` directory on every redeploy. After a redeploy, clicking "Download Label" returned 404 because the PDF file was gone from disk.

**Fix** (`server/controllers/labels.controller.js`, `downloadFile`):

```js
// Check if file exists on disk
let fileExistsOnDisk = false;
try { await fsp.access(filePath); fileExistsOnDisk = true; } catch { }

if (!fileExistsOnDisk) {
  // Recompile from order data in MongoDB
  const populated = await Label.findOne({ _id: id, userId: req.user._id })
    .populate('orderIds').lean();
  const pdfBuffer = await pdfSvc.compileLabelsIntoPdf(populated.orderIds, {
    pageSize: populated.settings?.pageSize || 'A4',
    labelsPerPage: populated.settings?.labelsPerPage || 1,
    settings: populated.settings || {},
  });
  res.set({ 'Content-Type': 'application/pdf', ... });
  return res.send(pdfBuffer);
}
```

Label downloads now work permanently regardless of server restarts or redeploys.

**Commit:** `51cd96d` — "fix: recompile label PDF on-the-fly if file missing after redeploy"

---

### Git Commit Log (this project)

| Commit | Message |
|---|---|
| `51cd96d` | fix: recompile label PDF on-the-fly if file missing after redeploy |
| `be8cde8` | fix: use splitType 'order' (valid enum) in acceptOrder, not 'none' |
| `2ce062e` | feat: Accept Order flow — auto-generate label, Orders page per-row actions |
| `a1c3d92` | fix: wire Orders page and Dashboard to real API, fix axios meta unwrap |
| *(earlier)* | feat: Amazon MFN label flow + sandbox PDF generation |
| *(earlier)* | feat: Label Generator simplified to Label Splitter |

---

## 13. Contributing

Contributions are welcome.

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-fork/shipsplit.git
cd shipsplit

# Create a feature branch from main
git checkout -b feature/your-feature-name

# Make your changes
git commit -m "feat: describe your change here"

# Push and open a pull request
git push origin feature/your-feature-name
```

### Guidelines

- Keep pull requests focused on a single feature or fix.
- Follow the existing code style.
- Update `.env.example` if you add new environment variables.
- Do not commit `.env`, secrets, or generated label files.

---

## 14. License

MIT License

Copyright (c) 2024 ShipSplit

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
