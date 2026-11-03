import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageSkeleton } from '../ui/Skeleton';
import { BottomNav, Sidebar, TopBar } from './Navbar';

/**
 * The frame around every signed-in page. Pages are code-split, so the frame
 * stays on screen (with a skeleton) while a page's code loads.
 */
export default function AppLayout() {
  const { pathname } = useLocation();

  // A new page starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink-800 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar />
      <TopBar />
      <main id="main" className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8 lg:px-8">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
