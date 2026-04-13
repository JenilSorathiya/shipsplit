import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon, BoltIcon, ShieldCheckIcon,
  ArrowUpCircleIcon, XCircleIcon, DocumentTextIcon,
  CalendarDaysIcon, ChartBarIcon, CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import {
  useSubscription, useInvoices, useCreateOrder,
  useVerifyPayment, useCancelSubscription, loadRazorpay,
} from '../hooks/useSubscription';

/* ── Constants ──────────────────────────────────────────────────────── */
const PLAN_META = {
  free:    { label: 'Free Trial',  icon: SparklesIcon,     color: 'gray',    orders: 500,      platforms: 1, monthly: 0,    annual: 0     },
  starter: { label: 'Free Trial',  icon: SparklesIcon,     color: 'gray',    orders: 500,      platforms: 1, monthly: 0,    annual: 0     },
  growth:  { label: 'Standard',    icon: BoltIcon,         color: 'primary', orders: 2000,     platforms: 3, monthly: 999,  annual: 9990  },
  pro:     { label: 'Pro',         icon: ShieldCheckIcon,  color: 'violet',  orders: Infinity, platforms: 4, monthly: 1999, annual: 19990 },
};

const STATUS_BADGE = {
  trialing:  { text: 'Trial',     cls: 'bg-blue-100 text-blue-700'    },
  active:    { text: 'Active',    cls: 'bg-green-100 text-green-700'  },
  cancelled: { text: 'Cancelled', cls: 'bg-red-100 text-red-600'      },
  expired:   { text: 'Expired',   cls: 'bg-gray-100 text-gray-600'    },
  past_due:  { text: 'Past due',  cls: 'bg-amber-100 text-amber-700'  },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const pct  = (u, m) => (m === Infinity || !m) ? 0 : Math.min(100, Math.round((u / m) * 100));

/* ── Cancel modal ───────────────────────────────────────────────────── */
function CancelModal({ onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel subscription?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Your access continues until end of current billing period. You can re-subscribe any time.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary text-sm">Keep subscription</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-60">
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Upgrade card ───────────────────────────────────────────────────── */
function UpgradeCard({ targetPlan, annual, onPay, paying }) {
  const meta  = PLAN_META[targetPlan];
  const Icon  = meta.icon;
  const price = annual ? meta.annual : meta.monthly;
  const isP   = targetPlan === 'pro';
  const feats = isP
    ? ['All 4 platforms', 'Unlimited orders', 'API access', 'Custom branding']
    : ['3 platforms', '2,000 orders/month', 'CSV export', '3 devices'];

  return (
    <div className={`rounded-xl border-2 p-5 flex items-start gap-4
        ${isP ? 'border-violet-300 bg-violet-50/20' : 'border-primary-300 bg-primary-50/20'}`}>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isP ? 'bg-violet-100' : 'bg-primary-100'}`}>
        <Icon className={`h-5 w-5 ${isP ? 'text-violet-600' : 'text-primary-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm">{meta.label} Plan</p>
        <p className="text-xs text-gray-500 mt-0.5">₹{price.toLocaleString('en-IN')}/{annual ? 'year' : 'month'} + GST</p>
        <ul className="mt-2 space-y-1">
          {feats.map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
              <CheckCircleIcon className={`h-3.5 w-3.5 flex-shrink-0 ${isP ? 'text-violet-500' : 'text-primary-500'}`} />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => onPay(targetPlan)}
        disabled={paying === targetPlan}
        className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all flex-shrink-0
            ${isP ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}
            ${paying === targetPlan ? 'opacity-60 cursor-wait' : ''}`}>
        {paying === targetPlan ? '…' : 'Upgrade'}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function BillingPage() {
  const [annual, setAnnual]         = useState(false);
  const [paying, setPaying]         = useState(null);
  const [showCancel, setShowCancel] = useState(false);

  const { user, refetchUser }       = useAuth();
  const { data: sub,  isLoading }   = useSubscription();
  const { data: invoices = [] }     = useInvoices();

  const { mutateAsync: createOrder }   = useCreateOrder();
  const { mutateAsync: verifyPayment } = useVerifyPayment();
  const { mutateAsync: cancelSub, isPending: cancelling } = useCancelSubscription();

  const planKey  = sub?.plan || 'free';
  const planMeta = PLAN_META[planKey] || PLAN_META.free;
  const Icon     = planMeta.icon;
  const badge    = STATUS_BADGE[sub?.status || 'active'];

  const ordersUsed  = sub?.ordersThisPeriod ?? 0;
  const ordersLimit = planMeta.orders;
  const usagePct    = pct(ordersUsed, ordersLimit);

  /* ── Razorpay checkout ── */
  const handlePay = useCallback(async (planId) => {
    setPaying(planId);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Payment gateway unavailable. Please try again.'); return; }

      const orderData = await createOrder({ plan: planId, billing: annual ? 'annual' : 'monthly' });

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.keyId,
          amount:      orderData.amount,
          currency:    orderData.currency || 'INR',
          name:        'ShipSplit',
          description: `${orderData.planName} Plan${annual ? ' (Annual)' : ''}`,
          order_id:    orderData.orderId,
          prefill:     { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
          theme:       { color: '#7c3aed' },
          modal:       { ondismiss: () => resolve(null) },
          handler:     async (resp) => {
            try {
              await verifyPayment({
                razorpayOrderId:   resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                plan: planId, billing: annual ? 'annual' : 'monthly',
              });
              await refetchUser();
              toast.success('🎉 Subscription upgraded!');
              resolve(true);
            } catch { reject(new Error('verify')); }
          },
        });
        rzp.on('payment.failed', (r) => { toast.error(`Payment failed: ${r.error.description}`); resolve(null); });
        rzp.open();
      });
    } catch (err) {
      if (err.message !== 'verify') toast.error('Something went wrong. Try again.');
    } finally { setPaying(null); }
  }, [user, annual, createOrder, verifyPayment, refetchUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      {showCancel && (
        <CancelModal
          onConfirm={async (r) => { await cancelSub(r); setShowCancel(false); }}
          onClose={() => setShowCancel(false)}
          loading={cancelling}
        />
      )}

      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your plan and payment history</p>
          </div>
          <Link to="/pricing" className="btn-secondary text-sm flex items-center gap-1.5">
            <ArrowUpCircleIcon className="h-4 w-4" /> View all plans
          </Link>
        </div>

        {/* ── Current plan card ── */}
        <div className={`rounded-2xl border-2 p-6
            ${planKey === 'growth' ? 'border-primary-200 bg-primary-50/20'
            : planKey === 'pro'    ? 'border-violet-200 bg-violet-50/20'
            :                        'border-gray-200   bg-gray-50/30'}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center
                  ${planKey === 'growth' ? 'bg-primary-100' : planKey === 'pro' ? 'bg-violet-100' : 'bg-gray-100'}`}>
                <Icon className={`h-6 w-6 ${planKey === 'growth' ? 'text-primary-600' : planKey === 'pro' ? 'text-violet-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">{planMeta.label} Plan</h2>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                </div>
                {sub?.status === 'trialing' && sub?.trialEndDate && (
                  <p className="text-sm text-amber-600 font-medium mt-0.5">Trial ends {fmt(sub.trialEndDate)}</p>
                )}
                {sub?.status === 'active' && sub?.currentPeriodEnd && (
                  <p className="text-sm text-gray-500 mt-0.5">Renews {fmt(sub.currentPeriodEnd)}</p>
                )}
                {sub?.status === 'cancelled' && sub?.currentPeriodEnd && (
                  <p className="text-sm text-red-500 mt-0.5">Access until {fmt(sub.currentPeriodEnd)}</p>
                )}
              </div>
            </div>
            {sub?.status === 'active' && planKey !== 'free' && planKey !== 'starter' && (
              <button onClick={() => setShowCancel(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <XCircleIcon className="h-4 w-4" /> Cancel plan
              </button>
            )}
          </div>

          {/* Usage stats */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ChartBarIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Orders this month</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {ordersUsed.toLocaleString('en-IN')}
                {ordersLimit !== Infinity && (
                  <span className="text-sm font-normal text-gray-400">/{ordersLimit.toLocaleString('en-IN')}</span>
                )}
              </p>
              {ordersLimit !== Infinity && (
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    usagePct > 80 ? 'bg-red-400' : usagePct > 60 ? 'bg-amber-400' : 'bg-primary-400'
                  }`} style={{ width: `${usagePct}%` }} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckBadgeIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Platforms</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{planMeta.platforms === 4 ? 'All 4' : planMeta.platforms}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {planMeta.platforms >= 4 ? 'Amazon, Flipkart, Meesho, Myntra'
                : planMeta.platforms === 3 ? 'Amazon + 2 of your choice'
                : 'Amazon only'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Next billing date</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {sub?.status === 'active' ? fmt(sub?.currentPeriodEnd) : '—'}
              </p>
              {sub?.lastPaymentAmount > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last: ₹{sub.lastPaymentAmount.toLocaleString('en-IN')} + GST
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Trial expired banner ── */}
        {sub?.status === 'expired' && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-4">
            <SparklesIcon className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-800">Your free trial has expired</p>
              <p className="text-sm text-amber-700 mt-1">Upgrade to continue accessing orders and labels.</p>
              <div className="flex gap-3 mt-3 flex-wrap">
                <button onClick={() => handlePay('growth')} disabled={paying === 'growth'}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60">
                  {paying === 'growth' ? '…' : 'Upgrade to Standard — ₹999/mo'}
                </button>
                <button onClick={() => handlePay('pro')} disabled={paying === 'pro'}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60">
                  {paying === 'pro' ? '…' : 'Upgrade to Pro — ₹1,999/mo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Upgrade options ── */}
        {planKey !== 'pro' && sub?.status !== 'expired' && (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Upgrade your plan</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className={`cursor-pointer font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`} onClick={() => setAnnual(false)}>Monthly</span>
                <button onClick={() => setAnnual(!annual)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${annual ? 'bg-primary-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-5' : ''}`} />
                </button>
                <span className={`cursor-pointer font-medium ${annual ? 'text-primary-600' : 'text-gray-400'}`} onClick={() => setAnnual(true)}>
                  Annual <span className="text-emerald-600 font-bold">(2 months free)</span>
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {(planKey === 'free' || planKey === 'starter') && (
                <UpgradeCard targetPlan="growth" annual={annual} onPay={handlePay} paying={paying} />
              )}
              {planKey !== 'pro' && (
                <UpgradeCard targetPlan="pro" annual={annual} onPay={handlePay} paying={paying} />
              )}
            </div>
          </div>
        )}

        {/* ── Invoice history ── */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Invoice history</h3>
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center">
              <DocumentTextIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No invoices yet</p>
              <p className="text-xs text-gray-300 mt-1">Invoices appear here after payments</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Date', 'Plan', 'Amount', 'Period', 'Payment ID'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{fmt(inv.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                            ${inv.plan === 'Pro' ? 'bg-violet-100 text-violet-700' : 'bg-primary-100 text-primary-700'}`}>
                          {inv.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{inv.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(inv.periodStart)} — {fmt(inv.periodEnd)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-[140px]">{inv.paymentId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          All prices are exclusive of 18% GST. GST invoices are emailed after each payment.
          Payments processed securely by Razorpay.
        </p>
      </div>
    </>
  );
}
