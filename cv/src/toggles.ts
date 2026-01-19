function toggleExperience(index: string) {
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

function toggleProject(index: string) {
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

export function setupExperienceToggles() {
  const headers = document.querySelectorAll('.exp-header');
  headers.forEach((header) => {
    header.addEventListener('click', () => {
      const index = header.getAttribute('data-exp-index');
      if (index !== null) {
        toggleExperience(index);
      }
    });
  });
}

export function setupProjectToggles() {
  const projects = document.querySelectorAll('.project-item');
  projects.forEach((project) => {
    project.addEventListener('click', (event) => {
      if ((event.target as HTMLElement | null)?.closest('.project-toggle')) {
        const index = project.getAttribute('data-project-index');
        if (index !== null) {
          toggleProject(index);
        }
      }
    });
  });
}
