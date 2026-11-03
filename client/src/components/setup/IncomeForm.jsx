import { useState } from 'react';
import { saveBudget } from '../../api/budgets';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/format';
import { amountError, cleanAmount, compactErrors, optionalAmountError } from '../../utils/validate';
import Banner from '../ui/Banner';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

const asText = (n) => (n ? String(n) : '');

/** Salary, extra income and the savings goal for one month. */
export default function IncomeForm({ month, setup, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    salary: setup.exists ? String(setup.salary) : '',
    other_income: asText(setup.other_income),
    other_income_note: setup.other_income_note || '',
    savings_goal: asText(setup.savings_goal),
    savings_goal_type: setup.savings_goal_type,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const isPercent = form.savings_goal_type === 'percent';
  const set = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const setType = (type) => {
    setForm((f) => ({ ...f, savings_goal_type: type }));
    setErrors((e) => ({ ...e, savings_goal: undefined }));
  };

  function validate() {
    let goal = optionalAmountError(form.savings_goal, { allowZero: true });
    if (!goal && isPercent && Number(cleanAmount(form.savings_goal)) > 100) {
      goal = 'A percentage cannot be more than 100';
    }
    return compactErrors({
      salary: amountError(form.salary, { allowZero: true, label: 'your salary (0 if none)' }),
      other_income: optionalAmountError(form.other_income, { allowZero: true }),
      other_income_note:
        form.other_income_note.length > 200 ? 'Keep the note under 200 characters' : '',
      savings_goal: goal,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const saved = await saveBudget(
        month,
        {
          salary: cleanAmount(form.salary),
          other_income: cleanAmount(form.other_income) || '0',
          other_income_note: form.other_income_note.trim() || null,
          savings_goal: cleanAmount(form.savings_goal) || '0',
          savings_goal_type: form.savings_goal_type,
        },
        setup.exists,
      );
      toast.success('Income and savings saved.');
      onSaved(saved);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const salaryNumber = Number(cleanAmount(form.salary)) || 0;
  const percentHint =
    isPercent && salaryNumber > 0 && Number(cleanAmount(form.savings_goal)) > 0
      ? `About ${formatINR((salaryNumber * Number(cleanAmount(form.savings_goal))) / 100)} a month`
      : undefined;

  const segment = (active) =>
    `h-9 flex-1 rounded-control px-3 text-sm font-medium transition-colors ${
      active
        ? 'bg-ink-800 text-white dark:bg-ink-200 dark:text-ink-950'
        : 'text-ink-600 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900'
    }`;

  return (
    <Card title="Income and savings" subtitle="What comes in this month, and what you want to keep">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <Banner level="danger">{formError}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Monthly salary"
            prefix="₹"
            inputMode="decimal"
            autoComplete="off"
            value={form.salary}
            onChange={set('salary')}
            error={errors.salary}
          />
          <Input
            label="Other income (optional)"
            prefix="₹"
            inputMode="decimal"
            autoComplete="off"
            value={form.other_income}
            onChange={set('other_income')}
            error={errors.other_income}
            hint="Bonus, freelance work, rent received"
          />
        </div>
        <Input
          label="What is the other income? (optional)"
          maxLength={200}
          value={form.other_income_note}
          onChange={set('other_income_note')}
          error={errors.other_income_note}
          placeholder="Diwali bonus"
        />

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium">Savings goal for the month</legend>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-start">
            <Input
              aria-label="Savings goal"
              prefix={isPercent ? undefined : '₹'}
              suffix={isPercent ? <span className="muted pr-3">%</span> : undefined}
              inputMode="decimal"
              autoComplete="off"
              value={form.savings_goal}
              onChange={set('savings_goal')}
              error={errors.savings_goal}
              hint={percentHint}
            />
            <div
              role="radiogroup"
              aria-label="Savings goal type"
              className="flex gap-1 rounded-control border border-ink-200 p-1 dark:border-night-line"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!isPercent}
                className={segment(!isPercent)}
                onClick={() => setType('amount')}
              >
                Amount
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isPercent}
                className={segment(isPercent)}
                onClick={() => setType('percent')}
              >
                % of salary
              </button>
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save income and savings
          </Button>
        </div>
      </form>
    </Card>
  );
}
