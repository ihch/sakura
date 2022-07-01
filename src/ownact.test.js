import { expect, describe, it } from 'vitest';

import { createElement } from './ownact';

describe('createElement', () => {
  it('create element', async () => {
    expect(createElement('div')).toStrictEqual({
      type: 'div',
      props: {
        children: [],
      }
    });
  });

  it('create element with props', async () => {
    expect(createElement('div', { text: 'hello' })).toStrictEqual({
      type: 'div',
      props: {
        text: "hello",
        children: [],
      }
    });
  });

  it('create element with children', async () => {
    expect(createElement('div', null, "a")).toStrictEqual({
      type: 'div',
      props: {
        children: [
          {
            type: "TEXT_ELEMENT",
            props: {
              nodeValue: "a",
              children: [],
            }
          }
        ],
      }
    });
  });
})
