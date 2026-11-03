import { useState } from 'react';
import {
  createFixedExpense,
  deleteFixedExpense,
  updateFixedExpense,
} from '../../api/fixedExpenses';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { findOtherId } from '../../hooks/useCategories';
import { formatINR, ordinal } from '../../utils/format';
import {
  amountError,
  cleanAmount,
  compactErrors,
  dueDayError,
  requiredError,
} from '../../utils/validate';
import Banner from '../ui/Banner';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import Dot from '../ui/Dot';
import EmptyState from '../ui/EmptyState';
import Icon from '../ui/Icon';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';

/** Add / edit dialog for a fixed monthly expense (rent, electricity, subscriptions...). */
function FixedExpenseForm({ month, item, categories, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: item?.name ?? '',
    amount: item ? String(item.amount) : '',
    category_id: String(item?.category_id ?? findOtherId(categories)),
    due_day: item ? String(item.due_day) : '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const found = compactErrors({
      name: requiredError(form.name, 'a name, like Rent'),
      amount: amountError(form.amount, { label: 'the monthly amount' }),
      due_day: dueDayError(form.due_day),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    const body = {
      name: form.name.trim(),
      amount: cleanAmount(form.amount),
      category_id: form.category_id ? Number(form.category_id) : null,
      due_day: Number(form.due_day),
    };
    setSaving(true);
    try {
      if (item) await updateFixedExpense(item.id, body);
      else await createFixedExpense({ month, ...body });
      toast.success(item ? 'Fixed expense updated.' : 'Fixed expense added.');
      onSaved();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Edit fixed expense' : 'Add a fixed expense'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="fixed-form" loading={saving}>
            {item ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form id="fixed-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Banner level="danger">{formError}</Banner>}
        <Input
          label="Name"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          maxLength={100}
          placeholder="Rent, electricity, internet"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Monthly amount"
            prefix="₹"
            inputMode="decimal"
            autoComplete="off"
            value={form.amount}
            onChange={set('amount')}
            error={errors.amount}
          />
          <Input
            label="Due day of the month"
            inputMode="numeric"
            autoComplete="off"
            value={form.due_day}
            onChange={set('due_day')}
            error={errors.due_day}
          />
        </div>
        <Select
          label="Category"
          value={form.category_id}
          onChange={set('category_id')}
          error={errors.category_id}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

export default function FixedExpenseList({ month, items, total, categories, onChanged }) {
  const toast = useToast();
  const [editing, setEditing] = useState(undefined);
  const [removing, setRemoving] = useState(null);

  async function confirmDelete() {
    try {
      await deleteFixedExpense(removing.id);
      toast.success('Fixed expense deleted.');
      setRemoving(null);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const addButton = (
    <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
      <Icon name="plus" className="h-4 w-4" />
      Add expense
    </Button>
  );

  return (
    <>
      <Card
        title="Fixed monthly expenses"
        subtitle={
          items.length > 0 ? `${formatINR(total)} a month` : 'Rent, bills, subscriptions, insurance'
        }
        action={items.length > 0 ? addButton : null}
        padded={items.length === 0}
      >
        {items.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No fixed expenses this month"
            description="Add the bills that stay about the same each month, such as rent, electricity, internet, insurance or school fees."
            action={addButton}
          />
        ) : (
          <ul className="px-4 pb-2 pt-1 sm:px-5">
            {items.map((item) => (
              <li key={item.id} className="rule flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="muted flex items-center gap-2 text-sm">
                    <Dot color={item.category_color || '#64748b'} />
                    {item.category_name || 'Other'}, due on the {ordinal(item.due_day)}
                  </p>
                </div>
                <p className="font-semibold">{formatINR(item.amount)}</p>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(item)}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Icon name="pencil" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoving(item)}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing !== undefined && (
        <FixedExpenseForm
          month={month}
          item={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this fixed expense?"
        message={
          removing
            ? `${removing.name} will be removed from this month. Other months are not affected.`
            : ''
        }
        confirmLabel="Delete expense"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
