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

  // Handle our new `{ __g: () => ... }` reactive getter envelope
  if (child && typeof child === 'object' && '__g' in child && typeof child.__g === 'function') {
    const marker = document.createTextNode('');
    el.appendChild(marker);
    let currentNodes: Node[] = [];
    
    effect(() => {
      const val = child.__g();
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
    // Provide a Proxy over props so that `{ __g: fn }` is transparently unwrapped
    // This gives child components reactive access to props passed from the parent!
    const reactiveProps = new Proxy(props || {}, {
      get(target, propKey) {
        const val = target[propKey];
        if (val && typeof val === 'object' && '__g' in val && typeof val.__g === 'function') {
          return val.__g();
        }
        return val;
      }
    });
    return Component(reactiveProps);
  }

  // Native elements
  const el = document.createElement(type);

  for (const name in props) {
    if (name === 'children') continue;

    const rawVal = props[name];
    const isReactive = rawVal && typeof rawVal === 'object' && '__g' in rawVal;
    const getter = isReactive ? rawVal.__g : (typeof rawVal === 'function' ? rawVal : () => rawVal);

    if (name === 'ref') {
      const refVal = isReactive ? rawVal.__g() : rawVal;
      if (typeof refVal === 'function') {
        refVal(el);
      } else if (refVal && 'current' in refVal) {
        refVal.current = el;
      }
    } else if (name.startsWith('on') && name.length > 2) {
      // Event listener: onClick -> click
      const eventName = name.slice(2).toLowerCase();
      // Babel explicitly skips `on*` attributes, so rawVal is the actual function
      el.addEventListener(eventName, rawVal);
    } else if (name === 'className') {
      if (isReactive || typeof rawVal === 'function') {
        effect(() => el.className = getter() || '');
      } else {
        el.className = rawVal || '';
      }
    } else if (name === 'style') {
       if (isReactive || typeof rawVal === 'function') {
        effect(() => {
          const styleObj = getter();
          if (typeof styleObj === 'string') {
            el.style.cssText = styleObj;
          } else if (styleObj) {
            Object.assign(el.style, styleObj);
          }
        });
      } else {
        Object.assign(el.style, rawVal);
      }
    } else {
      // Static or reactive prop
      if (isReactive || typeof rawVal === 'function') {
         effect(() => {
           const evaluated = getter();
           if (evaluated == null || evaluated === false) {
             el.removeAttribute(name);
           } else {
             el.setAttribute(name, evaluated === true ? '' : evaluated);
           }
         });
      } else {
         if (rawVal == null || rawVal === false) {
             el.removeAttribute(name);
         } else {
             el.setAttribute(name, rawVal === true ? '' : rawVal);
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
