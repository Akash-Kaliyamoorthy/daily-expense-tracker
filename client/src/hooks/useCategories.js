import { listCategories } from '../api/categories';
import useFetch from './useFetch';

/** The user's categories (defaults + custom): { data: [...], loading, error, reload }. */
export default function useCategories() {
  return useFetch(async () => (await listCategories()).items, []);
}

/** The id of the built-in "Other" category, used as the default choice in forms. */
export const findOtherId = (categories) =>
  categories?.find((c) => c.is_default && c.name === 'Other')?.id ?? '';
