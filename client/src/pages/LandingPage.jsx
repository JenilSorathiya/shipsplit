import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  PlayIcon,
  CheckIcon,
  TruckIcon,
  Squares2X2Icon,
  SparklesIcon,
  BoltIcon,
  ArchiveBoxIcon,
  PaintBrushIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

/* ─── Inline logo SVG ───────────────────────────────────────────────────────── */
function BoxLogo({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

/* ─── 5-star row ────────────────────────────────────────────────────────────── */
function Stars() {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className="h-4 w-4 text-amber-400" />
      ))}
    </div>
  );
}

/* ─── Landing-page plan data ────────────────────────────────────────────────── */
const LANDING_PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    tagline: 'Try everything, no card needed',
    priceDisplay: '₹0',
    priceSub: 'for 7 days',
    badge: null,
    color: 'gray',
    features: [
      '7 days full access',
      '1 platform (Amazon)',
      '500 orders / month',
      'All label split features',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaPath: '/register',
    isPaid: false,
  },
  {
    id: 'growth',
    name: 'Standard',
    tagline: 'For growing multi-platform sellers',
    priceDisplay: '₹999',
    priceSub: '/month',
    badge: 'Most Popular',
    color: 'primary',
    features: [
      '3 platforms (Amazon, Flipkart, Meesho or Myntra)',
      '2,000 orders / month',
      'All label split features',
      'CSV export',
      '3 devices',
    ],
    cta: 'Get Standard',
    ctaPath: '/pricing',
    isPaid: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For high-volume power sellers',
    priceDisplay: '₹1,999',
    priceSub: '/month',
    badge: null,
    color: 'violet',
    features: [
      'All 4 platforms',
      'Unlimited orders',
      'Custom label branding',
      'Priority phone + email support',
      'API access',
    ],
    cta: 'Get Pro',
    ctaPath: '/pricing',
    isPaid: true,
  },
];

const PLAN_STYLES = {
  gray: {
    ring: 'ring-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    btn: 'bg-gray-900 hover:bg-gray-700 text-white',
    check: 'text-gray-500',
  },
  primary: {
    ring: 'ring-primary-500',
    badge: 'bg-primary-600 text-white',
    btn: 'bg-primary-600 hover:bg-primary-700 text-white',
    check: 'text-primary-600',
  },
  violet: {
    ring: 'ring-violet-400',
    badge: 'bg-violet-600 text-white',
    btn: 'bg-violet-600 hover:bg-violet-700 text-white',
    check: 'text-violet-600',
  },
};

/* ─── FAQ data ──────────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'What platforms does ShipSplit support?',
    a: 'ShipSplit currently supports Amazon (via SP-API), Flipkart, Meesho, and Myntra. The Free Trial gives access to Amazon. Standard unlocks 3 platforms and Pro unlocks all 4.',
  },
  {
    q: 'How does the PDF label splitting work?',
    a: 'You connect your platform accounts and ShipSplit fetches your unshipped orders automatically every 30 minutes. It then groups and splits the shipping labels by courier partner, SKU, product category, or gift status — generating separate PDFs (or a single ZIP bundle) ready to hand off to your team.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. All data is encrypted in transit (TLS 1.3) and at rest. We use read-only API scopes wherever possible and never store your marketplace credentials. Your label data is isolated per account.',
  },
  {
    q: 'Can I try before paying?',
    a: 'Absolutely. The 7-day free trial gives you full access to all features on 1 platform (Amazon) with up to 500 orders — no credit card required. You only upgrade when you are ready.',
  },
  {
    q: 'What is the difference between courier-wise and SKU-wise split?',
    a: 'Courier-wise split groups all labels going with the same courier partner (e.g. Bluedart, Delhivery, Ecom Express) into one PDF — perfect for handing batches to pickup agents. SKU-wise split groups labels by product SKU or MSKU — ideal for warehouse pickers who pack by product type.',
  },
  {
    q: 'Does it work with FBA orders?',
    a: 'Yes. ShipSplit auto-detects FBA vs FBM orders from your Amazon account and can separate them into distinct label sets so your team knows which items to pull from FBA stock vs your own warehouse.',
  },
  {
    q: 'How do I apply for Amazon SP-API?',
    a: 'Once you create a ShipSplit account, the onboarding wizard guides you through registering as an Amazon developer and authorising ShipSplit in Seller Central. It typically takes under 10 minutes and does not require technical knowledge.',
  },
  {
    q: 'Can multiple team members use it?',
    a: 'Yes. The Standard plan supports 3 simultaneous devices and Pro supports unlimited devices. Team members can log in concurrently and each gets their own active session.',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq]       = useState(null);

  const navLinks = [
    { label: 'Features',     href: '#features'     },
    { label: 'How It Works', href: '#how-it-works'  },
    { label: 'Pricing',      href: '#pricing'       },
    { label: 'FAQ',          href: '#faq'           },
  ];

  return (
    <div className="scroll-smooth min-h-screen">

      {/* ══════════════════════════════════════════════════════════════════════
          1. STICKY NAV
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm">
                <BoxLogo className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-extrabold text-gray-900 tracking-tight">ShipSplit</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Desktop right actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/pricing"
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                Pricing
              </Link>
              <Link to="/login"    className="btn-secondary text-sm px-4 py-2">Sign in</Link>
              <Link to="/register" className="btn-primary  text-sm px-4 py-2">Start free</Link>
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen
                ? <XMarkIcon  className="h-6 w-6" />
                : <Bars3Icon  className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2 px-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-secondary w-full justify-center"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full justify-center"
                >
                  Start free
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          2. HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white pt-16 pb-24"
      >
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-amber-100/30 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          {/* Tag pill */}
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-4 py-1.5 text-sm font-semibold text-primary-700 mb-7 shadow-sm">
            <span>🇮🇳</span>
            <span>#1 Label Splitting Tool for Indian Sellers</span>
          </div>

          {/* H1 */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.07] tracking-tight mb-6">
            Save Time Profitably.<br />
            <span className="text-primary-600">Spend Time Productively!</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            ShipSplit automatically splits shipping labels from Amazon, Flipkart, Meesho &amp; Myntra
            by courier, SKU, or product — so your warehouse team never mis-ships again.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300"
            >
              Start 7-day free trial →
            </Link>
            <button className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-4 rounded-xl text-base transition-all shadow-sm">
              <PlayIcon className="h-5 w-5 text-primary-600" />
              Watch demo
            </button>
          </div>

          {/* Demo video placeholder */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video shadow-2xl max-w-3xl mx-auto border border-gray-800">
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* Fake browser chrome */}
            <div className="absolute top-0 inset-x-0 h-9 bg-gray-800/80 flex items-center gap-2 px-4">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <div className="ml-4 h-4 w-48 rounded bg-gray-700/60" />
            </div>
            {/* Fake UI */}
            <div className="absolute top-9 inset-x-0 bottom-0 flex">
              {/* Sidebar */}
              <div className="w-16 sm:w-20 bg-gray-800/60 border-r border-gray-700/50 flex flex-col gap-3 py-4 items-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 w-8 rounded bg-gray-700/60" />
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 p-4 sm:p-6 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="h-7 w-24 rounded bg-primary-500/30" />
                  <div className="h-7 w-16 rounded bg-gray-700/50" />
                  <div className="h-7 w-20 rounded bg-gray-700/50" />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-lg bg-gray-800/60 border border-gray-700/40 p-3 space-y-2">
                      <div className="h-3 w-16 rounded bg-gray-600/60" />
                      <div className="h-6 w-10 rounded bg-primary-400/30" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 rounded-lg bg-gray-800/40 border border-gray-700/30 mt-1" />
              </div>
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <button className="h-16 w-16 rounded-full bg-white/95 shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group">
                <PlayIcon className="h-7 w-7 text-primary-600 ml-1 group-hover:text-primary-700" />
              </button>
              <span className="text-sm font-semibold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                Product Demo · 2 min
              </span>
            </div>
          </div>

          {/* Platform trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-medium text-gray-400 mr-1">Works with</span>
            <span className="bg-orange-50 text-orange-700 border border-orange-200 font-bold text-sm px-3.5 py-1.5 rounded-full">
              Amazon
            </span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-sm px-3.5 py-1.5 rounded-full">
              Flipkart
            </span>
            <span className="bg-pink-50 text-pink-700 border border-pink-200 font-bold text-sm px-3.5 py-1.5 rounded-full">
              Meesho
            </span>
            <span className="bg-red-50 text-red-700 border border-red-200 font-bold text-sm px-3.5 py-1.5 rounded-full">
              Myntra
            </span>
          </div>

          {/* Stats bar */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { value: '500+',  label: 'sellers'           },
              { value: '1M+',   label: 'labels processed'  },
              { value: '99.9%', label: 'uptime'            },
              { value: '4',     label: 'platforms'         },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="hidden sm:block text-gray-200 text-lg select-none mx-1">·</span>
                )}
                <span className="font-extrabold text-gray-900 text-lg">{stat.value}</span>
                <span className="text-gray-500 text-sm">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. PLATFORM FEATURES
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-3 py-1 text-xs font-semibold text-primary-700 mb-4">
              Platform-specific features
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Everything your warehouse team needs
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Built ground-up for Indian ecommerce — each marketplace gets the exact integration it deserves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

            {/* Amazon */}
            <div className="card p-7 border-l-4 border-l-orange-400">
              <div className="flex items-center gap-3 mb-5">
                <span className="bg-orange-50 text-orange-700 border border-orange-200 font-extrabold text-sm px-3.5 py-1.5 rounded-full">
                  Amazon
                </span>
                <span className="text-xs text-gray-400">via SP-API</span>
              </div>
              <ul className="space-y-3">
                {[
                  'SP-API auto-sync every 30 minutes',
                  'FBA vs FBM order detection',
                  'Gift order automatic separation',
                  'MSKU display on labels',
                  'Unshipped + PartiallyShipped filter',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircleIcon className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Flipkart */}
            <div className="card p-7 border-l-4 border-l-blue-400">
              <div className="flex items-center gap-3 mb-5">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-sm px-3.5 py-1.5 rounded-full">
                  Flipkart
                </span>
                <span className="text-xs text-gray-400">CSV &amp; API</span>
              </div>
              <ul className="space-y-3">
                {[
                  'CSV & API order import',
                  'IMEI number support for electronics',
                  'Courier-wise label grouping',
                  'Bulk manifest download',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Meesho */}
            <div className="card p-7 border-l-4 border-l-pink-400">
              <div className="flex items-center gap-3 mb-5">
                <span className="bg-pink-50 text-pink-700 border border-pink-200 font-extrabold text-sm px-3.5 py-1.5 rounded-full">
                  Meesho
                </span>
                <span className="text-xs text-gray-400">Supplier sync</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Auto-detect supplier orders',
                  'Product-wise split by category',
                  'SKU grouping for warehouse',
                  'Return order handling',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircleIcon className="h-5 w-5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Myntra */}
            <div className="card p-7 border-l-4 border-l-red-400">
              <div className="flex items-center gap-3 mb-5">
                <span className="bg-red-50 text-red-700 border border-red-200 font-extrabold text-sm px-3.5 py-1.5 rounded-full">
                  Myntra
                </span>
                <span className="text-xs text-gray-400">Fashion-first</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Return label management',
                  'Style / article number on labels',
                  'Bulk processing up to 500',
                  'Quality check integration',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 mb-4">
              Simple setup
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              3 steps. Zero manual work.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line on desktop */}
            <div
              className="hidden md:block absolute top-14 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200"
              aria-hidden="true"
            />

            {[
              {
                step: '01',
                title: 'Connect platforms',
                desc: 'Link your Amazon, Flipkart, Meesho, and Myntra accounts with OAuth in under 2 minutes. No API keys to manage.',
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
                bg: 'bg-primary-600',
                label: 'text-primary-600',
              },
              {
                step: '02',
                title: 'Orders auto-sync',
                desc: 'ShipSplit fetches your unshipped orders every 30 minutes automatically. Or trigger a manual sync any time.',
                icon: <ArrowPathIcon className="h-7 w-7" />,
                bg: 'bg-emerald-600',
                label: 'text-emerald-600',
              },
              {
                step: '03',
                title: 'Download split labels',
                desc: 'Get courier-wise PDFs, SKU-grouped labels, gift order separations, and ZIP bundles — ready to print.',
                icon: <ArrowDownTrayIcon className="h-7 w-7" />,
                bg: 'bg-violet-600',
                label: 'text-violet-600',
              },
            ].map((s) => (
              <div key={s.step} className="card p-8 text-center">
                <div className={`h-14 w-14 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                  <span className="text-white">{s.icon}</span>
                </div>
                <div className={`text-xs font-black tracking-widest ${s.label} mb-2 uppercase`}>
                  Step {s.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. CORE FEATURES GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Powerful features, simple interface
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Every tool your operations team needs — packaged into a clean, no-nonsense dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                Icon: TruckIcon,
                title: 'Courier-wise split',
                desc: 'Group labels by Bluedart, Delhivery, Ecom Express and more, automatically.',
                bg: 'bg-primary-50',
                color: 'text-primary-600',
              },
              {
                Icon: Squares2X2Icon,
                title: 'SKU / MSKU grouping',
                desc: 'Sort labels by SKU or MSKU so pickers never scan the wrong shelf.',
                bg: 'bg-amber-50',
                color: 'text-amber-600',
              },
              {
                Icon: SparklesIcon,
                title: 'Gift order detection',
                desc: 'Auto-separate gift orders with messages into a dedicated PDF bundle.',
                bg: 'bg-pink-50',
                color: 'text-pink-600',
              },
              {
                Icon: BoltIcon,
                title: 'Batch 500 labels',
                desc: 'Process up to 500 labels in a single run — no timeouts, no crashes.',
                bg: 'bg-emerald-50',
                color: 'text-emerald-600',
              },
              {
                Icon: ArchiveBoxIcon,
                title: 'ZIP export',
                desc: 'Download all split PDFs as a single ZIP bundle with one click.',
                bg: 'bg-violet-50',
                color: 'text-violet-600',
              },
              {
                Icon: PaintBrushIcon,
                title: 'Custom watermarks',
                desc: 'Stamp your brand logo or warehouse code on every label page.',
                bg: 'bg-red-50',
                color: 'text-red-600',
              },
              {
                Icon: ChartBarIcon,
                title: 'Reports & analytics',
                desc: 'Daily shipment summaries, courier breakdowns, and volume trends.',
                bg: 'bg-blue-50',
                color: 'text-blue-600',
              },
              {
                Icon: ArrowPathIcon,
                title: '30-min auto-sync',
                desc: 'New orders appear in ShipSplit within 30 minutes of being placed.',
                bg: 'bg-teal-50',
                color: 'text-teal-600',
              },
            ].map((feat) => (
              <div key={feat.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className={`h-11 w-11 rounded-xl ${feat.bg} flex items-center justify-center mb-4`}>
                  <feat.Icon className={`h-6 w-6 ${feat.color}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{feat.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. PRICING
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-3 py-1 text-xs font-semibold text-primary-700 mb-4">
              Simple pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Plans for every seller
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Start free. Upgrade when you grow. All plans include the full label splitting engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {LANDING_PLANS.map((plan) => {
              const s = PLAN_STYLES[plan.color];
              const isPopular = plan.badge === 'Most Popular';
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border-2 bg-white p-7 transition-shadow
                    ${isPopular
                      ? `ring-2 ${s.ring} shadow-xl scale-[1.03]`
                      : 'ring-1 ring-gray-200 shadow-sm hover:shadow-md'
                    }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold px-3 py-1 rounded-full shadow ${s.badge}`}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>

                  {/* Price */}
                  <div className="mt-5 mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">{plan.priceDisplay}</span>
                      <span className="text-sm text-gray-400 mb-1">{plan.priceSub}</span>
                    </div>
                    {plan.isPaid && (
                      <p className="text-xs text-gray-400 mt-1">+ 18% GST</p>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    to={plan.ctaPath}
                    className={`block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-all mb-6 ${s.btn}`}
                  >
                    {plan.cta}
                  </Link>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <CheckIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${s.check}`} />
                        <span className="text-sm text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            All prices are exclusive of 18% GST · GST invoice provided for all paid plans ·{' '}
            <Link to="/pricing" className="underline hover:text-primary-600 transition-colors">
              View full feature comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Trusted by sellers across India
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From single-warehouse startups to multi-city operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {[
              {
                quote: "ShipSplit saves our team 2+ hours every morning. We used to manually sort 300 labels by courier — now it's one click. Absolute game changer.",
                name: 'Rahul Sharma',
                role: 'Operations Manager, Mumbai',
                sub: 'Amazon & Flipkart seller',
                initials: 'RS',
                avatarBg: 'bg-orange-100',
                avatarText: 'text-orange-700',
              },
              {
                quote: "Finally a tool that handles Flipkart and Meesho together! The CSV import is bulletproof and the SKU grouping means zero mis-picks in our warehouse.",
                name: 'Priya Patel',
                role: 'E-commerce Head, Ahmedabad',
                sub: '4-platform seller',
                initials: 'PP',
                avatarBg: 'bg-pink-100',
                avatarText: 'text-pink-700',
              },
              {
                quote: "The gift order detection feature alone is worth the subscription. During Diwali we had 40% gift orders — ShipSplit separated them automatically.",
                name: 'Amit Verma',
                role: 'Founder, ShopEasy',
                sub: 'Myntra & Amazon seller',
                initials: 'AV',
                avatarBg: 'bg-violet-100',
                avatarText: 'text-violet-700',
              },
            ].map((t) => (
              <div key={t.name} className="card p-7 flex flex-col">
                <Stars />
                <blockquote className="mt-4 text-sm text-gray-700 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className={`h-10 w-10 rounded-full ${t.avatarBg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${t.avatarText}`}>{t.initials}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                    <div className="text-xs text-gray-400">{t.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Can&apos;t find what you&apos;re looking for?{' '}
              <a href="mailto:support@shipsplit.in" className="text-primary-600 hover:underline">
                Email us
              </a>
            </p>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 pt-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          9. CTA BANNER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-900 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to split smarter?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Join 500+ Indian sellers who save hours every day with ShipSplit.
            7-day free trial, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-primary-900/30"
            >
              Start free trial →
            </Link>
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors underline underline-offset-4"
            >
              Talk to us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          10. FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* 4-col grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-gray-800">

            {/* Col 1 — Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <BoxLogo className="h-5 w-5 text-white" />
                </div>
                <span className="text-base font-extrabold text-white tracking-tight">ShipSplit</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Built for Indian ecommerce.
              </p>
              <p className="text-xs text-gray-600">
                © 2026 ShipSplit Technologies Pvt. Ltd.
              </p>
            </div>

            {/* Col 2 — Product */}
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-5">
                Product
              </h4>
              <ul className="space-y-3">
                <li><a href="#features"     className="text-sm hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing"      className="text-sm hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm hover:text-white transition-colors">How It Works</a></li>
                <li><Link to="/dashboard"   className="text-sm hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Col 3 — Legal */}
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-5">
                Legal
              </h4>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'Refund Policy', 'Cookie Policy'].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4 — Contact */}
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-5">
                Contact
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:support@shipsplit.in"
                    className="text-sm hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    support@shipsplit.in
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/919999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    {/* WhatsApp icon */}
                    <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp us
                  </a>
                </li>
                <li>
                  <a
                    href="https://twitter.com/shipsplit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    {/* X / Twitter icon */}
                    <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.74-8.855L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    @shipsplit
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <span>© 2026 ShipSplit Technologies Pvt. Ltd. · Made with ❤️ in India</span>
            <span>GST IN: 27XXXXX</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
