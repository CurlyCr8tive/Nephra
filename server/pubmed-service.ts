/**
 * PubMed API Service for fetching kidney health research abstracts
 * Uses the free NCBI E-utilities API (no API key required for basic usage)
 */

export interface PubMedArticle {
  id: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  link: string;
  category: 'research';
  authors?: string[];
  journal?: string;
  pmid: string;
}

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const KIDNEY_SEARCH_TERMS = [
  'chronic kidney disease',
  'kidney transplant',
  'dialysis treatment',
  'glomerular filtration rate',
  'renal function'
];

/**
 * Search PubMed for kidney-related articles
 */
async function searchPubMed(query: string, maxResults: number = 10): Promise<string[]> {
  try {
    const encodedQuery = encodeURIComponent(`${query} AND (kidney OR renal)`);
    const url = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmax=${maxResults}&sort=date&retmode=json`;
    
    console.log(`🔬 Searching PubMed: ${query}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`PubMed search returned status ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.esearchresult?.idlist || [];
    
  } catch (error) {
    console.error('Error searching PubMed:', error);
    return [];
  }
}

/**
 * Fetch article details from PubMed by PMID
 */
async function fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  
  try {
    const idList = pmids.join(',');
    const url = `${PUBMED_BASE_URL}/esummary.fcgi?db=pubmed&id=${idList}&retmode=json`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`PubMed summary fetch returned status ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const articles: PubMedArticle[] = [];
    
    if (data.result) {
      for (const pmid of pmids) {
        const articleData = data.result[pmid];
        if (articleData && articleData.title) {
          // Format the publication date
          let formattedDate: string;
          try {
            const pubDate = articleData.pubdate || articleData.sortpubdate;
            const date = new Date(pubDate);
            formattedDate = date.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
          } catch {
            formattedDate = articleData.pubdate || new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
          }
          
          // Extract authors
          const authors = articleData.authors?.map((a: { name: string }) => a.name) || [];
          
          articles.push({
            id: `pubmed_${pmid}`,
            title: articleData.title,
            date: formattedDate,
            summary: articleData.title, // PubMed summary doesn't include abstract in esummary
            source: 'PubMed Research',
            link: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            category: 'research',
            authors: authors.slice(0, 3), // First 3 authors
            journal: articleData.source || articleData.fulljournalname,
            pmid
          });
        }
      }
    }
    
    return articles;
    
  } catch (error) {
    console.error('Error fetching PubMed article details:', error);
    return [];
  }
}

/**
 * Fetch abstract for a specific article
 */
async function fetchAbstract(pmid: string): Promise<string> {
  try {
    const url = `${PUBMED_BASE_URL}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return '';
    }
    
    const text = await response.text();
    
    // Extract just the abstract portion
    const abstractMatch = text.match(/Abstract[:\s]*([\s\S]*?)(?=\n\n|Author information|Copyright|PMID)/i);
    if (abstractMatch) {
      return abstractMatch[1].trim().substring(0, 500);
    }
    
    return text.substring(0, 500);
    
  } catch (error) {
    console.error(`Error fetching abstract for ${pmid}:`, error);
    return '';
  }
}

/**
 * Fetch latest kidney health research from PubMed
 */
export async function fetchPubMedArticles(limit: number = 10): Promise<PubMedArticle[]> {
  console.log('🔬 Fetching PubMed kidney research articles...');
  
  try {
    // Search for recent kidney-related articles
    const searchQuery = 'chronic kidney disease OR kidney transplant OR dialysis';
    const pmids = await searchPubMed(searchQuery, limit);
    
    if (pmids.length === 0) {
      console.log('No PubMed articles found');
      return [];
    }
    
    console.log(`Found ${pmids.length} PubMed articles`);
    
    // Fetch article details
    const articles = await fetchArticleDetails(pmids);
    
    // Fetch abstracts for first 5 articles (to avoid rate limiting)
    for (let i = 0; i < Math.min(5, articles.length); i++) {
      const abstract = await fetchAbstract(articles[i].pmid);
      if (abstract) {
        articles[i].summary = abstract;
      }
    }
    
    console.log(`✅ Retrieved ${articles.length} PubMed articles`);
    return articles;
    
  } catch (error) {
    console.error('Error in PubMed article fetch:', error);
    return [];
  }
}

/**
 * Search PubMed for a specific topic
 */
export async function searchPubMedTopic(topic: string, limit: number = 5): Promise<PubMedArticle[]> {
  console.log(`🔬 Searching PubMed for: ${topic}`);
  
  try {
    const pmids = await searchPubMed(topic, limit);
    
    if (pmids.length === 0) {
      return [];
    }
    
    const articles = await fetchArticleDetails(pmids);
    
    // Fetch abstracts for these articles
    for (const article of articles) {
      const abstract = await fetchAbstract(article.pmid);
      if (abstract) {
        article.summary = abstract;
      }
    }
    
    return articles;
    
  } catch (error) {
    console.error(`Error searching PubMed for ${topic}:`, error);
    return [];
  }
}
