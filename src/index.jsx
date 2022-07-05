import Ownact from './ownact';

const container = document.getElementById('root');

const element = (
  <div id="foo">
    <a>bar</a>
    <b />
    <c>
      <d />
    </c>
  </div>
);

Ownact.render(element, container);
