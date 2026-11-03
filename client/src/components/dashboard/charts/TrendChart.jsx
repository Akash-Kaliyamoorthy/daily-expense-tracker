import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../../context/ThemeContext';
import { baseOptions, chartTheme } from '../../../utils/chartSetup';
import { currentMonth, formatINR, monthLabel, monthShort } from '../../../utils/format';
import Card from '../../ui/Card';

/**
 * Month-over-month comparison: what you spent against what you had available
 * to spend (income minus bills and savings goal).
 */
export default function TrendChart({ items = [], loading = false }) {
  const { theme } = useTheme();
  const colors = chartTheme(theme);
  const now = currentMonth();
  const hasAny = items.some((i) => i.spent > 0);

  const data = useMemo(
    () => ({
      labels: items.map((i) => monthShort(i.month)),
      datasets: [
        {
          type: 'bar',
          label: 'Spent',
          data: items.map((i) => i.spent),
          backgroundColor: items.map((i) => (i.month === now ? colors.highlight : colors.bar)),
          borderRadius: 4,
          maxBarThickness: 44,
          order: 2,
        },
        {
          type: 'line',
          label: 'Available to spend',
          // Months without a budget have no "available" figure: leave a gap.
          data: items.map((i) =>
            i.has_budget ? Math.max(0, i.income - i.commitments - i.savings_goal) : null,
          ),
          borderColor: colors.text,
          backgroundColor: colors.text,
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 5,
          spanGaps: false,
          order: 1,
        },
      ],
    }),
    [items, now, colors],
  );

  const options = useMemo(() => {
    const base = baseOptions(theme);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: colors.text, usePointStyle: true, boxWidth: 8, padding: 18 },
        },
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            title: (tooltipItems) => monthLabel(items[tooltipItems[0].dataIndex].month),
            label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}`,
          },
        },
      },
    };
  }, [theme, colors.text, items]);

  return (
    <Card title="Last 6 months" subtitle="Spending compared with what you had available">
      {loading && items.length === 0 ? (
        <div className="h-64 animate-pulse rounded-control bg-ink-100 dark:bg-ink-900" />
      ) : !hasAny ? (
        <p className="muted py-16 text-center text-sm">
          Your monthly comparison appears once you have recorded some expenses.
        </p>
      ) : (
        <div
          className="h-72"
          role="img"
          aria-label={`Monthly spending for the last ${items.length} months compared with the amount available to spend.`}
        >
          <Bar data={data} options={options} />
        </div>
      )}
    </Card>
  );
}
