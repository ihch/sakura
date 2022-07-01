import Ownact from './ownact';

const container = document.getElementById('root');

/** @jsxRuntime classic */
/** @jsx Ownact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);

Ownact.render(element, container);
