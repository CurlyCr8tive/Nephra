/**
 * RSS Feed Service for fetching kidney health news from NKF, NIH, and other sources
 */

export interface RSSArticle {
  id: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  link: string;
  category: 'research' | 'treatment' | 'policy' | 'prevention' | 'general';
}

interface RSSFeed {
  name: string;
  url: string;
  defaultCategory: RSSArticle['category'];
}

const RSS_FEEDS: RSSFeed[] = [
  {
    name: 'National Kidney Foundation',
    url: 'https://www.kidney.org/rss.xml',
    defaultCategory: 'general'
  },
  {
    name: 'NIH Health News',
    url: 'https://www.nih.gov/news-events/news-releases/feed',
    defaultCategory: 'research'
  },
  {
    name: 'MedlinePlus Health',
    url: 'https://medlineplus.gov/feeds/new_rss.xml',
    defaultCategory: 'general'
  },
  {
    name: 'FDA Medical Devices',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-devices/rss.xml',
    defaultCategory: 'treatment'
  }
];

/**
 * Parse RSS/XML feed content to extract articles
 */
function parseRSSContent(xmlContent: string, source: string, defaultCategory: RSSArticle['category']): RSSArticle[] {
  const articles: RSSArticle[] = [];
  
  try {
    // Simple XML parsing using regex (lightweight, no external dependencies)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
    const linkRegex = /<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i;
    const descRegex = /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i;
    const pubDateRegex = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;
    const dcDateRegex = /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i;
    
    let match;
    let index = 0;
    
    while ((match = itemRegex.exec(xmlContent)) !== null && index < 10) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(titleRegex);
      const linkMatch = itemContent.match(linkRegex);
      const descMatch = itemContent.match(descRegex);
      const dateMatch = itemContent.match(pubDateRegex) || itemContent.match(dcDateRegex);
      
      if (titleMatch && linkMatch) {
        const title = cleanHtmlEntities(titleMatch[1].trim());
        const link = cleanHtmlEntities(linkMatch[1].trim());
        const summary = descMatch ? cleanHtmlEntities(descMatch[1].trim()).substring(0, 300) : '';
        const dateStr = dateMatch ? dateMatch[1].trim() : new Date().toISOString();
        
        // Parse and format date
        let formattedDate: string;
        try {
          const date = new Date(dateStr);
          formattedDate = date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
        } catch {
          formattedDate = new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }
        
        // Detect category from content
        const category = detectCategory(title + ' ' + summary, defaultCategory);
        
        articles.push({
          id: `rss_${source.toLowerCase().replace(/\s+/g, '_')}_${index}`,
          title,
          date: formattedDate,
          summary: summary || `Latest update from ${source}`,
          source,
          link,
          category
        });
        
        index++;
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS from ${source}:`, error);
  }
  
  return articles;
}

/**
 * Clean HTML entities from text
 */
function cleanHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect article category from content
 */
function detectCategory(content: string, defaultCategory: RSSArticle['category']): RSSArticle['category'] {
  const lowerContent = content.toLowerCase();
  
  if (/research|study|clinical trial|findings|scientists|researchers/.test(lowerContent)) {
    return 'research';
  }
  if (/treatment|therapy|drug|medication|dialysis|transplant/.test(lowerContent)) {
    return 'treatment';
  }
  if (/policy|medicare|insurance|legislation|coverage|law|regulation/.test(lowerContent)) {
    return 'policy';
  }
  if (/prevention|diet|lifestyle|exercise|risk factor|screening/.test(lowerContent)) {
    return 'prevention';
  }
  
  return defaultCategory;
}

/**
 * Fetch articles from a single RSS feed
 */
async function fetchSingleFeed(feed: RSSFeed): Promise<RSSArticle[]> {
  try {
    console.log(`📰 Fetching RSS feed: ${feed.name}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Nephra-Health-App/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`RSS feed ${feed.name} returned status ${response.status}`);
      return [];
    }
    
    const xmlContent = await response.text();
    return parseRSSContent(xmlContent, feed.name, feed.defaultCategory);
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`RSS feed ${feed.name} timed out`);
    } else {
      console.warn(`Error fetching RSS feed ${feed.name}:`, error);
    }
    return [];
  }
}

/**
 * Fetch articles from all configured RSS feeds
 */
export async function fetchRSSFeeds(): Promise<RSSArticle[]> {
  console.log('📰 Starting RSS feed aggregation...');
  
  try {
    // Fetch all feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => fetchSingleFeed(feed));
    const results = await Promise.allSettled(feedPromises);
    
    // Combine all successful results
    const allArticles: RSSArticle[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`✅ Got ${result.value.length} articles from ${RSS_FEEDS[index].name}`);
        allArticles.push(...result.value);
      } else if (result.status === 'rejected') {
        console.warn(`❌ Failed to fetch ${RSS_FEEDS[index].name}:`, result.reason);
      }
    });
    
    // Sort by date (most recent first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`📰 RSS aggregation complete: ${allArticles.length} total articles`);
    return allArticles;
    
  } catch (error) {
    console.error('Error in RSS feed aggregation:', error);
    return [];
  }
}

/**
 * Fetch articles from a specific source only
 */
export async function fetchRSSFromSource(sourceName: string): Promise<RSSArticle[]> {
  const feed = RSS_FEEDS.find(f => f.name.toLowerCase().includes(sourceName.toLowerCase()));
  
  if (!feed) {
    console.warn(`No RSS feed found for source: ${sourceName}`);
    return [];
  }
  
  return fetchSingleFeed(feed);
}
