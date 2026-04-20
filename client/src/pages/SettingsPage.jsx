import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon, LinkIcon, TruckIcon, TagIcon,
  CreditCardIcon, UsersIcon, CheckCircleIcon,
  ExclamationTriangleIcon, PlusIcon, TrashIcon,
  PencilSquareIcon, ShieldCheckIcon, BellIcon,
  KeyIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

/* ── Tab config ──────────────────────────────────────── */
const TABS = [
  { id: 'profile',    label: 'Profile',             icon: UserCircleIcon },
  { id: 'platforms',  label: 'Connected Platforms',  icon: LinkIcon },
  { id: 'couriers',   label: 'Courier Partners',     icon: TruckIcon },
  { id: 'labels',     label: 'Label Settings',       icon: TagIcon },
  { id: 'billing',    label: 'Subscription',         icon: CreditCardIcon },
  { id: 'team',       label: 'Team Members',         icon: UsersIcon },
];

const PLATFORMS = [
  {
    id: 'amazon',
    name: 'Amazon',
    color: '#FF9900',
    bg: 'bg-[#FF9900]',
    connected: true,
    email: 'seller@amazon.in',
    lastSync: '2 min ago',
    orders: 4821,
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    color: '#2874F0',
    bg: 'bg-[#2874F0]',
    connected: true,
    email: 'store@flipkart.com',
    lastSync: '5 min ago',
    orders: 3104,
  },
  {
    id: 'meesho',
    name: 'Meesho',
    color: '#F43397',
    bg: 'bg-[#F43397]',
    connected: false,
    email: null,
    lastSync: null,
    orders: 0,
  },
  {
    id: 'myntra',
    name: 'Myntra',
    color: '#FF3F6C',
    bg: 'bg-[#FF3F6C]',
    connected: false,
    email: null,
    lastSync: null,
    orders: 0,
  },
];

const COURIERS_LIST = [
  { id: 'delhivery',  name: 'Delhivery',  logo: '🚚', connected: true,  apiKey: 'DLV_****_**** _2891', zones: 'Pan India' },
  { id: 'shiprocket', name: 'Shiprocket', logo: '🚀', connected: true,  apiKey: 'SHR_****_****_7734', zones: 'Pan India' },
  { id: 'bluedart',   name: 'BlueDart',   logo: '🔵', connected: false, apiKey: null, zones: 'Metro+' },
  { id: 'dtdc',       name: 'DTDC',       logo: '📦', connected: true,  apiKey: 'DTDC_****_****_3312', zones: 'Pan India' },
  { id: 'ekart',      name: 'Ekart',      logo: '🛒', connected: true,  apiKey: 'EKT_****_****_9021', zones: 'Pan India' },
  { id: 'xpressbees', name: 'XpressBees', logo: '🐝', connected: false, apiKey: null, zones: 'Pan India' },
];

const TEAM_MEMBERS = [
  { id: 1, name: 'Rahul Agarwal',   email: 'rahul@stylekart.in',   role: 'Owner',    avatar: 'R', status: 'active', joined: 'Jan 2025' },
  { id: 2, name: 'Priya Sharma',    email: 'priya@stylekart.in',   role: 'Manager',  avatar: 'P', status: 'active', joined: 'Mar 2025' },
  { id: 3, name: 'Ankit Verma',     email: 'ankit@stylekart.in',   role: 'Operator', avatar: 'A', status: 'active', joined: 'Apr 2025' },
  { id: 4, name: 'Sneha Patel',     email: 'sneha@stylekart.in',   role: 'Viewer',   avatar: 'S', status: 'invited', joined: '—' },
];

const ROLE_BADGE = {
  Owner:    'badge-blue',
  Manager:  'badge-green',
  Operator: 'badge-orange',
  Viewer:   'badge-gray',
};

/* ── Section wrapper ─────────────────────────────────── */
function Section({ title, desc, children, action }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Toggle switch ───────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
        transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transform transition-transform duration-200
        ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

/* ── Notifications section (proper hook usage) ───────── */
const NOTIF_DEFAULTS = [
  { label: 'New order received',        sub: 'Email when a new order comes in',     key: 'newOrder',     def: true  },
  { label: 'Label generation complete', sub: 'When your PDF is ready to download',  key: 'labelDone',    def: true  },
  { label: 'Low subscription usage',    sub: 'Alert when 80% of plan used',         key: 'usageAlert',   def: true  },
  { label: 'Return notifications',      sub: 'When an order is returned',           key: 'returns',      def: false },
  { label: 'Weekly summary report',     sub: 'Every Monday morning digest',         key: 'weeklyDigest', def: false },
];

function NotificationsSection() {
  const [prefs, setPrefs] = useState(
    Object.fromEntries(NOTIF_DEFAULTS.map(({ key, def }) => [key, def]))
  );
  return (
    <Section title="Notifications" desc="Choose which emails and alerts you receive.">
      <div className="space-y-3">
        {NOTIF_DEFAULTS.map(({ label, sub, key }) => (
          <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
            <Toggle checked={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Profile tab ─────────────────────────────────────── */
function ProfileTab({ user }) {
  const [form, setForm]       = useState({ name: user?.name || '', phone: user?.phone || '', gstin: '', business: '' });
  const [showPw, setShowPw]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="space-y-5">
      <Section
        title="Personal Information"
        desc="Update your account details and business info."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input className="form-input bg-gray-50 text-gray-500" value={user?.email || ''} disabled />
            <p className="form-hint">Email cannot be changed</p>
          </div>
          <div>
            <label className="form-label">Mobile Number</label>
            <input className="form-input" placeholder="9876543210" maxLength={10} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Business / Store Name</label>
            <input className="form-input" placeholder="StyleKart" value={form.business} onChange={(e) => update('business', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">GSTIN <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="form-input uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={form.gstin} onChange={(e) => update('gstin', e.target.value.toUpperCase())} />
          </div>
        </div>
        <button onClick={handleSave} className={`mt-4 btn-primary btn-sm ${saved ? '!bg-success-600' : ''}`}>
          {saved ? <><CheckCircleSolid className="h-3.5 w-3.5" />Saved!</> : 'Save Changes'}
        </button>
      </Section>

      <Section title="Change Password" desc="Use a strong password of at least 8 characters.">
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          <div className="sm:col-span-2">
            <label className="form-label">Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="form-input pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" placeholder="Repeat new password" />
          </div>
        </div>
        <button className="mt-4 btn-secondary btn-sm">Update Password</button>
      </Section>

      <NotificationsSection />
    </div>
  );
}

/* ── Platforms tab ───────────────────────────────────── */
function PlatformsTab() {
  const [statuses, setStatuses] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState({});

  // Check connection status for each platform
  useEffect(() => {
    const fetchStatuses = async () => {
      setLoading(true);
      const results = {};
      await Promise.allSettled(
        PLATFORMS.map(async (p) => {
          try {
            const { data } = await api.get(`/platforms/${p.id}`);
            results[p.id] = data?.platform ?? data ?? {};
          } catch {
            results[p.id] = { isConnected: false };
          }
        })
      );
      setStatuses(results);
      setLoading(false);
    };
    fetchStatuses();

    // If redirected back after Amazon OAuth, show success
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'amazon') {
      toast.success('Amazon connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async (platformId) => {
    if (platformId === 'amazon') {
      try {
        const { data } = await api.get('/platforms/amazon/oauth-url');
        window.location.href = data.url ?? data.oauthUrl ?? data;
      } catch {
        toast.error('Failed to get Amazon OAuth URL. Check your API credentials in Render.');
      }
    } else {
      toast('Coming soon! Only Amazon is available right now.', { icon: '🔜' });
    }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm(`Disconnect ${platformId}? Your synced orders will remain.`)) return;
    try {
      await api.delete(`/platforms/${platformId}`);
      setStatuses((prev) => ({ ...prev, [platformId]: { isConnected: false } }));
      toast.success(`${platformId} disconnected.`);
    } catch {
      toast.error('Failed to disconnect. Try again.');
    }
  };

  const handleSync = async (platformId) => {
    setSyncing((prev) => ({ ...prev, [platformId]: true }));
    try {
      await api.post(`/platforms/${platformId}/sync`);
      toast.success('Sync started! Orders will update shortly.');
    } catch {
      toast.error('Sync failed. Please try again.');
    } finally {
      setSyncing((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  return (
    <div className="space-y-3">
      {PLATFORMS.map((p) => {
        const status     = statuses[p.id] ?? {};
        const isConnected = status.isConnected ?? false;

        return (
          <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all
            ${isConnected ? 'border-success-200 bg-success-50/30' : 'border-gray-200 bg-white'}`}>
            <div className={`h-11 w-11 rounded-xl ${p.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
              {p.name[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{p.name}</span>
                {loading ? (
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                ) : isConnected ? (
                  <span className="badge-green text-2xs">Connected</span>
                ) : (
                  <span className="badge-gray text-2xs">Not Connected</span>
                )}
              </div>
              {isConnected ? (
                <p className="text-2xs text-gray-400 mt-0.5">
                  Last sync: {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString('en-IN') : 'Never'}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Connect your {p.name} seller account</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isConnected && (
                <button
                  onClick={() => handleSync(p.id)}
                  disabled={syncing[p.id]}
                  className="btn-ghost btn-sm text-gray-400 gap-1.5"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing[p.id] ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync</span>
                </button>
              )}
              <button
                onClick={() => isConnected ? handleDisconnect(p.id) : handleConnect(p.id)}
                disabled={loading}
                className={isConnected ? 'btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary btn-sm'}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
        <ShieldCheckIcon className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-primary-700">
          <p className="font-semibold mb-0.5">Secure OAuth Connection</p>
          <p>ShipSplit uses official OAuth APIs — we never store your platform passwords. You can revoke access at any time.</p>
        </div>
      </div>
    </div>
  );
}

function ArrowPathIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
}

/* ── Couriers tab ────────────────────────────────────── */
function CouriersTab() {
  return (
    <div className="space-y-3">
      {COURIERS_LIST.map((c) => (
        <div key={c.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all
          ${c.connected ? 'border-success-200 bg-success-50/20' : 'border-gray-200'}`}>
          <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl flex-shrink-0">
            {c.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">{c.name}</span>
              {c.connected
                ? <span className="badge-green text-2xs">Connected</span>
                : <span className="badge-gray text-2xs">Not Connected</span>}
            </div>
            {c.connected ? (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{c.apiKey}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Add API key to connect · Coverage: {c.zones}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {c.connected && (
              <button className="btn-ghost btn-sm text-gray-400">
                <PencilSquareIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <button className={c.connected ? 'btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary btn-sm'}>
              {c.connected ? 'Remove' : '+ Connect'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Label settings tab ──────────────────────────────── */
function LabelSettingsTab() {
  const [defaults, setDefaults] = useState({
    defaultSize: 'A4_4',
    returnName: '',
    returnAddr: '',
    returnPhone: '',
    returnGST: '',
    brandLogo: false,
    autoGenerate: false,
  });
  const upd = (k, v) => setDefaults((d) => ({ ...d, [k]: v }));
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <Section title="Default Label Format" desc="These settings apply to all new label generations.">
        <div className="space-y-4">
          <div>
            <label className="form-label">Default Label Size</label>
            <select className="form-select w-full sm:w-64" value={defaults.defaultSize} onChange={(e) => upd('defaultSize', e.target.value)}>
              <option value="A4_4">A4 — 4 labels per page</option>
              <option value="A4_2">A4 — 2 labels per page</option>
              <option value="A4_1">A4 — Full page</option>
              <option value="A6_1">A6 — Single label (Thermal)</option>
            </select>
          </div>
          <div className="space-y-3">
            {[
              { key: 'brandLogo',     label: 'Show brand logo on labels',      desc: 'Adds your business logo to each label' },
              { key: 'autoGenerate',  label: 'Auto-generate on order import',  desc: 'Immediately create labels when orders are synced' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <Toggle checked={!!defaults[key]} onChange={(v) => upd(key, v)} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Return Address" desc="Printed on all labels as the return/sender address.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Business Name</label>
            <input className="form-input" placeholder="StyleKart" value={defaults.returnName} onChange={(e) => upd('returnName', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Contact Phone</label>
            <input className="form-input" placeholder="9876543210" value={defaults.returnPhone} onChange={(e) => upd('returnPhone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Full Address</label>
            <textarea className="form-input resize-none" rows={2} placeholder="Shop 12, Gandhi Nagar, Jaipur, Rajasthan - 302001" value={defaults.returnAddr} onChange={(e) => upd('returnAddr', e.target.value)} />
          </div>
          <div>
            <label className="form-label">GSTIN <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="form-input uppercase" placeholder="22AAAAA0000A1Z5" value={defaults.returnGST} onChange={(e) => upd('returnGST', e.target.value.toUpperCase())} />
          </div>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className={`mt-4 btn-primary btn-sm ${saved ? '!bg-success-600' : ''}`}>
          {saved ? <><CheckCircleSolid className="h-3.5 w-3.5" />Saved!</> : 'Save Label Defaults'}
        </button>
      </Section>
    </div>
  );
}

/* ── Billing / subscription tab ──────────────────────── */
function BillingTab() {
  const PLANS = [
    { id: 'free',    name: 'Free',    price: '₹0',     orders: '50/mo',       current: false },
    { id: 'starter', name: 'Starter', price: '₹499',   orders: '500/mo',      current: false },
    { id: 'growth',  name: 'Growth',  price: '₹1,299', orders: '2,000/mo',    current: true  },
    { id: 'pro',     name: 'Pro',     price: '₹2,999', orders: 'Unlimited',   current: false },
  ];

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div>
          <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">Current Plan</p>
          <p className="text-2xl font-extrabold mt-0.5">Growth</p>
          <p className="text-sm opacity-80 mt-1">₹1,299/month · Renews May 10, 2026</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Usage this month</p>
          <p className="text-lg font-bold mt-0.5">1,247 / 2,000</p>
          <div className="h-1.5 w-32 bg-white/20 rounded-full mt-1.5">
            <div className="h-full bg-white rounded-full" style={{ width: '62%' }} />
          </div>
          <p className="text-xs opacity-60 mt-1">62% used</p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`rounded-xl border-2 p-4 ${plan.current ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200'}`}>
            <p className="font-bold text-gray-900">{plan.name}</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{plan.price}<span className="text-xs font-normal text-gray-400">/mo</span></p>
            <p className="text-xs text-gray-500 mt-1">{plan.orders}</p>
            <button className={`w-full mt-3 btn-sm ${plan.current ? 'btn-secondary opacity-60 cursor-default' : 'btn-outline-primary'}`} disabled={plan.current}>
              {plan.current ? 'Current' : `Switch`}
            </button>
          </div>
        ))}
      </div>

      {/* Invoice history */}
      <Section title="Invoice History" desc="Your recent billing history.">
        <div className="space-y-2">
          {[
            { date: 'Apr 10, 2026', plan: 'Growth', amount: '₹1,299', status: 'Paid' },
            { date: 'Mar 10, 2026', plan: 'Growth', amount: '₹1,299', status: 'Paid' },
            { date: 'Feb 10, 2026', plan: 'Starter', amount: '₹499',  status: 'Paid' },
          ].map((inv, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{inv.plan} Plan</p>
                <p className="text-xs text-gray-400">{inv.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-gray-900">{inv.amount}</span>
                <span className="badge-green">{inv.status}</span>
                <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">Download</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ── Team tab ────────────────────────────────────────── */
function TeamTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">3 active members · 1 pending invite</p>
        </div>
        <button className="btn-primary btn-sm gap-1.5">
          <PlusIcon className="h-3.5 w-3.5" />
          Invite Member
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table-root">
          <thead className="table-head">
            <tr>
              <th className="table-th">Member</th>
              <th className="table-th">Role</th>
              <th className="table-th">Status</th>
              <th className="table-th">Joined</th>
              <th className="table-th w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {TEAM_MEMBERS.map((m) => (
              <tr key={m.id} className="table-row">
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                      {m.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-td">
                  <span className={ROLE_BADGE[m.role]}>{m.role}</span>
                </td>
                <td className="table-td">
                  <span className={m.status === 'active' ? 'badge-green' : 'badge-orange'}>
                    {m.status === 'active' ? 'Active' : 'Invited'}
                  </span>
                </td>
                <td className="table-td text-xs text-gray-400">{m.joined}</td>
                <td className="table-td">
                  {m.role !== 'Owner' && (
                    <button className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <UsersIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-0.5">Role Permissions</p>
          <p><strong>Owner:</strong> Full access · <strong>Manager:</strong> All except billing · <strong>Operator:</strong> Orders & labels · <strong>Viewer:</strong> Read only</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main settings page ──────────────────────────────── */
export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your account, platforms, and preferences.</p>
      </div>

      <div className="flex gap-5 lg:gap-7 flex-col lg:flex-row">
        {/* ── Sidebar tabs ─────────────────────────── */}
        <aside className="lg:w-52 flex-shrink-0">
          <nav className="card p-2 space-y-0.5 lg:sticky lg:top-20">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                  ${tab === id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Tab content ──────────────────────────── */}
        <div className="flex-1 min-w-0 animate-fade-in" key={tab}>
          {tab === 'profile'   && <ProfileTab user={user} />}
          {tab === 'platforms' && <PlatformsTab />}
          {tab === 'couriers'  && <CouriersTab />}
          {tab === 'labels'    && <LabelSettingsTab />}
          {tab === 'billing'   && <BillingTab />}
          {tab === 'team'      && <TeamTab />}
        </div>
      </div>
    </div>
  );
}
