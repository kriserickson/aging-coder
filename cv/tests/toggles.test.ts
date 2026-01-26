import { describe, expect, it, beforeEach } from "vitest";
import { setupExperienceToggles, setupProjectToggles } from "../src/toggles";

beforeEach(() => {
	document.body.innerHTML = `
    <div class="exp-header" data-exp-index="0">
      <button class="exp-toggle" aria-expanded="false"></button>
    </div>
    <div id="exp-details-0" class="exp-details" aria-hidden="true"></div>
    <div class="exp-header" data-exp-index="1">
      <button class="exp-toggle" aria-expanded="false"></button>
    </div>
    <div id="exp-details-1" class="exp-details" aria-hidden="true"></div>

    <div class="project-item" data-project-index="0">
      <button class="project-toggle" aria-expanded="false">Toggle</button>
    </div>
    <div id="project-details-0" class="project-details" aria-hidden="true"></div>
  `;
});

describe("setupExperienceToggles", () => {
	it("expands the selected experience and collapses others", () => {
		setupExperienceToggles();
		const header = document.querySelector(
			".exp-header[data-exp-index='0']",
		) as HTMLElement;
		const details = document.getElementById("exp-details-0");
		const toggle = header.querySelector(".exp-toggle") as HTMLElement;

		header.click();

		expect(details?.classList.contains("expanded")).toBe(true);
		expect(details?.getAttribute("aria-hidden")).toBe("false");
		expect(toggle.classList.contains("expanded")).toBe(true);
		expect(toggle.getAttribute("aria-expanded")).toBe("true");

		// Clicking again should collapse it
		header.click();
		expect(details?.classList.contains("expanded")).toBe(false);
		expect(details?.getAttribute("aria-hidden")).toBe("true");
		expect(toggle.classList.contains("expanded")).toBe(false);
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
	});
});

describe("setupProjectToggles", () => {
	it("toggles project details only when clicking the toggle", () => {
		setupProjectToggles();
		const project = document.querySelector(
			".project-item[data-project-index='0']",
		) as HTMLElement;
		const toggle = project.querySelector(".project-toggle") as HTMLElement;
		const details = document.getElementById("project-details-0");

		// Clicking the project without the toggle should do nothing
		project.click();
		expect(details?.classList.contains("expanded")).toBe(false);

		// Clicking the toggle should expand
		toggle.click();
		expect(details?.classList.contains("expanded")).toBe(true);
		expect(details?.getAttribute("aria-hidden")).toBe("false");
	});
});
