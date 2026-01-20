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
const SCROLL_INDICATOR_THRESHOLD = 40;
let scrollIndicatorEl: HTMLButtonElement | null = null;

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
    if (msg.role === 'assistant') {
      renderMarkdownContent(messageEl, msg.content);
    } else {
      messageEl.textContent = msg.content;
    }
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
    btn.addEventListener('click', () => {
      // Populate the input and send the question immediately
      askSampleQuestion(q);
      // Use a tiny timeout so focus/update happens before sending
      setTimeout(() => {
        void sendMessage();
      }, 0);
    });
    container.appendChild(btn);
  });

  messagesContainer.appendChild(container);
  scrollChatToBottom();
}

function setAnchorsOpenNewTab(root: Element) {
  try {
    root.querySelectorAll('a').forEach((a) => {
      // Only modify normal anchors (ignore anchors without href)
      if (!(a instanceof HTMLAnchorElement)) return;
      if (!a.getAttribute('href')) return;
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  } catch (err) {
    // ignore errors
  }
}

function renderMarkdownContent(element: HTMLElement, markdown: string) {
  if (!markdown) {
    element.textContent = '';
    return;
  }

  element.innerHTML = '';
  try {
    const renderer = smd.default_renderer(element);
    const parser = smd.parser(renderer);
    smd.parser_write(parser, markdown);
    if (typeof smd.parser_end === 'function') {
      smd.parser_end(parser);
    }

    // Ensure any links added by the renderer open in a new tab
    setAnchorsOpenNewTab(element);
  } catch (err) {
    console.warn('renderMarkdownContent error:', err);
    element.textContent = markdown;
  }
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

  // Wrap the renderer's attribute setter so anchors created during streaming
  // are immediately given target and rel attributes (open in new tab safely).
  try {
    const originalSetAttr = (base as any).set_attr;
    if (typeof originalSetAttr === 'function') {
      (base as any).set_attr = function set_attr_wrapper(data: any, attr: any, value: any) {
        // Call original
        originalSetAttr.call(this, data, attr, value);
        try {
          const node = data && data.nodes && data.nodes[data.index];
          if (node && node instanceof Element && node.tagName === 'A') {
            (node as HTMLAnchorElement).setAttribute('target', '_blank');
            (node as HTMLAnchorElement).setAttribute('rel', 'noopener noreferrer');
          }
        } catch (err) {
          // ignore
        }
      };
    }
  } catch (err) {
    // ignore failures wrapping renderer
  }

  const delayMs = opts?.delayMs ?? 20;
  const chunkSize = opts?.chunkSize ?? 3;
  const queue: Array<{ text: string; node: Text }> = [];
  let processing = false;
  const idleResolvers: Array<() => void> = [];

  const resolveIdleResolvers = () => {
    while (idleResolvers.length) {
      const resolver = idleResolvers.shift();
      resolver?.();
    }
  };

  const markListItemHasStreamingContent = (node: Element | Node | null | undefined) => {
    if (!node) {
      return;
    }

    const referenceElement = node instanceof Element ? node : node.parentElement;
    if (!referenceElement) {
      return;
    }

    const listItem = referenceElement.closest('li');
    if (listItem && !listItem.hasAttribute('data-streaming-has-content')) {
      listItem.setAttribute('data-streaming-has-content', 'true');
    }
  };

  const processQueue = async () => {
    if (processing) return;
    processing = true;
    while (queue.length) {
      const { text, node } = queue.shift()!;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        if (chunk.trim().length > 0) {
          markListItemHasStreamingContent(node);
        }
        node.textContent += chunk;
        scrollChatToBottom();
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    processing = false;
    if (queue.length === 0) {
      resolveIdleResolvers();
    }
  };

  const waitForIdle = () => {
    if (!processing && queue.length === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      idleResolvers.push(resolve);
    });
  };

  const add_text = (data: any, text: string) => {
    const target = (data && data.nodes && data.nodes[data.index]) || element;
    const resolvedTarget = target instanceof Element ? target : element;
    const textNode = document.createTextNode('');
    resolvedTarget.appendChild(textNode);
    queue.push({ text, node: textNode });
    void processQueue();
  };

  return {
    ...base,
    add_text,
    waitForIdle,
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
  updateScrollIndicatorVisibility();
}

function updateScrollIndicatorVisibility() {
  const messages = document.getElementById('chat-messages');
  if (!messages || !scrollIndicatorEl) {
    return;
  }

  const distanceFromBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
  if (distanceFromBottom > SCROLL_INDICATOR_THRESHOLD) {
    scrollIndicatorEl.classList.add('visible');
  } else {
    scrollIndicatorEl.classList.remove('visible');
  }
}

export function setupChatScrollIndicator() {
  const messages = document.getElementById('chat-messages');
  if (!messages || scrollIndicatorEl) {
    return;
  }

  scrollIndicatorEl = document.createElement('button');
  scrollIndicatorEl.type = 'button';
  scrollIndicatorEl.className = 'chat-scroll-indicator';
  scrollIndicatorEl.textContent = 'More below';
  scrollIndicatorEl.addEventListener('click', () => {
    scrollChatToBottom();
    scrollIndicatorEl?.blur();
  });

  messages.appendChild(scrollIndicatorEl);
  messages.addEventListener('scroll', updateScrollIndicatorVisibility, { passive: true });
  updateScrollIndicatorVisibility();
}

// ---- Chat helpers (split from sendMessage to reduce complexity) ----
function createUserMessageEl(message: string, messagesContainer: Element) {
  const el = document.createElement('div');
  el.className = 'chat-message user';
  el.textContent = message;
  messagesContainer.appendChild(el);
  return el;
}

async function handleRateLimit(messagesContainer: Element) {
  const friendlyMd = `You seem really interested! You've reached the daily question limit and have been rate limited. Please try again tomorrow — or contact Kris on [LinkedIn](https://www.linkedin.com/in/kriserickson/) or by email at [kristian.erickson@gmail.com](mailto:kristian.erickson@gmail.com) for more information.`;

  try {
    const plain = friendlyMd.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    const typedEl = await addBotMessage(plain);

    try {
      renderMarkdownContent(typedEl as HTMLElement, friendlyMd);
      try { setAnchorsOpenNewTab(typedEl as Element); } catch (err) { /* ignore */ }
    } catch (err) {
      console.warn('Failed to render rate-limit markdown, keeping typed text:', err);
    }

    addToConversationHistory('assistant', plain);
    hideTypingIndicator();
    scrollChatToBottom();
  } catch (err) {
    console.warn('Failed handling rate-limit response (typed fallback):', err);
    hideTypingIndicator();
    scrollChatToBottom();
  }
}

async function streamResponseToMessage(response: Response, messagesContainer: Element) {
  // Similar logic to previous inline implementation but self-contained
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let done = false;
  const assistantChunks: string[] = [];

  let botMessageEl: HTMLDivElement | null = null;
  let renderer: any = null;
  let parser: any = null;
  let markdownSetup = false;

  const ensureBotMessage = () => {
    if (!botMessageEl) {
      botMessageEl = document.createElement('div');
      botMessageEl.className = 'chat-message bot streaming';
      botMessageEl.textContent = '';
      messagesContainer.appendChild(botMessageEl);
      scrollChatToBottom();
    }

    if (!markdownSetup && botMessageEl) {
      markdownSetup = true;
      try {
        renderer = createSlowRenderer(botMessageEl, { delayMs: 20, chunkSize: 3 });
        parser = smd.parser(renderer);
      } catch (err) {
        console.warn('streaming-markdown init failed, falling back to plain text streaming', err);
        renderer = null;
        parser = null;
      }
    }

    return botMessageEl;
  };

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
      hideTypingOnce();
      const chunkText = decoder.decode(result.value, { stream: true });
      assistantChunks.push(chunkText);
      const messageEl = ensureBotMessage();

      if (parser && typeof smd.parser_write === 'function') {
        try {
          smd.parser_write(parser, chunkText);
        } catch (err) {
          console.warn('parser_write error, appending raw text', err);
          if (messageEl) {
            messageEl.textContent += chunkText;
            scrollChatToBottom();
          }
        }
      } else if (messageEl) {
        messageEl.textContent += chunkText;
        scrollChatToBottom();
      }
    }
  }

  hideTypingOnce();

  if (parser && typeof smd.parser_end === 'function') {
    try {
      smd.parser_end(parser);
    } catch (err) {
      console.warn('parser_end error', err);
    }
  }

  if (renderer && typeof renderer.waitForIdle === 'function') {
    await renderer.waitForIdle();
  }

  // After streaming completes, ensure any links inside the bot message
  // open in a new tab (and are safe with rel="noopener noreferrer").
  if (botMessageEl) {
    try { setAnchorsOpenNewTab(botMessageEl); } catch (err) { /* ignore */ }
  }

  const remaining = decoder.decode();
  if (remaining) assistantChunks.push(remaining);

  const fallbackText = botMessageEl ? (botMessageEl as any).textContent || (botMessageEl as any).innerText || '' : '';
  const assistantTextCandidate = assistantChunks.join('');
  const assistantText = assistantTextCandidate.length ? assistantTextCandidate : fallbackText;
  if (botMessageEl) (botMessageEl as any).classList.remove('streaming');

  return assistantText;
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
  if (existingQuestions) existingQuestions.remove();

  createUserMessageEl(message, messagesContainer);
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

    if (response.status === 429) {
      await handleRateLimit(messagesContainer);
      return;
    }

    if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
    if (!response.body) throw new Error('Streaming is not supported in this browser.');

    const assistantText = await streamResponseToMessage(response, messagesContainer);
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
