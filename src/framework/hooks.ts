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
  
  // Register component unmount cleanup to also trigger effect cleanup
  onCleanup(() => {
    if (cleanup) cleanup();
  });
}

export function useMemo<T>(fn: () => T, deps?: any[]): T {
  const comp = computed(fn);
  return new Proxy({ __isMemoProxy: true } as any, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive) return () => comp();
      if (prop === '__isMemoProxy') return true;
      if (prop === '__g') return comp; // Allow unwrapping via __g pattern
      const val = comp() as any;
      if (val == null) return undefined;
      return val[prop];
    },
    has(_, prop) {
      if (prop === '__isMemoProxy' || prop === '__g') return true;
      return prop in Object(comp());
    },
    ownKeys() {
      const val = comp() as any;
      return val ? Reflect.ownKeys(val) : [];
    }
  });
}

/**
 * useRef 返回一个存放可变值的对象，通常用于获取真实的 DOM 引用。
 * 修改它的 .current 属性不会触发组件的重新渲染或依赖收集。
 */
export function useRef<T>(initialValue: T | null = null): { current: T | null } {
  return { current: initialValue };
}

export let currentLifecycles: { mounts: (() => void)[], cleanups: (() => void)[] } | null = null;
export function setCurrentLifecycles(val: any) {
  currentLifecycles = val;
}

export function onMount(fn: () => void) {
  if (currentLifecycles) {
    currentLifecycles.mounts.push(fn);
  } else {
    // If called outside a component, execute it immediately as it implies it's already mounted or global
    // But ideally it should warn if strictly wanting component lifecycle
    fn();
  }
}

export function onCleanup(fn: () => void) {
  if (currentLifecycles) {
    currentLifecycles.cleanups.push(fn);
  }
}

/**
 * 递归计算懒执行的 children
 */
function evaluateChildren(children: any): any {
  if (Array.isArray(children)) {
    return children.map(evaluateChildren);
  }
  if (children && typeof children === 'object' && '__lazy' in children && typeof children.__lazy === 'function') {
    return evaluateChildren(children.__lazy());
  }
  return children;
}

export function createContext<T>(defaultValue: T) {
  const id = Symbol();
  let stack: Array<() => T> = [() => defaultValue];

  return {
    id,
    Provider: function(props: any) {
      stack.push(() => props.value);
      const res = evaluateChildren(props.children);
      stack.pop();
      return res;
    },
    _stack: stack
  };
}

export function useContext<T>(context: any): T {
  const stack = context._stack;
  // Capture current thunk in closure (representing the closest provider at execution time)
  const thunk = stack[stack.length - 1];

  // Return a proxy that acts as both a getter (for `{ __g: ... }` unpacking in jsx-runtime)
  // and an object proxy (for standard prop destructuring and access)
  const proxy = new Proxy({ __g: thunk } as any, {
    get(_, prop) {
      if (prop === '__g') return thunk;
      
      const val = thunk();
      if (val == null) return undefined;
      const res = val[prop];
      if (typeof res === 'function') return res.bind(val);
      return res;
    }
  });

  return proxy as T;
}

export const SuspenseContext = createContext<{
  register: () => void;
  resolve: () => void;
} | null>(null);

export function createResource<T>(fetcher: () => Promise<T>) {
  // IMPORTANT: Use raw signal() here, NOT useState().
  // useState returns { get, set } which is NOT array-destructurable.
  // This is framework-internal code, not user code, so Babel doesn't transform it.
  const dataSig = signal<T | null>(null);
  const loadingSig = signal(true);
  const errorSig = signal<any>(null);

  const suspense = useContext(SuspenseContext);

  if (suspense && (suspense as any).__g() != null) {
    // Defer registration to avoid synchronous effect recursion during render
    Promise.resolve().then(() => (suspense as any).register());
  }

  fetcher()
    .then(val => {
      dataSig(val);
      loadingSig(false);
      if (suspense && (suspense as any).__g() != null) (suspense as any).resolve();
    })
    .catch(err => {
      errorSig(err);
      loadingSig(false);
      if (suspense && (suspense as any).__g() != null) (suspense as any).resolve();
    });

  return {
    get data() { return dataSig(); },
    get loading() { return loadingSig(); },
    get error() { return errorSig(); }
  };
}
