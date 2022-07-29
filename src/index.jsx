import Ownact from './ownact';

const container = document.getElementById('root');

const App = () => {
  const [count, setCount] = Ownact.useState(0);

  return (
    <div id="foo">
      <div>
        <p>{count}</p>
        <button
          type="button"
          onClick={() => {
            setCount((prev) => prev + 1);
            console.log(count);
          }}
        >
          count up
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('hoge');
          }}
        >
          hoge
        </button>
      </div>
      <a>bar</a>
      <b />
      <c>
        <d />
      </c>
    </div>
  );
};

const element = <App />;

Ownact.render(element, container);
