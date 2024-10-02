# Aging Coder Blog

This is a blog site built using [Eleventy](https://www.11ty.dev/), a simple static site generator. The site is designed to be easy to use and extend, with a focus on simplicity and performance.

## Features

- **Static Site Generation**: Fast and efficient static site generation with Eleventy.
- **Markdown Support**: Write your posts in Markdown.
- **Nunjucks Templating**: Use Nunjucks for templating.
- **Date Formatting**: Format dates using `nunjucks-date`.
- **Syntax Highlighting**: Code syntax highlighting with `@11ty/eleventy-plugin-syntaxhighlight`.
- **RSS Feed**: Generate RSS feeds with `@11ty/eleventy-plugin-rss`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/kriserickson/aging-coder.git
    cd aging-coder
    ```

2. Install the dependencies:

    ```sh
    npm i
    ```

### Usage

Your probably going to want to wipe out the src/posts directory and start fresh.  You can do this by running the following command:

```sh
rm -rf src/posts/*
```

#### Development

To start a local development server:

```sh
npm run serve
```

This will build the site and start a local server at `http://localhost:8080/`. The site will automatically rebuild and refresh when you make changes.

#### Build

To build the site for production:

```sh
npm run build
```

The generated site will be in the `_site` directory.

#### Clean

To clean the build directory:

```sh
npm run clean
```

#### Create a New Post

To create a new draft post:

```sh
npm run draft "Your Post Title"
```

This will create a new Markdown file in the `src/posts` directory with the current date and a slugified version of the title.

## Project Structure

- `src/`: Source files for the site.
  - `posts/`: Blog posts in Markdown format.
  - `index.njk`: Main template file.
- `js/`: JavaScript files.
  - `create-post.js`: Script to create new posts.
- `_site/`: Generated site (build output).
- `package.json`: Project configuration and dependencies.

