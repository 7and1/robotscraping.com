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
      description: 'Free tier: 5 requests/day. Pro tier: $29/month for 1,000 requests/day.',
    },
    description:
      'AI-powered web scraping API that uses Cloudflare Browser Rendering and LLMs to extract structured data from any website. No brittle CSS selectors required.',
    featureList: [
      'AI-powered content extraction using GPT-4o-mini and Claude Haiku',
      'Cloudflare Browser Rendering for dynamic pages',
      'Scheduled scraping with cron expressions',
      'Webhook notifications for async jobs',
      'D1 + R2 storage for audit trails',
      'RESTful API with SDK-ready responses',
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
        name: 'How do I get started?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Get an API key from the dashboard, then send a POST request to /extract with your target URL and desired fields. Check the documentation for code examples in JavaScript, Python, and cURL.',
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
    ],
  };
}

export function StructuredData() {
  const schemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
    generateSoftwareSchema(),
    generateFAQSchema(),
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
