---
layout: post
category: Programming
title: "Leveraging LLMs for Coding: Insights and Real-World Experiences"
imagefeature: blog/llms.webp
description: "I've been using LLMs like GitHub Copilot, ChatGPT, Gemini, and Claude for the past couple of years to assist with coding, automate repetitive tasks, and even do language translations—both for computer languages and for generating initial translations for languages like Spanish and French."
tags: ["Programming", "LLM"]
featured: true
---
I've been using LLMs like GitHub Copilot, ChatGPT, Gemini, and Claude for the past couple of years to assist with coding, automate repetitive tasks, and even do language translations—both for computer languages and for generating initial translations for languages like Spanish and French. These tools have transformed the way I approach coding, providing assistance across various aspects of software development. While I have worked with almost all of the popular LLMs, GitHub Copilot and ChatGPT are the two I keep coming back to.  LLM's over the past couple of years have significantly influenced the way I think about development, automation, and efficiency. Here are some of the key advantages and limitations I've experienced while using LLMs in my coding process.

#### Advantages of LLMs in Coding

1. **Reducing Repetitive Tasks**

   LLMs are also great at reducing repetitive tasks, such as converting data formats, generating boilerplate code, or performing bulk text transformations. For example, I've used them to turn a series of JSON entries into a switch statement that returns specific text, or to translate a file from English to Spanish. However, one of the frustrating aspects is that LLMs often give up halfway through such tasks. They might generate part of the output and then suggest that I 'complete the rest myself,' which can be quite irritating since the whole point was to have the LLM handle the repetitive work. Sometimes, with enough prompting, I can cajole it into finishing the task, but more often, it just stops after a few hundred lines. This limitation is a recurring pain point when trying to automate tedious, lengthy tasks.

2. **Creating Tests Efficiently**

   LLMs are quite effective at generating unit and integration tests. Given a function signature and a brief description of its purpose, they can create reasonable test cases that help us verify functionality and catch basic bugs early on. This is especially useful for routine testing tasks that can be time-consuming. However, I've noticed some problems with generating tests using GitHub Copilot. In languages that have multiple test frameworks, it frequently uses the wrong framework, even if the code already has a specific framework selected. Even after correcting it, Copilot might start using the correct framework but then mix it up midway through. For instance, when working with JavaScript, Copilot might initially generate tests in Jest, only to suddenly switch to Mocha syntax, which can be frustrating and require additional corrections.

   Despite these challenges, the ability to quickly scaffold tests provides a strong starting point for us. Instead of writing every test from scratch, Copilot can lay the foundation, allowing us to focus on refining the tests and ensuring edge cases are covered. This process makes us more efficient and helps in maintaining a higher standard of code quality, especially in projects where testing might otherwise be neglected.

3. **Automated Documentation**

   Writing documentation can often be tedious, but LLMs can automate this by generating docblocks and inline comments. By explaining function parameters, return types, and the general purpose of a function, LLMs make it easier to maintain readable, well-documented code. This feature is particularly valuable when working in teams, where clear documentation is essential for collaboration. For example, when working on a shared codebase, Copilot can automatically generate comments that explain what each function does, making it easier for other team members to understand the code without having to ask for clarification.

   Additionally, automated documentation reduces the risk of outdated comments. Since LLMs generate comments based on the current code, they help ensure that the documentation remains in sync with the actual implementation. This is especially useful in fast-paced development environments where code changes frequently and manual updates to documentation can easily be overlooked.

4. **Using the Right Language for the Job**

   One of the most valuable aspects of LLMs is their ability to help me use the correct language or tool for the task at hand. For example, I'm not great at writing bash scripts, but there are often situations where a simple bash script is the best tool for the job. LLMs like GitHub Copilot can quickly generate a bash script for me, saving time and frustration. Whether it's a script to automate file management, a cron job setup, or a utility to parse logs, having an LLM assist with writing these bash commands is incredibly useful.

   The same applies when I need to write a bit of Ruby for a Puppet script, or even create a Dockerfile. While I may not be proficient in these languages or configurations, LLMs allow me to be effective without needing deep expertise. For instance, generating a Puppet manifest in Ruby or setting up an environment using Docker commands becomes much more manageable with LLM assistance.

   This capability extends beyond just generating code—it allows me to bridge skill gaps and use the right tool for each specific job. It means I don't have to avoid using bash, Ruby, or Docker simply because I'm not as familiar with them. LLMs provide enough of a head start that I can create something functional, then iterate as needed. This advantage helps me stay versatile as a developer, using the best language or framework available, even if it isn't one I'm personally comfortable with.

   This capability is especially useful for developers working on cross-platform projects or those who need to quickly adapt to a new language for a specific task. By generating code that follows the best practices of the language, LLMs help us avoid common pitfalls and write cleaner, more maintainable code. It also shortens the learning curve, allowing us to become productive in the new language more quickly.

5. **Writing Idiomatic Code in Unfamiliar Languages**
   
   When learning a new programming language, one of the biggest challenges is writing code that adheres to that language's conventions. LLMs can generate idiomatic code, helping us write in a style that is consistent with best practices, even if we are not yet familiar with the language's nuances. For example, if we're transitioning from JavaScript to Python, LLMs can help us understand Pythonic ways of achieving similar outcomes, such as using list comprehensions instead of traditional loops.

   This capability is especially useful for developers working on cross-platform projects or those who need to quickly adapt to a new language for a specific task. By generating code that follows the best practices of the language, LLMs help us avoid common pitfalls and write cleaner, more maintainable code. It also shortens the learning curve, allowing us to become productive in the new language more quickly.

6. This feature is also beneficial during code reviews or when refactoring langauges that you are not one of your "native" languages. LLMs can provide context for why certain approaches were taken, making it easier to determine whether changes are safe or if there are potential side effects.

#### Limitations of LLMs in Coding

While LLMs are powerful, they have notable limitations, particularly when dealing with larger projects.

1. **Struggles with Larger Codebases**

   LLMs are generally effective for small-scale tasks but struggle with larger, complex systems. They lack a holistic understanding of entire projects, especially those involving hundreds of files and interdependent components, due to context limitations and their inability to access the entire codebase at once. As a result, LLMs are less useful for architectural changes or features that require a deep understanding of the entire codebase. For example, when working on a large microservices architecture, LLMs may provide useful suggestions for individual components but fail to understand how those components interact at a system level.

   Additionally, LLMs have a limited context window, which means they can only process a certain amount of information at a time. In large projects, this limitation becomes apparent, as they can't keep track of all the relevant files and dependencies. This often leads to suggestions that are either incomplete or incorrect because the LLM doesn't have the full picture of the codebase.

2. **Limited Knowledge of Custom Functions and Libraries**
  
   Tools like GitHub Copilot can suggest code snippets and help with common frameworks, but they often fall short when it comes to using custom functions or internal libraries unique to a specific project. They can't fully understand custom logic without explicit context, which limits their ability to contribute meaningfully to advanced projects. For instance, if our project has a custom-built authentication library, Copilot may struggle to use it correctly without detailed comments or examples.

   This limitation is particularly problematic in projects with a lot of proprietary code or domain-specific logic. The LLM might provide generic solutions that don't align well with the established patterns and practices of the project. As a result, developers need to spend time modifying or completely rewriting the generated code to fit the project's requirements, which can offset the productivity gains that LLMs provide.

3. **Evolving Role of GitHub Copilot**
   
   I've been using GitHub Copilot since it was released over three years ago, and I've seen it evolve from being like an auto-complete intellisense tool to something more like a chatbot with "some" understanding of the codebase. While Copilot has improved in providing context-aware suggestions, it frequently doesn't have enough understanding to be truly effective in larger or more complex projects. Additionally, if you're using a language or framework that has changed considerably over the past few years, Copilot will often suggest outdated syntax. If you're stuck using a specific version of a library, Copilot isn't always aware of the differences between the versions, which can lead to incorrect or incompatible code suggestions.

   For example, when working with Vue, Copilot might suggest using Vue 2 options-based syntax, such as `data` and `methods`, even though modern Vue 3 favors the Composition API. It can also get confused between different ways of setting up a Vue 3 component—sometimes suggesting the Options API, sometimes using the Composition API, and occasionally even mixing them up in a single component. This inconsistency can be frustrating when trying to maintain a coherent approach within the project. This can be particularly frustrating when maintaining consistency in a project that adheres to specific version constraints. Similarly, if you're working with a specific version of a popular library like Django, Copilot might suggest code that only works with a newer or older version, leading to confusion and potential errors.

   Despite these challenges, Copilot has become more interactive, allowing us to provide feedback and refine suggestions more easily. This interactivity makes it feel more like a coding partner, albeit one that occasionally needs guidance. The evolution from simple auto-complete to a more context-aware assistant is promising, but there is still a long way to go before it can truly understand and navigate complex, real-world projects.

#### Conclusion

LLMs are great companions for us as developers, especially when it comes to generating tests, writing documentation, and implementing well-known algorithms. They help boost productivity in areas that are repetitive or mundane, allowing us to focus on more creative aspects of our work. However, they are not a replacement for human understanding, particularly in large-scale projects or when working with deeply customized codebases. For now, LLMs are an excellent tool for augmenting our capabilities, but they are not a substitute for deep architectural insight or domain-specific knowledge.

As LLMs continue to evolve, we can expect improvements in their ability to understand larger contexts, provide more accurate suggestions for custom codebases, and stay up to date with the latest language and framework changes. In the meantime, we should view them as powerful aids that enhance our productivity, while still relying on our own expertise to ensure code quality and correctness. By understanding both their strengths and limitations, we can make the most out of what LLMs have to offer and continue to innovate in our development practices.
