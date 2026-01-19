import type { ChatMessage } from './types';
import { dedupeConversationPairs } from './utils/dedupeConversationPairs';
import * as smd from 'streaming-markdown';

type TopicConfig = {
  title: string;
  message: string;
  questions?: string[];
};

type ChatConfig = {
  default: TopicConfig;
  topics?: Record<string, Record<string, TopicConfig> | TopicConfig>;
};

let chatConfig: ChatConfig | null = null;
let currentTopic: { section: string | null; index: number | null; skillId: string | null } | null = null;
let chatInitialized = false;

const CONVERSATION_STORAGE_KEY = 'cv-chat-conversation';
const CONVERSATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const openedTopics = new Set<string>();

function getConversationHistory(): ChatMessage[] {
  try {
    const stored = sessionStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const data = JSON.parse(stored) as { timestamp?: number; messages?: ChatMessage[] };
    const now = Date.now();

    if (data.timestamp && now - data.timestamp > CONVERSATION_EXPIRY_MS) {
      sessionStorage.removeItem(CONVERSATION_STORAGE_KEY);
      return [];
    }

    return data.messages || [];
  } catch (err) {
    console.warn('Error reading conversation history:', err);
    return [];
  }
}

function saveConversationHistory(messages: ChatMessage[]) {
  try {
    const data = {
      timestamp: Date.now(),
      messages
    };
    sessionStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Error saving conversation history:', err);
  }
}

function addToConversationHistory(role: ChatMessage['role'], content: string) {
  const history = getConversationHistory();
  history.push({ role, content });
  saveConversationHistory(history);
  return history;
}

function getTopicKey(section: string | null, index: number | null, skillId: string | null) {
  switch (section) {
    case 'about':
      return 'about';
    case 'default':
      return 'default';
    case 'skills':
      if (skillId) {
        return `skills:${skillId}`;
      }
      break;
    default:
      break;
  }

  if (section && index !== null && index !== undefined) {
    return `${section}:${index}`;
  }

  if (section) {
    return section;
  }

  return 'default';
}

export function restoreConversationUI() {
  const history = getConversationHistory();
  if (history.length === 0) {
    return;
  }

  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) {
    return;
  }

  messagesContainer.innerHTML = '';

  for (const msg of history) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${msg.role === 'user' ? 'user' : 'bot'}`;
    messageEl.textContent = msg.content;
    messagesContainer.appendChild(messageEl);
  }

  chatInitialized = true;
  openedTopics.add('default');
}

export async function loadChatConfig() {
  if (chatConfig) {
    return chatConfig;
  }

  try {
    const res = await fetch('/cv/chat-config.json');
    if (res.ok) {
      chatConfig = (await res.json()) as ChatConfig;
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

function createFallbackConfig(): ChatConfig {
  return {
    default: {
      title: 'Ask My Digital Proxy',
      message: 'Hi! I\'m here to answer questions about Kris\'s background.',
      questions: ['What are Kris\'s key skills?', 'Tell me about Kris\'s experience']
    },
    topics: {}
  };
}

function getTopicConfig(section: string | null, index: number | null, skillId: string | null) {
  if (!chatConfig || !chatConfig.topics) {
    console.warn('getTopicConfig: No chatConfig or topics available');
    return null;
  }

  const topics = chatConfig.topics;

  if (section === 'about') {
    const config = topics.about as TopicConfig | undefined;
    if (config) {
      console.log('Found about config');
      return config;
    }
    return null;
  }

  if (section === 'skills' && skillId) {
    const skillsTopic = topics.skills as Record<string, TopicConfig> | undefined;
    const config = skillsTopic?.[skillId];
    if (config) {
      console.log('Found skill config for:', skillId);
      return config;
    }
    console.warn('No skill config found for:', skillId);
    return null;
  }

  if (section === 'summary') {
    const config = topics.summary as TopicConfig | undefined;
    if (config) {
      console.log('Found summary config');
      return config;
    }
    console.warn('No summary config found');
    return null;
  }

  if (section && topics[section]) {
    if (index !== undefined && index !== null) {
      const key = String(index);
      const group = topics[section] as Record<string, TopicConfig>;
      const config = group[key];
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

export function setupScrollDetection() {
  const chatToggle = document.getElementById('chat-toggle-btn');
  if (!chatToggle) return;

  const scrollThreshold = 300;

  function checkScroll() {
    if (window.scrollY > scrollThreshold) {
      chatToggle?.classList.add('visible');
    } else {
      chatToggle?.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
}

export function openChat() {
  const modal = document.getElementById('chat-modal');
  if (modal && !modal.classList.contains('active')) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeChat() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  document.body.classList.remove('modal-open');
}

function toggleChat() {
  const modal = document.getElementById('chat-modal');
  if (modal && modal.classList.contains('active')) {
    closeChat();
  } else {
    openChat();
  }
}

function askSampleQuestion(question: string) {
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  if (input) {
    input.value = question;
    input.focus();
  }
}

export function setupChatHandlers() {
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

function updateChatTitle(title: string) {
  const titleEl = document.getElementById('chat-title');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

function renderSampleQuestions(questions?: string[]) {
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

async function streamTextWordByWord(element: HTMLElement, text: string, delayMs = 30) {
  const words = text.split(' ');
  element.textContent = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = i === 0 ? words[i] : ` ${words[i]}`;
    element.textContent += word;
    scrollChatToBottom();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function showTypingIndicator() {
  const messages = document.getElementById('chat-messages');
  if (!messages) {
    return null;
  }
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

/**
 * Create a renderer that appends text in small chunks with a short delay so
 * streamed markdown looks like it's being typed and the page scrolls smoothly.
 */
function createSlowRenderer(element: HTMLElement, opts?: { delayMs?: number; chunkSize?: number }) {
  const base = smd.default_renderer(element);
  const delayMs = opts?.delayMs ?? 20;
  const chunkSize = opts?.chunkSize ?? 3;
  const queue: Array<{ text: string; target: Element }> = [];
  let processing = false;

  const processQueue = async () => {
    if (processing) return;
    processing = true;
    while (queue.length) {
      const { text, target } = queue.shift()!;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        target.appendChild(document.createTextNode(chunk));
        scrollChatToBottom();
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    processing = false;
  };

  const add_text = (data: any, text: string) => {
    const target = (data && data.nodes && data.nodes[data.index]) || element;
    queue.push({ text, target });
    void processQueue();
  };

  return {
    ...base,
    add_text,
    // Keep the underlying parser data intact
    data: base.data
  };
}

async function addBotMessage(text: string) {
  const messages = document.getElementById('chat-messages');
  if (!messages) {
    return null;
  }

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

export async function initializeChatWithDefault() {
  await loadChatConfig();
  if (!chatConfig) return;

  const topicKey = 'default';
  const defaultConfig = chatConfig.default;

  updateChatTitle(defaultConfig.title);

  if (!openedTopics.has(topicKey)) {
    openedTopics.add(topicKey);
    chatInitialized = true;
    await addBotMessage(defaultConfig.message);
    renderSampleQuestions(defaultConfig.questions);
  } else {
    renderSampleQuestions(defaultConfig.questions);
  }
}

export async function openChatWithMoreInfo(section: string | null, index: number | null, skillId: string | null) {
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

  updateChatTitle(topicConfig.title);

  if (!openedTopics.has(topicKey)) {
    openedTopics.add(topicKey);
    chatInitialized = true;
    await addBotMessage(topicConfig.message);
    renderSampleQuestions(topicConfig.questions);
  } else {
    renderSampleQuestions(topicConfig.questions);
  }
}

export function setupMoreInfoButtons() {
  const buttons = document.querySelectorAll('.more-info-btn');

  buttons.forEach((btn) => {
    const section = btn.getAttribute('data-section');
    const indexAttr = btn.getAttribute('data-index');
    const skillId = btn.getAttribute('data-skill-id');

    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      let parsedIndex: number | null = null;
      if (indexAttr !== null && indexAttr !== '') {
        parsedIndex = Number.parseInt(indexAttr, 10);
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

export async function sendMessage() {
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const messagesContainer = document.getElementById('chat-messages');
  const message = input?.value.trim() || '';

  if (!message || !input || !messagesContainer) return;

  const endpoint = window.CV_CHAT_ENDPOINT;
  if (!endpoint) {
    console.error('Missing CV_CHAT_ENDPOINT.');
    return;
  }

  const existingQuestions = messagesContainer.querySelector('.chat-sample-questions');
  if (existingQuestions) {
    existingQuestions.remove();
  }

  const userMessageEl = document.createElement('div');
  userMessageEl.className = 'chat-message user';
  userMessageEl.textContent = message;
  messagesContainer.appendChild(userMessageEl);

  addToConversationHistory('user', message);

  scrollChatToBottom();
  input.value = '';

  showTypingIndicator();

  try {
    const conversationHistory = getConversationHistory();
    const dedupedHistory = dedupeConversationPairs(conversationHistory);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: dedupedHistory })
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Streaming is not supported in this browser.');
    }

    // Keep the typing indicator visible until the first streaming chunk arrives.
    const botMessageEl = document.createElement('div');
    botMessageEl.className = 'chat-message bot';
    botMessageEl.textContent = '';
    messagesContainer.appendChild(botMessageEl);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    // Try to initialize streaming-markdown parser and renderer. Fall back to plain text if not available.
    let renderer: any = null;
    let parser: any = null;
    try {
      // Use a slow renderer so markdown text is appended gradually (smooth typing effect).
      renderer = createSlowRenderer(botMessageEl, { delayMs: 20, chunkSize: 3 });
      parser = smd.parser(renderer);
    } catch (err) {
      console.warn('streaming-markdown init failed, falling back to plain text streaming', err);
      renderer = null;
      parser = null;
    }

    // Ensure we only hide the typing indicator once and only after we receive the first chunk.
    let typingHidden = false;
    const hideTypingOnce = () => {
      if (!typingHidden) {
        hideTypingIndicator();
        typingHidden = true;
      }
    };

    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        // First streaming chunk has arrived — hide typing indicator now.
        hideTypingOnce();
        const chunkText = decoder.decode(result.value, { stream: true });
        if (parser && typeof smd.parser_write === 'function') {
          try {
            smd.parser_write(parser, chunkText);
          } catch (err) {
            console.warn('parser_write error, appending raw text', err);
            botMessageEl.textContent += chunkText;
            scrollChatToBottom();
          }
        } else {
          botMessageEl.textContent += chunkText;
          scrollChatToBottom();
        }
      }
    }

    // Ensure typing indicator is hidden even if the final chunk arrived only at end-of-stream.
    hideTypingOnce();

    // Finalize parser if used.
    if (parser && typeof smd.parser_end === 'function') {
      try {
        smd.parser_end(parser);
      } catch (err) {
        console.warn('parser_end error', err);
      }
    }

    const assistantText = botMessageEl.textContent || botMessageEl.innerText || '';
    addToConversationHistory('assistant', assistantText);
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

export function setupChatToggleButton() {
  const openButton = document.getElementById('chat-toggle-btn');
  if (openButton) {
    openButton.addEventListener('click', async (event) => {
      event.preventDefault();

      const modal = document.getElementById('chat-modal');
      const isCurrentlyOpen = modal?.classList.contains('active');

      if (isCurrentlyOpen) {
        closeChat();
      } else {
        openChat();
        await initializeChatWithDefault();
      }
    });
  }
}
