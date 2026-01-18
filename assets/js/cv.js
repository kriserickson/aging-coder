function toggleExperience(index) {
    const details = document.getElementById(`exp-details-${index}`);
    const toggle = document
        .querySelector(`#exp-details-${index}`)
        .previousElementSibling.querySelector('.exp-toggle');

    details.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

function toggleProject(index) {
    const details = document.getElementById(`project-details-${index}`);
    const toggle = document
        .querySelector(`#project-details-${index}`)
        .previousElementSibling.querySelector('.project-toggle');

    details.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

function toggleChat() {
    const modal = document.getElementById('chat-modal');
    const isActive = modal.classList.toggle('active');

    document.body.classList.toggle('modal-open', isActive);
}

function askSampleQuestion(question) {
    const input = document.getElementById('chat-input');
    input.value = question;
    sendMessage();
}

function scrollChatToBottom() {
    const messages = document.getElementById('chat-messages');
    if (messages) {
        messages.scrollTop = messages.scrollHeight;
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const message = input.value.trim();

    if (!message) return;

    const endpoint = window.CV_CHAT_ENDPOINT;
    if (!endpoint) {
        console.error('Missing CV_CHAT_ENDPOINT.');
        return;
    }

    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user';
    userMessage.textContent = message;
    messages.appendChild(userMessage);

    scrollChatToBottom();

    // Clear input
    input.value = '';

    // Add loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'chat-message bot';
    loadingMessage.textContent = 'Thinking...';
    messages.appendChild(loadingMessage);

    scrollChatToBottom();

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error(`Chat request failed: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Streaming is not supported in this browser.');
        }

        const botMessage = document.createElement('div');
        botMessage.className = 'chat-message bot';
        botMessage.textContent = '';
        messages.replaceChild(botMessage, loadingMessage);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
                botMessage.textContent += decoder.decode(result.value, { stream: true });
                scrollChatToBottom();
            }
        }

        scrollChatToBottom();
    } catch (error) {
        messages.removeChild(loadingMessage);

        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message bot';
        errorMessage.textContent = 'Sorry, I encountered an error. Please try again.';
        messages.appendChild(errorMessage);

        scrollChatToBottom();

        console.error('Chat error:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');

    if (input) {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }
});
