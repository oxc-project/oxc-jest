import { Transformer, TransformerCreator, TransformerFactory } from '@jest/transform'
import { transform, transformAsync } from '@oxc-jest/transform'

import { Options, Config, createTransformConfig } from './options'
import createCacheKey from '@jest/create-cache-key-function'

/**
 * @note this must be exactly named `createTransformer` to be picked up by Jest.
 */
export const createTransformer: TransformerCreator<Transformer<Options>, Options> = async options => {
    const config: Config = await createTransformConfig(options)
    const getCacheKey = createCacheKey(
        // files that affect computed cache key
        [],
        // values that affect computed cache key
        [JSON.stringify(config)]
    )

    return {
        canInstrument: false,
        getCacheKey: getCacheKey as Transformer<Options>['getCacheKey'],
        process(sourceText, sourcePath, jestOptions) {
            const { sourceText: code, sourceMap: map } = transform(sourcePath, sourceText)
            return { code, map }
        },
        async processAsync(sourceText, sourcePath, jestOptions) {
            const { sourceText: code, sourceMap: map } = await transformAsync(
                sourcePath,
                sourceText,
                config
            )
            return { code, map }
        },
    } satisfies Transformer<Options>
}
