import { Transformer, TransformerCreator } from '@jest/transform'
import { transform, transformAsync } from '@oxc-jest/transform'

import { Options, Config, createTransformConfig } from './options'
import createCacheKey from '@jest/create-cache-key-function'

/**
 * @note this must be exactly named `createTransformer` to be picked up by Jest.
 */
export const createTransformer: TransformerCreator<
    Transformer<Options>,
    Options
> = async options => {
    const config: Config = await createTransformConfig(options)
    const getCacheKey = createCacheKey(
        // files that affect computed cache key
        ['package.json', 'tsconfig.json'],
        // values that affect computed cache key
        [JSON.stringify(config)]
    )

    return {
        canInstrument: false,
        getCacheKey: getCacheKey as Transformer<Options>['getCacheKey'],
        process(sourceText, sourcePath, _jestOptions) {
            const { sourceText: code, sourceMap: _map } = transform(sourcePath, sourceText)
            return { code, map: undefined }
        },
        async processAsync(sourceText, sourcePath, _jestOptions) {
            const { sourceText: code, sourceMap: _map } = await transformAsync(
                sourcePath,
                sourceText,
                config
            )
            return { code, map: undefined }
        },
    } satisfies Transformer<Options>
}
