import { useState } from 'react';
import { copyFromMonth, getBudget } from '../api/budgets';
import { getErrorMessage } from '../api/client';
import FixedExpenseList from '../components/setup/FixedExpenseList';
import IncomeForm from '../components/setup/IncomeForm';
import LoanList from '../components/setup/LoanList';
import SetupSummary from '../components/setup/SetupSummary';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import MonthSwitcher from '../components/ui/MonthSwitcher';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import useCategories from '../hooks/useCategories';
import useFetch from '../hooks/useFetch';
import useMonth from '../hooks/useMonth';
import usePageTitle from '../hooks/usePageTitle';
import { currentMonth, monthLabel } from '../utils/format';

export default function MonthlySetup() {
  usePageTitle('Monthly setup');
  const toast = useToast();
  const { month, prevMonth, goPrev, goNext, setMonth, isCurrent } = useMonth();
  const query = useFetch(() => getBudget(month), [month]);
  const { data: categories } = useCategories();
  const [copying, setCopying] = useState(false);

  const setup = query.data;
  if (!setup && query.loading) return <PageSkeleton />;
  if (!setup && query.error) {
    return (
      <div className="space-y-4">
        <Banner level="danger">{getErrorMessage(query.error)}</Banner>
        <Button onClick={query.reload}>Try again</Button>
      </div>
    );
  }

  const stale = setup.month !== month;
  const isEmpty = setup.loans.length === 0 && setup.fixed_expenses.length === 0;

  async function handleCopy() {
    setCopying(true);
    try {
      await copyFromMonth(month, prevMonth);
      toast.success(`Copied the setup from ${monthLabel(prevMonth)}.`);
      await query.reload();
    } catch (err) {
      toast.error(
        err.status === 404
          ? `There is no setup for ${monthLabel(prevMonth)} to copy.`
          : getErrorMessage(err),
      );
    } finally {
      setCopying(false);
    }
  }

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
        className={`grid gap-6 transition-opacity lg:grid-cols-[minmax(0,1fr)_22rem] ${stale ? 'pointer-events-none opacity-50' : ''}`}
      >
        <div className="order-2 space-y-6 lg:order-1">
          {isEmpty && (
            <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="text-lg font-semibold">Start from last month</h2>
                <p className="muted mt-0.5 text-sm leading-relaxed">
                  Copy the salary, savings goal, EMIs and fixed bills from {monthLabel(prevMonth)}.
                  Loans on their last month are left out.
                </p>
              </div>
              <Button
                variant="secondary"
                loading={copying}
                onClick={handleCopy}
                className="shrink-0"
              >
                <Icon name="copy" className="h-4 w-4" />
                Copy {monthLabel(prevMonth)}
              </Button>
            </div>
          )}

          {/* Keyed on the LOADED data's month (not the URL's), so the form re-mounts with the
              right values only once that month's data has actually arrived. */}
          <IncomeForm
            key={`${setup.month}-${setup.exists}`}
            month={month}
            setup={setup}
            onSaved={(saved) => {
              query.setData(saved);
            }}
          />
          <LoanList
            month={month}
            loans={setup.loans}
            total={setup.totals.loans_total}
            onChanged={query.reload}
          />
          <FixedExpenseList
            month={month}
            items={setup.fixed_expenses}
            total={setup.totals.fixed_total}
            categories={categories || []}
            onChanged={query.reload}
          />
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start">
          <SetupSummary setup={setup} />
        </div>
      </div>
    </div>
  );
}
