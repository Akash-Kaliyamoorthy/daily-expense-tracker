/** The app's logo: a rupee sign in marigold on ledger-indigo. */
export default function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#1f2552" />
      <path
        d="M9.5 9h13M9.5 14h13M12.5 9c6.2 0 8 2.6 8 5s-1.8 5-8 5l8.5 6.5"
        fill="none"
        stroke="#f2b92b"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
