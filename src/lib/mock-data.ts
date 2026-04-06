export interface ScrapeResult {
  url: string;
  category: { name: string; confidence: number };
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  images: { src: string; alt: string }[];
  links: { href: string; text: string }[];
  tables: string[][];
  meta: { key: string; value: string }[];
  scrapedAt: string;
}

export const CATEGORIES = [
  "E-commerce", "Blog", "News", "Video", "Job Portal",
  "Academic", "Documentation", "Social Media", "Other"
] as const;

export const MOCK_RESULTS: ScrapeResult[] = [
  {
    url: "https://example-shop.com/products",
    category: { name: "E-commerce", confidence: 0.94 },
    title: "Premium Tech Store — Latest Gadgets",
    description: "Discover cutting-edge technology products at unbeatable prices.",
    headings: ["Featured Products", "New Arrivals", "Best Sellers", "Customer Reviews"],
    paragraphs: [
      "Browse our curated collection of premium electronics and accessories.",
      "Free shipping on orders over $50. 30-day money-back guarantee.",
      "Trusted by over 50,000 customers worldwide since 2019.",
    ],
    images: [
      { src: "/placeholder.svg", alt: "Wireless Headphones Pro X" },
      { src: "/placeholder.svg", alt: "Smart Watch Ultra" },
      { src: "/placeholder.svg", alt: "USB-C Hub Adapter" },
    ],
    links: [
      { href: "/products/headphones", text: "Wireless Headphones — $129.99" },
      { href: "/products/watch", text: "Smart Watch Ultra — $349.99" },
      { href: "/products/hub", text: "USB-C Hub — $49.99" },
      { href: "/cart", text: "View Cart" },
    ],
    tables: [
      ["Product", "Price", "Rating", "Stock"],
      ["Headphones Pro X", "$129.99", "4.8★", "In Stock"],
      ["Smart Watch Ultra", "$349.99", "4.6★", "Low Stock"],
      ["USB-C Hub", "$49.99", "4.9★", "In Stock"],
    ],
    meta: [
      { key: "og:type", value: "website" },
      { key: "robots", value: "index, follow" },
    ],
    scrapedAt: new Date().toISOString(),
  },
  {
    url: "https://tech-blog.io/ai-trends",
    category: { name: "Blog", confidence: 0.89 },
    title: "AI Trends 2026 — What's Next in Machine Learning",
    description: "A deep dive into emerging AI trends shaping the future of technology.",
    headings: ["Introduction", "Trend 1: Autonomous Agents", "Trend 2: Multimodal AI", "Conclusion"],
    paragraphs: [
      "The AI landscape is evolving at an unprecedented pace in 2026.",
      "Autonomous agents are becoming capable of complex multi-step reasoning.",
      "Multimodal models now seamlessly process text, images, audio, and video.",
    ],
    images: [{ src: "/placeholder.svg", alt: "AI Neural Network Visualization" }],
    links: [
      { href: "/author/suchet", text: "Written by Suchet" },
      { href: "/category/ai", text: "More AI Articles" },
    ],
    tables: [],
    meta: [
      { key: "author", value: "Suchet" },
      { key: "published", value: "2026-03-15" },
    ],
    scrapedAt: new Date().toISOString(),
  },
];

export const DUMMY_USERS = ["Suchet", "Ayush", "Siddharth"];

export function simulateScrape(url: string): Promise<ScrapeResult> {
  return new Promise((resolve) => {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setTimeout(() => {
      resolve({
        url,
        category: { name: cat, confidence: 0.7 + Math.random() * 0.25 },
        title: `Scraped: ${new URL(url).hostname}`,
        description: `Content extracted from ${url}`,
        headings: ["Main Heading", "Section 1", "Section 2"],
        paragraphs: [
          "This is extracted paragraph content from the target page.",
          "The scraper successfully parsed the DOM structure.",
        ],
        images: [{ src: "/placeholder.svg", alt: "Extracted image" }],
        links: [
          { href: url + "/about", text: "About Page" },
          { href: url + "/contact", text: "Contact" },
        ],
        tables: [
          ["Column A", "Column B", "Column C"],
          ["Data 1", "Data 2", "Data 3"],
        ],
        meta: [{ key: "generator", value: "ScrapeLab AI" }],
        scrapedAt: new Date().toISOString(),
      });
    }, 2500);
  });
}
