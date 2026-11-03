import { useState } from 'react';
import { deleteRecurring, listRecurring, setRecurringActive } from '../../api/expenses';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatINR } from '../../utils/format';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import Dot from '../ui/Dot';
import Icon from '../ui/Icon';

const EVERY = { daily: 'every day', weekly: 'every week', monthly: 'every month' };

/** Repeating expenses: pause, resume or stop them. `refreshKey` reloads the list after a new one is added. */
export default function RecurringList({ refreshKey, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(
    async () => (await listRecurring()).items,
    [refreshKey],
  );
  const [removing, setRemoving] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function toggle(rule) {
    setBusyId(rule.id);
    try {
      await setRecurringActive(rule.id, !rule.active);
      toast.success(rule.active ? 'Repeating expense paused.' : 'Repeating expense resumed.');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    try {
      await deleteRecurring(removing.id);
      toast.success('Repeating expense deleted.');
      setRemoving(null);
      await reload();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (!loading && !error && (!data || data.length === 0)) return null;

  return (
    <>
      <Card title="Repeating expenses" subtitle="Added for you on each due date" padded={false}>
        {error && !data ? (
          <p className="px-5 py-4 text-sm text-bad-700 dark:text-bad-500">
            {getErrorMessage(error)}
          </p>
        ) : (
          <ul className="px-4 pb-2 pt-1 sm:px-5">
            {(data || []).map((rule) => (
              <li
                key={rule.id}
                className={`rule flex items-center gap-3 py-3 ${rule.active ? '' : 'opacity-60'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{rule.note || rule.category_name}</p>
                  <p className="muted flex flex-wrap items-center gap-x-2 text-sm">
                    <Dot color={rule.category_color} />
                    {rule.category_name}, {EVERY[rule.frequency]},{' '}
                    {rule.active ? `next on ${formatDate(rule.next_date)}` : 'paused'}
                  </p>
                </div>
                <p className="font-semibold">{formatINR(rule.amount)}</p>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    loading={busyId === rule.id}
                    onClick={() => toggle(rule)}
                    aria-label={
                      rule.active ? 'Pause this repeating expense' : 'Resume this repeating expense'
                    }
                  >
                    <Icon name={rule.active ? 'pause' : 'play'} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoving(rule)}
                    aria-label="Delete this repeating expense"
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Stop this repeating expense?"
        message="No new entries will be added. The expenses it has already created stay in your list."
        confirmLabel="Delete repeating expense"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
