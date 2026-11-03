import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { formatCompact, formatINR } from './format';

// Register only what the charts use (keeps the bundle small). The line controller
// is needed because the bar charts draw a budget line on top of the bars.
ChartJS.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

/** Colours that follow the light / dark theme. */
export function chartTheme(theme) {
  const dark = theme === 'dark';
  return {
    text: dark ? '#a0a8d4' : '#4a569c',
    grid: dark ? 'rgba(160, 168, 212, 0.14)' : 'rgba(54, 63, 130, 0.10)',
    surface: dark ? '#151934' : '#ffffff',
    bar: dark ? '#7f8bd6' : '#363f82',
    barMuted: dark ? 'rgba(127, 139, 214, 0.35)' : 'rgba(54, 63, 130, 0.28)',
    highlight: '#f2b92b',
    danger: '#c8402f',
  };
}

/** Shared tooltip look + rupee formatting. */
export function baseOptions(theme) {
  const c = chartTheme(theme);
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#0d1022' : '#171b3d',
        titleColor: '#ffffff',
        bodyColor: '#e4e6f3',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => formatINR(ctx.parsed.y ?? ctx.parsed),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: c.text, maxRotation: 0, autoSkip: true },
        border: { color: c.grid },
      },
      y: {
        beginAtZero: true,
        grid: { color: c.grid },
        border: { display: false },
        ticks: { color: c.text, callback: (v) => `₹${formatCompact(v)}`, maxTicksLimit: 5 },
      },
    },
  };
}
