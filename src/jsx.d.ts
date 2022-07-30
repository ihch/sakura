declare namespace JSX {
  interface DOMAttributes<T> {
    children?: Element;
    // TODO: イベントハンドラーとして型をつける
    onClick?: Function;
  }
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    class?: string;
    hidden?: string;
    id?: string;
    inputmode?: 'none' | 'text' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  }
  interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
    download?: any;
    href?: string;
    rel?: string;
    target?: string;
  }
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    autofocus?: boolean;
    disabled?: boolean;
    name?: string;
    type?: 'submit' | 'reset' | 'button';
    value?: string;
  }
  interface IntrinsicElements {
    div: HTMLAttributes<HTMLDivElement>;
    p: HTMLAttributes<HTMLParagraphElement>;
    a: AnchorHTMLAttributes<HTMLAnchorElement>;
    button: ButtonHTMLAttributes<HTMLButtonElement>;
  }
}
