# The `pipeline` API

Just like the [transformers Python library](https://github.com/huggingface/transformers), Transformers.js provides users with a simple way to leverage the power of transformers. The `pipeline()` function is the easiest and fastest way to use a pretrained model for inference. 

<Tip>

For the full list of available tasks/pipelines, check out [this table](#available-tasks).

</Tip>


## The basics

Start by creating an instance of `pipeline()` and specifying a task you want to use it for. For example, to create a sentiment analysis pipeline, you can do:

```javascript
import { pipeline } from '@xenova/transformers';

let classifier = await pipeline('sentiment-analysis');
```

When running for the first time, the `pipeline` will download and cache the default pretrained model associated with the task. This can take a while, but subsequent calls will be much faster.

<Tip>

By default, models will be downloaded from the [Hugging Face Hub](https://huggingface.co/models) and stored in [browser cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache), but there are ways to specify custom models and cache locations. For more information see [here](./custom_usage).

</Tip>

You can now use the classifier on your target text by calling it as a function:

```javascript
let result = await classifier('I love transformers!');
// [{'label': 'POSITIVE', 'score': 0.9998}]
```

If you have multiple inputs, you can pass them as an array:

```javascript
let result = await classifier(['I love transformers!', 'I hate transformers!']);
// [{'label': 'POSITIVE', 'score': 0.9998}, {'label': 'NEGATIVE', 'score': 0.9982}]
```

You can also specify a different model to use for the pipeline by passing it as the second argument to the `pipeline()` function. For example, to use a different model for sentiment analysis (like one trained to predict sentiment of a review as a number of stars between 1 and 5), you can do:

<!-- TODO: REPLACE 'nlptown/bert-base-multilingual-uncased-sentiment' with 'nlptown/bert-base-multilingual-uncased-sentiment'-->

```javascript
let reviewer = await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');

let result = await reviewer('The Shawshank Redemption is a true masterpiece of cinema.');
// [{label: '5 stars', score: 0.8167929649353027}]
```

Transformers.js supports loading any model hosted on the Hugging Face Hub, provided it has ONNX weights (located in a subfolder called `onnx`). For more information on how to convert your PyTorch, TensorFlow, or JAX model to ONNX, see the [conversion section](./custom_usage#convert-your-models-to-onnx).

The `pipeline()` function is a great way to quickly use a pretrained model for inference, as it takes care of all the preprocessing and postprocessing for you. For example, if you want to perform Automatic Speech Recognition (ASR) using OpenAI's Whisper model, you can do:

<!-- TODO: Replace 'Xenova/whisper-small.en' with 'openai/whisper-small.en' -->
```javascript
// Allocate a pipeline for Automatic Speech Recognition
let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small.en');

// Transcribe an audio file, loaded from a URL.
let result = await transcriber('https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac');
// {text: ' I have a dream that one day this nation will rise up and live out the true meaning of its creed.'}
```

## Pipeline options

### Loading

We offer a variety of options to control how models are loaded from the Hugging Face Hub (or locally).
By default, the *quantized* version of the model is used, which is smaller and faster, but usually less accurate.
To override this behaviour (i.e., use the unquantized model), you can use a custom `PretrainedOptions` object
as the third parameter to the `pipeline` function:

```javascript
// Allocation a pipeline for feature extraction, using the unquantized model
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: false,
});
```

You can also specify which revision of the model to use, by passing a `revision` parameter.
Since the Hugging Face Hub uses a git-based versioning system, you can use any valid git revision specifier (e.g., branch name or commit hash)

```javascript
let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
    revision: 'output_attentions',
});
```

For the full list of options, check out the [PretrainedOptions](./api/utils/hub#module_utils/hub..PretrainedOptions) documentation.


### Running
Many pipelines have additional options that you can specify. For example, when using a model that does multilingual translation, you can specify the source and target languages like this:

<!-- TODO: Replace 'Xenova/nllb-200-distilled-600M' with 'facebook/nllb-200-distilled-600M' -->
```javascript
// Allocation a pipeline for translation
let translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M');

// Translate from English to Greek
let result = await translator('I like to walk my dog.', {
    src_lang: 'eng_Latn',
    tgt_lang: 'ell_Grek'
});
// [ { translation_text: 'Μου αρέσει να περπατάω το σκυλί μου.' } ]

// Translate back to English
let result2 = await translator(result[0].translation_text, {
    src_lang: 'ell_Grek',
    tgt_lang: 'eng_Latn'
});
// [ { translation_text: 'I like to walk my dog.' } ]
```

When using models that support auto-regressive generation, you can specify generation parameters like the number of new tokens, sampling methods, temperature, repetition penalty, and much more. For a full list of available parameters, see to the [GenerationConfig](./api/utils/generation#module_utils/generation.GenerationConfig) class.

For example, to generate a poem using `LaMini-Flan-T5-783M`, you can do: 

<!-- TODO: Replace 'Xenova/LaMini-Flan-T5-783M' with 'MBZUAI/LaMini-Flan-T5-783M' -->

```javascript
// Allocate a pipeline for text2text-generation
let poet = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-783M');
let result = await poet('Write me a love poem about cheese.', {
    max_new_tokens: 200,
    temperature: 0.9,
    repetition_penalty: 2.0,
    no_repeat_ngram_size: 3,
});
```

Logging `result[0].generated_text` to the console gives:

```
Cheese, oh cheese! You're the perfect comfort food.
Your texture so smooth and creamy you can never get old.
With every bite it melts in your mouth like buttery delights
that make me feel right at home with this sweet treat of mine. 

From classic to bold flavor combinations,
I love how versatile you are as an ingredient too?
Cheddar is my go-to for any occasion or mood; 
It adds depth and richness without being overpowering its taste buds alone
```

For more information on the available options for each pipeline, refer to the [API Reference](./api/pipelines).
If you would like more control over the inference process, you can use the [`AutoModel`](./api/models), [`AutoTokenizer`](./api/tokenizers), or [`AutoProcessor`](./api/processors) classes instead.


## Available tasks

<include>
{
    "path": "../snippets/5_supported-tasks.snippet"
}
</include>
