import { useEffect, useRef, useState } from 'react';
import { createExpense } from '../../api/expenses';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { findOtherId } from '../../hooks/useCategories';
import { amountError, cleanAmount } from '../../utils/validate';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

/**
 * Add an expense in a few seconds: amount, category, optional note, Enter.
 * It always records today's date and pays by UPI; use "Add expense" on the
 * Expenses page for another date or payment method.
 */
export default function QuickAddExpense({ categories = [], onAdded }) {
  const toast = useToast();
  const amountRef = useRef(null);
  const [form, setForm] = useState({ amount: '', category_id: '', note: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Default to "Other" once the categories arrive.
  useEffect(() => {
    if (categories.length > 0) {
      setForm((f) => (f.category_id ? f : { ...f, category_id: String(findOtherId(categories)) }));
    }
  }, [categories]);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = amountError(form.amount, { label: 'an amount' });
    setError(problem);
    if (problem) {
      amountRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await createExpense({
        amount: cleanAmount(form.amount),
        category_id: form.category_id ? Number(form.category_id) : null,
        note: form.note.trim() || null,
        payment_method: 'UPI',
      });
      toast.success('Expense added.');
      setForm((f) => ({ ...f, amount: '', note: '' })); // keep the category for the next one
      amountRef.current?.focus();
      onAdded?.();
    } catch (err) {
      setError(err.fieldErrors?.amount || '');
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Quick add expense"
      className="panel grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[9rem_11rem_minmax(0,1fr)_auto] lg:items-start"
    >
      <Input
        ref={amountRef}
        label="Amount"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={form.amount}
        onChange={(e) => {
          setForm((f) => ({ ...f, amount: e.target.value }));
          setError('');
        }}
        error={error}
      />
      <Select
        label="Category"
        value={form.category_id}
        onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label="Note (optional)"
        maxLength={255}
        autoComplete="off"
        placeholder="Chai, auto fare, groceries"
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        className="sm:col-span-2 lg:col-span-1"
      />
      <Button
        type="submit"
        loading={submitting}
        className="w-full sm:col-span-2 lg:col-span-1 lg:mt-[1.65rem]"
      >
        Add expense
      </Button>
    </form>
  );
}
