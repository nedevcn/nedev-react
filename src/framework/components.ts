import { effect } from 'alien-signals';

type KeyRef = string | number;

/**
 * 包装一个实际的 DOM 数组序列，对应一个列表项。
 * 因为一次 map 返回的结果可能是多个 DOM 节点（或者文字节点），我们需要一个对象来管理。
 */
interface ItemRecord {
  key: KeyRef;
  item: any;
  nodes: Node[];
}

export interface ForProps<T> {
  each: () => T[] | undefined | null;
  children: (item: T, index: () => number) => any;
  /** 可选，指定作为 Key 的属性名。如果不提供，按索引或者对象本身引用进行 fallback。 */
  // Actually, Solid's For doesn't require a key prop, it uses Object reference.
  // But for better compatibility or primitive arrays, a key is good.
  // In React we usually map and use `key` on the returned element.
  // But here we'll provide an explicit fallback.
}

/**
 * `<For>` 核心组件。
 * 在无 VDOM 模型中，负责精确移动、添加、删除真实 DOM 节点。
 */
export function For<T>(props: ForProps<T>) {
  const anchor = document.createComment('For-Anchor');
  const initialFrag = document.createDocumentFragment();
  initialFrag.appendChild(anchor);
  
  let currentRecords: Map<KeyRef, ItemRecord> = new Map();
  let currentArray: T[] = [];

  effect(() => {
    // each 可能是一个由 Babel Babel 插件包起来的闭包 `() => data.get()`
    // 在 props 当中它可能直接传进来的是一个 function
    let listOrFn = props.each;
    let list: T[] = [];
    if (typeof listOrFn === 'function') {
        list = listOrFn() || [];
    } else {
        list = listOrFn || [];
    }

    // O(N) Diff Algorithm (Basic React/Solid reconciliation concept)
    const newRecords = new Map<KeyRef, ItemRecord>();
    const newKeys: KeyRef[] = [];

    // 第一步：整理出新的 key 序列
    list.forEach((item, index) => {
      // 如果对象有 id，优先用 id；否则退化用对象引用（如果对象不支持，再退化成 index）
      let key: KeyRef = index; 
      if (item && typeof item === 'object') {
        if ('id' in item) {
           key = (item as any).id;
        } else if ('key' in item) {
           key = (item as any).key;
        } else {
           // Hack: Use weakmap to assign keys to items, or just hope object reference works.
           // For simplicity in this demo framework, we use index if no id/key found.
        }
      } else if (typeof item === 'string' || typeof item === 'number') {
        key = item;
      }
      
      // 保证 key 唯一
      let uniqueKey = key;
      let suffix = 0;
      while (newRecords.has(uniqueKey)) {
        uniqueKey = `${key}_${++suffix}`;
      }

      newKeys.push(uniqueKey);

      // 如果能在旧的记录中找到，复用
      if (currentRecords.has(uniqueKey)) {
        newRecords.set(uniqueKey, currentRecords.get(uniqueKey)!);
        // Note: We might need to update the `index` signal if it changed, 
        // but for a lightweight V1 For, we skip reactive inner index for now, 
        // or we implement index signals later.
      } else {
        // 创建新的 DOM
        // 这里需要调用 children(item, index)
        const rendered = props.children(item, () => index);
        // Normalize 结果为 Node 数组
        let rootNodes: Node[] = [];
        if (rendered instanceof Node) {
           rootNodes = [rendered];
        } else if (Array.isArray(rendered)) {
           // 提取全部平铺 Node (简化逻辑)
           // 实际应调用 jsx-runtime 中的 handleChild/insertNode 功能
           // 这里我们简化，直接如果不是 Node 的转化为 TextNode
           rendered.forEach(r => {
              if (r instanceof Node) rootNodes.push(r);
              else if (r != null) rootNodes.push(document.createTextNode(String(r)));
           });
        } else if (rendered != null) {
           rootNodes = [document.createTextNode(String(rendered))];
        }

        newRecords.set(uniqueKey, {
          key: uniqueKey,
          item,
          nodes: rootNodes
        });
      }
    });

    // 第二步：执行真实的 DOM 挂载和卸载
    const parent = anchor.parentNode;
    if (!parent) return; // Not mounted yet

    // 先卸载不再存在的 Key
    for (const [key, record] of currentRecords.entries()) {
      if (!newRecords.has(key)) {
        record.nodes.forEach(node => {
          if (node.parentNode === parent) {
             parent.removeChild(node);
          }
        });
      }
    }

    // 第三步：按照新顺序，排列已有节点和新节点
    // 使用游标 currentDOM 指针
    // 由于我们想要将新的 list 节点插入到 anchor 之前
    // 我们可以倒序插入，或者正序用一个随动的 marker
    
    // 正序游标，初始是 anchor 的位置，实际上我们只能通过 insertBefore 来安排相对位置
    // 我们找出 parent 里面对应这个 For 范围的起止点？
    // 简单起见，既然我们有所有节点的实体引用，我们直接按照 newKeys 顺序 insertBefore
    
    // 我们目前的问题是，如果是纯追加，我们应该放在哪里？
    // 只要有倒序的 marker 就很好办。
    
    let lastMarker: Node = anchor;

    // 倒序遍历能够很容易的通过 insertBefore 逐个往上排
    for (let i = newKeys.length - 1; i >= 0; i--) {
      const key = newKeys[i];
      const record = newRecords.get(key)!;
      // 它的 nodes 也需要倒序排上去
      for (let j = record.nodes.length - 1; j >= 0; j--) {
        const node = record.nodes[j];
        // 只有当 node 并不在当前的正确位置时才移动它
        // 对于极高性能优化，可以检查 node.nextSibling === lastMarker
        // 这里采用保守的统一排布实现
        if (node.nextSibling !== lastMarker) {
           parent.insertBefore(node, lastMarker);
        }
        lastMarker = node; // 游标前移
      }
    }

    // 更新当前的持久化记录
    currentRecords = newRecords;
    currentArray = list;
  });

  // 返回 Fragment 供 JSX runtime 挂载。里面的所有节点（包括初始列表和 anchor）
  // 都会被转移到最终的父节点（比如 ul）中。
  // 之后的更新中，anchor.parentNode 就会是确切的那个实际父级。
  return initialFrag;
}
