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

    // When the chat is closed, restore the default intro text so per-item instructions don't persist
    if (!isActive) {
        const intro = document.getElementById('chat-intro');
        if (intro && window.CV_CHAT_DEFAULT_INTRO) {
            intro.textContent = window.CV_CHAT_DEFAULT_INTRO;
        }
    }
}

function askSampleQuestion(question) {
    const input = document.getElementById('chat-input');
    // Populate the input with the selected sample question but do NOT auto-send
    if (input) {
        input.value = question;
        input.focus();
    }
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

async function openChatWithMoreInfo(section, index, skillId) {
    // Ensure we have the more_info data available; fetch it if not injected
    if (!window.CV_MORE_INFO) {
        try {
            const res = await fetch('/cv/cv.json');
            if (res.ok) {
                const data = await res.json();
                window.CV_MORE_INFO = data.more_info || {};
            } else {
                window.CV_MORE_INFO = {};
            }
        } catch (err) {
            console.error('Failed to fetch /cv.json for more info', err);
            window.CV_MORE_INFO = {};
        }
    }

    const info = window.CV_MORE_INFO || {};
    let item = null;

    if (section === 'skills') {
        if (skillId && info.skills && info.skills[skillId]) {
            item = info.skills[skillId];
        } else if (info.skills && info.skills[index]) {
            item = info.skills[index];
        }
    } else if (section === 'summary') {
        // If no index provided, merge all summary entries into a single item
        if (index === undefined || index === null) {
            if (Array.isArray(info.summary)) {
                const questions = info.summary.flatMap((x) => x.more_info_questions || []);
                const answers = info.summary.flatMap((x) => x.more_info_answers || []);
                item = { more_info_questions: questions, more_info_answers: answers };
            }
        } else if (info.summary && info.summary[index]) {
            item = info.summary[index];
        }
    } else if (info[section] && info[section][index] !== undefined) {
        item = info[section][index];
    }

    if (!item) return;

    const instruction = item.instruction || ('Please provide concise answers about this ' + section + ' item and expand where useful.');
    const questions = item.more_info_questions || [];

    // Open chat modal
    const modal = document.getElementById('chat-modal');
    if (!modal.classList.contains('active')) toggleChat();

    // Do NOT prepopulate the input. Instead show instruction text and render question boxes
    const intro = document.getElementById('chat-intro');
    if (intro) {
        intro.textContent = instruction || 'Select a question below to populate the chat input. Edit it if needed, then press Send to submit.';
    }

    // Replace sample questions in the UI with clickable boxes that populate the input (but do NOT send)
    const sampleContainer = document.getElementById('sample-questions');
    if (sampleContainer) {
        sampleContainer.innerHTML = '';
        questions.forEach((q) => {
            const btn = document.createElement('button');
            btn.className = 'sample-question';
            btn.type = 'button';
            btn.textContent = q;
            btn.addEventListener('click', () => askSampleQuestion(q));
            sampleContainer.appendChild(btn);
        });
    }

    // If answers are available, show them as an initial bot message
    const answers = item.more_info_answers || [];
    if (answers.length) {
        const messages = document.getElementById('chat-messages');
        const botMessage = document.createElement('div');
        botMessage.className = 'chat-message bot';
        botMessage.textContent = answers.join('\n\n');
        messages.appendChild(botMessage);
        scrollChatToBottom();
    }
}

function setupMoreInfoButtons() {
    const buttons = document.querySelectorAll('.more-info-btn');
    buttons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const section = btn.getAttribute('data-section');
            const indexAttr = btn.getAttribute('data-index');
            const skillId = btn.getAttribute('data-skill-id');

            // If this is a skills button, prefer the skill id (if present)
            if (section === 'skills') {
                openChatWithMoreInfo(section, indexAttr !== null ? Number(indexAttr) : undefined, skillId);
            } else if (indexAttr !== null) {
                // Section with an explicit index (experience, projects, education)
                openChatWithMoreInfo(section, Number(indexAttr));
            } else {
                // Section-only button (e.g., summary). Call chat without index to use aggregated summary behavior.
                openChatWithMoreInfo(section);
            }

            e.stopPropagation();
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
    const intro = document.getElementById('chat-intro');

    // Save default intro text so it can be restored after viewing item-specific instructions
    if (intro) {
        window.CV_CHAT_DEFAULT_INTRO = intro.textContent;
    }

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
    setupMoreInfoButtons();
});
