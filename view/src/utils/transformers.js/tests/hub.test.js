

import { AutoModel, PreTrainedModel } from '../src/transformers.js';
import { MAX_TEST_EXECUTION_TIME } from './init.js';

// TODO: Set cache folder to a temp directory

describe('Hub', () => {

    describe('Loading models', () => {

        it('should load a model from the local cache', async () => {
            // 1. Local model exists (doesn't matter about status of remote file since local is tried first)
            let model = await AutoModel.from_pretrained('t5-small');
            expect(model).toBeInstanceOf(PreTrainedModel);
        }, MAX_TEST_EXECUTION_TIME);

        it('should load a model from the remote cache', async () => {
            // 2. Local model doesn't exist, remote file exists
            // This tests that fallback functionality is working
            let model = await AutoModel.from_pretrained('Xenova/t5-small');
            expect(model).toBeInstanceOf(PreTrainedModel);
        }, MAX_TEST_EXECUTION_TIME);

        it('should fail to load a model', async () => {
            // 3. Local model doesn't exist, remote file doesn't exist
            // This tests that error handling is working.
            await expect(
                AutoModel.from_pretrained('Xenova/this-model-does-not-exist')
            ).rejects
                .toBeInstanceOf(Error);
        }, MAX_TEST_EXECUTION_TIME);
    });

});
