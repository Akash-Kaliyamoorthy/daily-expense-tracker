import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { getSummary, getTrend } from '../api/reports';
import BudgetProgress from '../components/dashboard/BudgetProgress';
import CategoryLimits from '../components/dashboard/CategoryLimits';
import CategoryDoughnut from '../components/dashboard/charts/CategoryDoughnut';
import DailySpendChart from '../components/dashboard/charts/DailySpendChart';
import TrendChart from '../components/dashboard/charts/TrendChart';
import QuickAddExpense from '../components/dashboard/QuickAddExpense';
import StatCards from '../components/dashboard/StatCards';
import TodayHero from '../components/dashboard/TodayHero';
import UpcomingDues from '../components/dashboard/UpcomingDues';
import WarningBanners from '../components/dashboard/WarningBanners';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import MonthSwitcher from '../components/ui/MonthSwitcher';
import { PageSkeleton } from '../components/ui/Skeleton';
import useCategories from '../hooks/useCategories';
import useFetch from '../hooks/useFetch';
import useMonth from '../hooks/useMonth';
import usePageTitle from '../hooks/usePageTitle';
import { currentMonth } from '../utils/format';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { month, goPrev, goNext, setMonth, isCurrent } = useMonth();
  const summaryQuery = useFetch(() => getSummary(month), [month]);
  const trendQuery = useFetch(() => getTrend(6), []);
  const { data: categories } = useCategories();

  const s = summaryQuery.data;
  const refresh = () => {
    summaryQuery.reload();
    trendQuery.reload();
  };

  if (!s && summaryQuery.loading) return <PageSkeleton />;
  if (!s && summaryQuery.error) {
    return (
      <div className="space-y-4">
        <Banner level="danger">{getErrorMessage(summaryQuery.error)}</Banner>
        <Button onClick={summaryQuery.reload}>Try again</Button>
      </div>
    );
  }

  // While another month loads, keep the old numbers on screen, dimmed.
  const stale = s.month !== month;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher
          month={month}
          onPrev={goPrev}
          onNext={goNext}
          isCurrent={isCurrent}
          onToday={() => setMonth(currentMonth())}
        />
        <Link
          to={`/setup?month=${month}`}
          className="inline-flex h-10 items-center rounded-control border border-ink-200 px-4 text-sm font-medium hover:bg-ink-100 dark:border-night-line dark:hover:bg-ink-900"
        >
          Monthly setup
        </Link>
      </div>

      <div
        aria-busy={stale}
        className={`space-y-6 transition-opacity ${stale ? 'pointer-events-none opacity-50' : ''}`}
      >
        <WarningBanners warnings={s.warnings} />
        <TodayHero summary={s} month={month} />
        {isCurrent && <QuickAddExpense categories={categories || []} onAdded={refresh} />}
        <StatCards summary={s} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BudgetProgress summary={s} />
            <CategoryLimits limits={s.category_limits} />
          </div>
          <UpcomingDues dues={s.upcoming_dues} isCurrentMonth={isCurrent} month={month} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DailySpendChart daily={s.daily} dailyBudget={s.daily_budget} today={s.today} />
          </div>
          <CategoryDoughnut categories={s.categories} />
        </div>

        <TrendChart items={trendQuery.data?.items || []} loading={trendQuery.loading} />
      </div>
    </div>
  );
}
