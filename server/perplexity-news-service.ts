/**
 * Perplexity API Service for fetching real-time kidney health news
 * Uses the Perplexity sonar model with online search capabilities
 */

export interface PerplexityNewsArticle {
  id: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  link: string;
  category: 'research' | 'treatment' | 'policy' | 'prevention' | 'general';
  relevanceScore: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }[];
  citations?: string[];
}

/**
 * Call Perplexity API for real-time kidney health news
 */
async function callPerplexityForNews(): Promise<PerplexityResponse | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.warn('Perplexity API key not configured');
    return null;
  }
  
  try {
    const systemPrompt = `You are a kidney health news aggregator. Your task is to find and summarize the most recent and relevant kidney health news from the past week.

Focus on:
- Chronic kidney disease (CKD) research and treatments
- Kidney transplant advancements
- Dialysis innovations
- Policy changes affecting kidney patients
- Prevention and lifestyle news
- Clinical trial results

Return your response as a valid JSON array of news articles with this exact format:
[
  {
    "title": "Article title",
    "date": "Month Day, Year",
    "summary": "2-3 sentence summary",
    "source": "Source name",
    "link": "URL",
    "category": "research|treatment|policy|prevention|general",
    "relevanceScore": 85
  }
]

Return ONLY the JSON array, no other text. Include 5-8 recent articles.`;

    const userPrompt = `Find the latest kidney health news from the past week. Include news about CKD research, transplants, dialysis, Medicare coverage for kidney patients, and any breakthrough treatments. Return as JSON array only.`;

    console.log('🤖 Calling Perplexity API for real-time news...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 3000,
        return_citations: true,
        search_recency_filter: 'week'
      })
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Perplexity API error: ${response.status} - ${errorBody}`);
      return null;
    }
    
    return await response.json() as PerplexityResponse;
    
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    return null;
  }
}

/**
 * Parse Perplexity response into news articles
 */
function parsePerplexityResponse(response: PerplexityResponse): PerplexityNewsArticle[] {
  try {
    const content = response.choices[0]?.message?.content;
    if (!content) return [];
    
    // Try to extract JSON from the response
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Find JSON array in the content
    const jsonStart = jsonContent.indexOf('[');
    const jsonEnd = jsonContent.lastIndexOf(']');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }
    
    const articles = JSON.parse(jsonContent);
    
    if (!Array.isArray(articles)) {
      console.warn('Perplexity response is not an array');
      return [];
    }
    
    // Map and validate articles
    return articles.map((article: any, index: number) => ({
      id: `perplexity_${Date.now()}_${index}`,
      title: article.title || 'Untitled Article',
      date: article.date || new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      summary: article.summary || article.description || '',
      source: article.source || 'Perplexity News',
      link: article.link || article.url || '#',
      category: validateCategory(article.category),
      relevanceScore: article.relevanceScore || 80
    })).filter((a: PerplexityNewsArticle) => a.title && a.summary);
    
  } catch (error) {
    console.error('Error parsing Perplexity response:', error);
    return [];
  }
}

/**
 * Validate and normalize category
 */
function validateCategory(category: string): PerplexityNewsArticle['category'] {
  const validCategories = ['research', 'treatment', 'policy', 'prevention', 'general'];
  const normalized = category?.toLowerCase().trim();
  
  if (validCategories.includes(normalized)) {
    return normalized as PerplexityNewsArticle['category'];
  }
  
  return 'general';
}

/**
 * Fetch real-time kidney health news using Perplexity
 */
export async function fetchPerplexityNews(): Promise<PerplexityNewsArticle[]> {
  console.log('🤖 Fetching real-time news via Perplexity...');
  
  const response = await callPerplexityForNews();
  
  if (!response) {
    console.log('No response from Perplexity, returning empty array');
    return [];
  }
  
  const articles = parsePerplexityResponse(response);
  
  console.log(`✅ Retrieved ${articles.length} articles from Perplexity`);
  return articles;
}

/**
 * Search for specific kidney health news topic using Perplexity
 */
export async function searchPerplexityNews(topic: string): Promise<PerplexityNewsArticle[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.warn('Perplexity API key not configured');
    return [];
  }
  
  try {
    const systemPrompt = `You are a kidney health news search assistant. Find recent news articles about the specific topic related to kidney health.

Return your response as a valid JSON array with this format:
[
  {
    "title": "Article title",
    "date": "Month Day, Year",
    "summary": "2-3 sentence summary",
    "source": "Source name",
    "link": "URL",
    "category": "research|treatment|policy|prevention|general",
    "relevanceScore": 85
  }
]

Return ONLY the JSON array, no other text.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Find recent news about: ${topic} related to kidney health or kidney disease` }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        return_citations: true,
        search_recency_filter: 'month'
      })
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json() as PerplexityResponse;
    return parsePerplexityResponse(data);
    
  } catch (error) {
    console.error(`Error searching Perplexity for ${topic}:`, error);
    return [];
  }
}
