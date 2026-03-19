// Documentation indexer for PocketBase docs
import { z } from 'zod';

/**
 * Represents a chunk of documentation content
 */
export interface DocumentationChunk {
  id: string;
  title: string;
  content: string;
  section: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for the documentation indexer
 */
export const DocsIndexerConfigSchema = z.object({
  baseUrl: z.string().url().default('https://pocketbase.io/docs/'),
  // Sections to prioritize when indexing
  prioritySections: z.array(z.string()).default([
    'collections',
    'authentication', 
    'records',
    'files',
    'realtime',
    'js-collections',
    'go-collections',
    'api-records',
    'api-collections',
    'api-auth'
  ])
});

export type DocsIndexerConfig = z.infer<typeof DocsIndexerConfigSchema>;

/**
 * Simple in-memory index for documentation chunks
 */
export class DocumentationIndex {
  private chunks: DocumentationChunk[] = [];

  /**
   * Add a documentation chunk to the index
   */
  addChunk(chunk: DocumentationChunk): void {
    this.chunks.push(chunk);
  }

  /**
   * Add multiple documentation chunks to the index
   */
  addChunks(chunks: DocumentationChunk[]): void {
    this.chunks.push(...chunks);
  }

  /**
   * Search for documentation chunks matching the query
   * Simple implementation using term frequency
   */
  search(query: string, limit = 10): DocumentationChunk[] {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (terms.length === 0) {
      return this.chunks.slice(0, limit);
    }

    // Score chunks based on term frequency
    const scoredChunks = this.chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      const titleLower = chunk.title.toLowerCase();
      
      let score = 0;
      terms.forEach(term => {
        // Title matches get higher weight
        score += (titleLower.match(new RegExp(term, 'g')) || []).length * 3;
        // Content matches
        score += (contentLower.match(new RegExp(term, 'g')) || []).length;
      });
      
      return { chunk, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.chunk);

    return scoredChunks;
  }

  /**
   * Get all chunks in a specific section
   */
  getBySection(section: string): DocumentationChunk[] {
    return this.chunks.filter(chunk => 
      chunk.section.toLowerCase().includes(section.toLowerCase())
    );
  }

  /**
   * Get all chunks
   */
  getAll(): DocumentationChunk[] {
    return [...this.chunks];
  }

  /**
   * Get count of chunks
   */
  getCount(): number {
    return this.chunks.length;
  }
}