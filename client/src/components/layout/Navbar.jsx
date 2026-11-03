import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../ui/Icon';
import BrandMark from './BrandMark';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: 'home', end: true },
  { to: '/setup', label: 'Monthly setup', short: 'Setup', icon: 'wallet' },
  { to: '/expenses', label: 'Expenses', short: 'Expenses', icon: 'list' },
  { to: '/reports', label: 'Reports', short: 'Reports', icon: 'chart' },
  { to: '/categories', label: 'Categories', short: 'Categories', icon: 'tag' },
];

function ThemeToggle({ className = '', withLabel = false }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-3 rounded-control text-ink-600 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900 ${className}`}
      aria-label={`Switch to ${next} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      {withLabel && (
        <span className="text-sm font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  );
}

function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  return async () => {
    await logout();
    toast.info('You have been logged out.');
    navigate('/login', { replace: true });
  };
}

/** Desktop: a fixed navigation rail on the left. */
export function Sidebar() {
  const { user } = useAuth();
  const handleLogout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink-100 bg-white px-3 py-5 md:flex dark:border-night-line dark:bg-ink-950">
      <div className="mb-8 flex items-center gap-3 px-3">
        <BrandMark />
        <span className="font-display text-lg font-semibold leading-tight">
          Daily Expense
          <br />
          Tracker
        </span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-ink-800 text-white dark:bg-ink-800 dark:text-white'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900'
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-dashed border-ink-200 pt-4 dark:border-night-line">
        <ThemeToggle withLabel className="h-11 w-full px-3" />
        <div className="px-3 py-1">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="muted truncate text-xs">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900"
        >
          <Icon name="logout" />
          Log out
        </button>
      </div>
    </aside>
  );
}

/** Phones: a slim top bar (brand, theme, log out)... */
export function TopBar() {
  const handleLogout = useLogout();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-100 bg-white/95 px-4 backdrop-blur md:hidden dark:border-night-line dark:bg-ink-950/95">
      <div className="flex items-center gap-2.5">
        <BrandMark className="h-8 w-8" />
        <span className="font-display text-base font-semibold">Daily Expense Tracker</span>
      </div>
      <div className="flex items-center">
        <ThemeToggle className="h-10 w-10 justify-center" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-control text-ink-600 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900"
          aria-label="Log out"
        >
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}

/** ...and a tab bar at the bottom, within thumb reach. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white md:hidden dark:border-night-line dark:bg-ink-950"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  isActive
                    ? 'text-ink-800 dark:text-marigold-400'
                    : 'text-ink-500 dark:text-ink-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-ink-100 dark:bg-ink-900' : ''
                    }`}
                  >
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  {item.short}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
