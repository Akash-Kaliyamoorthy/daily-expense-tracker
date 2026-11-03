import { useState } from 'react';
import { deleteCategory } from '../api/categories';
import { getErrorMessage } from '../api/client';
import CategoryForm from '../components/categories/CategoryForm';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Dot from '../components/ui/Dot';
import EmptyState from '../components/ui/EmptyState';
import Icon from '../components/ui/Icon';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import useCategories from '../hooks/useCategories';
import usePageTitle from '../hooks/usePageTitle';
import { formatINR } from '../utils/format';

function CategoryRow({ category, onEdit, onDelete }) {
  return (
    <li className="rule flex items-center gap-3 py-3">
      <Dot color={category.color} className="h-3.5 w-3.5" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p className="muted text-sm">
          {category.monthly_limit != null
            ? `Limit ${formatINR(category.monthly_limit)} a month`
            : 'No monthly limit'}
        </p>
      </div>
      {category.is_default ? (
        <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
          {category.monthly_limit != null ? 'Change limit' : 'Set limit'}
        </Button>
      ) : (
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
          >
            <Icon name="pencil" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(category)}
            aria-label={`Delete ${category.name}`}
          >
            <Icon name="trash" />
          </Button>
        </div>
      )}
    </li>
  );
}

export default function Categories() {
  usePageTitle('Categories');
  const toast = useToast();
  const { data: categories, loading, error, reload } = useCategories();
  const [formState, setFormState] = useState({ open: false, category: null });
  const [removing, setRemoving] = useState(null);

  const defaults = (categories || []).filter((c) => c.is_default);
  const custom = (categories || []).filter((c) => !c.is_default);

  async function confirmDelete() {
    try {
      const result = await deleteCategory(removing.id);
      toast.success(
        result.reassigned_expenses > 0
          ? `Category deleted. ${result.reassigned_expenses} expense${result.reassigned_expenses === 1 ? '' : 's'} moved to Other.`
          : 'Category deleted.',
      );
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const addButton = (
    <Button onClick={() => setFormState({ open: true, category: null })}>
      <Icon name="plus" className="h-4 w-4" />
      Add category
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Categories</h1>
        {addButton}
      </div>

      {error && !categories && (
        <div className="space-y-3">
          <Banner level="danger">{getErrorMessage(error)}</Banner>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}
      {!categories && loading && <ListSkeleton rows={6} />}

      {categories && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Your categories"
            subtitle="Ones you made yourself"
            padded={custom.length === 0}
          >
            {custom.length === 0 ? (
              <EmptyState
                icon="tag"
                title="No custom categories yet"
                description="Add one for something you track often, like pets, gym or gifts."
                action={addButton}
              />
            ) : (
              <ul className="px-4 pb-2 pt-1 sm:px-5">
                {custom.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    onEdit={(category) => setFormState({ open: true, category })}
                    onDelete={setRemoving}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Built-in categories"
            subtitle="You can set a limit on these, but not rename them"
            padded={false}
          >
            <ul className="px-4 pb-2 pt-1 sm:px-5">
              {defaults.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  onEdit={(category) => setFormState({ open: true, category })}
                  onDelete={setRemoving}
                />
              ))}
            </ul>
          </Card>
        </div>
      )}

      <CategoryForm
        open={formState.open}
        category={formState.category}
        onClose={() => setFormState({ open: false, category: null })}
        onSaved={() => {
          setFormState({ open: false, category: null });
          reload();
        }}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title={removing ? `Delete ${removing.name}?` : 'Delete category?'}
        message="Expenses in this category move to Other, so nothing is lost. Your spending totals stay the same."
        confirmLabel="Delete category"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
