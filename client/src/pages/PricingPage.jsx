import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckIcon, SparklesIcon, BoltIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useCreateOrder, useVerifyPayment, loadRazorpay } from '../hooks/useSubscription';

/* ── Plan data ───────────────────────────────────────────────────────── */
const PLANS = [
  {
    id:          'free',
    name:        'Free Trial',
    tagline:     'Try everything, no card needed',
    monthlyPrice: 0,
    annualPrice:  0,
    badge:        null,
    color:        'gray',
    icon:         SparklesIcon,
    features: [
      { text: '7 days free trial',              included: true  },
      { text: 'All features unlocked',           included: true  },
      { text: '1 platform (Amazon)',             included: true  },
      { text: '500 orders / month',              included: true  },
      { text: 'Single device usage',             included: true  },
      { text: 'Email support',                   included: true  },
      { text: 'CSV export',                      included: false },
      { text: 'Priority support',                included: false },
      { text: 'API access',                      included: false },
    ],
    cta:     'Start Free Trial',
    ctaPath: '/register',
    isPaid:  false,
  },
  {
    id:          'growth',
    name:        'Standard',
    tagline:     'For growing multi-platform sellers',
    monthlyPrice: 999,
    annualPrice:  9990,
    badge:        'Most Popular',
    color:        'primary',
    icon:         BoltIcon,
    features: [
      { text: '3 platforms (Amazon + Flipkart + Meesho or Myntra)', included: true },
      { text: '2,000 orders / month',            included: true  },
      { text: 'All label split features',         included: true  },
      { text: 'CSV export',                       included: true  },
      { text: '3 devices',                        included: true  },
      { text: 'Email support',                    included: true  },
      { text: 'Priority support',                 included: false },
      { text: 'API access',                       included: false },
      { text: 'Custom label branding',            included: false },
    ],
    cta:    'Get Standard',
    isPaid: true,
  },
  {
    id:          'pro',
    name:        'Pro',
    tagline:     'For high-volume power sellers',
    monthlyPrice: 1999,
    annualPrice:  19990,
    badge:        null,
    color:        'violet',
    icon:         ShieldCheckIcon,
    features: [
      { text: 'All 4 platforms (Amazon + Flipkart + Meesho + Myntra)', included: true },
      { text: 'Unlimited orders',                 included: true  },
      { text: 'All features',                     included: true  },
      { text: 'CSV export',                       included: true  },
      { text: 'Unlimited devices',                included: true  },
      { text: 'Priority phone + email support',   included: true  },
      { text: 'API access',                       included: true  },
      { text: 'Custom label branding',            included: true  },
      { text: 'Dedicated account manager',        included: true  },
    ],
    cta:    'Get Pro',
    isPaid: true,
  },
];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your billing page anytime. You keep access until your current billing period ends — no refund needed.',
  },
  {
    q: 'Do prices include GST?',
    a: 'Prices shown are exclusive of 18% GST. GST will be added at checkout. You\'ll receive a GST invoice for all payments.',
  },
  {
    q: 'What happens after the free trial?',
    a: 'After 7 days your trial expires automatically. You can upgrade to Standard or Pro to continue. No card is charged without your action.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade or downgrade at any time from the billing settings page. Upgrades are effective immediately.',
  },
  {
    q: 'Is my payment secure?',
    a: 'All payments are processed by Razorpay — India\'s most trusted payment gateway. We never store your card details.',
  },
];

/* ── Color helpers ──────────────────────────────────────────────────── */
const CARD_STYLES = {
  gray:    { ring: 'ring-gray-200',    badge: 'bg-gray-100 text-gray-700',   btn: 'bg-gray-900 hover:bg-gray-700 text-white', check: 'text-gray-500' },
  primary: { ring: 'ring-primary-500', badge: 'bg-primary-600 text-white',   btn: 'bg-primary-600 hover:bg-primary-700 text-white', check: 'text-primary-600' },
  violet:  { ring: 'ring-violet-400',  badge: 'bg-violet-600 text-white',    btn: 'bg-violet-600 hover:bg-violet-700 text-white', check: 'text-violet-600' },
};

/* ── Price display ──────────────────────────────────────────────────── */
function PriceDisplay({ plan, annual }) {
  if (!plan.isPaid) {
    return (
      <div className="mt-4">
        <span className="text-4xl font-extrabold text-gray-900">₹0</span>
        <span className="text-sm text-gray-500 ml-1">for 7 days</span>
      </div>
    );
  }
  const price   = annual ? plan.annualPrice  : plan.monthlyPrice;
  const perMonth = annual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
  const saving  = annual ? plan.monthlyPrice * 2 : 0;

  return (
    <div className="mt-4">
      {annual && (
        <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full inline-flex px-2 py-0.5 mb-2">
          Save ₹{saving.toLocaleString('en-IN')} / year
        </div>
      )}
      <div className="flex items-end gap-1">
        <span className="text-4xl font-extrabold text-gray-900">₹{perMonth.toLocaleString('en-IN')}</span>
        <span className="text-sm text-gray-500 mb-1">/month</span>
      </div>
      {annual && (
        <p className="text-xs text-gray-500 mt-0.5">
          Billed ₹{price.toLocaleString('en-IN')} annually
        </p>
      )}
      <p className="text-xs text-gray-400 mt-1">+ 18% GST</p>
    </div>
  );
}

/* ── Plan card ──────────────────────────────────────────────────────── */
function PlanCard({ plan, annual, onPay, paying }) {
  const s       = CARD_STYLES[plan.color];
  const Icon    = plan.icon;
  const isPopular = plan.badge === 'Most Popular';

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 bg-white p-7 shadow-sm
        ${isPopular ? `ring-2 ${s.ring} shadow-lg scale-[1.02]` : 'ring-1 ring-gray-200'}`}>

      {/* Badge */}
      {plan.badge && (
        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap
            text-xs font-bold px-3 py-1 rounded-full shadow ${s.badge}`}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center
            ${plan.color === 'gray' ? 'bg-gray-100' : plan.color === 'primary' ? 'bg-primary-100' : 'bg-violet-100'}`}>
          <Icon className={`h-5 w-5 ${plan.color === 'gray' ? 'text-gray-600' : plan.color === 'primary' ? 'text-primary-600' : 'text-violet-600'}`} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
          <p className="text-xs text-gray-500">{plan.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <PriceDisplay plan={plan} annual={annual} />

      {/* CTA */}
      <div className="mt-6">
        {plan.isPaid ? (
          <button
            onClick={() => onPay(plan.id)}
            disabled={paying === plan.id}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${s.btn}
                ${paying === plan.id ? 'opacity-60 cursor-wait' : ''}`}>
            {paying === plan.id ? 'Opening payment…' : plan.cta}
          </button>
        ) : (
          <Link to={plan.ctaPath}
            className="block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-all bg-gray-900 hover:bg-gray-700 text-white">
            {plan.cta}
          </Link>
        )}
      </div>

      {/* Features */}
      <ul className="mt-6 space-y-2.5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {f.included
              ? <CheckIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${s.check}`} />
              : <XMarkIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-300" />}
            <span className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function PricingPage() {
  const [annual, setAnnual]   = useState(false);
  const [paying, setPaying]   = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const { user, refetchUser }    = useAuth();
  const navigate                  = useNavigate();
  const { mutateAsync: createOrder }  = useCreateOrder();
  const { mutateAsync: verifyPayment } = useVerifyPayment();

  const handlePay = useCallback(async (planId) => {
    if (!user) {
      // Not logged in — redirect to register with plan pre-selected
      navigate(`/register?plan=${planId}&billing=${annual ? 'annual' : 'monthly'}`);
      return;
    }

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
          prefill: {
            name:    user.name  || '',
            email:   user.email || '',
            contact: user.phone || '',
          },
          theme:  { color: '#7c3aed' },
          modal:  { ondismiss: () => resolve(null) },
          handler: async (response) => {
            try {
              await verifyPayment({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                plan:    planId,
                billing: annual ? 'annual' : 'monthly',
              });
              await refetchUser();
              toast.success('🎉 Subscription activated! Welcome to ShipSplit ' + orderData.planName);
              navigate('/dashboard');
              resolve(true);
            } catch { reject(new Error('Verification failed')); }
          },
        });
        rzp.on('payment.failed', (resp) => {
          toast.error(`Payment failed: ${resp.error.description}`);
          resolve(null);
        });
        rzp.open();
      });
    } catch (err) {
      if (err.message !== 'Verification failed') toast.error('Something went wrong. Please try again.');
    } finally {
      setPaying(null);
    }
  }, [user, annual, navigate, createOrder, verifyPayment, refetchUser]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">ShipSplit</span>
          </Link>
          <div className="flex items-center gap-3">
            {user
              ? <Link to="/dashboard" className="btn-primary text-sm px-3 py-1.5">Dashboard</Link>
              : <>
                  <Link to="/login"    className="btn-secondary text-sm px-3 py-1.5">Sign in</Link>
                  <Link to="/register" className="btn-primary   text-sm px-3 py-1.5">Get started free</Link>
                </>
            }
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-3 py-1 text-xs font-medium text-primary-700 mb-5">
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Plans for every seller
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Start free. Upgrade when you grow. All plans include the full label splitting engine.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="mt-8 inline-flex items-center gap-3 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${!annual ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
                ${annual ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            Annual
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
              2 months free
            </span>
          </button>
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              annual={annual}
              onPay={handlePay}
              paying={paying}
            />
          ))}
        </div>

        {/* GST note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          All prices are exclusive of 18% GST. GST invoice provided for all paid plans.
          Payments processed securely by <strong>Razorpay</strong>.
        </p>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Full feature comparison</h2>
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 w-1/2">Feature</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-700">Free Trial</th>
                <th className="text-center px-4 py-3.5 font-bold text-primary-700 bg-primary-50">Standard</th>
                <th className="text-center px-4 py-3.5 font-semibold text-violet-700">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Platforms',              '1',        '3',           '4 (all)'],
                ['Orders / month',         '500',      '2,000',       'Unlimited'],
                ['Devices',                '1',        '3',           'Unlimited'],
                ['Label split (courier, SKU, product)', '✓', '✓',    '✓'],
                ['PDF merge & ZIP export', '✓',        '✓',           '✓'],
                ['Gift order detection',   '✓',        '✓',           '✓'],
                ['CSV export',             '—',        '✓',           '✓'],
                ['Amazon SP-API sync',     'Manual',   '✓',           '✓'],
                ['Custom label branding',  '—',        '—',           '✓'],
                ['API access',             '—',        '—',           '✓'],
                ['Support',                'Email',    'Email',       'Priority phone + email'],
              ].map(([feature, free, standard, pro]) => (
                <tr key={feature} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-700 font-medium">{feature}</td>
                  <td className="text-center px-4 py-3 text-gray-500">{free}</td>
                  <td className="text-center px-4 py-3 font-medium text-gray-800 bg-primary-50/30">{standard}</td>
                  <td className="text-center px-4 py-3 text-violet-700 font-medium">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-2xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                <span className="font-semibold text-gray-900 text-sm">{faq.q}</span>
                <span className="text-lg text-gray-400 ml-4 flex-shrink-0">
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gray-900 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-extrabold mb-3">Ready to split smarter?</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Start your 7-day free trial. No credit card required.
        </p>
        <Link to="/register" className="inline-block bg-primary-600 hover:bg-primary-500 text-white font-bold px-8 py-3 rounded-xl transition-colors">
          Start free trial →
        </Link>
      </section>
    </div>
  );
}
