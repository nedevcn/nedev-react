import { signal, effect, computed } from 'alien-signals';

// The Babel plugin transforms `const [count, setCount] = useState(0)`
// into:
// const _raw_count = useState(0); 
// const setCount = _raw_count.set;
// And reads of `count` into `_raw_count.get()`
export function useState<T>(initialValue: T) {
  const sig = signal(initialValue);
  return {
    get: () => sig(),
    set: (val: T) => sig(val)
  };
}

export function useEffect(fn: () => void | (() => void), deps?: any[]) {
  // Since we use alien-signals, dependencies are automatically tracked 
  // if `fn` reads any signal! The `deps` array from React is technically 
  // not needed for reactive re-runs, but we can respect it if we want 
  // strict React lifecycle (run on mount, etc).
  // For this vdom-less prototype, we map it directly to `effect`.
  // Note: effect() runs immediately.
  let cleanup: void | (() => void);
  effect(() => {
    if (cleanup) cleanup();
    cleanup = fn();
  });
}

export function useMemo<T>(fn: () => T, deps?: any[]): T {
  const comp = computed(fn);
  return new Proxy({} as any, {
    get(_, prop) {
      const val = comp() as any;
      if (val == null) return undefined;
      return val[prop];
    },
    apply(_, thisArg, args) {
      const val = comp() as any;
      if (typeof val === 'function') return val.apply(thisArg, args);
    },
    ownKeys() {
      const val = comp() as any;
      return val ? Reflect.ownKeys(val) : [];
    }
  });
}
