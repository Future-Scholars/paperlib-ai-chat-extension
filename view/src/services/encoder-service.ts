import { FeatureExtractionPipeline } from "@xenova/transformers";
import similarity from "compute-cosine-similarity";

// Initialise worker
const workerPath = "worker.js";

const worker = new Worker(new URL(workerPath, import.meta.url), {
  type: "module",
});

worker.onerror((event: ErrorEvent) => {
  console.error("transformers worker error:", event.error);
});

export class EncoderService {
  extractor?: FeatureExtractionPipeline;

  constructor() {}

  encode(text: string): Promise<number[]> {
    worker.postMessage({ text, task: "feature-extraction" });
    return new Promise((resolver) => {
      const handleMessage = (
        event: MessageEvent<{ type: string; data: number[] }>,
      ) => {
        const message = event.data;
        if (message.type == "feature-extraction") {
          resolver(message.data);
          worker.removeEventListener("message", handleMessage);
        }
      };

      worker.addEventListener("message", handleMessage);
    });
  }

  async retrieve(
    text: string,
    embeddings: { text: string; embedding: number[] }[],
  ) {
    // find the most similar text based on the cosine similarity of the embeddings
    const textEmbedding = await this.encode(text);

    let maxSimilarity = -1;
    let maxIndex = 0;
    for (let i = 0; i < embeddings.length; i++) {
      const { text: mostSimilarText, embedding } = embeddings[i];
      const cosine_sim = similarity(textEmbedding, embedding) || -1;
      console.log(cosine_sim, similarity(textEmbedding, embedding));
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
    return mostSimilarTexts.join(" ");
  }
}
