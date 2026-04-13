# ShipSplit

A SaaS shipping label management platform built for Indian ecommerce sellers on Amazon, Flipkart, Meesho, and Myntra. ShipSplit automates the process of splitting bulk shipping label PDFs, syncing orders across multiple marketplaces, and managing courier assignments — all behind a Razorpay-powered subscription model.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Environment Variables](#4-environment-variables)
5. [API Documentation](#5-api-documentation)
6. [Subscription Plans](#6-subscription-plans)
7. [Amazon SP-API Setup Guide](#7-amazon-sp-api-setup-guide)
8. [Deployment Guide](#8-deployment-guide)
9. [PDF Splitting Engine](#9-pdf-splitting-engine)
10. [Contributing](#10-contributing)
11. [License](#11-license)

---

## 1. Project Overview

### What ShipSplit Does

ShipSplit solves a daily pain point for Indian ecommerce sellers: managing and printing shipping labels across multiple platforms at scale.

**Core capabilities:**

- **Shipping label splitting** — Upload a bulk PDF of shipping labels; ShipSplit splits each page into individual label files and organizes them by courier, SKU, product name, or order ID. Output is available as individual PDFs or a single ZIP archive.
- **Multi-platform order sync** — Connect your Amazon Seller Central account via SP-API. Pull orders automatically, match them to label pages by position, and keep everything in sync.
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
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # React Query data-fetching hooks
│   │   ├── context/         # AuthContext (user session state)
│   │   └── utils/           # api.js (axios instance + interceptors)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                  # Express backend
│   ├── controllers/         # Route handler logic
│   ├── routes/              # Express router definitions
│   ├── models/              # Mongoose schemas (User, Order, Label, etc.)
│   ├── services/            # Business logic
│   │   ├── amazon.service.js
│   │   ├── pdfService.js
│   │   └── ...
│   ├── middleware/          # Auth, error handling, rate limiting
│   ├── utils/               # Helpers and shared utilities
│   ├── validations/         # Request validation schemas
│   ├── server.js            # App entry point
│   └── package.json
│
├── shared/                  # Constants shared between client and server
│   └── constants.js
│
├── .env                     # Environment variables (never commit this)
├── .env.example             # Template for environment variables
├── docker-compose.yml       # Docker orchestration
└── package.json             # Root package (optional workspace config)
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
# Option A — Local MongoDB (must be running before starting the server)
mongod --dbpath /data/db

# Option B — MongoDB Atlas
# No local setup needed; just set MONGODB_URI in .env to your Atlas connection string

# 6. Start the backend server
cd server
node server.js          # production mode
npx nodemon server.js   # development mode (auto-restarts on file changes)

# 7. Start the frontend (open a second terminal)
cd client
npm run dev             # starts on http://localhost:3000
```

Once both processes are running:
- Frontend: `http://localhost:3000`
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
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens (minimum 32 characters) | `another-random-32-character-string` |
| `JWT_EXPIRES_IN` | Access token expiry duration | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry duration | `30d` |
| `CLIENT_URL` | Frontend URL used for CORS allow-list | `http://localhost:3000` |
| `ENCRYPT_KEY` | AES-256 encryption key for storing platform tokens (hex, 64 characters) | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
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
| `GET` | `/` | Yes | List orders with optional filters (platform, status, date range, search) |
| `GET` | `/:id` | Yes | Fetch a single order by ID |
| `PATCH` | `/:id` | Yes | Update order fields (status, courier, notes) |
| `DELETE` | `/:id` | Yes | Delete an order |
| `POST` | `/upload` | Yes | Import orders from a CSV file |
| `POST` | `/:id/assign-courier` | Yes | Assign a courier to a single order |
| `POST` | `/bulk-assign-courier` | Yes | Assign a courier to multiple orders in one request |
| `POST` | `/sync` | Yes | Trigger a manual sync of orders from connected platforms |

---

### Labels — `/api/labels`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/` | Yes | List all label jobs for the authenticated user |
| `GET` | `/:id` | Yes | Fetch metadata for a specific label job |
| `GET` | `/:id/status` | Yes | Poll the processing status of a label job |
| `GET` | `/:id/download/:filename` | Yes | Download a generated label file (PDF or ZIP) |
| `POST` | `/upload-pdf` | Yes | Upload a bulk label PDF to start a new job |
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
| `GET` | `/:name` | Yes | Fetch details for a specific platform (e.g., `amazon`) |
| `DELETE` | `/:name` | Yes | Disconnect and remove a platform integration |
| `POST` | `/:name/sync` | Yes | Trigger an immediate order sync for a platform |
| `PUT` | `/:name/settings` | Yes | Update sync settings for a platform (frequency, filters) |

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
| `GET` | `/dashboard` | Yes | Summary metrics for the dashboard (order count, label count, top couriers) |
| `GET` | `/summary` | Yes | Aggregate totals filtered by date range |
| `GET` | `/orders-by-day` | Yes | Daily order volume time series |
| `GET` | `/courier-breakdown` | Yes | Order distribution across couriers |
| `GET` | `/sku-breakdown` | Yes | Order and label counts broken down by SKU |
| `GET` | `/export.csv` | Yes | Download a CSV export of order and label data for the selected period |

---

## 6. Subscription Plans

| Feature | Free Trial | Standard | Pro |
|---|---|---|---|
| **Price** | Free | ₹999 / month | ₹1,999 / month |
| **Duration** | 7 days | Monthly or Annual | Monthly or Annual |
| **Orders per month** | 500 | 2,000 | Unlimited |
| **Connected platforms** | 1 (Amazon only) | 3 | 4 (all platforms) |
| **Devices / sessions** | 1 | 3 | Unlimited |
| **API access** | No | No | Yes |
| **Custom branding on labels** | No | No | Yes |

Annual billing provides a discount equivalent to two months free compared to monthly billing. Subscriptions are managed through Razorpay; cancellations take effect at the end of the current billing period.

---

## 7. Amazon SP-API Setup Guide

Follow these steps to connect ShipSplit to Amazon Seller Central via the Selling Partner API.

**Step 1 — Register as an SP-API developer**

Go to [https://developer.amazonservices.in/](https://developer.amazonservices.in/) and sign in with your Amazon Seller Central account. Complete the developer registration form.

**Step 2 — Create a new SP-API application**

In the Developer Console, create a new application. Select "Private Seller App" if you are building for your own account, or "Public App" if you plan to offer ShipSplit to other sellers.

**Step 3 — Record your application credentials**

After creating the application, note down:
- **App ID** — goes into `AMAZON_APP_ID`
- **LWA Client ID** — goes into `AMAZON_CLIENT_ID`
- **LWA Client Secret** — goes into `AMAZON_CLIENT_SECRET`

**Step 4 — Create an IAM user**

In the [AWS IAM Console](https://console.aws.amazon.com/iam/), create a new IAM user. Attach the `AmazonSellingPartnerAPIRole` managed policy to the user. This grants the permissions required to sign SP-API requests.

**Step 5 — Generate IAM access keys**

Under the IAM user's Security Credentials tab, create an access key. Save:
- **Access Key ID** — goes into `AMAZON_AWS_ACCESS_KEY_ID`
- **Secret Access Key** — goes into `AMAZON_AWS_SECRET_ACCESS_KEY`

**Step 6 — Configure the OAuth callback URL**

In your SP-API application settings, set the OAuth redirect URI to:

```
https://yourdomain.com/api/platforms/amazon/callback
```

For local development use:

```
http://localhost:5000/api/platforms/amazon/callback
```

**Step 7 — Add all credentials to `.env`**

Populate `AMAZON_APP_ID`, `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, `AMAZON_AWS_ACCESS_KEY_ID`, and `AMAZON_AWS_SECRET_ACCESS_KEY` in your `.env` file.

**Step 8 — Marketplace ID**

The Amazon marketplace ID for India (Amazon.in) is:

```
A21TJRUUN4KGV
```

Set this as `AMAZON_MARKETPLACE_ID` in `.env`.

Once configured, users can connect their Seller Central account from the Platforms page in the ShipSplit dashboard. ShipSplit will request the OAuth authorization URL from `/api/platforms/amazon/oauth-url` and complete the token exchange via the callback.

---

## 8. Deployment Guide

### Option A: Docker (Recommended)

The repository includes a `docker-compose.yml` that orchestrates the backend, frontend build, and a MongoDB container.

```bash
# Build images and start all services in the background
docker-compose up -d

# Tail logs for the backend service
docker-compose logs -f backend

# Stop all services
docker-compose down
```

Make sure to supply environment variables either through a `.env` file at the project root (Docker Compose reads it automatically) or via the `environment:` section in `docker-compose.yml`.

---

### Option B: PM2 on a VPS

Suitable for a single Linux VPS (Ubuntu, Debian, etc.) running Node.js directly.

```bash
# Install PM2 globally
npm install -g pm2

# Build the frontend for production
cd client
npm run build
# Serve the dist/ directory via Nginx or another static file server

# Start the backend with PM2
cd ../server
pm2 start ecosystem.config.js

# Persist the PM2 process list across server reboots
pm2 save
pm2 startup
# Run the command that pm2 startup prints to register the init script
```

An `ecosystem.config.js` example:

```js
module.exports = {
  apps: [
    {
      name: 'shipsplit-api',
      script: 'server.js',
      cwd: '/var/www/shipsplit/server',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

---

### Option C: Vercel (Frontend) + Railway or Render (Backend)

A fully managed, zero-infrastructure option.

**Frontend — Vercel**

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com) and set the root directory to `client/`.
3. Vercel detects Vite automatically. Add a `vercel.json` in `client/` if you need to configure rewrites for client-side routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

4. Set `VITE_API_URL` to your backend URL in Vercel's Environment Variables settings.

**Backend — Railway or Render**

1. Create a new service in [Railway](https://railway.app) or [Render](https://render.com) and connect the same GitHub repository.
2. Set the root directory to `server/`.
3. Set the start command to `node server.js`.
4. Add all server-side environment variables from Section 4 in the platform's dashboard.
5. Update `CLIENT_URL` in the backend environment to match your Vercel deployment URL.

---

## 9. PDF Splitting Engine

ShipSplit's PDF engine is built on [pdf-lib](https://pdf-lib.js.org/) and handles the full lifecycle of a label processing job.

### Ingestion

A bulk label PDF is uploaded via `POST /api/labels/upload-pdf`. The file is stored temporarily on the server and a new label job record is created in MongoDB with status `pending`.

### Page-to-Order Mapping

Each page in the uploaded PDF corresponds to exactly one order, mapped positionally (page 1 = order 1, page 2 = order 2, etc.). The frontend order list must be sorted to match the page sequence before generating labels.

### Split Types

When a split job is triggered via `POST /api/labels/generate`, the user selects a split type that determines how output files are grouped:

| Split Type | Behaviour |
|---|---|
| `courier` | One folder/archive per courier (Blue Dart, Delhivery, Xpressbees, etc.) |
| `sku` | One folder/archive per SKU code |
| `product` | One folder/archive per product name |
| `orderid` | Each label saved as an individual file named by order ID |
| `gift` | Separates gift-wrapped orders into their own group |
| `none` | All labels kept in a single flat archive |

### Output

- Individual PDFs for each label page, named by order ID or sequence number.
- A single ZIP archive containing all generated files, available for bulk download via `GET /api/labels/:id/download/:filename`.

### PDF Transformations

The following transformations can be applied during generation:

- **AWB overlay** — Stamps the Airway Bill number onto the label.
- **SKU overlay** — Adds the SKU code as text on the label.
- **Product name overlay** — Adds the product name as a text overlay.
- **Watermark** — Applies a custom watermark (e.g., store name or logo) across the label.
- **Blank page removal** — Detects and skips pages that are entirely blank.
- **Page resize** — Resamples and crops pages to A4, A5, A6, or 4×6 inch dimensions.

### Limits

- Maximum **500 label pages per job** to keep processing times within acceptable bounds.
- Files are cleaned up from temporary storage after the job is downloaded or after a configurable TTL.

---

## 10. Contributing

Contributions are welcome. Please follow the steps below.

### Getting Started

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-fork/shipsplit.git
cd shipsplit
```

### Workflow

```bash
# Create a feature branch from main
git checkout -b feature/your-feature-name

# Make your changes, then run the test suite
node server/test.js

# Commit with a clear message
git commit -m "feat: describe your change here"

# Push your branch and open a pull request
git push origin feature/your-feature-name
```

### Guidelines

- Keep pull requests focused on a single feature or fix.
- Add or update tests in `server/test.js` for any new API behaviour.
- Follow the existing code style (ESLint config is in `.eslintrc.js`).
- Update `.env.example` if you add new environment variables.
- Do not commit `.env`, secrets, or generated label files.

---

## 11. License

MIT License

Copyright (c) 2024 ShipSplit

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"# shipsplit" 
