import { Transformer, TransformerCreator, TransformerFactory } from '@jest/transform'
import { transform, transformAsync } from '@oxc-jest/transform'

import { Options, Config, createTransformConfig } from './options'
import createCacheKey from '@jest/create-cache-key-function'

/**
 * @note this must be exactly named `createTransformer` to be picked up by Jest.
 */
export const createTransformer: TransformerCreator<Transformer<Options>, Options> = async options => {
    debugger;
    const config: Config = await createTransformConfig(options)
    console.log('[oxc-jest] createTransformer')
    console.log(config)
    const getCacheKey = createCacheKey(
        // files that affect computed cache key
        ['package.json', 'tsconfig.json'],
        // values that affect computed cache key
        [JSON.stringify(config)]
    )

    const IS_TS = /\.tsx?$/
    const isTs = (path: string) => IS_TS.test(path)
    console.log('[oxc-jest] called')
    return {
        canInstrument: false,
        getCacheKey: getCacheKey as Transformer<Options>['getCacheKey'],
        process(sourceText, sourcePath, jestOptions) {
            console.log('[oxc-jest] process', sourcePath)
            const { sourceText: code, sourceMap: map } = transform(sourcePath, sourceText)
            if (isTs(sourcePath)) {
                console.log('[oxc-jest] process ts:', sourcePath)
                console.log(code)
            }
            return { code, map: undefined }
        },
        async processAsync(sourceText, sourcePath, jestOptions) {
            console.log('[oxc-jest] processAsync', sourcePath)
            const { sourceText: code, sourceMap: map } = await transformAsync(
                sourcePath,
                sourceText,
                config
            )
            if (isTs(sourcePath)) {
                console.log('[oxc-jest] processAsync:', sourcePath)
                console.log(code)
            }
            return { code , map: undefined }
        },
    } satisfies Transformer<Options>
}
