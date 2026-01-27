import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	setupActionButtons: vi.fn(),
	loadChatConfig: vi.fn(),
	restoreConversationUI: vi.fn(),
	sendMessage: vi.fn(),
	setupChatHandlers: vi.fn(),
	setupChatScrollIndicator: vi.fn(),
	setupChatToggleButton: vi.fn(),
	setupMoreInfoButtons: vi.fn(),
	setupScrollDetection: vi.fn(),
	setupFitModal: vi.fn(),
	setupExperienceToggles: vi.fn(),
	setupProjectToggles: vi.fn(),
}));

vi.mock("../src/actions", () => ({
	setupActionButtons: mocks.setupActionButtons,
}));

vi.mock("../src/chat", () => ({
	loadChatConfig: mocks.loadChatConfig,
	restoreConversationUI: mocks.restoreConversationUI,
	sendMessage: mocks.sendMessage,
	setupChatHandlers: mocks.setupChatHandlers,
	setupChatScrollIndicator: mocks.setupChatScrollIndicator,
	setupChatToggleButton: mocks.setupChatToggleButton,
	setupMoreInfoButtons: mocks.setupMoreInfoButtons,
	setupScrollDetection: mocks.setupScrollDetection,
}));

vi.mock("../src/fit", () => ({
	setupFitModal: mocks.setupFitModal,
}));

vi.mock("../src/toggles", () => ({
	setupExperienceToggles: mocks.setupExperienceToggles,
	setupProjectToggles: mocks.setupProjectToggles,
}));

beforeEach(() => {
	document.body.innerHTML = `<input id="chat-input" />`;
	mocks.loadChatConfig.mockResolvedValue({});
	mocks.sendMessage.mockClear();
});

describe("index bootstrap", () => {
	it("initializes chat wiring on DOMContentLoaded", async () => {
		vi.resetModules();
		let domReadyHandler: ((event: Event) => void) | null = null;
		const addListenerSpy = vi
			.spyOn(document, "addEventListener")
			.mockImplementation((type, listener) => {
				if (type === "DOMContentLoaded" && typeof listener === "function") {
					domReadyHandler = listener as (event: Event) => void;
				}
			});

		await import("../src/index");
		expect(domReadyHandler).not.toBeNull();

		if (domReadyHandler) {
			await domReadyHandler(new Event("DOMContentLoaded"));
		}

		expect(mocks.loadChatConfig).toHaveBeenCalledTimes(1);
		expect(mocks.restoreConversationUI).toHaveBeenCalledTimes(1);
		expect(mocks.setupScrollDetection).toHaveBeenCalledTimes(1);
		expect(mocks.setupExperienceToggles).toHaveBeenCalledTimes(1);
		expect(mocks.setupProjectToggles).toHaveBeenCalledTimes(1);
		expect(mocks.setupChatHandlers).toHaveBeenCalledTimes(1);
		expect(mocks.setupMoreInfoButtons).toHaveBeenCalledTimes(1);
		expect(mocks.setupChatScrollIndicator).toHaveBeenCalledTimes(1);
		expect(mocks.setupActionButtons).toHaveBeenCalledTimes(1);
		expect(mocks.setupFitModal).toHaveBeenCalledTimes(1);
		expect(mocks.setupChatToggleButton).toHaveBeenCalledTimes(1);
		addListenerSpy.mockRestore();
	});

	it("sends message on Enter key", async () => {
		vi.resetModules();
		let domReadyHandler: ((event: Event) => void) | null = null;
		const addListenerSpy = vi
			.spyOn(document, "addEventListener")
			.mockImplementation((type, listener) => {
				if (type === "DOMContentLoaded" && typeof listener === "function") {
					domReadyHandler = listener as (event: Event) => void;
				}
			});

		await import("../src/index");
		if (domReadyHandler) {
			await domReadyHandler(new Event("DOMContentLoaded"));
		}

		const input = document.getElementById("chat-input") as HTMLInputElement;
		input.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter" }));

		expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
		addListenerSpy.mockRestore();
	});
});
