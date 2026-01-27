import type { ChatMessage } from "../types";

/**
 * Deduplicates conversation pairs by keeping only the last occurrence of each user message
 * and its corresponding assistant response. Removes user messages without following assistant
 * messages and assistant messages without preceding user messages.
 */
export function dedupeConversationPairs(
	messages: ChatMessage[],
): ChatMessage[] {
	// First pass: pair each user message with its immediate following assistant
	// Skip user messages that have another user message before the assistant
	const userAssistantPairs: Array<{
		userContent: string;
		userIndex: number;
		assistantIndex: number;
	}> = [];
	const usedAssistants = new Set<number>();

	for (let i = 0; i < messages.length; i += 1) {
		const msg = messages[i];
		if (msg.role === "user") {
			const j = i + 1;

			// If next is another user, this is an unpaired middle user message - skip it
			if (j < messages.length && messages[j].role === "user") {
				continue;
			}

			// If next is an assistant, pair them
			if (
				j < messages.length &&
				messages[j].role === "assistant" &&
				!usedAssistants.has(j)
			) {
				userAssistantPairs.push({
					userContent: msg.content,
					userIndex: i,
					assistantIndex: j,
				});
				usedAssistants.add(j);
				continue;
			}

			// If this is the last message and it's a user (no assistant after), keep it as trailing
			if (j >= messages.length) {
				userAssistantPairs.push({
					userContent: msg.content,
					userIndex: i,
					assistantIndex: -1,
				});
			}
		}
	}

	// Second pass: track the last occurrence of each unique user content
	const lastOccurrence = new Map<
		string,
		{ userContent: string; userIndex: number; assistantIndex: number }
	>();
	for (const pair of userAssistantPairs) {
		lastOccurrence.set(pair.userContent, pair);
	}

	// Third pass: build result with only the last occurrence of each user+assistant pair
	// If assistantIndex === -1, this is a trailing user message with no assistant and should be kept
	const out: ChatMessage[] = [];
	for (const pair of userAssistantPairs) {
		const lastPair = lastOccurrence.get(pair.userContent);
		if (lastPair && lastPair.userIndex === pair.userIndex) {
			out.push(messages[pair.userIndex]);
			if (pair.assistantIndex !== -1) {
				out.push(messages[pair.assistantIndex]);
			}
		}
	}

	return out;
}
