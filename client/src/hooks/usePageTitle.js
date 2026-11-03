import { useEffect } from 'react';

/** Sets the browser tab title: usePageTitle('Expenses') -> "Expenses · Daily Expense Tracker". */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Daily Expense Tracker` : 'Daily Expense Tracker';
  }, [title]);
}
