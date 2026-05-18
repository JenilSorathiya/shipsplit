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
  const [tokenInput,  setTokenInput]  = useState('');
  const [sellerInput, setSellerInput] = useState('');
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
      toast.success('Amazon connected via sandbox token!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save token');
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
              {/* Amazon: show manual token option when not connected */}
              {!isConnected && p.id === 'amazon' && (
                <button
                  onClick={() => { setManualForm(manualForm === p.id ? null : p.id); setTokenInput(''); setSellerInput(''); }}
                  className="btn-ghost btn-sm text-gray-500 gap-1.5"
                  title="Enter sandbox refresh token manually"
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
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Manual token entry form (sandbox) — inside outer wrapper */}
          {manualForm === p.id && !isConnected && (
            <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <KeyIcon className="h-4 w-4" /> Enter Sandbox Refresh Token
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
                <label className="form-label text-xs">Seller ID <span className="text-gray-400 font-normal">(optional for sandbox)</span></label>
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

/* ── Label Size visual card ──────────────────────────── */
const LABEL_SIZES = [
  {
    id: '4x6',
    name: '4 × 6 inch',
    sub: 'Thermal — Most Popular',
    dims: '100 × 150 mm',
    platforms: ['Amazon', 'Meesho'],
    color: 'blue',
    shape: { w: 40, h: 60 },
    popular: true,
  },
  {
    id: '3x5',
    name: '3 × 5 inch',
    sub: 'Flipkart New Format',
    dims: '75 × 125 mm',
    platforms: ['Flipkart'],
    color: 'indigo',
    shape: { w: 36, h: 50 },
  },
  {
    id: 'A6',
    name: 'A6',
    sub: 'Thermal / Small Inkjet',
    dims: '105 × 148 mm',
    platforms: ['Meesho', 'Flipkart'],
    color: 'violet',
    shape: { w: 42, h: 60 },
  },
  {
    id: 'A4_4',
    name: 'A4 — 4 per page',
    sub: 'Regular Printer',
    dims: '210 × 297 mm  ·  2×2 grid',
    platforms: ['Amazon', 'Flipkart', 'Meesho'],
    color: 'emerald',
    shape: { w: 56, h: 72 },
    grid: '2×2',
  },
  {
    id: 'A4_2',
    name: 'A4 — 2 per page',
    sub: 'Regular Printer',
    dims: '210 × 297 mm  ·  1×2 grid',
    platforms: ['Amazon', 'Flipkart', 'Meesho'],
    color: 'teal',
    shape: { w: 56, h: 72 },
    grid: '1×2',
  },
  {
    id: 'A4_1',
    name: 'A4 — Full Page',
    sub: 'Single large label',
    dims: '210 × 297 mm',
    platforms: ['Amazon'],
    color: 'gray',
    shape: { w: 56, h: 72 },
    grid: '1×1',
  },
];

const SIZE_COLORS = {
  blue:   { ring: 'ring-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700'   },
  indigo: { ring: 'ring-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  violet: { ring: 'ring-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  emerald:{ ring: 'ring-emerald-500',bg: 'bg-emerald-50',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700' },
  teal:   { ring: 'ring-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700',   badge: 'bg-teal-100 text-teal-700'   },
  gray:   { ring: 'ring-gray-400',   bg: 'bg-gray-50',   text: 'text-gray-700',   badge: 'bg-gray-100 text-gray-600'   },
};

function LabelSizeCard({ size, selected, onSelect }) {
  const c = SIZE_COLORS[size.color];
  const { w, h } = size.shape;
  return (
    <button
      onClick={() => onSelect(size.id)}
      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center w-full
        ${selected ? `${c.ring} ring-2 ${c.bg} border-transparent` : 'border-gray-200 hover:border-gray-300 bg-white'}`}
    >
      {size.popular && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-2xs font-bold bg-orange-500 text-white rounded-full whitespace-nowrap">
          Most Used
        </span>
      )}
      {/* Mini paper preview */}
      <div className="mb-2 mt-1 flex items-center justify-center" style={{ height: 64 }}>
        <div
          className={`rounded border-2 ${selected ? `border-current ${c.text}` : 'border-gray-300'} relative flex items-center justify-center`}
          style={{ width: w * 0.72, height: h * 0.72 }}
        >
          {size.grid === '2×2' && (
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px p-px opacity-30">
              {[0,1,2,3].map(i => <div key={i} className="bg-current rounded-sm" />)}
            </div>
          )}
          {size.grid === '1×2' && (
            <div className="absolute inset-0 grid grid-cols-1 grid-rows-2 gap-px p-px opacity-30">
              {[0,1].map(i => <div key={i} className="bg-current rounded-sm" />)}
            </div>
          )}
          {(size.id === '4x6' || size.id === '3x5' || size.id === 'A6') && (
            <div className="absolute inset-1 flex flex-col gap-0.5 opacity-25">
              <div className="h-1.5 bg-current rounded w-3/4 mx-auto" />
              <div className="h-px bg-current rounded w-full" />
              <div className="h-px bg-current rounded w-2/3" />
              <div className="h-px bg-current rounded w-1/2" />
              <div className="mt-auto h-3 bg-current rounded w-full opacity-70" />
            </div>
          )}
        </div>
      </div>
      <p className={`text-xs font-bold ${selected ? c.text : 'text-gray-800'}`}>{size.name}</p>
      <p className="text-2xs text-gray-500 mt-0.5">{size.sub}</p>
      <p className="text-2xs text-gray-400 mt-0.5">{size.dims}</p>
      <div className="flex flex-wrap gap-1 justify-center mt-1.5">
        {size.platforms.map(p => (
          <span key={p} className={`text-2xs px-1.5 py-0.5 rounded font-medium ${selected ? c.badge : 'bg-gray-100 text-gray-500'}`}>{p}</span>
        ))}
      </div>
    </button>
  );
}

/* ── Label settings tab ──────────────────────────────── */
function LabelSettingsTab() {
  const [s, setS] = useState({
    // Size
    defaultSize: '4x6',
    // Print content
    printContent: 'label_only',     // label_only | invoice_only | combined | separate
    // COD
    codBadge:     true,
    codAmount:    true,
    prepaidBadge: true,
    // Return address
    returnName:   '',
    returnPhone:  '',
    returnLine1:  '',
    returnLine2:  '',
    returnCity:   '',
    returnState:  '',
    returnPin:    '',
    returnGST:    '',
    // Brand
    brandLogo:    false,
    customMsg:    '',
    // Print prefs
    fontSize:     'medium',         // small | medium | large
    fileFormat:   'pdf',            // pdf | zpl
    autoGenerate: false,
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

      {/* ── 1. Label Size ─────────────────────────────── */}
      <Section title="Label Size" desc="Choose your default size based on your printer type.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LABEL_SIZES.map((size) => (
            <LabelSizeCard
              key={size.id}
              size={size}
              selected={s.defaultSize === size.id}
              onSelect={(id) => upd('defaultSize', id)}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          Most Indian sellers use <strong className="text-gray-600">4×6 inch thermal</strong> (TSC, Xprinter, TVS) or <strong className="text-gray-600">A4 4-up</strong> for regular printers.
        </p>
      </Section>

      {/* ── 2. Print Content ──────────────────────────── */}
      <Section title="What to Print" desc="Choose what gets included when you download a label.">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { id: 'label_only',  icon: '🏷️', title: 'Label Only',              desc: 'Just the shipping label. Print invoice separately.' },
            { id: 'invoice_only',icon: '🧾', title: 'Invoice Only',             desc: 'Tax invoice only. Useful for batch invoice printing.' },
            { id: 'combined',    icon: '📄', title: 'Label + Invoice (Same Page)', desc: 'Combined A4 — cut in half. Label on bottom, invoice on top.' },
            { id: 'separate',    icon: '📋', title: 'Label + Invoice (Separate)',  desc: 'Two separate PDFs — ideal for high-volume sellers.' },
          ].map(({ id, icon, title, desc }) => (
            <button
              key={id}
              onClick={() => upd('printContent', id)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all
                ${s.printContent === id ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <span className="text-xl mt-0.5">{icon}</span>
              <div>
                <p className={`text-sm font-semibold ${s.printContent === id ? 'text-primary-700' : 'text-gray-800'}`}>{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              {s.printContent === id && (
                <CheckCircleSolid className="h-4 w-4 text-primary-600 ml-auto flex-shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* ── 3. COD & Prepaid ──────────────────────────── */}
      <Section title="COD & Prepaid Labels" desc="India has 60%+ COD orders — make them impossible to miss.">
        <div className="space-y-3">
          {[
            {
              key: 'codBadge',
              label: 'Show red COD badge on labels',
              desc: 'Prints a bold red "CASH ON DELIVERY" badge — delivery agents scan for this first',
              recommended: true,
            },
            {
              key: 'codAmount',
              label: 'Print COD amount on label',
              desc: 'Shows "COD: ₹XXX" so the delivery agent knows exactly how much to collect',
              recommended: true,
            },
            {
              key: 'prepaidBadge',
              label: 'Show PREPAID marker on prepaid orders',
              desc: 'Clearly marks non-COD orders so agents don\'t attempt cash collection',
              recommended: true,
            },
          ].map(({ key, label, desc, recommended }) => (
            <div key={key} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all
              ${s[key] ? 'border-success-200 bg-success-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  {recommended && <span className="text-2xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">Recommended</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={!!s[key]} onChange={(v) => upd(key, v)} />
            </div>
          ))}
        </div>
        {/* Visual preview hint */}
        {s.codBadge && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3">
            <div className="flex-shrink-0 px-3 py-1.5 bg-red-600 rounded text-white text-xs font-bold">CASH ON DELIVERY</div>
            {s.codAmount && <div className="text-sm font-bold text-gray-800">₹ 499</div>}
            <p className="text-xs text-gray-400 ml-auto">Preview</p>
          </div>
        )}
      </Section>

      {/* ── 4. Return / Sender Address ────────────────── */}
      <Section
        title="Return Address"
        desc="Where failed deliveries (RTO) come back to. This may differ from your GST-registered address."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Business / Store Name</label>
            <input className="form-input" placeholder="StyleKart" value={s.returnName} onChange={(e) => upd('returnName', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Contact Phone</label>
            <input className="form-input" placeholder="9876543210" maxLength={10} value={s.returnPhone} onChange={(e) => upd('returnPhone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Address Line 1</label>
            <input className="form-input" placeholder="Shop 12, Gandhi Nagar" value={s.returnLine1} onChange={(e) => upd('returnLine1', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Address Line 2 <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="form-input" placeholder="Near Bus Stand" value={s.returnLine2} onChange={(e) => upd('returnLine2', e.target.value)} />
          </div>
          <div>
            <label className="form-label">City</label>
            <input className="form-input" placeholder="Jaipur" value={s.returnCity} onChange={(e) => upd('returnCity', e.target.value)} />
          </div>
          <div>
            <label className="form-label">State</label>
            <input className="form-input" placeholder="Rajasthan" value={s.returnState} onChange={(e) => upd('returnState', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Pincode</label>
            <input className="form-input" placeholder="302001" maxLength={6} value={s.returnPin} onChange={(e) => upd('returnPin', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <label className="form-label">GSTIN <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="form-input uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={s.returnGST} onChange={(e) => upd('returnGST', e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">India's RTO rate is 15–25%. Make sure this address is your actual warehouse/pickup location, not a virtual office.</p>
        </div>
      </Section>

      {/* ── 5. Branding ───────────────────────────────── */}
      <Section title="Branding" desc="Logo and custom message for your labels.">
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all
            ${s.brandLogo ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
            <div>
              <p className="text-sm font-medium text-gray-800">Show brand logo on labels</p>
              <p className="text-xs text-gray-400 mt-0.5">Appears on ShipSplit-generated labels and packing slips</p>
            </div>
            <Toggle checked={!!s.brandLogo} onChange={(v) => upd('brandLogo', v)} />
          </div>
          <div>
            <label className="form-label">Custom Message to Customer <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className="form-input"
              placeholder="Thank you for your order! 🎉"
              maxLength={80}
              value={s.customMsg}
              onChange={(e) => upd('customMsg', e.target.value)}
            />
            <p className="form-hint">{s.customMsg.length}/80 chars — printed at the bottom of the label</p>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <span className="text-blue-500 text-sm">ℹ️</span>
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Meesho prohibits seller branding on packaging. Amazon and Flipkart labels are carrier-generated — logo applies only to ShipSplit-generated labels and packing slips.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 6. Print Preferences ──────────────────────── */}
      <Section title="Print Preferences" desc="Fine-tune how your labels look and which format to use.">
        <div className="space-y-5">

          {/* Font size */}
          <div>
            <label className="form-label">Address Font Size</label>
            <div className="flex gap-3 mt-1">
              {[
                { id: 'small',  label: 'Small',  sub: '~8pt — fits more text' },
                { id: 'medium', label: 'Medium', sub: '~10pt — recommended'  },
                { id: 'large',  label: 'Large',  sub: '~12pt — easy to read' },
              ].map(({ id, label, sub }) => (
                <button
                  key={id}
                  onClick={() => upd('fontSize', id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center transition-all
                    ${s.fontSize === id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className={`text-sm font-semibold ${s.fontSize === id ? 'text-primary-700' : 'text-gray-700'}`}>{label}</p>
                  <p className="text-2xs text-gray-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* File format */}
          <div>
            <label className="form-label">File Format</label>
            <div className="flex gap-3 mt-1">
              {[
                { id: 'pdf', label: 'PDF', sub: 'All printers — recommended', badge: 'Default' },
                { id: 'zpl', label: 'ZPL', sub: 'Zebra / TSC printers only', badge: 'Advanced' },
              ].map(({ id, label, sub, badge }) => (
                <button
                  key={id}
                  onClick={() => upd('fileFormat', id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center transition-all relative
                    ${s.fileFormat === id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className={`absolute -top-2 right-2 text-2xs px-1.5 py-0.5 rounded font-bold
                    ${id === 'pdf' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{badge}</span>
                  <p className={`text-sm font-semibold ${s.fileFormat === id ? 'text-primary-700' : 'text-gray-700'}`}>{label}</p>
                  <p className="text-2xs text-gray-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-generate */}
          <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all
            ${s.autoGenerate ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
            <div>
              <p className="text-sm font-medium text-gray-800">Auto-generate on order import</p>
              <p className="text-xs text-gray-400 mt-0.5">Immediately prepare labels when orders are synced or uploaded</p>
            </div>
            <Toggle checked={!!s.autoGenerate} onChange={(v) => upd('autoGenerate', v)} />
          </div>
        </div>
      </Section>

      {/* Save button */}
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
