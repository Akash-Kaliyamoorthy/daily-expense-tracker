import { PAYMENT_METHODS, SORT_OPTIONS } from '../../utils/constants';
import { addMonths, currentMonth, monthEnd, monthStart } from '../../utils/format';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Input from '../ui/Input';
import Select from '../ui/Select';

const thisMonth = () => ({ from: monthStart(currentMonth()), to: monthEnd(currentMonth()) });
const lastMonth = () => {
  const m = addMonths(currentMonth(), -1);
  return { from: monthStart(m), to: monthEnd(m) };
};

/** Filters for the expense list: date range (with presets), category, payment method, search and sort. */
export default function ExpenseFilters({
  filters,
  onChange,
  searchText,
  onSearchText,
  categories,
  onClear,
  active,
}) {
  const presets = [
    { label: 'This month', range: thisMonth() },
    { label: 'Last month', range: lastMonth() },
    { label: 'All time', range: { from: '', to: '' } },
  ];
  const isPreset = (range) => filters.from === range.from && filters.to === range.to;

  return (
    <section className="panel space-y-4 p-4 sm:p-5" aria-label="Filter expenses">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Date range shortcuts"
      >
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={isPreset(p.range)}
            onClick={() => onChange(p.range)}
            className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
              isPreset(p.range)
                ? 'border-ink-800 bg-ink-800 text-white dark:border-ink-200 dark:bg-ink-200 dark:text-ink-950'
                : 'border-ink-200 text-ink-700 hover:bg-ink-100 dark:border-night-line dark:text-ink-100 dark:hover:bg-ink-900'
            }`}
          >
            {p.label}
          </button>
        ))}
        {active && (
          <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
            <Icon name="x" className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Input
            label="Search notes"
            type="search"
            value={searchText}
            onChange={(e) => onSearchText(e.target.value)}
            placeholder="Search"
            autoComplete="off"
          />
        </div>
        <Input
          label="From"
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => onChange({ from: e.target.value })}
        />
        <Input
          label="To"
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => onChange({ to: e.target.value })}
        />
        <Select
          label="Category"
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Paid by"
          value={filters.method}
          onChange={(e) => onChange({ method: e.target.value })}
        >
          <option value="">Any method</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          label="Sort by"
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="sm:col-span-2 lg:col-span-2"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </section>
  );
}
