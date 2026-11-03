import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data with loading + error state.
 *
 *   const { data, loading, error, reload, setData } = useFetch(() => getSummary(month), [month]);
 *
 *  - Re-runs whenever `deps` change; `reload()` runs it again on demand.
 *  - Old data stays visible while a refresh is loading (no flicker).
 *  - A slow, outdated response can never overwrite a newer one.
 */
export default function useFetch(fetcher, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: immediate });
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, error, loading: false }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    return () => {
      requestId.current += 1; // ignore a response that arrives after unmount / dep change
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback(
    (updater) =>
      setState((s) => ({
        ...s,
        data: typeof updater === 'function' ? updater(s.data) : updater,
      })),
    [],
  );

  return { ...state, reload: run, setData };
}
