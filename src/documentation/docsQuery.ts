// Documentation query utility for MCP tools
import { DocumentationIndex } from './docsIndexer.js';
import type { DocumentationChunk } from './docsIndexer.js';

/**
 * Format a documentation chunk for MCP resource or tool response
 */
export function formatDocumentationChunk(chunk: DocumentationChunk) {
  return {
    text: chunk.content,
    metadata: {
      title: chunk.title,
      section: chunk.section,
      url: chunk.url
    }
  };
}

/**
 * Generate a concise answer from documentation chunks
 * Simple implementation that returns the most relevant content
 */
export function generateAnswerFromChunks(question: string, chunks: DocumentationChunk[]) {
  if (chunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in the PocketBase documentation for your question.",
      sources: []
    };
  }

  // For simplicity, we'll return the most relevant chunk's content
  // In a more sophisticated implementation, we could synthesize from multiple chunks
  const bestChunk = chunks[0];
  
  // Truncate content to a reasonable length for MCP responses
  const maxLength = 1500;
  let answer = bestChunk.content;
  if (answer.length > maxLength) {
    answer = answer.substring(0, maxLength) + "...";
  }

  // Create sources array with relevance scores (simplified)
  const sources = chunks.map((chunk, index) => ({
    title: chunk.title,
    url: chunk.url,
    relevance: chunks.length - index // Higher relevance for earlier results
  }));

  return {
    answer,
    sources
  };
}

/**
 * Extract a suggested section from a question
 * Helps route questions to specific documentation sections
 */
export function suggestSectionFromQuestion(question: string) {
  const questionLower = question.toLowerCase();
  
  const sectionMap: Record<string, string[]> = {
    collections: ['collection', 'collections', 'schema', 'field'],
    authentication: ['auth', 'login', 'password', 'user', 'superuser', 'oauth'],
    records: ['record', 'records', 'data', 'item', 'entry'],
    files: ['file', 'files', 'upload', 'download', 'asset'],
    realtime: ['realtime', 'subscription', 'websocket', 'sse', 'event'],
    'js-extension': ['javascript', 'js', 'hook', 'event'],
    'go-extension': ['go', 'golang', 'package', 'module']
  };

  for (const [section, keywords] of Object.entries(sectionMap)) {
    if (keywords.some(keyword => questionLower.includes(keyword))) {
      return section;
    }
  }

  return undefined;
}