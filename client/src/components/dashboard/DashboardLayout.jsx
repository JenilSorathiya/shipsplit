import { useState, Fragment } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
import {
  HomeIcon, ShoppingBagIcon, TagIcon, ChartBarIcon, Cog6ToothIcon,
  Bars3Icon, XMarkIcon, BellIcon, ChevronDownIcon,
  ArrowRightOnRectangleIcon, UserCircleIcon, CreditCardIcon,
  MagnifyingGlassIcon, QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, ShoppingBagIcon as ShoppingBagSolid,
  TagIcon as TagSolid, ChartBarIcon as ChartBarSolid,
  Cog6ToothIcon as CogSolid, CreditCardIcon as CreditCardSolid } from '@heroicons/react/24/solid';

const NAV = [
  { to: '/dashboard',                 label: 'Dashboard',        icon: HomeIcon,         iconActive: HomeIconSolid },
  { to: '/dashboard/orders',          label: 'Orders',           icon: ShoppingBagIcon,  iconActive: ShoppingBagSolid },
  { to: '/dashboard/label-generator', label: 'Label Generator',  icon: TagIcon,          iconActive: TagSolid },
  { to: '/dashboard/reports',         label: 'Reports',          icon: ChartBarIcon,     iconActive: ChartBarSolid },
  { to: '/dashboard/billing',         label: 'Billing',          icon: CreditCardIcon,   iconActive: CreditCardSolid },
  { to: '/dashboard/settings',        label: 'Settings',         icon: Cog6ToothIcon,    iconActive: CogSolid },
];

const PLATFORM_OPTIONS = [
  { id: 'all',      label: 'All Platforms', dot: 'bg-gray-400' },
  { id: 'amazon',   label: 'Amazon',        dot: 'bg-[#FF9900]' },
  { id: 'flipkart', label: 'Flipkart',      dot: 'bg-[#2874F0]' },
  { id: 'meesho',   label: 'Meesho',        dot: 'bg-[#F43397]' },
  { id: 'myntra',   label: 'Myntra',        dot: 'bg-[#FF3F6C]' },
];

/* ── Logo ─────────────────────────────────────────────── */
function Logo({ collapsed }) {
  return (
    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
      <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
      {!collapsed && <span className="font-bold text-white text-base tracking-tight">ShipSplit</span>}
    </div>
  );
}

/* ── Sidebar nav item ─────────────────────────────────── */
function NavItem({ item, collapsed, onClick }) {
  const location = useLocation();
  const isActive = item.to === '/dashboard'
    ? location.pathname === '/dashboard'
    : location.pathname.startsWith(item.to);
  const Icon = isActive ? item.iconActive : item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
    >
      <Icon className="nav-item-icon flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && isActive && item.to !== '/dashboard' && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
      )}
    </NavLink>
  );
}

/* ── Sidebar ──────────────────────────────────────────── */
function Sidebar({ open, collapsed, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-30 h-full bg-sidebar flex flex-col
        transition-all duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-60'}
      `}>
        {/* Logo area */}
        <div className={`flex items-center h-14 border-b border-white/5 flex-shrink-0 ${collapsed ? 'px-4 justify-center' : 'px-4'}`}>
          <Logo collapsed={collapsed} />
          {!collapsed && (
            <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-white p-1">
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Platform badge */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="bg-white/5 rounded-lg px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-widest">
              Navigation
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className={`flex-1 overflow-y-auto py-2 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} onClick={onClose} />
          ))}
        </nav>

        {/* Help link */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <button className="nav-item w-full text-slate-500">
              <QuestionMarkCircleIcon className="nav-item-icon" />
              <span>Help & Support</span>
            </button>
          </div>
        )}

        {/* User section */}
        <div className={`border-t border-white/5 p-3 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="h-8 w-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-semibold text-sm hover:bg-primary-600/30 transition-colors"
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-2xs text-slate-500 capitalize">{user?.subscription?.plan || 'Free'} plan</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="p-1 text-slate-500 hover:text-white transition-colors rounded"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── Top bar ──────────────────────────────────────────── */
function TopBar({ onMenuClick, sidebarWidth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('all');
  const [notifOpen, setNotifOpen] = useState(false);

  const selectedPlatform = PLATFORM_OPTIONS.find((p) => p.id === platform);

  return (
    <header
      className="fixed top-0 right-0 z-10 h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4"
      style={{ left: sidebarWidth }}
    >
      {/* Mobile hamburger */}
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="hidden sm:flex flex-1 max-w-xs relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 transition-colors"
          placeholder="Search orders, labels…"
        />
      </div>

      <div className="flex-1 sm:hidden" />

      {/* Platform selector */}
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-700">
          <span className={`h-2 w-2 rounded-full ${selectedPlatform?.dot}`} />
          <span className="hidden sm:inline">{selectedPlatform?.label}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-75"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-50 focus:outline-none">
            {PLATFORM_OPTIONS.map((p) => (
              <Menu.Item key={p.id}>
                {({ active }) => (
                  <button
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm ${active ? 'bg-gray-50' : ''} ${platform === p.id ? 'text-primary-600 font-medium' : 'text-gray-700'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                    {p.label}
                    {platform === p.id && <span className="ml-auto text-primary-500">✓</span>}
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu>

      {/* Notifications */}
      <button
        onClick={() => setNotifOpen(!notifOpen)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <BellIcon className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-warning-500 ring-2 ring-white" />
      </button>

      {/* User menu */}
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="hidden md:inline text-sm font-medium text-gray-700 max-w-24 truncate">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 hidden md:block" />
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-75"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-50 focus:outline-none">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <span className="mt-1 badge badge-blue capitalize">{user?.subscription?.plan || 'free'} plan</span>
            </div>
            {[
              { icon: UserCircleIcon, label: 'Profile', to: '/dashboard/settings' },
              { icon: CreditCardIcon, label: 'Billing',  to: '/dashboard/billing'  },
            ].map(({ icon: Icon, label, to }) => (
              <Menu.Item key={label}>
                {({ active }) => (
                  <button
                    onClick={() => navigate(to)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 ${active ? 'bg-gray-50' : ''}`}
                  >
                    <Icon className="h-4 w-4 text-gray-400" />
                    {label}
                  </button>
                )}
              </Menu.Item>
            ))}
            <div className="border-t border-gray-100 mt-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 ${active ? 'bg-red-50' : ''}`}
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Sign out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </header>
  );
}

/* ── Layout ───────────────────────────────────────────── */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? '4rem' : '15rem';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Collapse toggle (desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex fixed top-4 z-40 items-center justify-center h-6 w-6 rounded-full bg-white border border-gray-200 shadow-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
        style={{ left: `calc(${sidebarWidth} - 12px)` }}
      >
        <svg className={`h-3 w-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        sidebarWidth={`max(${sidebarWidth}, 0px)`}
      />

      {/* Main content */}
      <main
        className="transition-all duration-300 pt-14 min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-5 lg:p-7 max-w-[1400px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
