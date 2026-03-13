import { useState, useEffect, useRef, createContext, useContext } from './framework/hooks';
import { For } from './framework/components';

// A child component to test props reactivity
function TimerDisplay(props: { time: number, color: string }) {
  // This component should only render ONCE!
  useEffect(() => {
    console.log("TimerDisplay mounted!");
  });

  return (
    <div style={{ padding: '10px', border: '2px solid', borderColor: props.color, margin: '10px 0', borderRadius: '8px' }}>
      <h3>Props Reactivity Test</h3>
      <p>The current time is: <strong>{props.time}</strong></p>
      <p>This component function never re-executes. The text above updates via O(1) DOM ops because `props` is a reactive Proxy.</p>
    </div>
  );
}

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

// A deeply nested child to test Context
function ThemeButton() {
  const ctx = useContext(ThemeContext);
  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Context API 跨层级透传</h2>
      <button 
        onClick={() => ctx.toggle()} 
        style={{
          padding: '10px 20px',
          backgroundColor: ctx.theme === 'light' ? '#eee' : '#333',
          color: ctx.theme === 'light' ? '#000' : '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
      >
        Current Theme: {ctx.theme} (Click to toggle)
      </button>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        DOM updates O(1) via synchronous context stack + Proxy wrappers. Component never re-renders!
      </p>
    </div>
  );
}

function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn No-VDOM Concept', done: true },
    { id: 2, text: 'Build Vite + Babel Plugin', done: true },
    { id: 3, text: 'Implement O(1) Re-rendering', done: true },
    { id: 4, text: 'Implement Props Reactivity', done: false }
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [timer, setTimer] = useState(0);
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Start a timer to test continuous props updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(timer + 1);
    }, 1000);
    return () => clearInterval(interval);
  });

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    setTodos([...todos, { id: Date.now(), text, done: false }]);
    setNewTodo('');
  };

  const removeTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  // test useRef
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
      <div style={{ 
        padding: '20px', 
        fontFamily: 'sans-serif', 
        maxWidth: '600px', 
        margin: '0 auto',
        backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a',
        color: theme === 'light' ? '#000' : '#eee',
        minHeight: '100vh',
        transition: 'background-color 0.3s'
      }}>
        <h1>自研 AI-Friendly UI Framework (V2)</h1>
      <p>完全无虚拟 DOM · O(1) 局部更新 · 全 React 语法兼容</p>
      
      {/* Test passing dynamic signals downward as props */}
      <TimerDisplay time={timer} color={timer % 2 === 0 ? '#4CAF50' : '#2196F3'} />

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>DOM API 逃生舱 (useRef)</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            ref={inputRef}
            placeholder="Click the button to focus me..."
            style={{ flex: 1, padding: '8px' }}
          />
          <button onClick={focusInput} style={{ padding: '8px 16px' }}>Focus Programmatically</button>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>任务列表 (高性能列表渲染能力)</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <input 
            value={newTodo} 
            onInput={(e: any) => setNewTodo(e.target.value)} 
            placeholder="Add new task..."
            style={{ flex: 1, padding: '8px' }}
          />
          <button onClick={addTodo} style={{ padding: '8px 16px' }}>Add</button>
        </div>
        
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <For each={todos}>
            {(todo, index) => (
              <li style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px', 
                borderBottom: '1px solid #eee',
                backgroundColor: () => todo.done ? '#f9f9f9' : 'white'
              }}>
                <span 
                  style={{ 
                     flex: 1, 
                     cursor: 'pointer',
                     textDecoration: todo.done ? 'line-through' : 'none',
                     color: todo.done ? '#999' : '#000'
                  }}
                  onClick={() => toggleTodo(todo.id)}
                >
                  <span style={{ marginRight: '8px', color: '#666' }}>{index() + 1}.</span>
                  {todo.text}
                </span>
                <button 
                  onClick={() => removeTodo(todo.id)}
                  style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  Delete
                </button>
              </li>
            )}
          </For>
        </ul>
        
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Total tasks: {todos.length}
        </div>
      </div>
      
      <ThemeButton />
    </div>
    </ThemeContext.Provider>
  );
}

const root = document.getElementById('root');
if (root) {
  root.innerHTML = '';
  root.appendChild(<TodoApp />);
}
