import { Link } from 'react-router-dom';
import BrandMark from '../components/layout/BrandMark';
import usePageTitle from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandMark className="h-12 w-12" />
      <h1 className="text-3xl font-semibold">This page does not exist</h1>
      <p className="muted max-w-sm leading-relaxed">
        The link may be old or mistyped. Your expenses are all on the dashboard.
      </p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-control bg-ink-800 px-4 text-sm font-medium text-white hover:bg-ink-700 dark:bg-ink-200 dark:text-ink-950"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
