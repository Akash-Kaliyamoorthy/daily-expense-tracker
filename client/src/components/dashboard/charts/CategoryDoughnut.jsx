import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../../context/ThemeContext';
import { chartTheme } from '../../../utils/chartSetup';
import { formatINR, formatPercent } from '../../../utils/format';
import Card from '../../ui/Card';
import Dot from '../../ui/Dot';

/** Where this month's money went, by category. The legend is a real list, so values are readable without hovering. */
export default function CategoryDoughnut({ categories = [] }) {
  const { theme } = useTheme();
  const colors = chartTheme(theme);
  const rows = useMemo(() => categories.filter((c) => c.spent > 0), [categories]);
  const total = rows.reduce((sum, r) => sum + r.spent, 0);

  const data = useMemo(
    () => ({
      labels: rows.map((r) => r.name),
      datasets: [
        {
          data: rows.map((r) => r.spent),
          backgroundColor: rows.map((r) => r.color),
          borderColor: colors.surface,
          borderWidth: 2,
        },
      ],
    }),
    [rows, colors.surface],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#0d1022' : '#171b3d',
          padding: 10,
          cornerRadius: 8,
          callbacks: { label: (ctx) => `${ctx.label}: ${formatINR(ctx.parsed)}` },
        },
      },
    }),
    [theme],
  );

  return (
    <Card title="Spending by category">
      {rows.length === 0 ? (
        <p className="muted py-10 text-center text-sm">No spending recorded this month yet.</p>
      ) : (
        <>
          <div
            className="relative mx-auto h-48 w-48"
            role="img"
            aria-label={`Spending by category, ${formatINR(total)} in total. Top: ${rows[0].name}, ${formatINR(rows[0].spent)}.`}
          >
            <Doughnut data={data} options={options} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="muted text-xs">Total</span>
              <span className="text-lg font-semibold">{formatINR(total)}</span>
            </div>
          </div>
          <ul className="mt-5">
            {rows.map((r) => (
              <li
                key={r.category_id ?? r.name}
                className="rule flex items-center gap-3 py-2 text-sm"
              >
                <Dot color={r.color} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="muted w-14 text-right">{formatPercent(r.share_pct)}</span>
                <span className="w-24 text-right font-medium">{formatINR(r.spent)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
