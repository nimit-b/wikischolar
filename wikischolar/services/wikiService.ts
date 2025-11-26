import { SearchResult, TopicData, WikiSection, RelatedTopic } from '../types';

const API_BASE = 'https://en.wikipedia.org/w/api.php';

export const searchTopics = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: '5',
    namespace: '0',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`);
    const data = await response.json();
    const titles = data[1] || [];
    const descriptions = data[2] || [];
    const urls = data[3] || [];
    
    return titles.map((title: string, index: number) => ({
      title,
      description: descriptions[index] || '',
      url: urls[index]
    }));
  } catch (error) {
    console.error('Wiki search error:', error);
    return [];
  }
};

const processWikiContent = (rawHtml: string): { overview: string, sections: WikiSection[] } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 1. Clean the DOM of unwanted elements
  const selectorsToRemove = [
    '.mw-editsection',       // [edit] links
    '.reference',            // [1][2] numbers
    '.reflist',              // Reference lists at bottom
    '.box-More_citations_needed', // Warning boxes
    '.box-Empty_section',
    '.navbox',               // Bottom navigation
    '.infobox',              // Side tables (often break mobile view, extract image separately if needed)
    '.sidebar',
    '.hatnote',              // "Main article: ..." (we could keep these, but they clutter)
    'style',
    'script',
    'link',
    '.mw-empty-elt'
  ];

  selectorsToRemove.forEach(selector => {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  });

  // 2. Fix Image URLs (Protocol Relative)
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('//')) {
      img.setAttribute('src', `https:${src}`);
    }
    // Remove fixed dimensions to allow CSS to handle it
    img.removeAttribute('width');
    img.removeAttribute('height');
    // Ensure parent figure/divs don't restrict width too much
    if (img.parentElement?.classList.contains('thumbinner')) {
        img.parentElement.style.width = 'auto';
    }
  });

  // 3. Split into sections
  const sections: WikiSection[] = [];
  let currentSection: WikiSection | null = null;
  let overviewHtml = '';
  
  // The structure is usually: <p>Overview text...</p> <h2>Section 1</h2> <p>Text...</p>
  
  // Get all children of the body (parseFromString puts content in body)
  const children = Array.from(doc.body.children);
  
  let processingOverview = true;
  let currentContent: HTMLElement[] = [];

  const commitSection = () => {
    if (currentContent.length === 0) return;
    
    const html = currentContent.map(el => el.outerHTML).join('');
    
    if (processingOverview) {
      overviewHtml = html;
    } else if (currentSection) {
      currentSection.contentHtml = html;
      sections.push(currentSection);
    }
    currentContent = [];
  };

  children.forEach(node => {
    if (node.tagName === 'H2') {
      // Finish previous section
      commitSection();
      
      // Start new section
      processingOverview = false;
      const titleSpan = node.querySelector('.mw-headline');
      const title = titleSpan ? titleSpan.textContent || '' : node.textContent || '';
      
      currentSection = {
        id: `sec-${sections.length}`,
        title: title,
        level: 2,
        contentHtml: ''
      };
    } else if (node.tagName === 'H3' || node.tagName === 'H4') {
        // We include h3/h4 in the current section flow for simplicity, 
        // or we could make them separate subsections. 
        // For a flat reader view, keeping them as styled headers inside the H2 section is better.
        currentContent.push(node as HTMLElement);
    } else {
       // Only add significant content
       if (node.textContent?.trim() || node.tagName === 'IMG' || node.querySelector('img')) {
          currentContent.push(node as HTMLElement);
       }
    }
  });
  
  // Commit last section
  commitSection();

  // Add Overview as the first section if it exists
  if (overviewHtml) {
      sections.unshift({
          id: 'overview',
          title: 'Overview',
          level: 1,
          contentHtml: overviewHtml
      });
  }

  return { overview: overviewHtml, sections: sections.filter(s => s.contentHtml.length > 50) };
};

export const getTopicDetails = async (title: string): Promise<{ topic: TopicData, related: RelatedTopic[] } | null> => {
  // 1. Get parsed HTML
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    page: title,
    prop: 'text|images|displaytitle',
    disabletoc: '1',
    mobileformat: '1',
    redirects: '1',
    origin: '*'
  });

  // 2. Get high-res thumbnail and summary info
  const infoParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'pageimages|links|info|extracts',
    piprop: 'original|thumbnail', // Get original for hero, thumbnail for fallback
    pithumbsize: '1000', // Large hero
    pllimit: '20',
    plnamespace: '0',
    inprop: 'url',
    explaintext: '1', // Plain text for generator
    exintro: '0', // Full text for generator
    origin: '*'
  });

  try {
    const [parseRes, infoRes] = await Promise.all([
      fetch(`${API_BASE}?${params.toString()}`),
      fetch(`${API_BASE}?${infoParams.toString()}`)
    ]);

    const parseData = await parseRes.json();
    const infoData = await infoRes.json();

    if (parseData.error || !parseData.parse) return null;

    const pageId = Object.keys(infoData.query?.pages || {})[0];
    const infoPage = infoData.query?.pages[pageId];

    // Process HTML structure
    const rawHtml = parseData.parse.text['*'];
    const { sections } = processWikiContent(rawHtml);

    // Get Title (stripped of HTML)
    const rawTitle = parseData.parse.displaytitle || title;
    // DOMParser to decode entities and strip tags from title
    const titleDoc = new DOMParser().parseFromString(rawTitle, 'text/html');
    const cleanTitle = titleDoc.body.textContent || title;

    // Get Image
    const heroImage = infoPage?.original?.source || infoPage?.thumbnail?.source;

    const topic: TopicData = {
      title: cleanTitle,
      sections: sections,
      thumbnail: heroImage,
      url: infoPage?.fullurl || `https://en.wikipedia.org/wiki/${title}`
    };

    const related: RelatedTopic[] = (infoPage?.links || [])
      .map((link: any) => ({ title: link.title }))
      .filter((r: RelatedTopic) => !r.title.startsWith('List of') && !r.title.startsWith('Category:'));

    return { topic, related };
  } catch (error) {
    console.error('Wiki details error:', error);
    return null;
  }
};
