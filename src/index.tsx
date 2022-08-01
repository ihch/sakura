import Sakura from './sakura';

const container = document.getElementById('root');

const App = () => {
  const [count1, setCount1] = Sakura.useState(0);
  const [count2, setCount2] = Sakura.useState(0);

  Sakura.useEffect(() => {
    console.log('hello', count1);
  }, [count1]);

  return (
    <div id="foo">
      <div>
        <p>count1: {count1}</p>
        <button
          type="button"
          onClick={() => {
            setCount1((prev) => prev + 1);
          }}
        >
          count up
        </button>
        <p>hoge2: {count2}</p>
        <button
          type="button"
          onClick={() => {
            setCount2((prev) => prev + 1);
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
