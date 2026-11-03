import { useState } from 'react';
import { createLoan, deleteLoan, updateLoan } from '../../api/loans';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
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
import EmptyState from '../ui/EmptyState';
import Icon from '../ui/Icon';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

function remainingError(value) {
  const v = String(value).trim();
  if (!v) return '';
  if (!/^\d{1,3}$/.test(v) || Number(v) > 600) return 'Enter a whole number of months, up to 600';
  return '';
}

/** Add / edit dialog. Mounted only while open, so it always starts with fresh values. */
function LoanForm({ month, loan, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: loan?.name ?? '',
    emi_amount: loan ? String(loan.emi_amount) : '',
    due_day: loan ? String(loan.due_day) : '',
    remaining_months: loan?.remaining_months != null ? String(loan.remaining_months) : '',
    lender: loan?.lender ?? '',
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
      name: requiredError(form.name, 'a name for this loan'),
      emi_amount: amountError(form.emi_amount, { label: 'the EMI amount' }),
      due_day: dueDayError(form.due_day),
      remaining_months: remainingError(form.remaining_months),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    const body = {
      name: form.name.trim(),
      emi_amount: cleanAmount(form.emi_amount),
      due_day: Number(form.due_day),
      remaining_months: form.remaining_months.trim() === '' ? null : Number(form.remaining_months),
      lender: form.lender.trim() || null,
    };
    setSaving(true);
    try {
      if (loan) await updateLoan(loan.id, body);
      else await createLoan({ month, ...body });
      toast.success(loan ? 'Loan updated.' : 'Loan added.');
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
      title={loan ? 'Edit loan' : 'Add a loan or EMI'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="loan-form" loading={saving}>
            {loan ? 'Save changes' : 'Add loan'}
          </Button>
        </>
      }
    >
      <form id="loan-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Banner level="danger">{formError}</Banner>}
        <Input
          label="Loan name"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          maxLength={100}
          placeholder="Home loan"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Monthly EMI"
            prefix="₹"
            inputMode="decimal"
            autoComplete="off"
            value={form.emi_amount}
            onChange={set('emi_amount')}
            error={errors.emi_amount}
          />
          <Input
            label="Due day of the month"
            inputMode="numeric"
            autoComplete="off"
            value={form.due_day}
            onChange={set('due_day')}
            error={errors.due_day}
            hint="1 to 31. Day 31 means the last day of shorter months."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Months left (optional)"
            inputMode="numeric"
            autoComplete="off"
            value={form.remaining_months}
            onChange={set('remaining_months')}
            error={errors.remaining_months}
          />
          <Input
            label="Lender (optional)"
            value={form.lender}
            onChange={set('lender')}
            error={errors.lender}
            maxLength={100}
            placeholder="HDFC Bank"
          />
        </div>
      </form>
    </Modal>
  );
}

export default function LoanList({ month, loans, total, onChanged }) {
  const toast = useToast();
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [removing, setRemoving] = useState(null);

  async function confirmDelete() {
    try {
      await deleteLoan(removing.id);
      toast.success('Loan deleted.');
      setRemoving(null);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const addButton = (
    <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
      <Icon name="plus" className="h-4 w-4" />
      Add loan
    </Button>
  );

  return (
    <>
      <Card
        title="Loans and EMIs"
        subtitle={loans.length > 0 ? `${formatINR(total)} a month` : 'Paid every month'}
        action={loans.length > 0 ? addButton : null}
        padded={loans.length === 0}
      >
        {loans.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="No EMIs this month"
            description="Add a home, car or phone EMI so it is taken out of what you can spend. Skip this if you have none."
            action={addButton}
          />
        ) : (
          <ul className="px-4 pb-2 pt-1 sm:px-5">
            {loans.map((loan) => (
              <li key={loan.id} className="rule flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{loan.name}</p>
                  <p className="muted text-sm">
                    Due on the {ordinal(loan.due_day)}
                    {loan.lender ? `, ${loan.lender}` : ''}
                    {loan.remaining_months != null ? `, ${loan.remaining_months} months left` : ''}
                  </p>
                </div>
                <p className="font-semibold">{formatINR(loan.emi_amount)}</p>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(loan)}
                    aria-label={`Edit ${loan.name}`}
                  >
                    <Icon name="pencil" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoving(loan)}
                    aria-label={`Delete ${loan.name}`}
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
        <LoanForm
          month={month}
          loan={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this loan?"
        message={
          removing
            ? `${removing.name} will be removed from this month. Other months are not affected.`
            : ''
        }
        confirmLabel="Delete loan"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
