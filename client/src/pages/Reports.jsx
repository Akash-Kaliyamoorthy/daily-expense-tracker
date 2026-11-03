import { useState } from 'react';
import { downloadCsv, getSummary, getTrend } from '../api/reports';
import { getErrorMessage } from '../api/client';
import CategoryLimits from '../components/dashboard/CategoryLimits';
import TrendChart from '../components/dashboard/charts/TrendChart';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Dot from '../components/ui/Dot';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import MonthSwitcher from '../components/ui/MonthSwitcher';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import useFetch from '../hooks/useFetch';
import useMonth from '../hooks/useMonth';
import usePageTitle from '../hooks/usePageTitle';
import {
  DATE_RE,
  currentMonth,
  formatDate,
  formatINR,
  formatPercent,
  monthEnd,
  monthLabel,
  monthStart,
} from '../utils/format';

function BarRow({ label, value, max, tone = 'ink', note }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = {
    ink: 'bg-ink-600 dark:bg-ink-300',
    ok: 'bg-ok-500',
    warn: 'bg-warn-500',
    bad: 'bg-bad-500',
  }[tone];
  return (
    <div className="rule py-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="font-semibold">{formatINR(value)}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-900"
        aria-hidden="true"
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
      {note && <p className="muted mt-1.5 text-sm">{note}</p>}
    </div>
  );
}

/** Income against spending against savings, as proportional bars. */
function Overview({ summary: s }) {
  const o = s.overview;
  const max = Math.max(o.income, o.total_outflow, 1);
  const goalMet = o.savings_goal > 0 && o.actual_savings >= o.savings_goal;
  const leftTone = o.actual_savings < 0 ? 'bad' : o.savings_goal > 0 && !goalMet ? 'warn' : 'ok';
  const leftNote =
    o.savings_goal === 0
      ? 'No savings goal set for this month'
      : goalMet
        ? `You are ${formatINR(o.actual_savings - o.savings_goal)} above your ${formatINR(o.savings_goal)} goal`
        : `${formatINR(o.savings_goal - Math.max(0, o.actual_savings))} short of your ${formatINR(o.savings_goal)} goal`;

  return (
    <Card title="Income, spending and savings" subtitle={`${monthLabel(s.month)} so far`}>
      <div className="-mb-3">
        <BarRow label="Income" value={o.income} max={max} tone="ok" />
        <BarRow label="Bills and EMIs" value={o.commitments} max={max} />
        <BarRow label="Everyday spending" value={o.variable_spending} max={max} />
        <BarRow
          label="Left in hand"
          value={o.actual_savings}
          max={max}
          tone={leftTone}
          note={leftNote}
        />
      </div>
    </Card>
  );
}

function TopCategories({ categories }) {
  return (
    <Card title="Top categories" subtitle="Where most of the money went">
      {categories.length === 0 ? (
        <p className="muted text-sm">No spending recorded in this month.</p>
      ) : (
        <ol className="-my-1">
          {categories.map((c) => (
            <li key={c.category_id ?? c.name} className="rule py-3">
              <div className="flex items-center gap-2">
                <Dot color={c.color} />
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                <span className="muted text-sm">{formatPercent(c.share_pct)}</span>
                <span className="w-24 text-right font-semibold">{formatINR(c.spent)}</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-900"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.share_pct || 0}%`, backgroundColor: c.color }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Highlights({ summary: s }) {
  return (
    <Card title="Highlights">
      <dl className="-my-1">
        <div className="rule flex items-baseline justify-between gap-4 py-3">
          <dt className="muted">Highest spending day</dt>
          <dd className="text-right font-medium">
            {s.highest_day ? (
              <>
                {formatDate(s.highest_day.date)}
                <span className="block font-semibold">{formatINR(s.highest_day.total)}</span>
              </>
            ) : (
              'None yet'
            )}
          </dd>
        </div>
        <div className="rule flex items-baseline justify-between gap-4 py-3">
          <dt className="muted">Average per day</dt>
          <dd className="font-semibold">{formatINR(s.average_per_day)}</dd>
        </div>
        <div className="rule flex items-baseline justify-between gap-4 py-3">
          <dt className="muted">Daily budget</dt>
          <dd className="font-semibold">{formatINR(s.daily_budget)}</dd>
        </div>
        <div className="rule flex items-baseline justify-between gap-4 py-3">
          <dt className="muted">Expenses recorded</dt>
          <dd className="font-semibold">{s.expense_count}</dd>
        </div>
      </dl>
    </Card>
  );
}

/** Download the expenses in any date range as a spreadsheet file. */
function ExportCard({ defaultMonth }) {
  const toast = useToast();
  const [range, setRange] = useState({
    from: monthStart(defaultMonth),
    to: monthEnd(defaultMonth),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleDownload(event) {
    event.preventDefault();
    if (!DATE_RE.test(range.from) || !DATE_RE.test(range.to)) {
      setError('Choose both dates');
      return;
    }
    if (range.from > range.to) {
      setError('The start date must be on or before the end date');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await downloadCsv(range.from, range.to);
      toast.success('Your CSV file is downloading.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Download your expenses" subtitle="A CSV file that opens in Excel or Google Sheets">
      <form
        onSubmit={handleDownload}
        noValidate
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
      >
        <Input
          label="From"
          type="date"
          value={range.from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
        />
        <Input
          label="To"
          type="date"
          value={range.to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          error={error}
        />
        <Button type="submit" loading={busy} className="sm:mt-[1.65rem]">
          <Icon name="download" className="h-4 w-4" />
          Download CSV
        </Button>
      </form>
    </Card>
  );
}

export default function Reports() {
  usePageTitle('Reports');
  const { month, goPrev, goNext, setMonth, isCurrent } = useMonth();
  const summaryQuery = useFetch(() => getSummary(month), [month]);
  const trendQuery = useFetch(() => getTrend(6), []);

  const s = summaryQuery.data;
  if (!s && summaryQuery.loading) return <PageSkeleton />;
  if (!s && summaryQuery.error) {
    return (
      <div className="space-y-4">
        <Banner level="danger">{getErrorMessage(summaryQuery.error)}</Banner>
        <Button onClick={summaryQuery.reload}>Try again</Button>
      </div>
    );
  }
  const stale = s.month !== month;

  return (
    <div className="space-y-6">
      <MonthSwitcher
        month={month}
        onPrev={goPrev}
        onNext={goNext}
        isCurrent={isCurrent}
        onToday={() => setMonth(currentMonth())}
      />

      <div
        aria-busy={stale}
        className={`space-y-6 transition-opacity ${stale ? 'pointer-events-none opacity-50' : ''}`}
      >
        {!s.has_budget && (
          <Banner level="info">
            There is no budget for {monthLabel(month)}, so income and savings show as zero. Spending
            is still counted.
          </Banner>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <Overview summary={s} />
          <div className="space-y-6">
            <TopCategories categories={s.top_categories} />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Highlights summary={s} />
          <CategoryLimits limits={s.category_limits} />
        </div>
        <TrendChart items={trendQuery.data?.items || []} loading={trendQuery.loading} />
        <ExportCard key={month} defaultMonth={month} />
      </div>
    </div>
  );
}
