const createElement = (type, props, ...children) => {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  };
}

const createTextElement = (text) => {
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

  const isProperty = key => key !== 'children';
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

const commitWork = (fiber) => {
  if (!fiber) {
    return;
  }

  // 親ノードに対してノードを追加
  const parentDom = fiber.parent.dom;
  parentDom.appendChild(fiber.dom);

  // ノードが持つ子要素をDOMに反映
  commitWork(fiber.child);
  // ノードの兄弟要素をDOMに反映
  commitWork(fiber.sibling);
}

const commitRoot = () => {
  commitWork(progressRoot.child);
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

const reconcileChildren = (progressFiber, elements) => {
  // TODO DOMの差分比較をする

  let prevSibling = null;

  elements.forEach((element, index) => {
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: progressFiber,
      dom: null,
    }

    if (index === 0) {
      progressFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
  });
}

const performUnitOfWork = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber)
  }

  reconcileChildren(fiber, fiber.props.children);

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

const render = (element, container) => {
  progressRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };

  nextUnitOfWork = progressRoot;

  requestIdleCallback(workLoop);
};

const Ownact = {
  createElement,
  render,
};

export default Ownact;
