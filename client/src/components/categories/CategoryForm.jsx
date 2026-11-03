import { useState } from 'react';
import { createCategory, updateCategory } from '../../api/categories';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_COLORS } from '../../utils/constants';
import {
  cleanAmount,
  compactErrors,
  optionalAmountError,
  requiredError,
} from '../../utils/validate';
import Banner from '../ui/Banner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

function CategoryFormDialog({ category, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(category);
  const isDefault = Boolean(category?.is_default);
  const [form, setForm] = useState({
    name: category?.name ?? '',
    color: category?.color ?? CATEGORY_COLORS[4],
    monthly_limit: category?.monthly_limit != null ? String(category.monthly_limit) : '',
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
      name: isDefault ? '' : requiredError(form.name, 'a category name'),
      monthly_limit: optionalAmountError(form.monthly_limit, { allowZero: true }),
    });
    if (form.name.trim().length > 50) found.name = 'Keep the name under 50 characters';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    const limit = cleanAmount(form.monthly_limit) || null;
    setSaving(true);
    try {
      if (!isEdit) {
        await createCategory({ name: form.name.trim(), color: form.color, monthly_limit: limit });
        toast.success('Category added.');
      } else if (isDefault) {
        await updateCategory(category.id, { monthly_limit: limit });
        toast.success('Limit saved.');
      } else {
        await updateCategory(category.id, {
          name: form.name.trim(),
          color: form.color,
          monthly_limit: limit,
        });
        toast.success('Category updated.');
      }
      onSaved();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const title = !isEdit
    ? 'Add a category'
    : isDefault
      ? `Set a limit for ${category.name}`
      : 'Edit category';

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Banner level="danger">{formError}</Banner>}
        {!isDefault && (
          <>
            <Input
              label="Name"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              maxLength={50}
              placeholder="Pets, gym, gifts"
            />
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium">Colour</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category colour">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={`Colour ${color}`}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                      form.color === color
                        ? 'border-ink-900 dark:border-white'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {form.color === color && (
                      <span className="h-2 w-2 rounded-full bg-white mix-blend-difference" />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <Input
          label="Monthly limit (optional)"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          value={form.monthly_limit}
          onChange={set('monthly_limit')}
          error={errors.monthly_limit}
          hint="You get an alert when spending in this category goes over it. Leave empty for no limit."
        />
      </form>
    </Modal>
  );
}

/** Mounted only while open, so every opening starts with fresh values. */
export default function CategoryForm({ open, ...props }) {
  return open ? <CategoryFormDialog {...props} /> : null;
}
