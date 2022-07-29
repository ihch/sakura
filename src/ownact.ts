const createElement = (type, props, ...children: Children) => {
  return {
    type,
    props: {
      ...props,
      children: children.map((child: Element) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  };
}

const createTextElement = (text: string) => {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}

const createDOM = (fiber) => {
  const dom = fiber.type === 'TEXT_ELEMENT'
    ? document.createTextNode('')
    : document.createElement(fiber.type);

  updateDOM(dom, {}, fiber.props);

  return dom;
}

const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key);
const isNew = (prev: { [key: string]: any }, next: { [key: string]: any }) => (key: string) => prev[key] !== next[key];
const isGone = (_prev: { [key: string]: any }, next: { [key: string]: any }) => (key: string) => !(key in next);

const updateDOM = (dom, prevProps, nextProps) => {
  // 古いプロパティを削除する
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => { dom[name] = '' });

  // 新しいプロパティ・変更されたプロパティを設定
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => { dom[name] = nextProps[name] });

  // 必要ない・変更されたイベントリスナーの削除
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key => !(key in nextProps) || isNew(prevProps, nextProps)(key)
    )
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
}

const commitDeletion = (fiber, parentDom) => {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else {
    // DOMノードを持つ子が見つかるまで再帰的に探索する
    commitDeletion(fiber.child, parentDom);
  }
}

const commitWork = (fiber) => {
  if (!fiber) {
    return;
  }

  // DOMノードを持つfiberが見つかるまでfiberツリーを上に移動する
  // DOMノードを持たないfiber -> 関数コンポーネント
  let parentDomFiber = fiber.parent;
  while (!parentDomFiber.dom) { parentDomFiber = parentDomFiber.parent }
  const parentDom = parentDomFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    // 親ノードに対してノードを追加
    parentDom.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, parentDom);
  }

  // ノードが持つ子要素をDOMに反映
  commitWork(fiber.child);
  // ノードの兄弟要素をDOMに反映
  commitWork(fiber.sibling);
}

const commitRoot = () => {
  commitWork(progressRoot.child);
  currentRoot = progressRoot;
  progressRoot = null;
}

const workLoop = (deadline) => {
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
}

const reconcileChildren = (progressFiber, elements: Children) => {
  let index = 0;
  let prevSibling = null;
  let oldFiber = progressFiber.alternate && progressFiber.alternate.child;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    // 差分検出をしているところ。Reactではkeyの確認とかもして効率化している
    const sameType = oldFiber && element && element.type == oldFiber.type;


    // 同じelementタイプ(h1など)のノードならデータの更新のみ
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: progressFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
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
        effectTag: "PLACEMENT",
      };
    }
    // elementタイプが違い要素がない場合は古いノードを削除する
    if (!sameType && oldFiber) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    // 注目する古いノードを次の要素にする
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      progressFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  };
}

let progressFiber = null;
let hookIndex = null;

const useState = (initialState) => {
  const oldHook = progressFiber.alternate
    && progressFiber.alternate.hooks
    && progressFiber.alternate.hooks[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initialState,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    hook.queue.push(action);

    // render関数と同じように変更が起きたノードを次の描画処理として指定する
    progressRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
      flag: true,
    };
    nextUnitOfWork = progressRoot;
    deletions = [];
  }

  progressFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

const updateFunctionComponent = (fiber) => {
  progressFiber = fiber;
  hookIndex = 0;
  progressFiber.hooks = [];

  // JSX変換の仕様で関数コンポーネントにはDOMノードがつかない
  // 関数コンポーネントは変換済みのJSXを返すので、それを子要素としてfiberにする
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

const updateHostComponent = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

const performUnitOfWork = (fiber) => {
  const isFunctionComponent = (fiber) => fiber.type instanceof Function;

  if (isFunctionComponent(fiber)) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

// 描画処理をするノード
let nextUnitOfWork = null;
// 描画処理をしているDOMツリーのルートノード
let progressRoot = null;
// 差分比較に利用する最後にコミットしたDOMツリー
let currentRoot = null;
// 新しいDOMツリーから削除されたノードを仮想DOMツリーに反映するため記憶する
let deletions = null;

type Element<T = {}> = {
  child: Element | string;
  type: 'TEXT_ELEMENT' | string;
  props: T;
};

type Child = Element;

type Children = Child[];

declare type Ownact = {
  Element: Element
}

const render = (element: Element, container: HTMLElement) => {
  progressRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };

  deletions = [];
  nextUnitOfWork = progressRoot;

  requestIdleCallback(workLoop);
};

const Ownact = {
  createElement,
  render,
  useState,
};

export default Ownact;
