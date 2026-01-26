import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
	openChat: vi.fn(),
	initializeChatWithDefault: vi.fn(),
	openChatWithMoreInfo: vi.fn(),
	openFitModal: vi.fn(),
}));

vi.mock("../src/chat", () => ({
	openChat: mocks.openChat,
	initializeChatWithDefault: mocks.initializeChatWithDefault,
	openChatWithMoreInfo: mocks.openChatWithMoreInfo,
}));

vi.mock("../src/fit", () => ({
	openFitModal: mocks.openFitModal,
}));

import { setupActionButtons } from "../src/actions";

beforeEach(() => {
	document.body.innerHTML = `
    <button id="btn-digital-assistant"></button>
    <button id="btn-fit-assessment"></button>
    <button id="btn-about-cv"></button>
  `;
	mocks.openChat.mockClear();
	mocks.initializeChatWithDefault.mockClear();
	mocks.openChatWithMoreInfo.mockClear();
	mocks.openFitModal.mockClear();
});

describe("setupActionButtons", () => {
	it("wires the digital assistant button", async () => {
	setupActionButtons();
	const button = document.getElementById("btn-digital-assistant");
	button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

	expect(mocks.openChat).toHaveBeenCalledTimes(1);
	expect(mocks.initializeChatWithDefault).toHaveBeenCalledTimes(1);
});

	it("wires the fit assessment button", () => {
	setupActionButtons();
	const button = document.getElementById("btn-fit-assessment");
	button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

	expect(mocks.openFitModal).toHaveBeenCalledTimes(1);
});

	it("wires the about CV button", async () => {
	setupActionButtons();
	const button = document.getElementById("btn-about-cv");
	button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

	expect(mocks.openChatWithMoreInfo).toHaveBeenCalledWith("about", null, null);
});
});
