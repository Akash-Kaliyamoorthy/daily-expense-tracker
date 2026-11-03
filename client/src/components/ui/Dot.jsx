/** A small colour swatch that identifies a category. */
export default function Dot({ color = '#64748b', className = 'h-2.5 w-2.5' }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}
