import { useState } from 'react';
import { createExpense, updateExpense } from '../../api/expenses';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { findOtherId } from '../../hooks/useCategories';
import { FREQUENCIES, PAYMENT_METHODS } from '../../utils/constants';
import { DATE_RE, parseISODate, toISODate, todayISO } from '../../utils/format';
import { amountError, cleanAmount, compactErrors } from '../../utils/validate';
import Banner from '../ui/Banner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';

const isRealDate = (value) => DATE_RE.test(value) && toISODate(parseISODate(value)) === value;

function ExpenseFormDialog({ expense, categories, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(expense);
  const [form, setForm] = useState({
    amount: expense ? String(expense.amount) : '',
    expense_date: expense?.expense_date ?? todayISO(),
    category_id: String(expense?.category_id ?? findOtherId(categories)),
    payment_method: expense?.payment_method ?? 'UPI',
    note: expense?.note ?? '',
    recurring_frequency: '',
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
      amount: amountError(form.amount, { label: 'an amount' }),
      expense_date: isRealDate(form.expense_date) ? '' : 'Choose a valid date',
      note: form.note.length > 255 ? 'Keep the note under 255 characters' : '',
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    const body = {
      amount: cleanAmount(form.amount),
      expense_date: form.expense_date,
      category_id: form.category_id ? Number(form.category_id) : null,
      payment_method: form.payment_method,
      note: form.note.trim() || null,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateExpense(expense.id, body);
        toast.success('Expense updated.');
      } else {
        await createExpense({ ...body, recurring_frequency: form.recurring_frequency || null });
        toast.success(
          form.recurring_frequency ? 'Expense added. It will repeat.' : 'Expense added.',
        );
      }
      onSaved(Boolean(form.recurring_frequency));
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
      title={isEdit ? 'Edit expense' : 'Add expense'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Banner level="danger">{formError}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Amount"
            prefix="₹"
            inputMode="decimal"
            autoComplete="off"
            value={form.amount}
            onChange={set('amount')}
            error={errors.amount}
          />
          <Input
            label="Date"
            type="date"
            value={form.expense_date}
            onChange={set('expense_date')}
            error={errors.expense_date}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Select
            label="Paid by"
            value={form.payment_method}
            onChange={set('payment_method')}
            error={errors.payment_method}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Note (optional)"
          maxLength={255}
          value={form.note}
          onChange={set('note')}
          error={errors.note}
          placeholder="What was it for?"
        />
        {!isEdit && (
          <Select
            label="Repeat"
            value={form.recurring_frequency}
            onChange={set('recurring_frequency')}
            hint="Repeating expenses are added for you on each due date."
          >
            <option value="">Does not repeat</option>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        )}
      </form>
    </Modal>
  );
}

/** Mounted only while open, so every opening starts with fresh values. */
export default function ExpenseForm({ open, ...props }) {
  return open ? <ExpenseFormDialog {...props} /> : null;
}
