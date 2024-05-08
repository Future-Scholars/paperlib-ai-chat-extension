# paperlib-ai-chat-extension

## Setup API keys

1. Open the preference window of this extension.
2. Choose your preferred LLM.
3. Enter your API key.

## PDF text parsing

As shown in the preferece window, we have two options for parsing text from PDFs:
1. Use **Llama Parse** (recommended): This is a service (free plan includes 1000 pages/day) that uses the Llama Parse API to extract text from PDFs. You can sign up for a free account at [https://cloud.llamaindex.ai/](https://cloud.llamaindex.ai/). After signing up, you create an API key that you can use to extract text from PDFs.
2. Use **PDF.js**: This is a local way to extract text from PDFs. It is not as accurate as Llama Parse.