import { effect } from 'alien-signals';

// Dynamic child insertion helper
function insertNode(el: HTMLElement | DocumentFragment, child: any, marker: Node | null): Node[] {
  if (child == null || typeof child === 'boolean') return [];
  if (child instanceof Node) {
    el.insertBefore(child, marker);
    return [child];
  } else if (Array.isArray(child)) {
    const nodes: Node[] = [];
    for (const c of child) {
      nodes.push(...insertNode(el, c, marker));
    }
    return nodes;
  } else {
    const text = document.createTextNode(String(child));
    el.insertBefore(text, marker);
    return [text];
  }
}

function handleChild(el: HTMLElement | DocumentFragment, child: any) {
  if (child == null || typeof child === 'boolean') {
    return;
  }

  if (typeof child === 'function') {
    // It's a reactive getter created by our Babel plugin!
    const marker = document.createTextNode('');
    el.appendChild(marker);
    let currentNodes: Node[] = [];
    
    effect(() => {
      const val = child();
      // Remove old nodes
      currentNodes.forEach(n => {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
      // Insert new nodes before the marker
      currentNodes = insertNode(el, val, marker);
    });
  } else if (child instanceof Node) {
    el.appendChild(child);
  } else if (Array.isArray(child)) {
    child.forEach(c => handleChild(el, c));
  } else {
    // Static primitive
    el.appendChild(document.createTextNode(String(child)));
  }
}

export function jsx(type: any, props: any, key?: any) {
  // Fragment support
  if (type === Fragment) {
    const frag = document.createDocumentFragment();
    if (props && props.children) {
      handleChild(frag, props.children);
    }
    return frag;
  }

  // Component support
  if (typeof type === 'function') {
    const Component = type;
    // Note: in our zero VDOM model, components run EXACTLY ONCE.
    // So we just call them directly. Proved react compatible.
    return Component(props);
  }

  // Native elements
  const el = document.createElement(type);

  for (const name in props) {
    if (name === 'children') continue;

    const val = props[name];

    if (name.startsWith('on') && name.length > 2) {
      // Event listener: onClick -> click
      const eventName = name.slice(2).toLowerCase();
      // Notice we use the latest function, actually since component runs
      // once, the function reference doesn't change, no need to delegate.
      el.addEventListener(eventName, val);
    } else if (name === 'className') {
      if (typeof val === 'function') {
        effect(() => el.className = val() || '');
      } else {
        el.className = val || '';
      }
    } else if (name === 'style') {
       if (typeof val === 'function') {
        effect(() => {
          const styleObj = val();
          if (typeof styleObj === 'string') {
            el.style.cssText = styleObj;
          } else if (styleObj) {
            Object.assign(el.style, styleObj);
          }
        });
      } else {
        Object.assign(el.style, val);
      }
    } else {
      // Static or reactive prop
      if (typeof val === 'function') {
         effect(() => {
           const evaluated = val();
           if (evaluated == null || evaluated === false) {
             el.removeAttribute(name);
           } else {
             el.setAttribute(name, evaluated === true ? '' : evaluated);
           }
         });
      } else {
         if (val == null || val === false) {
             el.removeAttribute(name);
         } else {
             el.setAttribute(name, val === true ? '' : val);
         }
      }
    }
  }

  if (props.children) {
    handleChild(el, props.children);
  }

  return el;
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export function Fragment(props: any) {
  return props.children;
}
