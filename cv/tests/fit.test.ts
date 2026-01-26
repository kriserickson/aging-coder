import { describe, expect, it, beforeEach, vi } from "vitest";
import { openFitModal, resetFitModal, setupFitModal } from "../src/fit";

const flushPromises = async () => {
	for (let i = 0; i < 6; i += 1) {
		await Promise.resolve();
	}
	await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
	document.body.innerHTML = `
    <div id="fit-modal" class="fit-modal">
      <button class="fit-close">Close</button>
      <div class="fit-modal-overlay"></div>
      <div class="fit-tab active" data-tab="paste"></div>
      <div class="fit-tab" data-tab="url"></div>
      <div id="tab-paste" class="fit-tab-content active"></div>
      <div id="tab-url" class="fit-tab-content"></div>
    </div>
    <div id="fit-input-section"></div>
    <div id="fit-loading" style="display:none"></div>
    <div id="fit-results" style="display:none"></div>
    <textarea id="fit-job-text"></textarea>
    <input id="fit-job-url" />
    <button id="fit-submit"></button>
    <div id="fit-error" style="display:none"></div>
  `;
	window.CV_CHAT_API = "https://example.com";
	vi.restoreAllMocks();
});

describe("fit modal", () => {
	it("openFitModal activates the modal and resets inputs", () => {
		const modal = document.getElementById("fit-modal");
		const textArea = document.getElementById(
			"fit-job-text",
		) as HTMLTextAreaElement;
		textArea.value = "old";

		openFitModal();
		expect(modal?.classList.contains("active")).toBe(true);
		expect(document.body.classList.contains("modal-open")).toBe(true);
		expect(textArea.value).toBe("");
	});

	it("resetFitModal clears UI state and errors", () => {
		const textArea = document.getElementById(
			"fit-job-text",
		) as HTMLTextAreaElement;
		const urlInput = document.getElementById(
			"fit-job-url",
		) as HTMLInputElement;
		const error = document.getElementById("fit-error");
		textArea.value = "text";
		urlInput.value = "url";
		if (error) {
			error.textContent = "bad";
			error.style.display = "block";
			error.setAttribute("role", "alert");
		}

		resetFitModal();
		expect(textArea.value).toBe("");
		expect(urlInput.value).toBe("");
		expect(error?.textContent).toBe("");
		expect(error?.style.display).toBe("none");
		expect(error?.hasAttribute("role")).toBe(false);
	});

	it("setupFitModal wires tabs and exposes resetFitModal", () => {
		setupFitModal();
		const tab = document.querySelector(
			".fit-tab[data-tab='url']",
		) as HTMLElement;
		const tabPasteContent = document.getElementById("tab-paste");
		const tabUrlContent = document.getElementById("tab-url");

		tab.click();
		expect(tab.classList.contains("active")).toBe(true);
		expect(tabPasteContent?.classList.contains("active")).toBe(false);
		expect(tabUrlContent?.classList.contains("active")).toBe(true);
		expect(typeof window.resetFitModal).toBe("function");
	});

	it("shows validation error when submit is clicked without input", async () => {
		setupFitModal();
		const submit = document.getElementById("fit-submit") as HTMLButtonElement;
		submit.click();
		await flushPromises();

		const error = document.getElementById("fit-error");
		expect(error?.textContent).toContain("Please enter");
		expect(error?.getAttribute("role")).toBe("alert");
	});

	it("submits job text and renders results", async () => {
		setupFitModal();
		const textArea = document.getElementById(
			"fit-job-text",
		) as HTMLTextAreaElement;
		textArea.value = "Senior Engineer";

		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(
					JSON.stringify({
						verdict: "strong",
						jobTitle: "Senior Engineer",
						matches: [
							{ title: "Go", description: "Built services" },
						],
						recommendation: "Let's talk",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		const submit = document.getElementById("fit-submit") as HTMLButtonElement;
		submit.click();
		await flushPromises();

		const results = document.getElementById("fit-results");
		expect(results?.style.display).toBe("block");
		expect(results?.innerHTML).toContain("Strong Fit");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("renders job-posting warning when content is not a job posting", async () => {
		setupFitModal();
		const textArea = document.getElementById(
			"fit-job-text",
		) as HTMLTextAreaElement;
		textArea.value = "Not a job";

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					jobPostingJudgment: {
						isJobPosting: false,
						reason: "Missing responsibilities",
						confidence: "High",
					},
					jobPostingMessage: "Does not look like a posting",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		const submit = document.getElementById("fit-submit") as HTMLButtonElement;
		submit.click();
		await flushPromises();

		const results = document.getElementById("fit-results");
		expect(results?.innerHTML).toContain("does not look like a job posting");
		expect(results?.innerHTML).toContain("Missing responsibilities");
		expect(results?.innerHTML).toContain("Confidence: High");
	});
});
