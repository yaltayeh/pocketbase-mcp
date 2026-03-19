import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DocumentationIndex } from './docsIndexer.js';
import { generateAnswerFromChunks, suggestSectionFromQuestion } from './docsQuery.js';

// Global documentation index - in a production app, you might want to make this configurable
let docsIndex: DocumentationIndex | null = null;

/**
 * Initialize the documentation index with PocketBase documentation
 * This would typically be called during server startup
 */
export async function initializeDocumentationIndex(): Promise<DocumentationIndex> {
  // For now, we'll create an empty index and populate it later
  // In a real implementation, you would fetch and parse the documentation here
  docsIndex = new DocumentationIndex();
  
  // TODO: Implement actual documentation fetching and indexing
  // This would involve:
  // 1. Using firecrawl to map the documentation site
  // 2. Scraping each documentation page
  // 3. Parsing and chunking the content
  // 4. Adding chunks to the index
  
  console.log('Documentation index initialized (empty for now)');
  return docsIndex;
}

/**
 * Get the documentation index, initializing it if necessary
 */
export function getDocumentationIndex(): DocumentationIndex {
  if (!docsIndex) {
    throw new Error('Documentation index not initialized. Call initializeDocumentationIndex() first.');
  }
  return docsIndex;
}

/**
 * Register documentation-related tools with the MCP server
 */
export function registerDocumentationTools(server: McpServer) {
  // Tool to query the PocketBase documentation
  server.registerTool("query_pocketbase_docs", {
    title: "Query PocketBase Documentation",
    description: "Ask questions about PocketBase features and get answers from the official documentation",
    inputSchema: z.object({
      question: z.string().describe("Question about PocketBase"),
      section: z.enum([
        "collections", 
        "authentication", 
        "records", 
        "files", 
        "realtime", 
        "js-extension", 
        "go-extension", 
        "api"
      ]).optional().describe("Specific documentation section to search in")
    }),
    outputSchema: z.object({
      answer: z.string(),
      sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
        relevance: z.number()
      }))
    }),
    async ({ question, section }) => {
      const index = getDocumentationIndex();
      
      // If a specific section is requested, search only in that section
      let chunks: any[] = [];
      if (section) {
        chunks = index.getBySection(section);
        // Further filter by question relevance
        // For now, we'll just return all chunks from the section
        // A better implementation would score them by relevance to the question
      } else {
        // Search across all documentation
        chunks = index.search(question, 10);
        
        // If we have a suggested section from the question, boost those results
        const suggestedSection = suggestSectionFromQuestion(question);
        if (suggestedSection) {
          const sectionChunks = index.getBySection(suggestedSection);
          // Combine and deduplicate - simplified for now
          const sectionUrls = new Set<string>();
          sectionChunks.forEach((c: any) => sectionUrls.add(c.url));
          const filteredChunks: any[] = [];
          chunks.forEach((c: any) => {
            if (!sectionUrls.has(c.url)) {
              filteredChunks.push(c);
            }
          });
          chunks = [...sectionChunks, ...filteredChunks];
        }
      }
      
      // Generate answer from the chunks
      return generateAnswerFromChunks(question, chunks);
    }
  });
  
  // Tool to list available documentation sections
  server.registerTool("list_doc_sections", {
    title: "List Documentation Sections",
    description: "Get a list of available documentation sections in the PocketBase docs",
    inputSchema: z.object({}),
    outputSchema: z.object({
      sections: z.array(z.string())
    }),
    async () => {
      // Return common PocketBase documentation sections
      return {
        sections: [
          "collections",
          "authentication", 
          "records",
          "files",
          "realtime",
          "js-extension",
          "go-extension",
          "api",
          "getting-started",
          "guides",
          "reference"
        ]
      };
    }
  });
}

/**
 * Register documentation resources with the MCP server
 * These expose documentation as readable resources
 */
export function registerDocumentationResources(server: McpServer) {
  // Resource template for accessing specific documentation sections
  server.registerResourceTemplate(
    "docs://{section}",
    {
      name: "PocketBase Documentation Section",
      description: "Access a specific section of the PocketBase documentation",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const { section } = uri.params;
      const index = getDocumentationIndex();
      const chunks = index.getBySection(section);
      
      if (chunks.length === 0) {
        return {
          contents: [
            {
              type: "text",
              text: `# Documentation Section: ${section}\n\nNo documentation found for this section.`
            }
          ]
        };
      }
      
      // Combine all chunks in the section
      const combinedContent: string[] = [];
      chunks.forEach((chunk: any) => {
        combinedContent.push(`# ${chunk.title}`);
        combinedContent.push('');
        combinedContent.push(chunk.content);
        combinedContent.push('');
        combinedContent.push('---');
        combinedContent.push('');
      });
      
      return {
        contents: [
          {
            type: "text",
            text: `# PocketBase Documentation: ${section}\n\n${combinedContent.join('\n')}`
          }
        ]
      };
    }
  );
  
  // Resource template for accessing specific documentation topics
  server.registerResourceTemplate(
    "docs://{section}/{topic}",
    {
      name: "PocketBase Documentation Topic",
      description: "Access a specific topic within a PocketBase documentation section",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const { section, topic } = uri.params;
      const index = getDocumentationIndex();
      
      // Find chunks that match both section and topic
      const allSectionChunks = index.getBySection(section);
      const matchingChunks: any[] = [];
      allSectionChunks.forEach((chunk: any) => {
        if (
          chunk.title.toLowerCase().includes(topic.toLowerCase()) ||
          chunk.content.toLowerCase().includes(topic.toLowerCase())
        ) {
          matchingChunks.push(chunk);
        }
      });
      
      if (matchingChunks.length === 0) {
        return {
          contents: [
            {
              type: "text",
              text: `# Documentation Topic: ${topic} in ${section}\n\nNo documentation found for this topic in the specified section.`
            }
          ]
        };
      }
      
      // Combine matching chunks
      const combinedContent: string[] = [];
      matchingChunks.forEach((chunk: any) => {
        combinedContent.push(`# ${chunk.title}`);
        combinedContent.push('');
        combinedContent.push(chunk.content);
        combinedContent.push('');
        combinedContent.push('---');
        combinedContent.push('');
      });
      
      return {
        contents: [
          {
            type: "text",
            text: `# PocketBase Documentation: ${section} - ${topic}\n\n${combinedContent.join('\n')}`
          }
        ]
      };
    }
  );
}