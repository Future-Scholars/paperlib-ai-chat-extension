/**
 * @file Handler file for choosing the correct version of ONNX Runtime, based on the environment.
 * Ideally, we could import the `onnxruntime-web` and `onnxruntime-node` packages only when needed,
 * but dynamic imports don't seem to work with the current webpack version and/or configuration.
 * This is possibly due to the experimental nature of top-level await statements.
 * So, we just import both packages, and use the appropriate one based on the environment:
 *   - When running in node, we use `onnxruntime-node`.
 *   - When running in the browser, we use `onnxruntime-web` (`onnxruntime-node` is not bundled).
 * 
 * This module is not directly exported, but can be accessed through the environment variables:
 * ```javascript
 * import { env } from '@xenova/transformers';
 * console.log(env.backends.onnx);
 * ```
 * 
 * @module backends/onnx
 */

// NOTE: Import order matters here. We need to import `onnxruntime-node` before `onnxruntime-web`.
// In either case, we select the default export if it exists, otherwise we use the named export.
import * as ONNX_WEB from 'onnxruntime-web';

/** @type {import('onnxruntime-web')} The ONNX runtime module. */
export let ONNX;

export const executionProviders = [
    // 'webgpu',
    'wasm'
];

ONNX = ONNX_WEB.default ?? ONNX_WEB;