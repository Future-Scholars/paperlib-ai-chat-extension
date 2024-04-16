// https://github.com/xenova/transformers.js/blob/main/examples/demo-site/src/worker.js
import {
  pipeline,
  FeatureExtractionPipeline,
  PipelineType,
  env,
} from "@xenova/transformers";

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = self.location.href.replace(
  "assets/worker.js",
  "/transformersWasm/",
);

// Define task function mapping
const TASK_FUNCTION_MAPPING = {
  "feature-extraction": featureExtraction,
};

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
  static task: PipelineType | null = null;
  static model: string | null = null;
  static instance: ReturnType<typeof pipeline> | null = null;

  static getInstance(progressCallback: (data: any) => void) {
    if (this.task === null || this.model === null) {
      throw Error("Must set task and model");
    }
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback: progressCallback,
      });
    }

    return this.instance;
  }
}

class FeatureExtractionFactory extends PipelineFactory {
  static task: PipelineType = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
}

async function featureExtraction(data: { text: string }) {
  let pipeline = (await FeatureExtractionFactory.getInstance((data) => {
    self.postMessage({
      type: "download",
      task: "feature-extraction",
      data: data,
    });
  })) as FeatureExtractionPipeline;

  // Update task based on source and target languages
  // Doing it this way prevents the same model from being loaded multiple times
  pipeline.task = `feature-extraction`;

  const output = await pipeline(data.text, {
    pooling: "mean",
    normalize: true,
  });
  self.postMessage({
    type: "feature-extraction",
    data: output.tolist()[0] as number[],
  });
}

// Listen for messages from UI
self.addEventListener("message", async (event) => {
  const data = event.data;
  let fn = TASK_FUNCTION_MAPPING[data.task];

  if (!fn) return;

  let result = await fn(data);
  self.postMessage({
    task: data.task,
    type: "result",
    data: result,
  });
});
