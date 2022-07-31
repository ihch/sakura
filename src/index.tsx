import Sakura from './sakura';

const container = document.getElementById('root');

const App = () => {
  const [count, setCount] = Sakura.useState(0);

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
    </div>
  );
};

const element = <App />;

Sakura.render(element, container);
