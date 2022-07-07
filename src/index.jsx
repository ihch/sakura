import Ownact from './ownact';

const container = document.getElementById('root');

const App = () => {
  return (
    <div id="foo">
      <a>bar</a>
      <b />
      <c>
        <d />
      </c>
    </div>
  )
}

const element = <App />;

Ownact.render(element, container);
