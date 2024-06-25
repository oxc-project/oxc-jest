/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface SourceMap {
  file?: string
  names: Array<string>
  sourceRoot?: string
  sources: Array<string | undefined | null>
  sourcesContent?: Array<string | undefined | null>
  version: number
  ignoreList?: Array<number>
  mappings: string
}
export interface TransformResult {
  sourceText: string
  sourceMap?: SourceMap
}
export function transform(filename: string, sourceText: string): TransformResult
export function transformAsync(filename: string, sourceText: string): Promise<TransformResult>
