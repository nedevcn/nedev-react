import { useState, useEffect } from './framework/hooks';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Count is now:", count);
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>自研 AI-Friendly UI Framework</h1>
      <p>这是一个完全无虚拟 DOM 的 React 变体。</p>
      
      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h2>Current Count: {count}</h2>
        <button 
          onClick={() => setCount(count + 1)}
          style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer' }}
        >
          Increment
        </button>
      </div>
      
      {count > 5 ? (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Count 超过 5 了！(条件渲染测试)
        </div>
      ) : (
        <div style={{ color: 'blue', marginTop: '10px' }}>
          Count 小于等于 5。(条件渲染测试)
        </div>
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  root.innerHTML = '';
  // Since JSX returns real DOM elements directly
  root.appendChild(<Counter />);
}
