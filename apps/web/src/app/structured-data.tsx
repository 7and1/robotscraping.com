const baseUrl = 'https://robotscraping.com';

export function generateOrganizationSchema(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'RobotScraping.com',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/icon.png`,
      width: 512,
      height: 512,
    },
    description: 'AI-powered universal web extraction API on Cloudflare Workers',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'technical support',
      email: 'hello@robotscraping.com',
    },
  };
}

export function generateWebSiteSchema(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'RobotScraping.com',
    description: 'Turn any website into a JSON API with AI-powered web extraction',
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateSoftwareSchema(): Record<string, unknown> {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${baseUrl}/#software`,
    name: 'RobotScraping.com',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description:
        'Free tier: 5 requests/day. GitHub sign-in: 50 requests/day. Paid plans are waitlist-only.',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    description:
      'AI-powered web scraping API that uses Cloudflare Browser Rendering and LLMs to extract structured data from any website. No brittle CSS selectors required.',
    featureList: [
      'AI-powered content extraction using GPT-4o-mini and Claude Haiku',
      'Cloudflare Browser Rendering for dynamic pages',
      'Scheduled scraping with cron expressions',
      'Webhook notifications for async jobs',
      'Batch processing for multiple URLs',
      'Proxy Grid integration with residential/datacenter proxies',
      'Custom headers and cookies support',
      'D1 + R2 storage for audit trails',
      'RESTful API with SDK-ready responses',
      'JavaScript rendering for SPAs and React apps',
      'HMAC-signed webhooks for security',
    ],
  };
}

export function generateFAQSchema(): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does AI web scraping work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'RobotScraping.com renders the target page using Cloudflare Browser Rendering, distills the content, and then uses LLMs (GPT-4o-mini or Claude Haiku) to extract structured data based on your specified fields or schema.',
        },
      },
      {
        '@type': 'Question',
        name: 'What websites can I scrape?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can scrape any publicly accessible website. The service handles JavaScript-heavy sites, SPAs, and traditional HTML pages. Sites with aggressive bot detection may block requests.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is the data extracted accurate?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI extraction is resilient to layout changes but may occasionally make errors. We recommend validating critical data and using specific schemas for better accuracy.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is web scraping legal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Web scraping publicly available data is generally legal, but you should respect robots.txt, terms of service, and data privacy laws like GDPR and CCPA.',
        },
      },
      {
        '@type': 'Question',
        name: 'What LLMs do you support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'RobotScraping.com supports GPT-4o-mini and Claude Haiku for extraction. You can specify your preferred model in the API request.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do webhooks work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When using async mode, provide a webhook_url. The API will POST the extraction result to your endpoint when complete. Verify signatures using the x-webhook-secret header.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the rate limits?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Free tier: 5 requests/day. Pro tier: 1,000 requests/day. All requests are subject to fair use policies. Check X-RateLimit headers in responses.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I scrape JavaScript-heavy sites?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! RobotScraping.com uses Cloudflare Browser Rendering to execute JavaScript and render dynamic content before extraction.',
        },
      },
      {
        '@type': 'Question',
        name: 'What happens when a site blocks scraping?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The API returns a 403 status with blocked: true in the response. Pro users can enable Proxy Grid fallback for improved success rates.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I get started?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Get an API key from the dashboard, then send a POST request to /extract with your target URL and desired fields. The playground on the homepage offers a no-code way to test the API.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a SDK available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The API is RESTful and works with any HTTP client. JavaScript and Python examples are available in the documentation.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is pricing calculated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pricing is per-request. Free tier includes 5 requests/day. GitHub sign-in unlocks 50 requests/day. Paid plans are currently waitlist-only.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I schedule recurring scrapes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Use the /schedules endpoint to create cron-based recurring extraction jobs. Results are delivered via webhook.',
        },
      },
      {
        '@type': 'Question',
        name: 'What happens if a site blocks the scraper?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The API returns a blocked status with error code "blocked". You can implement retry logic with different user agents or use proxy rotation for sensitive sites.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I handle authentication?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Include your API key via the x-api-key header. For scraping protected pages, you can pass custom headers and cookies in the options parameter.',
        },
      },
      {
        '@type': 'Question',
        name: 'What data formats are supported?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The API returns JSON by default. You can specify a JSON schema for structured output, or simply request specific fields to extract.',
        },
      },
    ],
  };
}

export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  const itemListElement = breadcrumbs.map((item, index) => ({
    '@type': 'ListItem' as const,
    position: index + 1,
    name: item.name,
    item: item.url,
  }));

  return {
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

export function generateServiceSchema(): Record<string, unknown> {
  return {
    '@type': 'Service',
    '@id': `${baseUrl}/#service`,
    name: 'AI-Powered Web Scraping API',
    description:
      'Turn any website into structured JSON data using AI. Cloudflare Workers-based extraction service with browser rendering, LLM-powered extraction, and webhook delivery.',
    provider: {
      '@id': `${baseUrl}/#organization`,
    },
    offers: {
      '@type': 'Offer',
      name: 'Web Scraping API',
      description: 'AI-powered web extraction with free and paid tiers',
      priceSpecification: [
        {
          '@type': 'UnitPriceSpecification',
          price: '0',
          priceCurrency: 'USD',
          name: 'Free Tier - 5 requests/day',
        },
        {
          '@type': 'UnitPriceSpecification',
          price: '0',
          priceCurrency: 'USD',
          name: 'GitHub Tier - 50 requests/day',
        },
      ],
    },
    areaServed: 'Worldwide',
    keywords: ['web scraping', 'data extraction', 'API', 'AI', 'LLM', 'browser rendering'],
  };
}

export function StructuredData() {
  const context = 'https://schema.org';
  const schemas = [
    { '@context': context, ...generateOrganizationSchema() },
    { '@context': context, ...generateWebSiteSchema() },
    { '@context': context, ...generateSoftwareSchema() },
    { '@context': context, ...generateServiceSchema() },
    { '@context': context, ...generateFAQSchema() },
    { '@context': context, ...generateBreadcrumbSchema([{ name: 'Home', url: baseUrl }]) },
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export function generateTechArticleSchema(): Record<string, unknown> {
  return {
    '@type': 'TechArticle',
    '@id': `${baseUrl}/docs#techarticle`,
    headline: 'RobotScraping.com API Documentation',
    description:
      'Complete API documentation for AI-powered web scraping. Learn about extraction endpoints, async jobs, scheduled scraping, webhooks, and error handling.',
    author: {
      '@type': 'Organization',
      name: 'RobotScraping.com',
      url: baseUrl,
    },
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    datePublished: '2025-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/docs`,
    },
    inLanguage: 'en-US',
    keywords: [
      'web scraping API',
      'AI data extraction',
      'Cloudflare Workers scraping',
      'async scraping',
      'scheduled scraping',
      'webhook integration',
    ],
    articleSection: [
      'Quickstart',
      'Extraction API',
      'Async Mode',
      'Jobs',
      'Schedules',
      'Webhooks',
      'Error Codes',
    ],
  };
}

export function DocsStructuredData() {
  const context = 'https://schema.org';
  const schemas = [
    {
      '@context': context,
      ...generateBreadcrumbSchema([
        { name: 'Home', url: baseUrl },
        { name: 'API Docs', url: `${baseUrl}/docs` },
      ]),
    },
    { '@context': context, ...generateTechArticleSchema() },
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
