import { pipeline, FeatureExtractionPipeline } from '@/utils/transformers.js/src/transformers';
import similarity from "compute-cosine-similarity";

export class EncoderService {
  extractor?: FeatureExtractionPipeline;

  constructor() { }

  async loadEncoder() {
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      cache_dir: __dirname
    });
  }

  async encode(text: string) {
    if (!this.extractor) {
      throw new Error('Encoder not loaded');
    }

    const output = await this.extractor(text, { pooling: 'mean', normalize: true });

    return output.tolist()[0] as number[]
  }

  async retrieve(text: string, embeddings: {text: string, embedding: number[]}[]) {
    // find the most similar text based on the cosine similarity of the embeddings
    const textEmbedding = await this.encode(text);

    let maxSimilarity = -1;
    let maxIndex = 0;
    for (let i = 0; i < embeddings.length; i++) {
      const { text: mostSimilarText, embedding } = embeddings[i];
      const cosine_sim = similarity(textEmbedding, embedding) || -1;
      console.log(cosine_sim, similarity(textEmbedding, embedding))
      if (cosine_sim > maxSimilarity) {
        maxSimilarity = cosine_sim;
        maxIndex = i;
      }
    }
    const { text: mostSimilarText } = embeddings[maxIndex];
    let mostSimilarTexts = [mostSimilarText];
    if (maxIndex - 1 >= 0) {
      mostSimilarTexts.unshift(embeddings[maxIndex - 1].text);
    }
    if (maxIndex + 1 < embeddings.length) {
      mostSimilarTexts.push(embeddings[maxIndex + 1].text);
    }
    return mostSimilarTexts.join(' ');
  }
}
