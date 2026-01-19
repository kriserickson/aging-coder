import {
  loadChatConfig,
  restoreConversationUI,
  sendMessage,
  setupChatHandlers,
  setupChatScrollIndicator,
  setupChatToggleButton,
  setupMoreInfoButtons,
  setupScrollDetection
} from './chat';
import { setupActionButtons } from './actions';
import { setupFitModal } from './fit';
import { setupExperienceToggles, setupProjectToggles } from './toggles';

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

  await loadChatConfig();

  restoreConversationUI();

  setupScrollDetection();
  setupExperienceToggles();
  setupProjectToggles();
  setupChatHandlers();
  setupMoreInfoButtons();
  setupChatScrollIndicator();
  setupActionButtons();
  setupFitModal();
  setupChatToggleButton();

  console.log('CV Chat initialized');
});
