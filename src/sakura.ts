const createElement = (type: FiberType | FunctionComponent, props: any, ...children: Children) => {
  return {
    type,
    props: {
      ...props,
      children: children.map((child: Element) => (typeof child === 'object' ? child : createTextElement(child))),
    },
  };
};

const createTextElement = (text: string) => {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
};

const domCreator = (type: FiberType | FunctionComponent | null) => {
  if (type instanceof Function) {
    return null;
  }
  if (type === 'TEXT_ELEMENT') {
    return document.createTextNode('');
  }
  if (type) {
    return document.createElement(type);
  }
  return null;
};

const createDOM = (fiber: Fiber) => {
  const dom = domCreator(fiber.type);
  dom && updateDOM(dom, {}, fiber.props);
  return dom;
};

const isEvent = (key: string) => key.startsWith('on');
const isProperty = (key: string) => key !== 'children' && !isEvent(key);
const isNew = (prev: { [key: string]: any }, next: { [key: string]: any }) => (key: string) => prev[key] !== next[key];
const isGone = (_prev: { [key: string]: any }, next: { [key: string]: any }) => (key: string) => !(key in next);

const updateDOM = (dom: HTMLElement | Text, prevProps: any, nextProps: any) => {
  // 古いプロパティを削除する
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore TODO: いい感じにする
      dom[name] = '';
    });

  // 新しいプロパティ・変更されたプロパティを設定
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore TODO: いい感じにする
      dom[name] = nextProps[name];
    });

  // 必要ない・変更されたイベントリスナーの削除
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 新しい・変更されたイベントリスナーの追加
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
};

const commitDeletion = (fiber: Fiber, parentDom: HTMLElement | Text) => {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else {
    // DOMノードを持つ子が見つかるまで再帰的に探索する
    fiber.child && commitDeletion(fiber.child, parentDom);
  }
};

const commitWork = (fiber: Fiber) => {
  if (!fiber) {
    return;
  }

  // DOMノードを持つfiberが見つかるまでfiberツリーを上に移動する
  // DOMノードを持たないfiber -> 関数コンポーネント
  let parentDomFiber = fiber.parent;
  while (!parentDomFiber?.dom) {
    parentDomFiber = parentDomFiber?.parent || null;
  }
  const parentDom = parentDomFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    // 親ノードに対してノードを追加
    parentDom.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDOM(fiber.dom, fiber.alternate?.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, parentDom);
  }

  // ノードが持つ子要素をDOMに反映
  fiber.child && commitWork(fiber.child);
  // ノードの兄弟要素をDOMに反映
  fiber.sibling && commitWork(fiber.sibling);
};

const commitRoot = () => {
  progressRoot && progressRoot.child && commitWork(progressRoot.child);
  currentRoot = progressRoot;
  progressRoot = null;
};

const workLoop: IdleRequestCallback = (deadline) => {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // ノードの生成作業が終了したらDOMツリーに反映する
  if (!nextUnitOfWork && progressRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
};

const reconcileChildren = (progressFiber: Fiber, elements: Children) => {
  let index = 0;
  let prevSibling = null;
  let oldFiber = progressFiber.alternate && progressFiber.alternate.child;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: Fiber | null = null;

    // 差分検出をしているところ。Reactではkeyの確認とかもして効率化している
    const sameType = oldFiber && element && element.type == oldFiber.type;

    // 同じelementタイプ(h1など)のノードならデータの更新のみ
    if (oldFiber && sameType) {
      newFiber = {
        ...oldFiber,
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: progressFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    // elementタイプが違う別の要素なら新しいノードを追加する
    if (!sameType && element) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: progressFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
        child: null,
        sibling: null,
        hooks: [],
        flag: false,
      };
    }
    // elementタイプが違い要素がない場合は古いノードを削除する
    if (!sameType && oldFiber) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    // 注目する古いノードを次の要素にする
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      progressFiber.child = newFiber;
    } else if (element && prevSibling) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
};

let progressFiber: Fiber | null = null;
let hookIndex: number = 0;

const useState = <T>(initialState: T): [T, (action: (prev: T) => T) => void] => {
  const oldHook = progressFiber?.alternate && progressFiber.alternate.hooks && progressFiber.alternate.hooks[hookIndex];

  const hook: Hook<T> = {
    state: oldHook ? oldHook.state : initialState,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];

  actions.forEach((action: Function) => {
    hook.state = action(hook.state);
  });

  const setState = (action: (prev: T) => T) => {
    hook.queue.push(action);

    if (!currentRoot) {
      return;
    }

    // render関数と同じように変更が起きたノードを次の描画処理として指定する
    progressRoot = {
      ...currentRoot,
      alternate: currentRoot,
      flag: true,
    };
    nextUnitOfWork = progressRoot;
    deletions = [];
  };

  progressFiber?.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
};

const updateFunctionComponent = (fiber: Fiber, type: FunctionComponent) => {
  progressFiber = fiber;
  hookIndex = 0;
  progressFiber.hooks = [];

  // JSX変換の仕様で関数コンポーネントにはDOMノードがつかない
  // 関数コンポーネントは変換済みのJSXを返すので、それを子要素としてfiberにする
  const children = [type(fiber.props)];
  reconcileChildren(fiber, children);
};

const updateHostComponent = (fiber: Fiber) => {
  if (!fiber.dom) {
    const hoge = createDOM(fiber);
    if (hoge) {
      fiber.dom = hoge;
    }
  }
  reconcileChildren(fiber, fiber.props.children || []);
};

const performUnitOfWork = (fiber: Fiber) => {
  const isFunctionComponent = (type: FiberType | FunctionComponent | null): type is Function =>
    type instanceof Function;

  if (isFunctionComponent(fiber.type)) {
    updateFunctionComponent(fiber, fiber.type);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber: Fiber | null = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
};

// 描画処理をするノード
let nextUnitOfWork: Fiber | null = null;
// 描画処理をしているDOMツリーのルートノード
let progressRoot: Fiber | null = null;
// 差分比較に利用する最後にコミットしたDOMツリー
let currentRoot: Fiber | null = null;
// 新しいDOMツリーから削除されたノードを仮想DOMツリーに反映するため記憶する
let deletions = null;

type Element<T = {}> = {
  child: Element | string;
  type: FiberType | FunctionComponent | null;
  props: T;
};

type Child = Element;

type Children = Child[];

type FunctionComponent = Function;

type FiberType = 'TEXT_ELEMENT' | keyof HTMLElementTagNameMap;

type FiberEffectTag = 'PLACEMENT' | 'UPDATE' | 'DELETION';

type Hook<T = any> = {
  queue: Function[];
  state: T;
};

type Fiber = {
  type: FiberType | FunctionComponent | null;
  dom: HTMLElement | Text | null;
  props: {
    children?: Element[];
    [key: string]: any;
  };
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  parent: Fiber | null;
  effectTag: FiberEffectTag | null;
  hooks: Hook[];
  flag: boolean | null;
};

const render = (element: Element, container: HTMLElement) => {
  progressRoot = {
    type: null,
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
    child: null,
    sibling: null,
    parent: null,
    effectTag: null,
    hooks: [],
    flag: null,
  };

  deletions = [];
  nextUnitOfWork = progressRoot;

  requestIdleCallback(workLoop);
};

const Sakura = {
  createElement,
  render,
  useState,
};

export default Sakura;
