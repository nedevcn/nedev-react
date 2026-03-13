import { createContext, useContext, useState, useEffect } from './hooks';
import { Show } from './components';

export const RouterContext = createContext({
  path: window.location.pathname,
  navigate: (to: string) => {}
});

export function Router(props: { children: any }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });

  const navigate = (to: string) => {
    // Avoid redundant pushes
    if (window.location.pathname === to) return;
    window.history.pushState({}, '', to);
    setPath(to);
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {props.children}
    </RouterContext.Provider>
  );
}

export function Route(props: { path: string, component?: any, children?: any }) {
  const ctx = useContext<any>(RouterContext);
  
  return (
    <Show when={ctx.path === props.path}>
      {props.component || props.children}
    </Show>
  );
}

export function useNavigate() {
  const ctx = useContext<any>(RouterContext);
  return ctx.navigate;
}

export function useParams() {
  // A basic empty implementation for now.
  // Advanced pattern matching (e.g. /users/:id) can be added in the future.
  return {};
}

export function Link(props: { to: string, children: any, style?: any, className?: any }) {
  const navigate = useNavigate();
  return (
    <a 
      href={props.to} 
      className={props.className}
      style={props.style}
      onClick={(e: any) => {
        e.preventDefault();
        navigate(props.to);
      }}
    >
      {props.children}
    </a>
  );
}
