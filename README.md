# No-VDOM React-Compatible AI-Friendly UI Framework

A high-performance, experimental UI framework designed from the ground up to be **AI-generation friendly**, achieving zero-VDOM overhead by utilizing fine-grained reactivity powered by [`alien-signals`](https://github.com/stackblitz/alien-signals).

## ✨ Key Features

- **Maximum React Compatibility**: AI assistants (like Copilot, Cursor, etc.) are trained heavily on React. This framework allows you to write standard React JSX syntax and Hooks (`useState`, `useEffect`, `useMemo`), making it incredibly easy for AI to generate correct code.
- **Zero Virtual DOM**: Component functions execute **exactly once** upon mounting. There is no VDOM diffing, eliminating CPU and memory overhead during state updates.
- **O(1) Fine-Grained DOM Updates**: Dynamic properties and DOM children are directly bound to signals. When a state changes, only the exact DOM node associated with that state updates immediately.
- **Compile-Time Magic**: Powered by a custom Babel plugin, standard JSX expressions (e.g., `<div>{count}</div>`) are transparently transformed into defensive, auto-tracking reactive closures at build time.

## 🛠️ How it Works

1. **Babel Transformation**: Our custom Vite/Babel plugin intercepts JSX. It transforms standard array destructuring `const [count, setCount] = useState(0)` into signal references, and transforms JSX bindings `<div>{count}</div>` into reactive arrow functions `<div>{() => count.get()}</div>`.
2. **Reactivity Engine**: Hooks are lightweight wrappers around `alien-signals`. `useState` returns a signal pseudo-tuple, while `useEffect` directly binds to signal `effect()`.
3. **Custom JSX Runtime**: Instead of creating virtual trees, our customized `jsx-runtime.ts` immediately constructs real `HTMLElement` and `DocumentFragment` objects. Reactive expressions are mapped to `alien-signals` effects that update text content, attributes, or swap DOM nodes (Conditional Rendering) on the fly.

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and npm installed.

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Development Server

Run the Vite dev server:

```bash
npm run dev
```

Visit the displayed local URL (usually `http://localhost:5173` or `http://localhost:5174`) to see the counter and conditional rendering demo.

## 📝 Example

Because of our compile-time transformations, you can write code exactly like standard React:

```tsx
import { useState, useEffect } from './framework/hooks';

export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Count changed to:", count);
  });

  return (
    <div>
      <h2>Current Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      
      {count > 5 ? (
        <div style={{ color: 'red' }}>Count is > 5!</div>
      ) : (
        <div style={{ color: 'blue' }}>Count is <= 5.</div>
      )}
    </div>
  );
}
```

*Note: The `Counter` function runs only once. Only the specific `{count}` text node and the conditional `<div>` elements are re-evaluated and swapped by the framework's internal effects.*

## 📄 License
MIT
