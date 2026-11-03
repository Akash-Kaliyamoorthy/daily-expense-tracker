import { useState } from 'react';
import { deleteExpense, listExpenses } from '../api/expenses';
import { getErrorMessage } from '../api/client';
import ExpenseFilters from '../components/expenses/ExpenseFilters';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseTable from '../components/expenses/ExpenseTable';
import RecurringList from '../components/expenses/RecurringList';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Icon from '../components/ui/Icon';
import Pagination from '../components/ui/Pagination';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import useCategories from '../hooks/useCategories';
import useDebounce from '../hooks/useDebounce';
import useFetch from '../hooks/useFetch';
import usePageTitle from '../hooks/usePageTitle';
import { currentMonth, formatDate, formatINR, monthEnd, monthStart } from '../utils/format';

const LIMIT = 20;
const defaultFilters = () => ({
  from: monthStart(currentMonth()),
  to: monthEnd(currentMonth()),
  category: '',
  method: '',
  sort: 'date_desc',
});

export default function Expenses() {
  usePageTitle('Expenses');
  const toast = useToast();
  const { data: categories } = useCategories();

  const [filters, setFilters] = useState(defaultFilters);
  const [searchText, setSearchText] = useState('');
  const q = useDebounce(searchText.trim(), 350);

  // The page number belongs to one particular set of filters: changing a filter
  // (or the search) automatically goes back to page 1, with no extra request.
  const queryKey = JSON.stringify([filters, q]);
  const [pageState, setPageState] = useState({ key: queryKey, page: 1 });
  const page = pageState.key === queryKey ? pageState.page : 1;
  const setPage = (p) => setPageState({ key: queryKey, page: p });

  const [formState, setFormState] = useState({ open: false, expense: null });
  const [removing, setRemoving] = useState(null);
  const [recurringKey, setRecurringKey] = useState(0);

  const { data, loading, error, reload } = useFetch(
    () => listExpenses({ ...filters, q, page, limit: LIMIT }),
    [queryKey, page],
  );

  const defaults = defaultFilters();
  const filtersActive =
    searchText.trim() !== '' || JSON.stringify(filters) !== JSON.stringify(defaults);
  const stale = loading && data;

  function clearFilters() {
    setFilters(defaultFilters());
    setSearchText('');
  }

  async function confirmDelete() {
    try {
      await deleteExpense(removing.id);
      toast.success('Expense deleted.');
      setRemoving(null);
      // Deleting the last item on a page would leave an empty page: step back.
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const addButton = (
    <Button onClick={() => setFormState({ open: true, expense: null })}>
      <Icon name="plus" className="h-4 w-4" />
      Add expense
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Expenses</h1>
        {addButton}
      </div>

      <ExpenseFilters
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        searchText={searchText}
        onSearchText={setSearchText}
        categories={categories || []}
        onClear={clearFilters}
        active={filtersActive}
      />

      {error && !data && (
        <div className="space-y-3">
          <Banner level="danger">{getErrorMessage(error)}</Banner>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {!data && loading && <ListSkeleton />}

      {data && (
        <section aria-live="polite" aria-busy={Boolean(stale)} className="space-y-4">
          {data.total > 0 ? (
            <>
              <p className="muted text-sm">
                {data.total} {data.total === 1 ? 'expense' : 'expenses'},{' '}
                <span className="font-semibold text-ink-900 dark:text-ink-50">
                  {formatINR(data.total_amount)}
                </span>{' '}
                in total
              </p>
              <ExpenseTable
                items={data.items}
                dimmed={Boolean(stale)}
                onEdit={(expense) => setFormState({ open: true, expense })}
                onDelete={setRemoving}
              />
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </>
          ) : (
            <div className="panel">
              <EmptyState
                icon="list"
                title={filtersActive ? 'No expenses match these filters' : 'No expenses yet'}
                description={
                  filtersActive
                    ? 'Try a wider date range, or clear the filters to see everything.'
                    : 'Add your first expense. It takes a few seconds, and the dashboard updates straight away.'
                }
                action={
                  filtersActive ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    addButton
                  )
                }
              />
            </div>
          )}
        </section>
      )}

      <RecurringList refreshKey={recurringKey} onChanged={reload} />

      <ExpenseForm
        open={formState.open}
        expense={formState.expense}
        categories={categories || []}
        onClose={() => setFormState({ open: false, expense: null })}
        onSaved={(createdRepeating) => {
          setFormState({ open: false, expense: null });
          reload();
          if (createdRepeating) setRecurringKey((k) => k + 1);
        }}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this expense?"
        message={
          removing
            ? `${formatINR(removing.amount)} on ${formatDate(removing.expense_date)}${removing.note ? ` (${removing.note})` : ''} will be deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete expense"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
