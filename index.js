const createElement = (type, props, ...children) => {
  return {
    type,
    props: {
      children,
      ...props,
    },
  }
}

const div = createElement("div");
const divWithChild = createElement("div", null, "a");
const divWithChildren = createElement("div", null, "a", "b");

console.log(div)
console.log(divWithChild)
console.log(divWithChildren)
