import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../../context/ThemeContext';
import { baseOptions, chartTheme } from '../../../utils/chartSetup';
import { formatINR } from '../../../utils/format';
import Card from '../../ui/Card';

/**
 * Spending for each day of the month. A dashed line marks the average daily
 * budget; days above it are red, today is marigold.
 */
export default function DailySpendChart({ daily = [], dailyBudget = 0, today }) {
  const { theme } = useTheme();
  const colors = chartTheme(theme);
  const hasBudget = dailyBudget > 0;
  const total = daily.reduce((sum, d) => sum + d.total, 0);

  const data = useMemo(
    () => ({
      labels: daily.map((d) => d.day),
      datasets: [
        {
          type: 'bar',
          label: 'Spent',
          data: daily.map((d) => d.total),
          backgroundColor: daily.map((d) => {
            if (d.date === today) return colors.highlight;
            if (hasBudget && d.total > dailyBudget) return colors.danger;
            return colors.bar;
          }),
          borderRadius: 3,
          maxBarThickness: 18,
          order: 2,
        },
        ...(hasBudget
          ? [
              {
                type: 'line',
                label: 'Daily budget',
                data: daily.map(() => dailyBudget),
                borderColor: colors.text,
                borderDash: [6, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 0,
                order: 1,
              },
            ]
          : []),
      ],
    }),
    [daily, dailyBudget, hasBudget, today, colors],
  );

  const options = useMemo(() => {
    const base = baseOptions(theme);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            title: (items) => `Day ${items[0].label}`,
            label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        ...base.scales,
        x: { ...base.scales.x, ticks: { ...base.scales.x.ticks, maxTicksLimit: 16 } },
      },
    };
  }, [theme]);

  return (
    <Card title="Day by day" subtitle="What you spent on each day of the month">
      {total === 0 ? (
        <p className="muted py-16 text-center text-sm">No spending recorded this month yet.</p>
      ) : (
        <>
          <div
            className="h-64"
            role="img"
            aria-label={`Daily spending for the month, ${formatINR(total)} in total.`}
          >
            <Bar data={data} options={options} />
          </div>
          {hasBudget && (
            <p className="muted mt-3 text-xs leading-relaxed">
              The dashed line is your average daily budget of {formatINR(dailyBudget)}. Days above
              it are red, and today is yellow.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
