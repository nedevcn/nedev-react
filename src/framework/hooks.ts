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

/**
 * useRef 返回一个存放可变值的对象，通常用于获取真实的 DOM 引用。
 * 修改它的 .current 属性不会触发组件的重新渲染或依赖收集。
 */
export function useRef<T>(initialValue: T | null = null): { current: T | null } {
  return { current: initialValue };
}

/**
 * 递归计算懒执行的 children
 */
function evaluateChildren(children: any): any {
  if (Array.isArray(children)) {
    return children.map(evaluateChildren);
  }
  if (children && typeof children === 'object' && '__g' in children) {
    return evaluateChildren(children.__g());
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
    get(target, prop) {
      if (prop === '__g') return target.__g;
      
      const currentValue = thunk();
      if (currentValue == null) return undefined;
      const res = currentValue[prop];
      if (typeof res === 'function') return res.bind(currentValue);
      return res;
    }
  });

  return proxy as T;
}
