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
        // For now, simulate a response since we don't have the API deployed yet
        setTimeout(() => {
            messages.removeChild(loadingMessage);

            const botMessage = document.createElement('div');
            botMessage.className = 'chat-message bot';

            // Simple context-aware responses
            const lowerMessage = message.toLowerCase();
            let response = "I can tell you about Kris's experience, skills, education, projects, or how to contact him. What specific aspect would you like to know more about?";

            if (lowerMessage.includes('experience') || lowerMessage.includes('background')) {
                response = "Kris has 25+ years of experience building enterprise SaaS platforms. He's been a Director of Software Development, Team Lead/Senior Software Architect, and Senior Software Developer at Storefront.com, working with major retailers and processing millions of transactions.";
            } else if (lowerMessage.includes('skills') || lowerMessage.includes('technologies')) {
                response = "Kris's key skills include frontend development (TypeScript, React, Vue), backend systems (Node.js, Python, C#), AI/ML (PyTorch, fine-tuning LLMs), mobile development, and extensive DevOps experience with Docker and Kubernetes.";
            } else if (lowerMessage.includes('education')) {
                response = "Kris has an Honours BA in English Literature from University of Western Ontario (1993) and completed the Advanced Computer Studies and Technology Program at Langara College (1995-1998).";
            } else if (lowerMessage.includes('contact') || lowerMessage.includes('email')) {
                response = "You can reach Kris at kristian.erickson@gmail.com or 604-908-0432. He's also on GitHub (kriserickson) and LinkedIn (kristian-l-erickson).";
            } else if (lowerMessage.includes('project')) {
                response = "Key projects include the Storefront E-Commerce Platform (operational for 25+ years), Kiosk File Transfer and Payment system, and a Remote Management platform that scaled to 30,000+ devices.";
            }

            botMessage.textContent = response;
            messages.appendChild(botMessage);

            scrollChatToBottom();
        }, 1000);
    } catch (error) {
        // Remove loading indicator
        messages.removeChild(loadingMessage);

        // Add error message
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
