---
layout: home.njk
title: CV
permalink: /cv/index.html
---

<div class="cv-container">
    <header class="cv-header">
        <div class="cv-name">{{ cv.personal.name }}</div>
        <div class="cv-contact">
            <span>{{ cv.personal.location }}</span> | 
            <a href="mailto:{{ cv.personal.email }}">{{ cv.personal.email }}</a> | 
            <span>{{ cv.personal.phone }}</span>
        </div>
        <div class="cv-links">
            <a href="{{ cv.personal.github }}" target="_blank">GitHub</a> | 
            <a href="{{ cv.personal.linkedin }}" target="_blank">LinkedIn</a>
        </div>
    </header>

    <section class="cv-section">
        <h2 class="cv-section-title">Executive Summary</h2>
        <div class="cv-summary">
            <ul>
                {% for bullet in cv.summary %}
                <li>{{ bullet }}</li>
                {% endfor %}
            </ul>
        </div>
    </section>

    <section class="cv-section">
        <h2 class="cv-section-title">Professional Experience</h2>
        {% for exp in cv.experience %}
        <div class="cv-experience-item">
            <div class="exp-header" onclick="toggleExperience({{ loop.index0 }})">
                <div class="exp-title-row">
                    <h3 class="exp-title">{{ exp.title }}</h3>
                    <span class="exp-toggle">▼</span>
                </div>
                <div class="exp-meta">
                    <span class="exp-company">{{ exp.company }}</span>
                    <span class="exp-location">{{ exp.location }}</span>
                    <span class="exp-period">{{ exp.period }}</span>
                </div>
            </div>
            <div class="exp-details" id="exp-details-{{ loop.index0 }}">
                <ul class="exp-achievements">
                    {% for achievement in exp.achievements %}
                    <li>{{ achievement }}</li>
                    {% endfor %}
                </ul>
            </div>
        </div>
        {% endfor %}
    </section>

    <section class="cv-section">
        <h2 class="cv-section-title">Technical Skills</h2>
        <div class="cv-skills-grid">
            <div class="skill-category">
                <h3 class="skill-category-title">Frontend</h3>
                <div class="skill-details">
                    <div class="skill-technologies">
                        <strong>Technologies:</strong> {{ cv.skills.frontend.technologies | join: ", " }}
                    </div>
                    <div class="skill-tools">
                        <strong>Tools:</strong> {{ cv.skills.frontend.tools | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.frontend.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Backend</h3>
                <div class="skill-details">
                    <div class="skill-technologies">
                        <strong>Technologies:</strong> {{ cv.skills.backend.technologies | join: ", " }}
                    </div>
                    <div class="skill-integration">
                        <strong>Integration:</strong> {{ cv.skills.backend.integration | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.backend.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Ai Ml</h3>
                <div class="skill-details">
                    <div class="skill-technologies">
                        <strong>Technologies:</strong> {{ cv.skills.ai_ml.technologies | join: ", " }}
                    </div>
                    <div class="skill-specialties">
                        <strong>Specialties:</strong> {{ cv.skills.ai_ml.specialties | join: ", " }}
                    </div>
                    <div class="skill-tools">
                        <strong>Tools:</strong> {{ cv.skills.ai_ml.tools | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.ai_ml.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Mobile</h3>
                <div class="skill-details">
                    <div class="skill-platforms">
                        <strong>Platforms:</strong> {{ cv.skills.mobile.platforms | join: ", " }}
                    </div>
                    <div class="skill-technologies">
                        <strong>Technologies:</strong> {{ cv.skills.mobile.technologies | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.mobile.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Databases</h3>
                <div class="skill-details">
                    <div class="skill-technologies">
                        <strong>Technologies:</strong> {{ cv.skills.databases.technologies | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.databases.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Practices</h3>
                <div class="skill-details">
                    <div class="skill-methodologies">
                        <strong>Methodologies:</strong> {{ cv.skills.practices.methodologies | join: ", " }}
                    </div>
                    <div class="skill-architecture">
                        <strong>Architecture:</strong> {{ cv.skills.practices.architecture | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.practices.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Devops</h3>
                <div class="skill-details">
                    <div class="skill-technologies">
                        <strong>Technologies:</strong> {{ cv.skills.devops.technologies | join: ", " }}
                    </div>
                    <div class="skill-cicd">
                        <strong>CI/CD:</strong> {{ cv.skills.devops.cicd | join: ", " }}
                    </div>
                    <div class="skill-architecture">
                        <strong>Architecture:</strong> {{ cv.skills.devops.architecture | join: ", " }}
                    </div>
                    <div class="skill-description">{{ cv.skills.devops.description }}</div>
                </div>
            </div>
            <div class="skill-category">
                <h3 class="skill-category-title">Languages</h3>
                <div class="skill-details">
                    <div class="skill-breadth">{{ cv.skills.languages.breadth }}</div>
                    <div class="skill-description">{{ cv.skills.languages.description }}</div>
                </div>
            </div>
        </div>
    </section>

    <section class="cv-section">
        <h2 class="cv-section-title">Key Projects</h2>
        <div class="cv-projects">
            <div class="project-item" onclick="toggleProject(0)">
                <div class="project-header">
                    <h3 class="project-title">{{ cv.projects.storefront_ecommerce.name }}</h3>
                    <span class="project-period">{{ cv.projects.storefront_ecommerce.period }}</span>
                    <span class="project-toggle">▼</span>
                </div>
                <div class="project-details" id="project-details-0">
                    <p class="project-description">{{ cv.projects.storefront_ecommerce.description }}</p>
                    <div class="project-impact">
                        <strong>Impact:</strong> {{ cv.projects.storefront_ecommerce.impact }}
                    </div>
                    <div class="project-technologies">
                        <strong>Technologies:</strong> {{ cv.projects.storefront_ecommerce.technologies | join: ", " }}
                    </div>
                </div>
            </div>
            <div class="project-item" onclick="toggleProject(1)">
                <div class="project-header">
                    <h3 class="project-title">{{ cv.projects.storefront_kiosk.name }}</h3>
                    <span class="project-period">{{ cv.projects.storefront_kiosk.period }}</span>
                    <span class="project-toggle">▼</span>
                </div>
                <div class="project-details" id="project-details-1">
                    <p class="project-description">{{ cv.projects.storefront_kiosk.description }}</p>
                    <div class="project-impact">
                        <strong>Impact:</strong> {{ cv.projects.storefront_kiosk.impact }}
                    </div>
                    <div class="project-technologies">
                        <strong>Technologies:</strong> {{ cv.projects.storefront_kiosk.technologies | join: ", " }}
                    </div>
                </div>
            </div>
            <div class="project-item" onclick="toggleProject(2)">
                <div class="project-header">
                    <h3 class="project-title">{{ cv.projects.file_transfer_payment.name }}</h3>
                    <span class="project-period">{{ cv.projects.file_transfer_payment.period }}</span>
                    <span class="project-toggle">▼</span>
                </div>
                <div class="project-details" id="project-details-2">
                    <p class="project-description">{{ cv.projects.file_transfer_payment.description }}</p>
                    <div class="project-impact">
                        <strong>Impact:</strong> {{ cv.projects.file_transfer_payment.impact }}
                    </div>
                    <div class="project-technologies">
                        <strong>Technologies:</strong> {{ cv.projects.file_transfer_payment.technologies | join: ", " }}
                    </div>
                </div>
            </div>
            <div class="project-item" onclick="toggleProject(3)">
                <div class="project-header">
                    <h3 class="project-title">{{ cv.projects.remote_management.name }}</h3>
                    <span class="project-period">{{ cv.projects.remote_management.period }}</span>
                    <span class="project-toggle">▼</span>
                </div>
                <div class="project-details" id="project-details-3">
                    <p class="project-description">{{ cv.projects.remote_management.description }}</p>
                    <div class="project-impact">
                        <strong>Impact:</strong> {{ cv.projects.remote_management.impact }}
                    </div>
                    <div class="project-technologies">
                        <strong>Technologies:</strong> {{ cv.projects.remote_management.technologies | join: ", " }}
                    </div>
                </div>
            </div>
            <div class="project-item" onclick="toggleProject(4)">
                <div class="project-header">
                    <h3 class="project-title">{{ cv.projects.saas_platform.name }}</h3>
                    <span class="project-period">{{ cv.projects.saas_platform.period }}</span>
                    <span class="project-toggle">▼</span>
                </div>
                <div class="project-details" id="project-details-4">
                    <p class="project-description">{{ cv.projects.saas_platform.description }}</p>
                    <div class="project-impact">
                        <strong>Impact:</strong> {{ cv.projects.saas_platform.impact }}
                    </div>
                    <div class="project-technologies">
                        <strong>Technologies:</strong> {{ cv.projects.saas_platform.technologies | join: ", " }}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="cv-section">
        <h2 class="cv-section-title">Education</h2>
        <div class="cv-education">
            {% for edu in cv.education %}
            <div class="education-item">
                <h3 class="edu-institution">{{ edu.institution }}</h3>
                <div class="edu-details">
                    <span class="edu-location">{{ edu.location }}</span>
                    <span class="edu-period">{{ edu.period }}</span>
                </div>
                <div class="edu-program">
                    {% if edu.degree %}
                        <strong>{{ edu.degree }}</strong>
                    {% endif %}
                    {% if edu.program %}
                        {{ edu.program }}
                    {% endif %}
                </div>
            </div>
            {% endfor %}
        </div>
    </section>

    <div class="cv-chat-container">
        <div class="chat-toggle" onclick="toggleChat()">
            Ask My Digital Proxy
        </div>
        <div class="chat-modal" id="chat-modal">
            <div class="chat-modal-overlay" onclick="toggleChat()"></div>
            <div class="chat-modal-content">
                <div class="chat-header">
                    <h3>{{ cv.chat.welcome }}</h3>
                    <button class="chat-close" onclick="toggleChat()">×</button>
                </div>
                <div class="chat-sample-questions" id="sample-questions">
                    {% for question in cv.chat.sample_questions %}
                    <div class="sample-question" onclick="askSampleQuestion('{{ question | replace: "'", "\\'" }}')">
                        {{ question }}
                    </div>
                    {% endfor %}
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="chat-message bot">
                        Hi! I'm here to answer questions about Kris's background, experience, and skills. Click on any question above or type your own below.
                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" id="chat-input" placeholder="Ask me anything about Kris's CV..." />
                    <button onclick="sendMessage()">Send</button>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.cv-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
    line-height: 1.6;
    color: var(--text-color, #1e0b0b);
}

.cv-header {
    text-align: center;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid color-mix(in srgb, var(--muted-color) 30%, transparent);
}

.cv-name {
    font-size: 2.6rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-family: 'Merriweather', 'Georgia', serif;
}

.cv-contact {
    font-size: 1.05rem;
    margin-bottom: 0.5rem;
    color: var(--muted-color);
}

.cv-links a {
    color: var(--link);
    text-decoration: none;
    margin: 0 0.5rem;
    font-weight: 600;
}

.cv-links a:hover {
    color: var(--link-hover);
}

.cv-section-title {
    font-size: 1.75rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--text-color);
    border-bottom: 1px solid color-mix(in srgb, var(--muted-color) 30%, transparent);
    padding-bottom: 0.5rem;
    font-family: 'Merriweather', 'Georgia', serif;
}


.cv-name {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--primary-color, #2c3e50);
}

.cv-contact {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
}

.cv-links a {
    color: var(--accent-color, #007acc);
    text-decoration: none;
    margin: 0 0.5rem;
}

.cv-links a:hover {
    text-decoration: underline;
}

.cv-section {
    margin-bottom: 3rem;
}

.cv-section-title {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--primary-color, #2c3e50);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    padding-bottom: 0.5rem;
}

.cv-summary {
    font-size: 1.1rem;
    line-height: 1.7;
    background: var(--surface);
    padding: 1.5rem 1.8rem;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    box-shadow: 0 12px 24px rgba(30, 11, 11, 0.08);
}

.cv-summary ul {
    margin: 0;
    padding-left: 1.4rem;
    display: grid;
    gap: 0.75rem;
}

.cv-summary li {
    color: var(--text-color);
}

.cv-summary li::marker {
    color: var(--link);
    font-weight: 600;
}

.cv-experience-item {
    margin-bottom: 2rem;
    border: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 0.3s ease, transform 0.3s ease;
    background: var(--surface);
}

.cv-experience-item:hover {
    box-shadow: 0 18px 30px rgba(30, 11, 11, 0.12);
    transform: translateY(-2px);
}

.exp-header {
    cursor: pointer;
    padding: 1.5rem;
    background: color-mix(in srgb, var(--surface) 85%, var(--header-bg) 15%);
    transition: background 0.3s ease;
}

.exp-header:hover {
    background: color-mix(in srgb, var(--surface) 75%, var(--header-bg) 25%);
}

.exp-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.exp-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
}

.exp-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.95rem;
    color: var(--muted-color);
}


.exp-toggle {
    font-size: 1.2rem;
    transition: transform 0.3s ease;
}

.exp-toggle.expanded {
    transform: rotate(180deg);
}

.exp-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.95rem;
    color: var(--text-secondary, #666);
}

.exp-company {
    font-weight: 600;
}

.exp-details {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    background: var(--surface);
}

.exp-details.expanded {
    max-height: 1000px;
}

.exp-achievements {
    padding: 1.5rem;
    margin: 0;
    list-style: none;
}

.exp-achievements li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.8rem;
    line-height: 1.6;
}

.exp-achievements li:before {
    content: "▸";
    position: absolute;
    left: 0;
    color: var(--link);
    font-weight: bold;
}

.cv-skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.skill-category {
    background: var(--surface);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    box-shadow: 0 12px 22px rgba(30, 11, 11, 0.08);
}

.skill-category-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 1rem;
}

.skill-description {
    font-style: italic;
    color: var(--muted-color);
    margin-top: 0.5rem;
}


.skill-category-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-color, #2c3e50);
    margin-bottom: 1rem;
}

.skill-details > div {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.skill-description {
    font-style: italic;
    color: var(--text-secondary, #666);
    margin-top: 0.5rem;
}

.cv-projects {
    display: grid;
    gap: 1.5rem;
}

.project-item {
    border: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.3s ease, transform 0.3s ease;
    background: var(--surface);
}

.project-item:hover {
    box-shadow: 0 18px 30px rgba(30, 11, 11, 0.12);
    transform: translateY(-2px);
}

.project-header {
    cursor: pointer;
    padding: 1.5rem;
    background: color-mix(in srgb, var(--surface) 85%, var(--header-bg) 15%);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.project-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
}

.project-period {
    color: var(--muted-color);
    font-size: 0.9rem;
}

.project-toggle {
    font-size: 1rem;
    transition: transform 0.3s ease;
}

.project-toggle.expanded {
    transform: rotate(180deg);
}

.project-details {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    background: var(--surface);
}

.project-details.expanded {
    max-height: 500px;
}

.project-details > div {
    padding: 0.5rem 1.5rem;
}

.project-description {
    padding: 1rem 1.5rem !important;
    margin: 0;
}

.cv-education {
    display: grid;
    gap: 1.5rem;
}

.education-item {
    background: var(--surface);
    padding: 1.5rem;
    border-radius: 12px;
    border-left: 4px solid var(--link);
    box-shadow: 0 12px 22px rgba(30, 11, 11, 0.08);
}

.edu-institution {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.5rem;
}

.edu-details {
    display: flex;
    gap: 1rem;
    color: var(--muted-color);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
}

.edu-program {
    font-size: 1rem;
}

.cv-chat-container {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 1000;
}

.chat-toggle {
    background: var(--header-bg);
    color: var(--header-fg);
    padding: 0.85rem 1.6rem;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(180, 0, 0, 0.25);
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid var(--header-border);
}

.chat-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(180, 0, 0, 0.35);
    background: var(--link-hover);
}

.chat-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: none;
    z-index: 1001;
}

.chat-modal.active {
    display: flex;
    align-items: center;
    justify-content: center;
}

.chat-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(18, 10, 10, 0.65);
    backdrop-filter: blur(6px);
}

.chat-modal-content {
    position: relative;
    width: min(900px, 92vw);
    height: min(78vh, 720px);
    background: var(--surface);
    border-radius: 18px;
    box-shadow: 0 32px 80px rgba(30, 11, 11, 0.35);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    animation: modalSlideIn 0.28s ease-out;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: scale(0.96) translateY(-12px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.chat-sample-questions {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.75rem;
    max-height: 210px;
    overflow-y: auto;
    background: color-mix(in srgb, var(--surface) 80%, var(--header-bg) 20%);
}

.sample-question {
    background: var(--bg);
    border: 1px solid color-mix(in srgb, var(--muted-color) 30%, transparent);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
    font-size: 0.92rem;
    line-height: 1.4;
    color: var(--text-color);
    box-shadow: 0 8px 18px rgba(30, 11, 11, 0.08);
}

.sample-question:hover {
    transform: translateY(-2px);
    border-color: var(--link);
    box-shadow: 0 10px 22px rgba(30, 11, 11, 0.18);
}

.chat-header {
    background: linear-gradient(135deg, var(--header-bg), color-mix(in srgb, var(--header-bg) 70%, #400000 30%));
    color: var(--header-fg);
    padding: 1.25rem 1.5rem;
    border-radius: 18px 18px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.chat-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-family: 'Merriweather', 'Georgia', serif;
    letter-spacing: -0.2px;
    color: white;
}

.chat-close {
    background: color-mix(in srgb, var(--header-fg) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--header-fg) 35%, transparent);
    color: var(--header-fg);
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease, transform 0.2s ease;
}

.chat-close:hover {
    background: color-mix(in srgb, var(--header-fg) 25%, transparent);
    transform: scale(1.02);
}

.chat-messages {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 220px;
    background: var(--bg);
}

.chat-message {
    padding: 0.85rem 1rem;
    border-radius: 14px;
    max-width: 78%;
    word-wrap: break-word;
    box-shadow: 0 8px 20px rgba(30, 11, 11, 0.08);
    border: 1px solid color-mix(in srgb, var(--muted-color) 20%, transparent);
}

.chat-message.user {
    background: var(--header-bg);
    color: var(--header-fg);
    align-self: flex-end;
    border-color: var(--header-border);
}

.chat-message.bot {
    background: var(--surface);
    color: var(--text-color);
    align-self: flex-start;
}

.chat-input-container {
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--muted-color) 25%, transparent);
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background: color-mix(in srgb, var(--surface) 85%, var(--header-bg) 15%);
}

.chat-input-container input {
    flex: 1;
    padding: 0.7rem 1rem;
    border: 1px solid color-mix(in srgb, var(--muted-color) 35%, transparent);
    border-radius: 999px;
    outline: none;
    background: var(--bg);
    color: var(--text-color);
    font-size: 0.95rem;
}

.chat-input-container input:focus {
    border-color: var(--link);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--link) 20%, transparent);
}

.chat-input-container button {
    background: var(--link);
    color: var(--surface);
    border: none;
    padding: 0.65rem 1.3rem;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.chat-input-container button:hover {
    background: var(--link-hover);
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(180, 0, 0, 0.2);
}

@media (max-width: 768px) {
    .cv-container {
        padding: 1rem;
    }
    
    .cv-name {
        font-size: 2rem;
    }
    
    .cv-chat-container {
        bottom: 1rem;
        right: 1rem;
    }
    
    .chat-modal-content {
        width: 95%;
        height: 85vh;
        max-height: none;
    }
    
    .chat-sample-questions {
        grid-template-columns: 1fr;
        max-height: 250px;
    }
    
    .exp-meta {
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .project-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>

<script>
function toggleExperience(index) {
    const details = document.getElementById(`exp-details-${index}`);
    const toggle = document.querySelector(`#exp-details-${index}`).previousElementSibling.querySelector('.exp-toggle');
    
    details.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

function toggleProject(index) {
    const details = document.getElementById(`project-details-${index}`);
    const toggle = document.querySelector(`#project-details-${index}`).previousElementSibling.querySelector('.project-toggle');
    
    details.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

function toggleChat() {
    const modal = document.getElementById('chat-modal');
    modal.classList.toggle('active');
}

function askSampleQuestion(question) {
    const input = document.getElementById('chat-input');
    input.value = question;
    sendMessage();
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
    
    // Clear input
    input.value = '';
    
    // Add loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'chat-message bot';
    loadingMessage.textContent = 'Thinking...';
    messages.appendChild(loadingMessage);
    
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
            
            // Scroll to bottom
            messages.scrollTop = messages.scrollHeight;
        }, 1000);
        
    } catch (error) {
        // Remove loading indicator
        messages.removeChild(loadingMessage);
        
        // Add error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message bot';
        errorMessage.textContent = 'Sorry, I encountered an error. Please try again.';
        messages.appendChild(errorMessage);
        
        console.error('Chat error:', error);
    }
}

// Allow Enter key to send message
document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
</script>