import { formatINR, friendlyDate } from '../../utils/format';
import Button from '../ui/Button';
import Dot from '../ui/Dot';
import Icon from '../ui/Icon';

const COLUMNS = 'sm:grid-cols-[7.5rem_11rem_minmax(0,1fr)_8rem_5.5rem]';

/**
 * The expense list, set like ledger lines. One layout adapts: on phones each
 * entry is two lines (what and how much, then category/date); on wider screens
 * it becomes columns.
 */
export default function ExpenseTable({ items, onEdit, onDelete, dimmed = false }) {
  return (
    <ul className={`panel overflow-hidden transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
      <li
        aria-hidden="true"
        className={`muted hidden gap-3 border-b border-ink-100 px-5 py-2.5 text-sm font-medium sm:grid dark:border-night-line ${COLUMNS}`}
      >
        <span>Date</span>
        <span>Category</span>
        <span>Note</span>
        <span className="text-right">Amount</span>
        <span />
      </li>
      {items.map((e) => (
        <li
          key={e.id}
          className={`rule grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 sm:px-5 ${COLUMNS}`}
        >
          <span className="muted hidden text-sm sm:block">{friendlyDate(e.expense_date)}</span>
          <span className="hidden items-center gap-2 text-sm sm:flex">
            <Dot color={e.category_color} />
            <span className="truncate">{e.category_name}</span>
          </span>

          <div className="row-span-2 min-w-0 sm:row-span-1">
            <p className="truncate font-medium">{e.note || e.category_name}</p>
            <p className="muted flex flex-wrap items-center gap-x-3 text-sm">
              <span className="flex items-center gap-1.5 sm:hidden">
                <Dot color={e.category_color} />
                {e.category_name}
              </span>
              <span className="sm:hidden">{friendlyDate(e.expense_date)}</span>
              <span>{e.payment_method}</span>
              {e.recurring_id && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="repeat" className="h-3.5 w-3.5" />
                  Repeats
                </span>
              )}
            </p>
          </div>

          <p className="text-right font-semibold sm:text-base">{formatINR(e.amount)}</p>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(e)}
              aria-label={`Edit expense of ${formatINR(e.amount)}`}
            >
              <Icon name="pencil" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(e)}
              aria-label={`Delete expense of ${formatINR(e.amount)}`}
            >
              <Icon name="trash" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
