function toggleExperience(index) {
    const details = document.getElementById(`exp-details-${index}`);
    const header = details?.previousElementSibling;
    const toggle = header?.querySelector('.exp-toggle');

    if (!details || !toggle) return;

    const allDetails = document.querySelectorAll('.exp-details');
    const allToggles = document.querySelectorAll('.exp-toggle');
    const isCurrentlyExpanded = details.classList.contains('expanded');

    allDetails.forEach((panel) => {
        panel.classList.remove('expanded');
        panel.setAttribute('aria-hidden', 'true');
    });

    allToggles.forEach((button) => {
        button.classList.remove('expanded');
        button.setAttribute('aria-expanded', 'false');
    });

    if (!isCurrentlyExpanded) {
        details.classList.add('expanded');
        details.setAttribute('aria-hidden', 'false');
        toggle.classList.add('expanded');
        toggle.setAttribute('aria-expanded', 'true');
    }
}

function toggleProject(index) {
    const details = document.getElementById(`project-details-${index}`);
    const header = details?.previousElementSibling;
    const toggle = header?.querySelector('.project-toggle');

    if (!details || !toggle) return;

    const allDetails = document.querySelectorAll('.project-details');
    const allToggles = document.querySelectorAll('.project-toggle');
    const isCurrentlyExpanded = details.classList.contains('expanded');

    allDetails.forEach((panel) => {
        panel.classList.remove('expanded');
        panel.setAttribute('aria-hidden', 'true');
    });

    allToggles.forEach((button) => {
        button.classList.remove('expanded');
        button.setAttribute('aria-expanded', 'false');
    });

    if (!isCurrentlyExpanded) {
        details.classList.add('expanded');
        details.setAttribute('aria-hidden', 'false');
        toggle.classList.add('expanded');
        toggle.setAttribute('aria-expanded', 'true');
    }
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

function setupExperienceToggles() {
    const headers = document.querySelectorAll('.exp-header');
    headers.forEach((header) => {
        header.addEventListener('click', (event) => {            
            const index = header.getAttribute('data-exp-index');
            if (index !== null) {
                toggleExperience(index);
            }            
        });
    });
}

function setupProjectToggles() {
    const projects = document.querySelectorAll('.project-item');
    projects.forEach((project) => {
        project.addEventListener('click', (event) => {
            if (event.target.closest('.project-toggle')) {
                const index = project.getAttribute('data-project-index');
                if (index !== null) {
                    toggleProject(index);
                }
            }
        });
    });
}

function setupChatHandlers() {
    const openButton = document.querySelector('.chat-toggle');
    const closeButton = document.querySelector('.chat-close');
    const overlay = document.querySelector('.chat-modal-overlay');
    const sendButton = document.querySelector('.chat-send');

    if (openButton) {
        openButton.addEventListener('click', toggleChat);
    }

    if (closeButton) {
        closeButton.addEventListener('click', toggleChat);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleChat);
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
}

function setupSampleQuestions() {
    const questions = document.querySelectorAll('.sample-question');
    questions.forEach((question) => {
        question.addEventListener('click', () => {
            askSampleQuestion(question.textContent.trim());
        });
    });
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

    setupExperienceToggles();
    setupProjectToggles();
    setupChatHandlers();
    setupSampleQuestions();
});
