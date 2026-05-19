import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription, useInvoices } from '../hooks/useSubscription';
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
  { id: 'delhivery',  name: 'Delhivery',  logo: '🚚', zones: 'Pan India' },
  { id: 'shiprocket', name: 'Shiprocket', logo: '🚀', zones: 'Pan India' },
  { id: 'bluedart',   name: 'BlueDart',   logo: '🔵', zones: 'Metro+' },
  { id: 'dtdc',       name: 'DTDC',       logo: '📦', zones: 'Pan India' },
  { id: 'ekart',      name: 'Ekart',      logo: '🛒', zones: 'Pan India' },
  { id: 'xpressbees', name: 'XpressBees', logo: '🐝', zones: 'Pan India' },
];


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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => {
        if (data?.notifications) setPrefs((p) => ({ ...p, ...data.notifications }));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleToggle = async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await api.put('/settings/notifications', { [key]: value });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !value })); // revert on error
      toast.error('Failed to save notification preference');
    }
  };

  return (
    <Section title="Notifications" desc="Choose which emails and alerts you receive.">
      <div className="space-y-3">
        {NOTIF_DEFAULTS.map(({ label, sub, key }) => (
          <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
            <Toggle checked={prefs[key]} onChange={(v) => handleToggle(key, v)} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Profile tab ─────────────────────────────────────── */
function ProfileTab({ user }) {
  const [form, setForm]     = useState({
    name:         user?.name         || '',
    phone:        user?.phone        || '',
    gstin:        user?.gstin        || '',
    businessName: user?.businessName || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const [pw, setPw]           = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const update   = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updatePw = (k, v) => setPw((p)  => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        name:         form.name,
        phone:        form.phone,
        gstin:        form.gstin,
        businessName: form.businessName,
      });
      setSaved(true);
      toast.success('Profile saved');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pw.current)          { toast.error('Enter your current password'); return; }
    if (pw.newPw.length < 8)  { toast.error('New password must be at least 8 characters'); return; }
    if (pw.newPw !== pw.confirm) { toast.error('New passwords do not match'); return; }
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pw.current, newPassword: pw.newPw });
      toast.success('Password changed successfully');
      setPw({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section title="Personal Information" desc="Update your account details and business info.">
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
            <input className="form-input" placeholder="StyleKart" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">GSTIN <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="form-input uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={form.gstin} onChange={(e) => update('gstin', e.target.value.toUpperCase())} />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-4 btn-primary btn-sm ${saved ? '!bg-success-600' : ''}`}
        >
          {saving ? 'Saving…' : saved ? <><CheckCircleSolid className="h-3.5 w-3.5" />Saved!</> : 'Save Changes'}
        </button>
      </Section>

      <Section title="Change Password" desc="Use a strong password of at least 8 characters.">
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          <div className="sm:col-span-2">
            <label className="form-label">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input pr-10"
                placeholder="••••••••"
                value={pw.current}
                onChange={(e) => updatePw('current', e.target.value)}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" placeholder="Min 8 characters" value={pw.newPw} onChange={(e) => updatePw('newPw', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" placeholder="Repeat new password" value={pw.confirm} onChange={(e) => updatePw('confirm', e.target.value)} />
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={pwSaving}
          className="mt-4 btn-secondary btn-sm"
        >
          {pwSaving ? 'Updating…' : 'Update Password'}
        </button>
      </Section>

      <NotificationsSection />
    </div>
  );
}

/* ── Platforms tab ───────────────────────────────────── */
function PlatformsTab() {
  const [statuses,    setStatuses]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState({});
  const [manualForm,  setManualForm]  = useState(null); // platformId or null
  const [tokenInput,  setTokenInput]  = useState('');   // Amazon: refresh token
  const [sellerInput, setSellerInput] = useState('');   // Amazon: seller ID
  const [fkApiKey,    setFkApiKey]    = useState('');   // Flipkart: API Key
  const [fkApiSecret, setFkApiSecret] = useState('');   // Flipkart: API Secret
  const [saving,      setSaving]      = useState(false);

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

    // Handle OAuth callback redirects
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error     = params.get('error');

    if (connected === 'amazon') {
      toast.success('Amazon connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (connected === 'flipkart') {
      toast.success('Flipkart connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error?.startsWith('flipkart_')) {
      const msgs = {
        flipkart_rejected:       'Flipkart authorization was denied.',
        flipkart_missing_params: 'Flipkart OAuth failed — missing parameters.',
        flipkart_invalid_state:  'Flipkart OAuth session expired. Please try again.',
        flipkart_oauth_failed:   'Flipkart connection failed. Please try again.',
      };
      toast.error(msgs[error] || 'Flipkart connection failed.');
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
    } else if (platformId === 'flipkart') {
      // Show Self Access form (API Key + Secret) — this works now.
      // Third Party OAuth is also wired up; toggle to that when partner approval arrives.
      setManualForm(manualForm === 'flipkart' ? null : 'flipkart');
      setTokenInput('');
      setSellerInput('');
    } else {
      toast('Coming soon!', { icon: '🔜' });
    }
  };

  const handleManualConnect = async () => {
    if (!tokenInput.trim()) { toast.error('Please enter your refresh token'); return; }
    setSaving(true);
    try {
      await api.post('/platforms/amazon/manual-connect', {
        refreshToken: tokenInput.trim(),
        sellerId:     sellerInput.trim(),
      });
      setStatuses((prev) => ({ ...prev, amazon: { isConnected: true } }));
      setManualForm(null);
      setTokenInput('');
      setSellerInput('');
      toast.success('Amazon connected successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save token');
    } finally {
      setSaving(false);
    }
  };

  const handleFlipkartSelfConnect = async () => {
    if (!fkApiKey.trim())    { toast.error('Please enter your Flipkart API Key');    return; }
    if (!fkApiSecret.trim()) { toast.error('Please enter your Flipkart API Secret'); return; }
    setSaving(true);
    try {
      await api.post('/platforms/flipkart/self-connect', {
        apiKey:    fkApiKey.trim(),
        apiSecret: fkApiSecret.trim(),
      });
      setStatuses((prev) => ({ ...prev, flipkart: { isConnected: true } }));
      setManualForm(null);
      setFkApiKey('');
      setFkApiSecret('');
      toast.success('Flipkart connected successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to connect Flipkart. Check your API Key and Secret.');
    } finally {
      setSaving(false);
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
          <div key={p.id}>
          <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all
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
                <div className="mt-0.5 space-y-0.5">
                  {(status.sellerEmail || status.storeName || status.sellerId) && (
                    <p className="text-2xs text-gray-500 font-medium truncate">
                      {status.storeName || status.sellerEmail || status.sellerId}
                    </p>
                  )}
                  <p className="text-2xs text-gray-400">
                    {status.totalOrdersSynced != null && status.totalOrdersSynced > 0
                      ? `${status.totalOrdersSynced.toLocaleString('en-IN')} orders synced · `
                      : ''}
                    Last sync: {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('en-IN') : 'Never'}
                  </p>
                </div>
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
              {/* Amazon: manual token entry */}
              {!isConnected && p.id === 'amazon' && (
                <button
                  onClick={() => { setManualForm(manualForm === p.id ? null : p.id); setTokenInput(''); setSellerInput(''); }}
                  className="btn-ghost btn-sm text-gray-500 gap-1.5"
                  title="Enter refresh token manually"
                >
                  <KeyIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Token</span>
                </button>
              )}
              <button
                onClick={() => isConnected ? handleDisconnect(p.id) : handleConnect(p.id)}
                disabled={loading}
                className={isConnected ? 'btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary btn-sm'}
              >
                {isConnected
                  ? 'Disconnect'
                  : p.id === 'flipkart'
                    ? (manualForm === 'flipkart' ? 'Cancel' : 'Connect')
                    : 'Connect'}
              </button>
            </div>
          </div>

          {/* ── Amazon manual token form ── */}
          {manualForm === p.id && p.id === 'amazon' && !isConnected && (
            <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <KeyIcon className="h-4 w-4" /> Enter Amazon Refresh Token
              </p>
              <div>
                <label className="form-label text-xs">Refresh Token <span className="text-red-500">*</span></label>
                <textarea
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="form-input text-xs font-mono resize-none"
                  rows={3}
                  placeholder="Atzr|IwEB..."
                />
              </div>
              <div>
                <label className="form-label text-xs">Seller ID <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={sellerInput}
                  onChange={(e) => setSellerInput(e.target.value)}
                  className="form-input text-xs"
                  placeholder="e.g. A2ZUZMCNFQ40RB"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleManualConnect} disabled={saving} className="btn-primary btn-sm">
                  {saving ? 'Saving…' : 'Save & Connect'}
                </button>
                <button onClick={() => setManualForm(null)} className="btn-ghost btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* ── Flipkart Self Access form ── */}
          {manualForm === p.id && p.id === 'flipkart' && !isConnected && (
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div>
                <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                  <KeyIcon className="h-4 w-4" /> Connect via Self Access
                </p>
                <p className="text-2xs text-blue-600 mt-1">
                  Find your API Key and Secret in Flipkart Seller Hub → Manage Profile → Developer Access → Self Access.
                </p>
              </div>
              <div>
                <label className="form-label text-xs">API Key (App ID) <span className="text-red-500">*</span></label>
                <input
                  value={fkApiKey}
                  onChange={(e) => setFkApiKey(e.target.value)}
                  className="form-input text-xs font-mono"
                  placeholder="3523b8b9b08210a7703337aa364274971745"
                />
              </div>
              <div>
                <label className="form-label text-xs">API Secret <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={fkApiSecret}
                  onChange={(e) => setFkApiSecret(e.target.value)}
                  className="form-input text-xs font-mono"
                  placeholder="Your Flipkart API Secret"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleFlipkartSelfConnect} disabled={saving} className="btn-primary btn-sm">
                  {saving ? 'Connecting…' : 'Connect Flipkart'}
                </button>
                <button onClick={() => { setManualForm(null); setFkApiKey(''); setFkApiSecret(''); }} className="btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
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
  const [couriers,     setCouriers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [connectForm,  setConnectForm]  = useState(null); // slug being connected
  const [editTarget,   setEditTarget]   = useState(null); // courier _id being edited
  const [form,         setForm]         = useState({ apiKey: '', pickupPincode: '' });
  const [saving,       setSaving]       = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/couriers');
      setCouriers(data?.couriers ?? []);
    } catch {
      toast.error('Failed to load courier settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openConnect = (slug) => {
    setConnectForm(slug);
    setEditTarget(null);
    setForm({ apiKey: '', pickupPincode: '' });
  };

  const openEdit = (courier) => {
    setEditTarget(courier._id);
    setConnectForm(null);
    setForm({ apiKey: '', pickupPincode: courier.settings?.pickupPincode || '' });
  };

  const closeForm = () => { setConnectForm(null); setEditTarget(null); };

  const handleConnect = async (slug, name) => {
    if (!form.apiKey.trim()) { toast.error('API Key is required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/settings/couriers', {
        name, slug,
        apiKey: form.apiKey.trim(),
        ...(form.pickupPincode ? { settings: { pickupPincode: form.pickupPincode } } : {}),
      });
      setCouriers((prev) => [...prev, data.courier]);
      closeForm();
      toast.success(`${name} connected!`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to connect courier');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, name) => {
    setSaving(true);
    try {
      const body = {};
      if (form.apiKey.trim())      body.apiKey   = form.apiKey.trim();
      if (form.pickupPincode)      body.settings  = { pickupPincode: form.pickupPincode };
      const { data } = await api.put(`/settings/couriers/${id}`, body);
      setCouriers((prev) => prev.map((c) => c._id === id ? data.courier : c));
      closeForm();
      toast.success(`${name} updated!`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update courier');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name}? This will disconnect it from ShipSplit.`)) return;
    try {
      await api.delete(`/settings/couriers/${id}`);
      setCouriers((prev) => prev.filter((c) => c._id !== id));
      toast.success(`${name} removed.`);
    } catch {
      toast.error('Failed to remove courier. Try again.');
    }
  };

  return (
    <div className="space-y-3">
      {COURIERS_LIST.map((c) => {
        const saved      = couriers.find((x) => x.slug === c.id && x.isActive);
        const isConnected = !!saved;
        const showConnect = connectForm === c.id;
        const showEdit    = editTarget   === saved?._id;

        return (
          <div key={c.id}>
            {/* ── Row ── */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all
              ${isConnected ? 'border-success-200 bg-success-50/20' : 'border-gray-200'}`}>
              <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                {c.logo}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                  {loading ? (
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  ) : isConnected ? (
                    <span className="badge-green text-2xs">Connected</span>
                  ) : (
                    <span className="badge-gray text-2xs">Not Connected</span>
                  )}
                </div>
                {isConnected ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    API Key: ••••••••{saved._id.slice(-4)}
                    {saved.settings?.pickupPincode ? ` · Pickup PIN: ${saved.settings.pickupPincode}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Add API key to connect · Coverage: {c.zones}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isConnected && (
                  <button onClick={() => showEdit ? closeForm() : openEdit(saved)} className="btn-ghost btn-sm text-gray-400">
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                {isConnected ? (
                  <button onClick={() => handleRemove(saved._id, c.name)} className="btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => showConnect ? closeForm() : openConnect(c.id)} className="btn-primary btn-sm">
                    + Connect
                  </button>
                )}
              </div>
            </div>

            {/* ── Connect form ── */}
            {showConnect && (
              <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-gray-700">Connect {c.name}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-xs">API Key <span className="text-red-500">*</span></label>
                    <input className="form-input text-xs font-mono" placeholder="Your courier API key" value={form.apiKey} onChange={(e) => upd('apiKey', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Pickup Pincode <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className="form-input text-xs" placeholder="e.g. 302001" maxLength={6} value={form.pickupPincode} onChange={(e) => upd('pickupPincode', e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleConnect(c.id, c.name)} disabled={saving} className="btn-primary btn-sm">
                    {saving ? 'Saving…' : 'Save & Connect'}
                  </button>
                  <button onClick={closeForm} className="btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* ── Edit form ── */}
            {showEdit && (
              <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-gray-700">Update {c.name}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-xs">New API Key <span className="text-gray-400 font-normal">(leave blank to keep existing)</span></label>
                    <input className="form-input text-xs font-mono" placeholder="Enter new key to replace" value={form.apiKey} onChange={(e) => upd('apiKey', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Pickup Pincode</label>
                    <input className="form-input text-xs" placeholder="e.g. 302001" maxLength={6} value={form.pickupPincode} onChange={(e) => upd('pickupPincode', e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(saved._id, c.name)} disabled={saving} className="btn-primary btn-sm">
                    {saving ? 'Saving…' : 'Update'}
                  </button>
                  <button onClick={closeForm} className="btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Printer type card ───────────────────────────────── */
function PrinterCard({ id, icon, title, sub, examples, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
        ${selected ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <p className={`text-sm font-bold ${selected ? 'text-primary-700' : 'text-gray-800'}`}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
        <p className="text-2xs text-gray-400 mt-1">{examples}</p>
      </div>
      {selected && <CheckCircleSolid className="h-4 w-4 text-primary-600" />}
    </button>
  );
}

/* ── Platform label size row ─────────────────────────── */
function PlatformSizeRow({ platform, color, bg, options, value, onChange }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {platform[0]}
      </div>
      <div className="w-28 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-800">{platform}</p>
      </div>
      <div className="flex flex-wrap gap-2 flex-1">
        {options.map(({ id, label, hint }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
              ${value === id
                ? 'border-primary-500 bg-primary-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
          >
            {label}
            {hint && <span className={`ml-1 text-2xs ${value === id ? 'text-primary-200' : 'text-gray-400'}`}>({hint})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}


/* ── Label settings tab ──────────────────────────────── */
function LabelSettingsTab() {
  const [s, setS] = useState({
    printerType:   'thermal',   // thermal | regular
    // per-platform download size
    amazonSize:    '4x6',       // 4x6 | A4
    flipkartSize:  '3x5',       // 3x5 | A4_4
    meeshoSize:    '4x6',       // 4x6 | A4_4
    // combined PDF handling (Meesho/Flipkart generate label+invoice on one A4)
    splitCombined: true,        // auto-split label from invoice
    // bulk download layout (when downloading multiple labels at once)
    bulkLayout:    'A4_4',      // A4_4 | A4_2 | per_file
    // auto-accept
    autoSync:      false,
  });

  const upd = (k, v) => setS((d) => ({ ...d, [k]: v }));
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => { if (data?.labelDefaults) setS((d) => ({ ...d, ...data.labelDefaults })); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/label-defaults', s);
      setSaved(true);
      toast.success('Label settings saved');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── 1. Printer Type ───────────────────────────── */}
      <Section
        title="Printer Type"
        desc="Tell ShipSplit what printer you use — this controls which label size is downloaded."
      >
        <div className="flex gap-3">
          <PrinterCard
            id="thermal"
            icon="🖨️"
            title="Thermal Printer"
            sub="Direct thermal, no ink"
            examples="TSC, Xprinter, TVS, iDPRT, Zebra"
            selected={s.printerType === 'thermal'}
            onSelect={(id) => upd('printerType', id)}
          />
          <PrinterCard
            id="regular"
            icon="🖨️"
            title="Regular Printer"
            sub="Inkjet or laser, A4 paper"
            examples="HP, Canon, Epson, Brother"
            selected={s.printerType === 'regular'}
            onSelect={(id) => upd('printerType', id)}
          />
        </div>
        {s.printerType === 'thermal' && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <span className="text-sm">💡</span>
            <p className="text-xs text-blue-700">
              Thermal printers use direct heat — no ink cartridges needed. Most popular in India: <strong>TSC TE244</strong>, <strong>Xprinter XP-470B</strong>, <strong>TVS LP-46</strong>.
              Labels come out as individual 4×6" or 3×5" slips ready to stick.
            </p>
          </div>
        )}
        {s.printerType === 'regular' && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-sm">💡</span>
            <p className="text-xs text-amber-700">
              For regular printers, labels are arranged on A4 sheets. You cut and stick them.
              Most sellers prefer <strong>4 labels per A4</strong> to save paper.
            </p>
          </div>
        )}
      </Section>

      {/* ── 2. Per-Platform Label Size ────────────────── */}
      <Section
        title="Label Size per Platform"
        desc="Each marketplace generates labels in different formats. Set your preferred download size."
      >
        <div className="divide-y divide-gray-100">
          {/* Amazon */}
          <PlatformSizeRow
            platform="Amazon"
            bg="bg-[#FF9900]"
            value={s.amazonSize}
            onChange={(v) => upd('amazonSize', v)}
            options={[
              { id: '4x6', label: '4×6"', hint: 'thermal' },
              { id: 'A4',  label: 'A4',   hint: 'regular printer' },
            ]}
          />
          {/* Flipkart */}
          <PlatformSizeRow
            platform="Flipkart"
            bg="bg-[#2874F0]"
            value={s.flipkartSize}
            onChange={(v) => upd('flipkartSize', v)}
            options={[
              { id: '3x5',  label: '3×5"',     hint: 'new format' },
              { id: 'A4_4', label: 'A4 (4-up)', hint: 'regular printer' },
            ]}
          />
          {/* Meesho */}
          <PlatformSizeRow
            platform="Meesho"
            bg="bg-[#F43397]"
            value={s.meeshoSize}
            onChange={(v) => upd('meeshoSize', v)}
            options={[
              { id: '4x6',  label: '4×6" / A6', hint: 'thermal' },
              { id: 'A4_4', label: 'A4 (4-up)',  hint: 'regular printer' },
            ]}
          />
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm">ℹ️</span>
          <p className="text-xs text-gray-600">
            Labels are generated by each marketplace — ShipSplit downloads them as-is and arranges
            them for your printer. Flipkart switched to <strong>3×5 inch</strong> labels in 2023.
          </p>
        </div>
      </Section>

      {/* ── 3. Combined PDF Handling ──────────────────── */}
      <Section
        title="Combined Label + Invoice PDF"
        desc="Meesho and Flipkart generate a single A4 PDF with the label on one half and invoice on the other."
      >
        {/* Visual explainer */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden text-center text-xs">
            <div className="bg-blue-50 border-b border-dashed border-blue-200 px-3 py-4 text-blue-700 font-medium">
              🧾 Invoice
            </div>
            <div className="bg-orange-50 px-3 py-4 text-orange-700 font-medium">
              🏷️ Shipping Label
            </div>
            <div className="px-2 py-1.5 bg-gray-50 text-gray-400 text-2xs">
              Combined A4 (what Meesho/Flipkart give you)
            </div>
          </div>
          <div className="flex items-center text-gray-400 text-lg">→</div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="border border-orange-200 rounded-lg px-3 py-3 bg-orange-50 text-center text-xs text-orange-700 font-medium">
              🏷️ Label only
            </div>
            <div className="border border-blue-200 rounded-lg px-3 py-3 bg-blue-50 text-center text-xs text-blue-700 font-medium">
              🧾 Invoice only
            </div>
            <div className="px-2 py-1 bg-gray-50 rounded text-gray-400 text-2xs text-center">
              After ShipSplit splits it
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all
          ${s.splitCombined ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
          <div>
            <p className="text-sm font-medium text-gray-800">Auto-split label from invoice</p>
            <p className="text-xs text-gray-400 mt-0.5">
              ShipSplit separates the label half automatically — you get a clean label ready to print
            </p>
          </div>
          <Toggle checked={!!s.splitCombined} onChange={(v) => upd('splitCombined', v)} />
        </div>
        {!s.splitCombined && (
          <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            Combined PDF downloaded as-is — you'll need to cut it manually before printing on thermal.
          </p>
        )}
      </Section>

      {/* ── 4. Bulk Download Layout ───────────────────── */}
      <Section
        title="Bulk Download Layout"
        desc="When you download multiple labels at once, how should they be arranged in the PDF?"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: 'A4_4',
              icon: '▦',
              label: '4 per A4',
              sub: '2×2 grid — saves paper',
              best: 'Regular printer',
            },
            {
              id: 'A4_2',
              icon: '▤',
              label: '2 per A4',
              sub: '1×2 layout — larger labels',
              best: 'Regular printer',
            },
            {
              id: 'per_file',
              icon: '🏷',
              label: '1 per file',
              sub: 'Each label separate',
              best: 'Thermal printer',
            },
          ].map(({ id, icon, label, sub, best }) => (
            <button
              key={id}
              onClick={() => upd('bulkLayout', id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                ${s.bulkLayout === id
                  ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300 bg-white'}`}
            >
              <span className="text-2xl">{icon}</span>
              <p className={`text-sm font-bold ${s.bulkLayout === id ? 'text-primary-700' : 'text-gray-800'}`}>{label}</p>
              <p className="text-2xs text-gray-500">{sub}</p>
              <span className={`text-2xs px-1.5 py-0.5 rounded font-medium mt-0.5
                ${s.bulkLayout === id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                {best}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`btn-primary gap-2 ${saved ? '!bg-success-600' : ''}`}
        >
          {saving ? 'Saving…' : saved ? <><CheckCircleSolid className="h-4 w-4" /> Saved!</> : 'Save Label Settings'}
        </button>
      </div>
    </div>
  );
}

/* ── Billing / subscription tab ──────────────────────── */
function BillingTab() {
  const { data: sub,      isLoading: subLoading  } = useSubscription();
  const { data: invoices, isLoading: invLoading  } = useInvoices();

  const planName    = sub?.plan        ?? 'Free';
  const ordersUsed  = sub?.ordersUsed  ?? 0;
  const orderLimit  = sub?.orderLimit  ?? 50;
  const renewsAt    = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const usagePct    = orderLimit > 0 ? Math.min(100, Math.round((ordersUsed / orderLimit) * 100)) : 0;

  const PLANS = [
    { id: 'free',    name: 'Free',    price: '₹0',     orders: '50/mo'      },
    { id: 'starter', name: 'Starter', price: '₹499',   orders: '500/mo'     },
    { id: 'growth',  name: 'Growth',  price: '₹1,299', orders: '2,000/mo'   },
    { id: 'pro',     name: 'Pro',     price: '₹2,999', orders: 'Unlimited'  },
  ];

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div>
          <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">Current Plan</p>
          {subLoading
            ? <div className="mt-1 h-7 w-24 bg-white/20 rounded animate-pulse" />
            : <p className="text-2xl font-extrabold mt-0.5 capitalize">{planName}</p>}
          {renewsAt && <p className="text-sm opacity-80 mt-1">Renews {renewsAt}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Usage this month</p>
          {subLoading
            ? <div className="mt-1 h-6 w-28 bg-white/20 rounded animate-pulse" />
            : <p className="text-lg font-bold mt-0.5">{ordersUsed.toLocaleString('en-IN')} / {orderLimit === 999999 ? '∞' : orderLimit.toLocaleString('en-IN')}</p>}
          <div className="h-1.5 w-32 bg-white/20 rounded-full mt-1.5">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${usagePct}%` }} />
          </div>
          <p className="text-xs opacity-60 mt-1">{usagePct}% used</p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map((plan) => {
          const isCurrent = planName.toLowerCase() === plan.id;
          return (
            <div key={plan.id} className={`rounded-xl border-2 p-4 ${isCurrent ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200'}`}>
              <p className="font-bold text-gray-900">{plan.name}</p>
              <p className="text-xl font-extrabold text-gray-900 mt-1">{plan.price}<span className="text-xs font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-500 mt-1">{plan.orders}</p>
              <button
                className={`w-full mt-3 btn-sm ${isCurrent ? 'btn-secondary opacity-60 cursor-default' : 'btn-outline-primary'}`}
                disabled={isCurrent}
                onClick={() => !isCurrent && window.location.assign('/dashboard/billing')}
              >
                {isCurrent ? 'Current' : 'Switch'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoice history */}
      <Section title="Invoice History" desc="Your recent billing history.">
        {invLoading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : !invoices?.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800 capitalize">{inv.plan ?? inv.description ?? 'Plan'}</p>
                  <p className="text-xs text-gray-400">{inv.date ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-gray-900">₹{Number(inv.amount ?? 0).toLocaleString('en-IN')}</span>
                  <span className="badge-green">{inv.status ?? 'Paid'}</span>
                  {inv.receiptUrl && (
                    <a href={inv.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Download</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ── Team tab ────────────────────────────────────────── */
function TeamTab({ user }) {
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">1 active member</p>
        <button
          onClick={() => toast('Team invite coming soon!', { icon: '🔜' })}
          className="btn-primary btn-sm gap-1.5"
        >
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr className="table-row">
              <td className="table-td">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                    {(user?.name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{user?.email || '—'}</p>
                  </div>
                </div>
              </td>
              <td className="table-td"><span className="badge-blue">Owner</span></td>
              <td className="table-td"><span className="badge-green">Active</span></td>
              <td className="table-td text-xs text-gray-400">{joinedDate}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <UsersIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-0.5">Team Members — Coming Soon</p>
          <p>Multi-user team access with role-based permissions will be available in a future update.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main settings page ──────────────────────────────── */
export default function SettingsPage() {
  const { user } = useAuth();

  // Read ?tab= from URL so Amazon OAuth redirect lands on the right tab
  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'profile';
  const [tab, setTab] = useState(initialTab);

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
          {tab === 'team'      && <TeamTab user={user} />}
        </div>
      </div>
    </div>
  );
}
