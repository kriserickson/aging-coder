// Chat configuration loaded from chat-config.json
let chatConfig = null;
let currentTopic = null;
let chatInitialized = false;

// Conversation history management
const CONVERSATION_STORAGE_KEY = 'cv-chat-conversation';
const CONVERSATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Track which topics have been opened in this session (to avoid re-adding messages)
const openedTopics = new Set();

function getConversationHistory() {
    try {
        const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
        if (!stored) return [];

        const data = JSON.parse(stored);
        const now = Date.now();

        // Check if expired
        if (data.timestamp && (now - data.timestamp) > CONVERSATION_EXPIRY_MS) {
            localStorage.removeItem(CONVERSATION_STORAGE_KEY);
            return [];
        }

        return data.messages || [];
    } catch (err) {
        console.warn('Error reading conversation history:', err);
        return [];
    }
}

function saveConversationHistory(messages) {
    try {
        const data = {
            timestamp: Date.now(),
            messages: messages
        };
        localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('Error saving conversation history:', err);
    }
}

function addToConversationHistory(role, content) {
    const history = getConversationHistory();
    history.push({ role, content });
    saveConversationHistory(history);
    return history;
}

function getTopicKey(section, index, skillId) {
    if (section === 'about') return 'about';
    if (section === 'default') return 'default';
    if (section === 'skills' && skillId) return `skills:${skillId}`;
    if (section && index !== null && index !== undefined) return `${section}:${index}`;
    if (section) return section;
    return 'default';
}

function restoreConversationUI() {
    const history = getConversationHistory();
    if (history.length === 0) return;

    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    // Clear existing messages
    messagesContainer.innerHTML = '';

    // Restore each message
    for (const msg of history) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${msg.role === 'user' ? 'user' : 'bot'}`;
        messageEl.textContent = msg.content;
        messagesContainer.appendChild(messageEl);
    }

    // Mark chat as initialized since we have history
    chatInitialized = true;
    // Mark default topic as opened
    openedTopics.add('default');
}

// Load chat configuration
async function loadChatConfig() {
    if (chatConfig) return chatConfig;

    try {
        const res = await fetch('/cv/chat-config.json');
        if (res.ok) {
            chatConfig = await res.json();
            console.log('Chat config loaded successfully');
        } else {
            console.error('Failed to load chat-config.json:', res.status);
            chatConfig = createFallbackConfig();
        }
    } catch (err) {
        console.error('Error loading chat-config.json:', err);
        chatConfig = createFallbackConfig();
    }
    return chatConfig;
}

function createFallbackConfig() {
    return {
        default: {
            title: 'Ask My Digital Proxy',
            message: 'Hi! I\'m here to answer questions about Kris\'s background.',
            questions: ['What are Kris\'s key skills?', 'Tell me about Kris\'s experience']
        },
        topics: {}
    };
}

// Get topic config from chat-config.json
function getTopicConfig(section, index, skillId) {
    if (!chatConfig || !chatConfig.topics) {
        console.warn('getTopicConfig: No chatConfig or topics available');
        return null;
    }

    const topics = chatConfig.topics;

    // About section
    if (section === 'about') {
        const config = topics.about;
        if (config) {
            console.log('Found about config');
            return config;
        }
        return null;
    }

    // Skills - lookup by skillId
    if (section === 'skills' && skillId) {
        const config = topics.skills?.[skillId];
        if (config) {
            console.log('Found skill config for:', skillId);
            return config;
        }
        console.warn('No skill config found for:', skillId);
        return null;
    }

    // Summary - no index needed
    if (section === 'summary') {
        const config = topics.summary;
        if (config) {
            console.log('Found summary config');
            return config;
        }
        console.warn('No summary config found');
        return null;
    }

    // Experience, projects, education - lookup by string index
    if (section && topics[section]) {
        if (index !== undefined && index !== null) {
            const key = String(index);
            const config = topics[section][key];
            if (config) {
                console.log('Found config for:', section, 'key:', key);
                return config;
            }
            console.warn('No config found for:', section, 'key:', key);
        }
    }

    console.warn('getTopicConfig: No match for', { section, index, skillId });
    return null;
}

// ===========================================
// Scroll detection for chat toggle visibility
// ===========================================

function setupScrollDetection() {
    const chatToggle = document.getElementById('chat-toggle-btn');
    if (!chatToggle) return;

    const scrollThreshold = 300;

    function checkScroll() {
        if (window.scrollY > scrollThreshold) {
            chatToggle.classList.add('visible');
        } else {
            chatToggle.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll(); // Initial check
}

// ===========================================
// Experience and Project Toggles
// ===========================================

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

// ===========================================
// Chat Modal Functions
// ===========================================

function openChat() {
    const modal = document.getElementById('chat-modal');
    if (!modal.classList.contains('active')) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

function closeChat() {
    const modal = document.getElementById('chat-modal');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}

function toggleChat() {
    const modal = document.getElementById('chat-modal');
    if (modal.classList.contains('active')) {
        closeChat();
    } else {
        openChat();
    }
}

function askSampleQuestion(question) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = question;
        input.focus();
    }
}

function setupChatHandlers() {
    const closeButton = document.querySelector('.chat-close');
    const overlay = document.querySelector('.chat-modal-overlay');
    const sendButton = document.querySelector('.chat-send');

    if (closeButton) {
        closeButton.addEventListener('click', closeChat);
    }

    if (overlay) {
        overlay.addEventListener('click', closeChat);
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
}

function updateChatTitle(title) {
    const titleEl = document.getElementById('chat-title');
    if (titleEl) {
        titleEl.textContent = title;
    }
}

function renderSampleQuestions(questions) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }

    const existing = messagesContainer.querySelector('.chat-sample-questions');
    if (existing) {
        existing.remove();
    }

    if (!questions || questions.length === 0) {
        return;
    }

    const container = document.createElement('div');
    container.className = 'chat-sample-questions';

    questions.forEach((q) => {
        const btn = document.createElement('button');
        btn.className = 'sample-question';
        btn.type = 'button';
        btn.textContent = q;
        btn.addEventListener('click', () => askSampleQuestion(q));
        container.appendChild(btn);
    });

    messagesContainer.appendChild(container);
    scrollChatToBottom();
}

async function streamTextWordByWord(element, text, delayMs = 30) {
    const words = text.split(' ');
    element.textContent = '';

    for (let i = 0; i < words.length; i++) {
        const word = i === 0 ? words[i] : ' ' + words[i];
        element.textContent += word;
        scrollChatToBottom();
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

function showTypingIndicator() {
    const messages = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.className = 'chat-message bot typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    messages.appendChild(indicator);
    scrollChatToBottom();
    return indicator;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

async function addBotMessage(text) {
    const messages = document.getElementById('chat-messages');

    const existingQuestions = messages.querySelector('.chat-sample-questions');
    if (existingQuestions) {
        existingQuestions.remove();
    }

    const botMessage = document.createElement('div');
    botMessage.className = 'chat-message bot';
    messages.appendChild(botMessage);

    await streamTextWordByWord(botMessage, text);
    scrollChatToBottom();
    return botMessage;
}

async function initializeChatWithDefault() {
    await loadChatConfig();
    if (!chatConfig) return;

    const topicKey = 'default';
    const defaultConfig = chatConfig.default;

    // Always update title
    updateChatTitle(defaultConfig.title);

    // Only add message and questions if this topic hasn't been opened before
    if (!openedTopics.has(topicKey)) {
        openedTopics.add(topicKey);
        chatInitialized = true;
        await addBotMessage(defaultConfig.message);
        renderSampleQuestions(defaultConfig.questions);
    } else {
        // Topic was already opened, just show existing questions at bottom
        renderSampleQuestions(defaultConfig.questions);
    }
}

async function openChatWithMoreInfo(section, index, skillId) {
    console.log('openChatWithMoreInfo:', { section, index, skillId });

    await loadChatConfig();

    if (!chatConfig) {
        console.error('Chat config not loaded');
        openChat();
        return;
    }

    const topicConfig = getTopicConfig(section, index, skillId);
    const topicKey = getTopicKey(section, index, skillId);

    openChat();

    if (!topicConfig) {
        console.warn('No topic config found, falling back to default');
        await initializeChatWithDefault();
        return;
    }

    currentTopic = { section, index, skillId };

    // Always update title
    updateChatTitle(topicConfig.title);

    // Only add message and questions if this topic hasn't been opened before
    if (!openedTopics.has(topicKey)) {
        openedTopics.add(topicKey);
        chatInitialized = true;
        await addBotMessage(topicConfig.message);
        renderSampleQuestions(topicConfig.questions);
    } else {
        // Topic was already opened, just show existing questions at bottom
        renderSampleQuestions(topicConfig.questions);
    }
}

function setupMoreInfoButtons() {
    const buttons = document.querySelectorAll('.more-info-btn');

    buttons.forEach((btn) => {
        const section = btn.getAttribute('data-section');
        const indexAttr = btn.getAttribute('data-index');
        const skillId = btn.getAttribute('data-skill-id');

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            let parsedIndex = null;
            if (indexAttr !== null && indexAttr !== '') {
                parsedIndex = parseInt(indexAttr, 10);
            }

            if (section === 'skills' && skillId) {
                await openChatWithMoreInfo(section, null, skillId);
            } else if (parsedIndex !== null) {
                await openChatWithMoreInfo(section, parsedIndex, null);
            } else {
                await openChatWithMoreInfo(section, null, null);
            }
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
    const messagesContainer = document.getElementById('chat-messages');
    const message = input.value.trim();

    if (!message) return;

    const endpoint = window.CV_CHAT_ENDPOINT;
    if (!endpoint) {
        console.error('Missing CV_CHAT_ENDPOINT.');
        return;
    }

    const existingQuestions = messagesContainer.querySelector('.chat-sample-questions');
    if (existingQuestions) {
        existingQuestions.remove();
    }

    // Add user message to UI
    const userMessageEl = document.createElement('div');
    userMessageEl.className = 'chat-message user';
    userMessageEl.textContent = message;
    messagesContainer.appendChild(userMessageEl);

    // Add to conversation history
    addToConversationHistory('user', message);

    scrollChatToBottom();
    input.value = '';

    showTypingIndicator();

    try {
        // Get full conversation history for API
        const conversationHistory = getConversationHistory();

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory })
        });

        if (!response.ok) {
            throw new Error(`Chat request failed: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Streaming is not supported in this browser.');
        }

        hideTypingIndicator();

        const botMessageEl = document.createElement('div');
        botMessageEl.className = 'chat-message bot';
        botMessageEl.textContent = '';
        messagesContainer.appendChild(botMessageEl);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = '';
        let displayedWords = 0;
        let fullResponse = '';

        const processBuffer = async () => {
            const words = buffer.split(' ');
            const completeWords = words.slice(0, -1);
            buffer = words[words.length - 1] || '';

            for (const word of completeWords) {
                if (displayedWords > 0) {
                    botMessageEl.textContent += ' ';
                    fullResponse += ' ';
                }
                botMessageEl.textContent += word;
                fullResponse += word;
                displayedWords++;
                scrollChatToBottom();
                await new Promise(resolve => setTimeout(resolve, 25));
            }
        };

        while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
                buffer += decoder.decode(result.value, { stream: true });
                await processBuffer();
            }
        }

        if (buffer) {
            if (displayedWords > 0) {
                botMessageEl.textContent += ' ';
                fullResponse += ' ';
            }
            botMessageEl.textContent += buffer;
            fullResponse += buffer;
            scrollChatToBottom();
        }

        // Save assistant response to conversation history
        addToConversationHistory('assistant', fullResponse);

    } catch (error) {
        hideTypingIndicator();

        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message bot';
        errorMessage.textContent = 'Sorry, I encountered an error. Please try again.';
        messagesContainer.appendChild(errorMessage);

        scrollChatToBottom();
        console.error('Chat error:', error);
    }
}

// ===========================================
// Action Buttons (Header)
// ===========================================

function setupActionButtons() {
    const digitalAssistantBtn = document.getElementById('btn-digital-assistant');
    const fitAssessmentBtn = document.getElementById('btn-fit-assessment');
    const aboutCvBtn = document.getElementById('btn-about-cv');

    if (digitalAssistantBtn) {
        digitalAssistantBtn.addEventListener('click', async () => {
            openChat();
            await initializeChatWithDefault();
        });
    }

    if (fitAssessmentBtn) {
        fitAssessmentBtn.addEventListener('click', () => {
            openFitModal();
        });
    }

    if (aboutCvBtn) {
        aboutCvBtn.addEventListener('click', async () => {
            await openChatWithMoreInfo('about', null, null);
        });
    }
}

// ===========================================
// Fit Assessment Modal
// ===========================================

function openFitModal() {
    const modal = document.getElementById('fit-modal');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    resetFitModal();
}

function closeFitModal() {
    const modal = document.getElementById('fit-modal');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}

function resetFitModal() {
    document.getElementById('fit-input-section').style.display = 'block';
    document.getElementById('fit-loading').style.display = 'none';
    document.getElementById('fit-results').style.display = 'none';
    document.getElementById('fit-job-text').value = '';
    document.getElementById('fit-job-url').value = '';
}

function setupFitModal() {
    const closeBtn = document.querySelector('.fit-close');
    const overlay = document.querySelector('.fit-modal-overlay');
    const submitBtn = document.getElementById('fit-submit');
    const tabs = document.querySelectorAll('.fit-tab');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeFitModal);
    }

    if (overlay) {
        overlay.addEventListener('click', closeFitModal);
    }

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.fit-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', submitFitAssessment);
    }
}

async function submitFitAssessment() {
    const activeTab = document.querySelector('.fit-tab.active').getAttribute('data-tab');
    let jobInput = '';

    if (activeTab === 'paste') {
        jobInput = document.getElementById('fit-job-text').value.trim();
    } else {
        jobInput = document.getElementById('fit-job-url').value.trim();
    }

    if (!jobInput) {
        alert('Please enter a job description or URL.');
        return;
    }

    const endpoint = window.CV_FIT_ENDPOINT;
    if (!endpoint) {
        alert('Fit assessment endpoint not configured.');
        return;
    }

    // Show loading
    document.getElementById('fit-input-section').style.display = 'none';
    document.getElementById('fit-loading').style.display = 'block';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: activeTab,
                input: jobInput
            })
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        const result = await response.json();
        renderFitResults(result, jobInput);

    } catch (error) {
        console.error('Fit assessment error:', error);
        document.getElementById('fit-loading').style.display = 'none';
        document.getElementById('fit-input-section').style.display = 'block';
        alert('Failed to analyze job fit. Please try again.');
    }
}

function renderFitResults(result, jobInput) {
    document.getElementById('fit-loading').style.display = 'none';

    const resultsContainer = document.getElementById('fit-results');
    resultsContainer.style.display = 'block';

    const isStrongFit = result.verdict === 'strong';
    const verdictClass = isStrongFit ? 'strong-fit' : 'weak-fit';
    const verdictTitle = isStrongFit ? 'Strong Fit — Let\'s Talk' : 'Honest Assessment — Probably Not Your Person';
    const verdictSubtext = isStrongFit
        ? 'Your requirements align well with my experience. Here\'s the specific evidence:'
        : 'I want to be direct with you. Here\'s why this might not be the right fit:';

    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
    const warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;

    // Build job preview snippet
    const jobSnippet = jobInput.length > 200 ? jobInput.substring(0, 200) + '...' : jobInput;
    const jobTitle = result.jobTitle || 'Job Position';

    let html = `
        <div class="fit-job-preview">
            <div class="fit-job-preview-header">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Job description to analyze
            </div>
            <div class="fit-job-title">${escapeHtml(jobTitle)}</div>
            <div class="fit-job-snippet">${escapeHtml(jobSnippet)}</div>
        </div>

        <div class="fit-verdict ${verdictClass}">
            <div class="fit-verdict-icon">
                ${isStrongFit ? checkIcon : warningIcon}
            </div>
            <div class="fit-verdict-content">
                <h4>${verdictTitle}</h4>
                <p>${verdictSubtext}</p>
            </div>
        </div>
    `;

    // Matches section
    if (result.matches && result.matches.length > 0) {
        html += `<div class="fit-section-header">${isStrongFit ? 'Where I Match' : 'What Does Transfer'}</div>`;
        result.matches.forEach(match => {
            html += `
                <div class="fit-card ${isStrongFit ? 'match' : 'transfer'}">
                    <div class="fit-card-header">
                        <span class="fit-card-icon">${isStrongFit ? '✓' : '○'}</span>
                        <span class="fit-card-title">${escapeHtml(match.title)}</span>
                    </div>
                    <p class="fit-card-description">${escapeHtml(match.description)}</p>
                </div>
            `;
        });
    }

    // Gaps section
    if (result.gaps && result.gaps.length > 0) {
        html += `<div class="fit-section-header">${isStrongFit ? 'Gaps to Note' : 'Where I Don\'t Fit'}</div>`;
        result.gaps.forEach(gap => {
            html += `
                <div class="fit-card gap">
                    <div class="fit-card-header">
                        <span class="fit-card-icon">${isStrongFit ? '○' : '✗'}</span>
                        <span class="fit-card-title">${escapeHtml(gap.title)}</span>
                    </div>
                    <p class="fit-card-description">${escapeHtml(gap.description)}</p>
                </div>
            `;
        });
    }

    // Recommendation
    if (result.recommendation) {
        html += `
            <div class="fit-recommendation">
                <div class="fit-recommendation-header">My Recommendation</div>
                <p>${escapeHtml(result.recommendation)}</p>
            </div>
        `;
    }

    // New assessment button
    html += `<button type="button" class="fit-new-assessment" onclick="resetFitModal()">Analyze Another Job</button>`;

    resultsContainer.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===========================================
// Main Chat Toggle Button
// ===========================================

function setupChatToggleButton() {
    const openButton = document.getElementById('chat-toggle-btn');
    if (openButton) {
        openButton.addEventListener('click', async (e) => {
            e.preventDefault();

            const modal = document.getElementById('chat-modal');
            const isCurrentlyOpen = modal.classList.contains('active');

            if (isCurrentlyOpen) {
                closeChat();
            } else {
                openChat();
                await initializeChatWithDefault();
            }
        });
    }
}

// ===========================================
// Initialization
// ===========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('CV Chat initializing...');

    const input = document.getElementById('chat-input');
    if (input) {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Load chat config early
    await loadChatConfig();

    // Restore conversation from localStorage if any
    restoreConversationUI();

    // Setup all handlers
    setupScrollDetection();
    setupExperienceToggles();
    setupProjectToggles();
    setupChatHandlers();
    setupMoreInfoButtons();
    setupActionButtons();
    setupFitModal();
    setupChatToggleButton();

    console.log('CV Chat initialized');
});
