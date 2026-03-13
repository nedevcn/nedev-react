export const mountRegistry = new WeakMap<Node, (() => void)[]>();
export const cleanupRegistry = new WeakMap<Node, (() => void)[]>();

let isObserving = false;

export function startLifecycleObserver() {
  if (isObserving || typeof window === 'undefined') return;
  isObserving = true;
  
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
         m.addedNodes.forEach(node => triggerMount(node));
         m.removedNodes.forEach(node => triggerCleanup(node));
      }
    }
  });
  
  // We wait for body to be available, or just observe the document element.
  const root = document.body || document.documentElement;
  observer.observe(root, { childList: true, subtree: true });
}

function triggerMount(node: Node) {
   const mounts = mountRegistry.get(node);
   if (mounts) {
      mounts.forEach(fn => fn());
      mountRegistry.delete(node); // Executed once
   }
   if (node.childNodes && node.childNodes.length > 0) {
      node.childNodes.forEach(triggerMount);
   }
}

function triggerCleanup(node: Node) {
   const cleanups = cleanupRegistry.get(node);
   if (cleanups) {
      cleanups.forEach(fn => fn());
      cleanupRegistry.delete(node);
   }
   if (node.childNodes && node.childNodes.length > 0) {
      node.childNodes.forEach(triggerCleanup);
   }
}
