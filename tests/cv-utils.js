/**
 * Utility functions extracted from cv.js for testing
 */

/**
 * Deduplicates conversation pairs by keeping only the last occurrence of each user message
 * and its corresponding assistant response. Removes user messages without following assistant
 * messages and assistant messages without preceding user messages.
 * 
 * @param {Array<{role: string, content: string}>} messages - Array of message objects
 * @returns {Array<{role: string, content: string}>} - Deduplicated array of messages
 */
export function dedupeConversationPairs(messages) {
    // First pass: pair each user message with its immediate following assistant
    // Skip user messages that have another user message before the assistant
    const userAssistantPairs = [];
    const usedAssistants = new Set();
    
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
            // Find the immediately next message
            let j = i + 1;
            
            // If the next message is another user, this user has no assistant
            if (j < messages.length && messages[j].role === 'user') {
                continue; // Skip this user message
            }
            
            // If next message is an assistant, pair them
            if (j < messages.length && messages[j].role === 'assistant' && !usedAssistants.has(j)) {
                userAssistantPairs.push({ 
                    userContent: msg.content, 
                    userIndex: i, 
                    assistantIndex: j 
                });
                usedAssistants.add(j);
            }
            // Otherwise, skip this user message (no assistant response)
        }
    }
    
    // Second pass: track the last occurrence of each unique user content
    const lastOccurrence = new Map();
    for (const pair of userAssistantPairs) {
        lastOccurrence.set(pair.userContent, pair);
    }
    
    // Third pass: build result with only the last occurrence of each user+assistant pair
    const out = [];
    for (const pair of userAssistantPairs) {
        const lastPair = lastOccurrence.get(pair.userContent);
        if (lastPair.userIndex === pair.userIndex) {
            out.push(messages[pair.userIndex]);
            out.push(messages[pair.assistantIndex]);
        }
    }

    return out;
}
