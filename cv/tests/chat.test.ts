import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("streaming-markdown", () => ({
	default_renderer: (element: HTMLElement) => ({
		element,
		data: { nodes: [] },
	}),
	parser: (renderer: { element?: HTMLElement }) => ({ renderer }),
	parser_write: (parser: { renderer?: unknown }, chunk: string) => {
		const renderer = parser.renderer as
			| {
				add_text?: (arg: unknown, chunk: string) => void;
				element?: HTMLElement;
			}
			| undefined;
		if (renderer?.add_text) {
			renderer.add_text(null, chunk);
			return;
		}
		if (renderer?.element) {
			renderer.element.textContent += chunk;
		}
	},

	parser_end: () => { },
}));

const makeConfig = () => ({
	default: {
		title: "Default Title",
		message: "Hello from default",
		questions: ["Q1", "Q2"],
	},
	topics: {
		about: {
			title: "About",
			message: "About message",
			questions: ["About Q"],
		},
		skills: {
			typescript: {
				title: "TypeScript",
				message: "TS message",
				questions: ["TS Q"],
			},
		},
		summary: {
			title: "Summary",
			message: "Summary message",
		},
	},
});

const setupBaseDOM = () => {
	document.body.innerHTML = `
    <div id="chat-modal" class="chat-modal">
      <button class="chat-close"></button>
      <div class="chat-modal-overlay"></div>
      <div class="chat-modal-content"></div>
    </div>
    <div id="chat-title"></div>
    <div id="chat-messages"></div>
    <input id="chat-input" />
    <button class="chat-send"></button>
    <button id="chat-toggle-btn"></button>
  `;
};

const flushPromises = async () => {
	await Promise.resolve();
	await Promise.resolve();
};

beforeEach(() => {
	setupBaseDOM();
	sessionStorage.clear();
	vi.restoreAllMocks();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("chat config", () => {
	it("loads chat config and caches it", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(makeConfig()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.resetModules();
		const chat = await import("../src/chat");
		const configA = await chat.loadChatConfig();
		const configB = await chat.loadChatConfig();

		expect(configA.default.title).toBe("Default Title");
		expect(configB).toBe(configA);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("falls back to default config on error", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));

		vi.resetModules();
		const chat = await import("../src/chat");
		const config = await chat.loadChatConfig();

		expect(config.default.title).toBe("Ask My Digital Proxy");
	});
});

describe("restoreConversationUI", () => {
	it("rebuilds stored chat messages", async () => {
		const stored = {
			timestamp: Date.now(),
			messages: [
				{ role: "user", content: "Hi" },
				{ role: "assistant", content: "Hello" },
			],
		};
		sessionStorage.setItem("cv-chat-conversation", JSON.stringify(stored));

		vi.resetModules();
		const chat = await import("../src/chat");
		chat.restoreConversationUI();

		const messages = document.querySelectorAll(".chat-message");
		expect(messages).toHaveLength(2);
		expect(messages[0].textContent).toBe("Hi");
		expect(messages[1].textContent).toBe("Hello");
	});
});

describe("openChat", () => {
	it("opens the modal and injects the disclaimer", async () => {
		vi.resetModules();
		const chat = await import("../src/chat");
		chat.openChat();

		const modal = document.getElementById("chat-modal");
		expect(modal?.classList.contains("active")).toBe(true);
		expect(document.body.classList.contains("modal-open")).toBe(true);

		const disclaimer = document.querySelector("[data-llm-disclaimer]");
		expect(disclaimer).not.toBeNull();
	});
});

describe("setupChatHandlers", () => {
	it("closes the modal from close button and overlay", async () => {
		const modal = document.getElementById("chat-modal");
		modal?.classList.add("active");
		document.body.classList.add("modal-open");

		vi.resetModules();
		const chat = await import("../src/chat");
		chat.setupChatHandlers();

		const closeButton = document.querySelector(".chat-close") as HTMLElement;
		closeButton.click();
		expect(modal?.classList.contains("active")).toBe(false);
		expect(document.body.classList.contains("modal-open")).toBe(false);

		modal?.classList.add("active");
		document.body.classList.add("modal-open");
		const overlay = document.querySelector(
			".chat-modal-overlay",
		) as HTMLElement;
		overlay.click();
		expect(modal?.classList.contains("active")).toBe(false);
	});
});

describe("initializeChatWithDefault", () => {
	it("renders default message and sample questions", async () => {
		vi.useFakeTimers();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(makeConfig()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.resetModules();
		const chat = await import("../src/chat");
		const promise = chat.initializeChatWithDefault();
		await vi.runAllTimersAsync();
		await promise;

		const title = document.getElementById("chat-title");
		expect(title?.textContent).toBe("Default Title");
		const messages = document.querySelectorAll(".chat-message");
		expect(messages.length).toBeGreaterThan(0);
		const samples = document.querySelectorAll(".sample-question");
		expect(samples).toHaveLength(2);
	});
});

describe("openChatWithMoreInfo", () => {
	it("opens the topic and renders its content", async () => {
		vi.useFakeTimers();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(makeConfig()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.resetModules();
		const chat = await import("../src/chat");
		const promise = chat.openChatWithMoreInfo("about", null, null);
		await vi.runAllTimersAsync();
		await promise;

		const title = document.getElementById("chat-title");
		expect(title?.textContent).toBe("About");
		const messages = document.querySelectorAll(".chat-message");
		expect(messages.length).toBeGreaterThan(0);
	});
});

describe("setupMoreInfoButtons", () => {
	it("routes click to openChatWithMoreInfo", async () => {
		vi.useFakeTimers();
		const button = document.createElement("button");
		button.className = "more-info-btn";
		button.setAttribute("data-section", "skills");
		button.setAttribute("data-skill-id", "typescript");
		document.body.appendChild(button);

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(makeConfig()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.resetModules();
		const chat = await import("../src/chat");

		chat.setupMoreInfoButtons();
		button.click();
		await vi.runAllTimersAsync();
		await flushPromises();

		const title = document.getElementById("chat-title");
		expect(title?.textContent).toBe("TypeScript");
	});
});

describe("setupChatScrollIndicator", () => {
	it("adds a scroll indicator and toggles visibility", async () => {
		const messages = document.getElementById("chat-messages") as HTMLElement;
		const content = document.querySelector(
			".chat-modal-content",
		) as HTMLElement;

		Object.defineProperty(messages, "scrollHeight", {
			value: 200,
			configurable: true,
		});
		Object.defineProperty(messages, "clientHeight", {
			value: 100,
			configurable: true,
		});
		Object.defineProperty(messages, "scrollTop", {
			value: 0,
			writable: true,
			configurable: true,
		});

		vi.resetModules();
		const chat = await import("../src/chat");
		chat.setupChatScrollIndicator();

		const indicator = content.querySelector(
			".chat-scroll-indicator",
		) as HTMLElement;
		expect(indicator).toBeTruthy();

		messages.scrollTop = 0;
		messages.dispatchEvent(new Event("scroll"));
		expect(indicator.classList.contains("visible")).toBe(true);

		messages.scrollTop = 120;
		messages.dispatchEvent(new Event("scroll"));
		expect(indicator.classList.contains("visible")).toBe(false);
	});
});

describe("setupChatToggleButton", () => {
	it("opens the chat and initializes default on click", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(makeConfig()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.resetModules();
		const chat = await import("../src/chat");

		chat.setupChatToggleButton();
		const btn = document.getElementById("chat-toggle-btn") as HTMLElement;
		btn.click();
		await flushPromises();

		const modal = document.getElementById("chat-modal");
		expect(modal?.classList.contains("active")).toBe(true);
	});
});

describe("sendMessage", () => {
	it("sends a message, streams a response, and saves history", async () => {
		vi.useFakeTimers();
		window.CV_CHAT_API = "https://example.com";
		const input = document.getElementById("chat-input") as HTMLInputElement;
		input.value = "Hello";

		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("Hi there"));
				controller.close();
			},
		});

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(stream, { status: 200 }),
		);

		vi.resetModules();
		const chat = await import("../src/chat");
		const sendPromise = chat.sendMessage();
		await vi.runAllTimersAsync();
		await sendPromise;

		const messages = document.querySelectorAll(".chat-message");
		expect(messages.length).toBeGreaterThanOrEqual(2);

		const stored = sessionStorage.getItem("cv-chat-conversation");
		expect(stored).toBeTruthy();
		const parsed = stored ? JSON.parse(stored) : null;
		expect(parsed.messages[0].role).toBe("user");
		expect(parsed.messages[1].role).toBe("assistant");
	});

	it("handles rate limiting with a friendly message", async () => {
		vi.useFakeTimers();
		window.CV_CHAT_API = "https://example.com";
		const input = document.getElementById("chat-input") as HTMLInputElement;
		input.value = "Hello";

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("", { status: 429 }),
		);

		vi.resetModules();
		const chat = await import("../src/chat");
		const sendPromise = chat.sendMessage();
		await vi.runAllTimersAsync();
		await sendPromise;

		const messages = document.querySelectorAll(".chat-message");
		expect(messages.length).toBeGreaterThanOrEqual(2);
		const stored = sessionStorage.getItem("cv-chat-conversation");
		expect(stored).toContain("assistant");
	});
});
