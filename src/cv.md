---
layout: home.njk
title: CV
permalink: /cv/index.html
extra_css:
  - /assets/css/cv.css
extra_js:
  - /assets/js/cv.js
---

<script>
    window.CV_CHAT_ENDPOINT = "{{ env.CV_CHAT_ENDPOINT | default: '' }}";
</script>

<div class="cv-container">
    <header class="cv-header">
        <div class="cv-name">{{ cv.personal.name }}</div>
        <div class="cv-contact">
            <span>{{ cv.personal.location }}</span> | 
            <a href="mailto:{{ cv.personal.email }}">{{ cv.personal.email }}</a> 
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
                {%- for bullet in cv.summary %}
                <li><span>{{ bullet }}</span></li>
                {%- endfor %}
            </ul>
        </div>
    </section>

    <section class="cv-section">
        <h2 class="cv-section-title">Professional Experience</h2>
        {% for exp in cv.experience %}
        <div class="cv-experience-item">
            <div class="exp-header" data-exp-index="{{ loop.index0 }}">
                <div class="exp-title-row">
                    <h3 class="exp-title">{{ exp.title }}</h3>
                    <button class="exp-toggle" type="button" aria-expanded="false" aria-controls="exp-details-{{ loop.index0 }}">▼</button>
                </div>
                <div class="exp-meta">
                    <span class="exp-company">{{ exp.company }}</span>
                    <span class="exp-location">{{ exp.location }}</span>
                    <span class="exp-period">{{ exp.period }}</span>
                </div>
            </div>
            <div class="exp-details" id="exp-details-{{ loop.index0 }}" aria-hidden="true">
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
            {% for skill in cv.skills %}
            <div class="skill-category" data-skill-index="{{ loop.index0 }}">
                <div class="skill-header">
                    <h3 class="skill-category-title">{{ skill.title }}</h3>
                    <button class="skill-toggle" type="button" aria-expanded="false" aria-controls="skill-details-{{ loop.index0 }}">▼</button>
                </div>
                <div class="skill-details" id="skill-details-{{ loop.index0 }}" aria-hidden="true">
                    {% for item in skill.items %}
                    <div class="skill-line">
                        <strong>{{ item.label }}:</strong> {{ item.values | join: ", " }}
                    </div>
                    {% endfor %}
                    <div class="skill-description">{{ skill.description }}</div>
                </div>
            </div>
            {% endfor %}
        </div>
    </section>

    <section class="cv-section">
        <h2 class="cv-section-title">Key Projects</h2>
        <div class="cv-projects">
            {% for project in cv.projects %}
            <div class="project-item" data-project-index="{{ loop.index0 }}">
                <div class="project-header">
                    <h3 class="project-title">{{ project.name }}</h3>
                    <span class="project-period">{{ project.period }}</span>
                    <button class="project-toggle" type="button" aria-expanded="false" aria-controls="project-details-{{ loop.index0 }}">▼</button>
                </div>
                <div class="project-details" id="project-details-{{ loop.index0 }}" aria-hidden="true">
                    <p class="project-description">{{ project.description }}</p>
                    <div class="project-impact">
                        <strong>Impact:</strong> {{ project.impact }}
                    </div>
                    <div class="project-technologies">
                        <strong>Technologies:</strong> {{ project.technologies | join: ", " }}
                    </div>
                </div>
            </div>
            {% endfor %}
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
        <div class="chat-toggle">
            Ask My Digital Proxy
        </div>
        <div class="chat-modal" id="chat-modal">
            <div class="chat-modal-overlay"></div>
            <div class="chat-modal-content">
                <div class="chat-header">
                    <h3>{{ cv.chat.welcome }}</h3>
                    <button class="chat-close" type="button">×</button>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="chat-intro" id="chat-intro">
                        Hi! I'm here to answer questions about Kris's background, experience, and skills. Click on any question below or type your own.
                    </div>
                    <div class="chat-sample-questions" id="sample-questions">
                    {%- for question in cv.chat.sample_questions %}
                    <div class="sample-question">{{ question }}</div>
                    {%- endfor %}

                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" id="chat-input" placeholder="Ask me anything about Kris's CV..." />
                    <button type="button" class="chat-send">Send</button>
                </div>
            </div>
        </div>
    </div>
</div>
