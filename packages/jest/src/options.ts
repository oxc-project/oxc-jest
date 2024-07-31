import { z } from 'zod'
import { promises as fs } from 'node:fs'
import { parse } from 'jsonc-parser'
import type { PackageJson, TsConfigJson } from 'type-fest'
import { merge } from './merge'
import { ReactJsxRuntime } from '@oxc-jest/transform'

const OptionsSchema = z.object({
    react: z
        .object({
            jsxPlugin: z.boolean().default(false),
            runtime: z
                .enum(['automatic', 'classic'])
                .default('automatic')
                .optional()
                .transform((runtime, ctx) => {
                    switch (runtime) {
                        case 'automatic':
                            return 1 as ReactJsxRuntime.Automatic
                        case 'classic':
                            return 0 as ReactJsxRuntime.Classic
                        default:
                            ctx.addIssue({
                                code: 'invalid_enum_value',
                                message: 'Invalid JSX runtime',
                                received: runtime as any,
                                options: ['automatic', 'classic'],
                            })
                            return 1 as ReactJsxRuntime.Automatic
                    }
                }),
        })
        .optional().default({ runtime: 'automatic', jsxPlugin: false }),

    codegen: z.object({
        compress: z.union([
            z.boolean(),
            z.enum(['none', 'whitespace', 'fold']).transform(compress => {
                switch (compress) {
                    case 'none': return 0
                    case 'whitespace': return 1
                    case 'fold': return 2
                    default: return 0
                }
            })
        ]).default('none'),
        sourceMap: z.boolean().default(true)
    }).default({})
})

/**
 * Resolved configuration after merging with defaults
 */
export type Config = z.infer<typeof OptionsSchema>
export type Options = z.input<typeof OptionsSchema>

export const createTransformConfig = async (options?: Options): Promise<Config> => {
    // TODO: make these paths configurable
    const [packageJsonPromise, tsConfigPromise] = await Promise.allSettled([
        fs.readFile('package.json', 'utf8').then<PackageJson>(JSON.parse).then(packageJsonOptions),
        fs.readFile('tsconfig.json', 'utf8').then<TsConfigJson>(parse).then(tsConfigOptions),
    ])

    const packageJson = 'value' in packageJsonPromise ? packageJsonPromise.value : undefined
    const tsConfig = 'value' in tsConfigPromise ? tsConfigPromise.value : undefined

    const resolvedOptions: Partial<Options> = merge(
        [packageJson, tsConfig, options].filter(<T>(x: T | undefined): x is T => !!x)
    )

    return OptionsSchema.parse(resolvedOptions)
}

// NOTE: we're telling TypeScript that `tsConfig` a certain contract, but we
// can't actually guarantee this, so we need to be defensive here

const packageJsonOptions = (packageJson: PackageJson): Partial<Options> => {
    if (!packageJson || typeof packageJson !== 'object') return {}

    return {}
}
const tsConfigOptions = (tsConfig: TsConfigJson): Partial<Options> => {
    if (!tsConfig?.compilerOptions || typeof tsConfig.compilerOptions !== 'object') {
        return {}
    }

    const { jsx } = tsConfig.compilerOptions

    return {
        react: {
            jsxPlugin: jsx != null && jsx !== 'preserve',
            runtime: jsx == 'react' ? 'classic' : 'automatic',
        },
    }
}
