export { };

declare global {
  interface Window {
    CV_CHAT_API?: string;
    resetFitModal?: () => void;
  }
}

declare module 'streaming-markdown' {
  export function parser(renderer: any): any;
  export function parser_write(parser: any, chunk: string): void;
  export function parser_end(parser: any): void;
  export function default_renderer(element: HTMLElement, opts?: any): any;
}

