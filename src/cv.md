---
layout: home.njk
title: CV
permalink: /cv/index.html
extra_css:
  - /assets/css/cv.css
extra_js:
  - /assets/js/cv.js
---

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
                <div class="chat-messages" id="chat-messages">
                    <div class="chat-intro" id="chat-intro">
                        Hi! I'm here to answer questions about Kris's background, experience, and skills. Click on any question below or type your own.
                    </div>
                    <div class="chat-sample-questions" id="sample-questions">
                    {%- for question in cv.chat.sample_questions %}
                    <div class="sample-question" onclick="askSampleQuestion('{{ question | replace: "'", "\\'" }}')">{{ question }}</div>
                    {%- endfor %}

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
