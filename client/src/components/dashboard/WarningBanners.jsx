import Banner from '../ui/Banner';

/** Renders the server's warnings (80% used, over budget, over today's budget, over a category limit...). */
export default function WarningBanners({ warnings = [] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <Banner key={w.code + w.message} level={w.level}>
          {w.message}
        </Banner>
      ))}
    </div>
  );
}
