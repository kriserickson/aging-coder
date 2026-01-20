export function openFitModal() {
  const modal = document.getElementById('fit-modal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  resetFitModal();
}

function closeFitModal() {
  const modal = document.getElementById('fit-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
}

export function resetFitModal() {
  const inputSection = document.getElementById('fit-input-section');
  const loading = document.getElementById('fit-loading');
  const results = document.getElementById('fit-results');
  const textArea = document.getElementById('fit-job-text') as HTMLTextAreaElement | null;
  const urlInput = document.getElementById('fit-job-url') as HTMLInputElement | null;

  if (inputSection) inputSection.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (results) results.style.display = 'none';
  if (textArea) textArea.value = '';
  if (urlInput) urlInput.value = '';
  clearFitError();
}

function showFitError(msg: string) {
  const el = document.getElementById('fit-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  // Make the element an accessible alert and move focus so screen readers announce it
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('tabindex', '-1');
}

function clearFitError() {
  const el = document.getElementById('fit-error');
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
  el.removeAttribute('role');
  el.removeAttribute('aria-live');
  el.removeAttribute('tabindex');
}

export function setupFitModal() {
  const fitModalEl = document.getElementById('fit-modal');
  if (!fitModalEl) return;

  const closeBtn = fitModalEl.querySelector('.chat-close, .fit-close');
  const overlay = fitModalEl.querySelector('.chat-modal-overlay, .fit-modal-overlay');
  const submitBtn = document.getElementById('fit-submit');
  const tabs = fitModalEl.querySelectorAll('.fit-tab');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeFitModal);
  }

  if (overlay) {
    overlay.addEventListener('click', closeFitModal);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      fitModalEl.querySelectorAll('.fit-tab-content').forEach((content) => {
        content.classList.remove('active');
      });
      if (targetTab) {
        fitModalEl.querySelector(`#tab-${targetTab}`)?.classList.add('active');
      }
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', submitFitAssessment);
  }

  window.resetFitModal = resetFitModal;
}

async function submitFitAssessment() {
  const activeTab = document.querySelector('.fit-tab.active')?.getAttribute('data-tab');
  let jobInput = '';

  if (activeTab === 'paste') {
    const textArea = document.getElementById('fit-job-text') as HTMLTextAreaElement | null;
    jobInput = textArea?.value.trim() || '';
  } else {
    const urlInput = document.getElementById('fit-job-url') as HTMLInputElement | null;
    jobInput = urlInput?.value.trim() || '';
  }

  if (!jobInput) {
    showFitError('Please enter a job description or URL.');
    return;
  }

  const endpoint = window.CV_FIT_ENDPOINT;
  if (!endpoint) {
    showFitError('Fit assessment endpoint not configured.');
    return;
  }

  const payload = activeTab === 'paste'
    ? { type: 'paste', content: jobInput }
    : { type: 'url', url: jobInput };

  clearFitError();
  const inputSection = document.getElementById('fit-input-section');
  const loading = document.getElementById('fit-loading');
  if (inputSection) inputSection.style.display = 'none';
  if (loading) loading.style.display = 'block';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let msg = `Request failed: ${response.status}`;
      try {
        const bodyErr = await response.json();
        if (bodyErr && bodyErr.error) msg = bodyErr.error;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(msg);
    }

    const result = await response.json();
    renderFitResults(result, jobInput);
  } catch (error) {
    console.error('Fit assessment error:', error);
    if (loading) loading.style.display = 'none';
    if (inputSection) inputSection.style.display = 'block';
    showFitError(error instanceof Error ? `Error: ${error.message}` : 'Failed to analyze job fit. Please try again.');
  }
}

function renderFitResults(result: any, jobInput: string) {
  const loading = document.getElementById('fit-loading');
  if (loading) loading.style.display = 'none';

  const resultsContainer = document.getElementById('fit-results');
  if (!resultsContainer) return;

  resultsContainer.style.display = 'block';

  const verdict = String(result.verdict || '').toLowerCase();
  const isStrong = verdict === 'strong';
  const isModerate = verdict === 'moderate';

  const verdictClass = isStrong ? 'strong-fit' : (isModerate ? 'moderate-fit' : 'weak-fit');

  let verdictTitle;
  let verdictSubtext;
  if (isStrong) {
    verdictTitle = 'Strong Fit — Let\'s Talk';
    verdictSubtext = 'Your requirements align well with my experience. Here\'s the specific evidence:';
  } else if (isModerate) {
    verdictTitle = 'Moderate Fit — Worth Considering';
    verdictSubtext = 'This role has several relevant matches; here are the strengths and areas to watch:';
  } else {
    verdictTitle = 'Honest Assessment — Probably Not Your Person';
    verdictSubtext = 'I want to be direct with you. Here\'s why this might not be the right fit:';
  }

  const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
  const moderateIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4"/></svg>';
  const warningIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';

  const jobSnippet = jobInput.length > 200 ? `${jobInput.substring(0, 200)}...` : jobInput;
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
                ${isStrong ? checkIcon : (isModerate ? moderateIcon : warningIcon)}
            </div>
            <div class="fit-verdict-content">
                <h4>${verdictTitle}</h4>
                <p>${verdictSubtext}</p>
            </div>
        </div>
    `;

  if (Array.isArray(result.matches) && result.matches.length > 0) {
    html += `<div class="fit-section-header">${(isStrong || isModerate) ? 'Where I Match' : 'What Does Transfer'}</div>`;
    result.matches.forEach((match: { title: string; description: string }) => {
      html += `
                <div class="fit-card ${(isStrong || isModerate) ? 'match' : 'transfer'}">
                    <div class="fit-card-header">
                        <span class="fit-card-icon">${isStrong ? '✓' : (isModerate ? '•' : '○')}</span>
                        <span class="fit-card-title">${escapeHtml(match.title)}</span>
                    </div>
                    <p class="fit-card-description">${escapeHtml(match.description)}</p>
                </div>
            `;
    });
  }

  if (Array.isArray(result.gaps) && result.gaps.length > 0) {
    html += `<div class="fit-section-header">${(isStrong || isModerate) ? 'Gaps to Note' : 'Where I Don\'t Fit'}</div>`;
    result.gaps.forEach((gap: { title: string; description: string }) => {
      html += `
                <div class="fit-card gap">
                    <div class="fit-card-header">
                        <span class="fit-card-icon">${(isStrong || isModerate) ? '○' : '✗'}</span>
                        <span class="fit-card-title">${escapeHtml(gap.title)}</span>
                    </div>
                    <p class="fit-card-description">${escapeHtml(gap.description)}</p>
                </div>
            `;
    });
  }

  if (result.recommendation) {
    html += `
            <div class="fit-recommendation ${verdictClass}">
                <div class="fit-recommendation-header">My Recommendation</div>
                <p>${escapeHtml(result.recommendation)}</p>
            </div>
        `;
  }

  html += `
    <div class="fit-disclaimer">
      <p><strong>Note:</strong> This assessment was generated by an AI model. While it is grounded in actual 
      resume data, large language models are non-deterministic and can occasionally make mistakes or hallucinate. 
      Please review these results critically.</p>
    </div>
  `;

  html += '<button type="button" class="fit-new-assessment" onclick="resetFitModal()">Analyze Another Job</button>';

  resultsContainer.innerHTML = html;
}

function escapeHtml(str: string) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
