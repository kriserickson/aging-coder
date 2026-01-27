export {};

declare global {
	interface Window {
		CV_CHAT_API?: string;
		resetFitModal?: () => void;
	}

	interface IRenderer {
		/** Optional internal parser data that some renderers expose */
		data?: { nodes?: Node[]; index?: number } | null;
		/** Optional attribute setter used by streaming renderers */
		set_attr?: (
			data?: { nodes?: Element[]; index?: number },
			attr?: string | number,
			value?: string,
		) => void;
		/** Method to add text to the renderer (used by slow renderer wrapper) */
		add_text?: (
			data: { nodes?: Node[]; index?: number } | null,
			text: string,
		) => void;
		/** Optional helper to await pending work */
		waitForIdle?: () => Promise<void>;
	}

	interface IParser {}
}

declare module "streaming-markdown" {
	export function parser(renderer: IRenderer): IParser;
	export function parser_write(parser: IParser, chunk: string): void;
	export function parser_end(parser: IParser): void;
	export function default_renderer(
		element: HTMLElement,
		opts?: unknown,
	): IRenderer;
}
