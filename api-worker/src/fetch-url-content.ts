export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CVFitAssessment/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      // Provide clearer messages for common status codes
      handleError(response);
    }

    const html = await response.text();

    // Basic HTML to text conversion - strip tags and decode entities
    let text = cleanHtml(html);

    // Limit content length to avoid token limits
    if (text.length > 15000) {
      text = `${text.substring(0, 15000)}...`;
    }

    return text;
  } catch (error) {
    // Re-throw the original, user-friendly error message when possible
    if (error && error instanceof Error && error.message) {
      throw error;
    }
    throw new Error(`URL fetch failed: ${String(error)}`);
  }
}

function cleanHtml(html: string): string {
  return (
    html
      // Remove script and style content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Replace block elements with newlines
      .replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
      // Remove remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
  );
}

function handleError(response: Response) {
  if (response.status === 400) {
    throw new Error(
      'Invalid URL or request. Please verify the address and try again, or paste the job details directly.',
    );
  }
  if (response.status === 403 || response.status === 401) {
    throw new Error(
      'That webpage is not publicly accessible. Please paste the job contents into the Job Description field and try again.',
    );
  }
  if (response.status === 404) {
    throw new Error(
      'That webpage could not be found (404). Please verify the URL or paste the job contents into the Job Description field.',
    );
  }
  if (response.status === 429) {
    throw new Error(
      'The site appears to be rate-limiting requests (429). Try again later or paste the job description directly.',
    );
  }
  if (response.status >= 500) {
    throw new Error(
      `The remote site returned a server error (${response.status}). Please try again later or paste the job contents.`,
    );
  }
  throw new Error(`Failed to fetch URL: ${response.status}`);
}
