import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { kv } from '@vercel/kv';

const app = new Hono();

// CORS configuration
app.use('/*', cors({
  origin: ['http://localhost:8888', 'https://your-domain.com'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// CV data - in production, this could come from a database or external source
const cvData = {
  personal: {
    name: "Kris Erickson",
    location: "Vancouver, BC",
    email: "kristian.erickson@gmail.com",
    phone: "604-908-0432",
    github: "https://github.com/kriserickson",
    linkedin: "https://linkedin.com/in/kristian-l-erickson"
  },
  summary: "25+ years of building and modernizing enterprise SaaS and software platforms, with expertise in scalable, reliable, and maintainable systems. Helped architect and develop systems which processed millions of prints per year across 10+ countries; web + kiosk platforms handled ~$1B in annual sales at peak. Successfully managed, mentored, and grew high-performing development teams of up to 15 programmers. Championed adoption of modern development practices, including AI coding tools (Copilot since 2021; Cursor, Windsurf; modern agentic tooling) to accelerate delivery and code quality. Expert in modernizing and integrating legacy systems into scalable, maintainable platforms used by major retailers and high-volume consumer channels. Passionate about leveraging AI/ML and emerging technologies to deliver real-world products. Experienced in applying machine learning and automation to improve workflows and customer experiences. Pragmatic problem solver, recognized for delivering robust, maintainable solutions on time.",
  experience: [
    {
      title: "Director of Software Development",
      company: "Storefront.com / Macdonald Harris and Associates",
      location: "Vancouver, BC",
      period: "August 2020 – July 2025",
      achievements: [
        "Directed company-wide software strategy, architecture, and full-cycle delivery across web, mobile, and kiosk platforms.",
        "Created and delivered consumer-facing mobile applications in accelerated timelines, achieving widespread adoption and measurable customer impact.",
        "Led modernization of critical legacy systems, integrating web and mobile platforms, improving maintainability, reducing operational costs, and increasing system performance and stability.",
        "Co-architected and delivered a distributed SaaS platform for customizable products and e-commerce integrations, leveraging microservices and APIs.",
        "Oversaw development of core libraries and production systems, ensuring accuracy, efficiency, and reliability in high-volume workflows.",
        "Managed and mentored teams of up to 10 developers; implemented structured career development paths, guiding early-career engineers into senior and leadership roles."
      ]
    },
    {
      title: "Team Lead / Senior Software Architect",
      company: "Storefront.com / Macdonald Harris and Associates",
      location: "Vancouver, BC",
      period: "January 2010 – July 2020",
      achievements: [
        "Led the launch and architecture of new Android-based platforms that doubled engagement and revenue while improving security and user experience.",
        "Designed and developed the Kiosk File Transfer and Payment system in Node.js and React, enabling seamless photo transfer from mobile devices to kiosks and secure phone-based payments — eliminating kiosk credit card hardware costs and security risks. Adopted by thousands of legacy Windows and modern Android kiosks across multiple major retailers.",
        "Architected and implemented the Storefront Remote Management platform for centralized monitoring, remote access, scheduling, and automated error reporting for kiosks, lab software, and printers. Scaled to over 30,000 devices and sustained backend throughput of 12,000 requests per minute.",
        "Directed agile teams of 10–15 developers through multiple full-cycle deliveries, integrating product, QA, and operations teams to accelerate time-to-market.",
        "Enhanced the Storefront E-Commerce platform and backend administrative tools with dozens of new features, streamlining retailer workflows, increasing adoption rates, and improving the end-customer experience.",
        "Delivered retailer-specific integrations and plugins enabling online customization and ordering of photo products — including photo books, calendars, and template-based prints — directly from partner websites, expanding market reach and transaction volume."
      ]
    }
  ],
  skills: {
    frontend: {
      technologies: ["TypeScript", "JavaScript", "Vue", "React", "Angular", "HTML", "CSS"],
      tools: ["Vite", "Webpack", "Rollup", "Gulp", "Websockets", "PWAs"],
      description: "Expert in modern frontend development with complex build systems and real-time applications."
    },
    backend: {
      technologies: ["PHP", "C#", "Node.js", "Python"],
      integration: ["Solace", "Kafka", "RabbitMQ", "REST APIs", "GraphQL"],
      description: "Strong backend development experience with message buses and API design."
    },
    ai_ml: {
      technologies: ["PyTorch", "OpenCV", "Scikit-learn", "Hugging Face Transformers"],
      specialties: ["Fine-tuning LLMs (LoRA, SIT)", "prompt engineering", "AI-assisted coding tools"],
      tools: ["GitHub Copilot", "Cursor", "Windsurf", "agentic development environments"],
      description: "Passionate about AI/ML with hands-on experience in machine learning and modern AI tools."
    }
  }
};

// Rate limiting middleware
async function checkRateLimit(c, clientId) {
  const kv = c.env.RATE_LIMIT;
  const today = new Date().toISOString().split('T')[0];
  const key = `rate_limit:${clientId}:${today}`;
  
  const current = await kv.get(key);
  const count = current ? parseInt(current) : 0;
  const limit = parseInt(c.env.DAILY_LIMIT || '30');
  
  if (count >= limit) {
    return false;
  }
  
  await kv.set(key, (count + 1).toString(), { expirationTtl: 86400 });
  return true;
}

// Analytics tracking
async function trackAnalytics(c, clientId, message, response) {
  const analytics = {
    timestamp: new Date().toISOString(),
    clientId: clientId,
    message: message,
    responseLength: response.length,
    userAgent: c.req.header('User-Agent')
  };
  
  // In production, you'd send this to your analytics service
  console.log('Analytics:', JSON.stringify(analytics));
}

// Simple chat response function
function generateChatResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Context-aware responses based on CV data
  if (lowerMessage.includes('experience') || lowerMessage.includes('background')) {
    return `Kris has ${cvData.experience.length} major roles, most recently as Director of Software Development at Storefront.com (2020-2025). He has 25+ years of experience building enterprise SaaS platforms that have processed millions of prints and handled ~$1B in annual sales.`;
  }
  
  if (lowerMessage.includes('skills') || lowerMessage.includes('technologies')) {
    const skills = Object.keys(cvData.skills);
    return `Kris's key skills include: ${skills.join(', ')}. He's particularly strong in frontend development (TypeScript, React, Vue), backend systems (Node.js, Python, C#), and AI/ML technologies (PyTorch, fine-tuning LLMs).`;
  }
  
  if (lowerMessage.includes('education')) {
    return `Kris has an Honours BA in English Literature from University of Western Ontario (1993) and completed the Advanced Computer Studies and Technology Program at Langara College (1995-1998).`;
  }
  
  if (lowerMessage.includes('team') || lowerMessage.includes('manage')) {
    return `Kris has managed teams of up to 15 developers, implementing structured career development paths and mentoring early-career engineers into senior and leadership roles. He's experienced in agile methodologies and full-cycle delivery.`;
  }
  
  if (lowerMessage.includes('project') || lowerMessage.includes('achievement')) {
    return `Key projects include the Storefront E-Commerce Platform (operational for 25+ years), Kiosk File Transfer and Payment system, and a Remote Management platform that scaled to 30,000+ devices with 12,000 requests/minute throughput.`;
  }
  
  if (lowerMessage.includes('contact') || lowerMessage.includes('email') || lowerMessage.includes('reach')) {
    return `You can reach Kris at kristian.erickson@gmail.com or 604-908-0432. He's also on GitHub (kriserickson) and LinkedIn (kristian-l-erickson).`;
  }
  
  // Default response
  return `I can tell you about Kris's experience, skills, education, projects, or how to contact him. What specific aspect would you like to know more about?`;
}

// Chat endpoint
app.post('/api/chat', async (c) => {
  try {
    const { message } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    
    // Get client ID for rate limiting (using IP address as simple identifier)
    const clientId = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    
    // Check rate limit
    const canProceed = await checkRateLimit(c, clientId);
    if (!canProceed) {
      return c.json({ error: 'Daily question limit reached. Please try again tomorrow.' }, 429);
    }
    
    // Generate response
    const response = generateChatResponse(message);
    
    // Track analytics
    await trackAnalytics(c, clientId, message, response);
    
    return c.json({ response });
    
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default {
  fetch: app.fetch,
};