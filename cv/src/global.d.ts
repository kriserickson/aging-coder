export {};

declare global {
  interface Window {
    CV_CHAT_ENDPOINT?: string;
    CV_FIT_ENDPOINT?: string;
    resetFitModal?: () => void;
  }
}
