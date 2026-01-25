import {
	initializeChatWithDefault,
	openChat,
	openChatWithMoreInfo,
} from "./chat";
import { openFitModal } from "./fit";

export function setupActionButtons() {
	const digitalAssistantBtn = document.getElementById("btn-digital-assistant");
	const fitAssessmentBtn = document.getElementById("btn-fit-assessment");
	const aboutCvBtn = document.getElementById("btn-about-cv");

	if (digitalAssistantBtn) {
		digitalAssistantBtn.addEventListener("click", async () => {
			openChat();
			await initializeChatWithDefault();
		});
	}

	if (fitAssessmentBtn) {
		fitAssessmentBtn.addEventListener("click", () => {
			openFitModal();
		});
	}

	if (aboutCvBtn) {
		aboutCvBtn.addEventListener("click", async () => {
			await openChatWithMoreInfo("about", null, null);
		});
	}
}
