import { useState, useEffect, useMemo, useRef, useCallback, useReducer, useId, useLayoutEffect, createContext, useContext, onMount, onCleanup, createResource } from './framework/hooks';
import { For, Show, Switch, Match, Suspense } from './framework/components';
import { Router, Route, Link } from './framework/router';

// A child component to test props reactivity
function TimerDisplay(props: { time: number, color: string }) {
  const [status, setStatus] = useState('Initializing (Not in DOM)');

  onMount(() => {
    setStatus('🚀 MOUNTED in True DOM!');
    console.log("TimerDisplay MOUNTED!");
  });

  onCleanup(() => {
    console.log("TimerDisplay UNMOUNTED from True DOM!");
  });

  return (
    <div style={{ padding: '10px', border: '2px solid', borderColor: props.color, margin: '10px 0', borderRadius: '8px' }}>
      <h3>Props Reactivity & Lifecycle Test</h3>
      <p style={{ color: '#E91E63', fontWeight: 'bold' }}>Lifecycle: <span>{status}</span></p>
      <p>The current time is: <strong>{props.time}</strong></p>
      <p>This component function never re-executes. The text above updates via O(1) DOM ops because `props` is a reactive Proxy.</p>
    </div>
  );
}

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

// A deeply nested child to test Context
function ThemeButton() {
  const ctx = useContext<any>(ThemeContext);
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

function Navigation() {
  const ctx = useContext<any>(ThemeContext);
  return (
    <nav style={{ padding: '15px', background: ctx.theme === 'light' ? '#eee' : '#333', display: 'flex', gap: '20px', borderRadius: '8px', marginBottom: '20px', transition: 'background-color 0.3s' }}>
      <Link to="/" style={{ color: ctx.theme === 'light' ? '#000' : '#fff', textDecoration: 'none', fontWeight: 'bold' }}>首页 (Home)</Link>
      <Link to="/todos" style={{ color: ctx.theme === 'light' ? '#000' : '#fff', textDecoration: 'none', fontWeight: 'bold' }}>任务大厅 (Todos)</Link>
      <Link to="/about" style={{ color: ctx.theme === 'light' ? '#000' : '#fff', textDecoration: 'none', fontWeight: 'bold' }}>关于 (About)</Link>
    </nav>
  );
}

// A simulated async component
function AsyncProfile() {
  const user = createResource(async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { name: 'Antigravity AI', role: 'Framework Architect' };
  });

  return (
    <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px', color: '#1565c0' }}>
      <h4>User Profile (Async)</h4>
      <p>Name: <strong>{user.data?.name}</strong></p>
      <p>Role: <strong>{user.data?.role}</strong></p>
    </div>
  );
}

// ---- Demo: useReducer ----
type CounterAction = { type: 'increment' } | { type: 'decrement' } | { type: 'reset' };

function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case 'increment': return state + 1;
    case 'decrement': return state - 1;
    case 'reset': return 0;
    default: return state;
  }
}

function NewHooksDemo() {
  // useReducer: action/dispatch 复杂状态
  const [reducerCount, dispatch] = useReducer(counterReducer, 0);

  // useId: 唯一 ID
  const inputId = useId();
  const checkboxId = useId();

  // useCallback: 缓存回调
  const handleAlert = useCallback(() => {
    alert('useCallback works! Reducer count = ' + reducerCount);
  });

  // useLayoutEffect: 同步测量 DOM
  const [measured, setMeasured] = useState('Measuring...');
  useLayoutEffect(() => {
    const el = document.getElementById(inputId);
    if (el) {
      setMeasured(`Input width = ${el.offsetWidth}px`);
    }
  });

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>新 Hooks 演示 (Phase 13)</h2>

      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f3e5f5', borderRadius: '6px' }}>
        <h4 style={{ color: '#7b1fa2', margin: '0 0 8px' }}>useReducer — Action/Dispatch</h4>
        <p>Count: <strong style={{ fontSize: '18px' }}>{reducerCount}</strong></p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => dispatch({ type: 'decrement' })}>➖ Decrement</button>
          <button onClick={() => dispatch({ type: 'reset' })}>🔄 Reset</button>
          <button onClick={() => dispatch({ type: 'increment' })}>➕ Increment</button>
        </div>
      </div>

      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
        <h4 style={{ color: '#2e7d32', margin: '0 0 8px' }}>useId — 唯一标识符绑定</h4>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label htmlFor={inputId}>Name:</label>
          <input id={inputId} placeholder="Auto-linked via useId" style={{ padding: '4px 8px', flex: 1 }} />
        </div>
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="checkbox" id={checkboxId} />
          <label htmlFor={checkboxId}>I agree (checkbox ID: {checkboxId})</label>
        </div>
      </div>

      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>
        <h4 style={{ color: '#e65100', margin: '0 0 8px' }}>useCallback — 回调缓存</h4>
        <button onClick={handleAlert}>Click me (useCallback)</button>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
          在 0-VDOM 架构下，useCallback 直接透传函数，因为不存在 vdom diff 导致的引用比较问题。
        </p>
      </div>

      <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
        <h4 style={{ color: '#1565c0', margin: '0 0 8px' }}>useLayoutEffect — 同步布局测量</h4>
        <p>{measured}</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          useLayoutEffect 在 DOM 变更后、浏览器绘制前通过 queueMicrotask 同步执行。
        </p>
      </div>
    </div>
  );
}

function HomePage() {
  const [count, setCount] = useState(0);
  const [showTimer, setShowTimer] = useState(true);
  const color = useMemo(() => count % 2 === 0 ? '#4CAF50' : '#2196F3');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [userRole, setUserRole] = useState('guest');
  const ctx = useContext<any>(ThemeContext);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(timer);
  });

  return (
    <div>
      <h2>主页 (Signals & Reactivity)</h2>
      
      <div style={{ marginBottom: '20px' }}>
         <button onClick={() => setShowTimer(!showTimer)}>
           {showTimer ? '销毁计时器 (Unmount)' : '创建计时器 (Mount)'}
         </button>
      </div>

      <Show when={showTimer}>
        <TimerDisplay time={count} color={color} />
      </Show>

      <section style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <h3>异步悬挂测试 (Suspense)</h3>
        <p>下方组件模拟了一个 2 秒延迟的 API 请求：</p>
        <Suspense fallback={<div style={{ padding: '15px', backgroundColor: '#fff3e0', color: '#ef6c00', borderRadius: '8px', border: '1px dashed orange' }}>⏳ 正在努力加载资源... (2s)</div>}>
          <AsyncProfile />
        </Suspense>
      </section>

      <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>DOM API 逃生舱 (useRef)</h2>
        <p>我们可以像 React 一样直接操纵真实 DOM。</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" id="demo-input" placeholder="Click the button to focus me..." style={{ flex: 1, padding: '8px' }} />
          <button onClick={() => {
            const input = document.getElementById('demo-input') as HTMLInputElement;
            input?.focus();
            input.value = "Focused via standard DOM API!";
          }}>Focus Programmatically</button>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>现代控制流 (Control Flow)</h2>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding: '8px 16px', marginRight: '10px' }}>
            Toggle Show: {showAdvanced ? 'ON' : 'OFF'}
          </button>
          
          <select value={userRole} onChange={(e: any) => setUserRole(e.target.value)} style={{ padding: '8px' }}>
            <option value="guest">Guest</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div style={{ padding: '10px', backgroundColor: ctx.theme === 'light' ? '#f5f5f5' : '#444', borderRadius: '6px', transition: 'background-color 0.3s' }}>
          <Show when={showAdvanced} fallback={<p>Fallback: Advanced settings hidden.</p>}>
             <div style={{ color: '#E91E63' }}>
                <p>Advanced Content Revealed! This DOM node was structurally inserted O(1).</p>
             </div>
          </Show>
          <hr style={{ margin: '15px 0', borderColor: '#ccc' }} />
          <Switch fallback={<p>Unknown Role Detected.</p>}>
            <Match when={userRole === 'guest'}>
              <p style={{ color: '#9E9E9E' }}>Welcome Guest. Please log in to see your tasks.</p>
            </Match>
            <Match when={userRole === 'user'}>
              <p style={{ color: '#2196F3' }}>Welcome User. You have basic access to the application.</p>
            </Match>
            <Match when={userRole === 'admin'}>
              <p style={{ color: '#F44336', fontWeight: 'bold' }}>Welcome Admin. You have superuser privileges!</p>
            </Match>
          </Switch>
        </div>
      </div>
      
      <ThemeButton />
      <NewHooksDemo />
    </div>
  );
}

function TodosPage() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn No-VDOM Concept', done: true },
    { id: 2, text: 'Build Vite + Babel Plugin', done: true },
    { id: 3, text: 'Implement O(1) Re-rendering', done: false },
    { id: 4, text: 'Implement Props Reactivity', done: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

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

  return (
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
              display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee',
              backgroundColor: todo.done ? '#f9f9f9' : 'white'
            }}>
              <span 
                style={{ 
                   flex: 1, cursor: 'pointer', textDecoration: todo.done ? 'line-through' : 'none',
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
  );
}

function AboutPage() {
  const ctx = useContext<any>(ThemeContext);
  return (
    <div style={{ padding: '20px', border: '1px dashed #ccc', borderRadius: '8px', backgroundColor: ctx.theme === 'light' ? '#fdfdfd' : '#2a2a2a', transition: 'background-color 0.3s' }}>
      <h2>关于 V3 路由架构</h2>
      <p>完全脱离 Virtual DOM，我们的 <strong>{'<Router>'}</strong> 本质上只是提供了一个全局的 <code>Location Signal</code> Context。</p>
      <p>而 <strong>{'<Route>'}</strong> 则是 <code>{'<Show>'}</code> 的语法糖。当路由切换时，只有匹配组件的 DOM 会被挂载到 Document 中。</p>
      <p style={{ color: '#E91E63', fontWeight: 'bold' }}>
        ✨ 架构揭秘：如果您切回首页，计时器会重置为 0。这是 Bug 吗？不，这是最完美的 React 兼容！<br/>
        尽管顶层 <code>{'<App />'}</code> 只执行了一次，但归功于底层的 <code>__lazy</code> AST 惰性闭包，当 <code>{'<Route>'}</code> 条件满足时，<code>{'<HomePage />'}</code> 会被精确地重新调用。这让我们在 <strong>0-VDOM 的性能极限</strong> 架构下，意外收获了标准的 <strong>组件挂载/卸载 (Mount/Unmount) 生命周期</strong>！
      </p>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
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
        transition: 'all 0.3s ease'
      }}>
        <h1>自研 AI-Friendly UI Framework (V3)</h1>
        <p>完全无虚拟 DOM · O(1) 局部更新 · 全 React 语法兼容</p>
        
        <Router>
           <Navigation />
           <Route path="/" component={<HomePage />} />
           <Route path="/todos" component={<TodosPage />} />
           <Route path="/about" component={<AboutPage />} />
        </Router>
      </div>
    </ThemeContext.Provider>
  );
}

const root = document.getElementById('root');
if (root) {
  root.innerHTML = '';
  root.appendChild(<App />);
}
