const isObject = (val: unknown): val is object => typeof val === 'object' && val !== null

type AnyRecord = Record<string | number | symbol, unknown>
type DeepMerge<T extends AnyRecord, U extends AnyRecord> = {
    [K in keyof (T & U)]: K extends keyof U
        ? U[K] extends AnyRecord
            ? T[K] extends AnyRecord
                ? DeepMerge<T[K], U[K]>
                : U[K]
            : U[K]
        : K extends keyof T
          ? T[K]
          : never
}

/**
 * merge properties from the `right` object into the `left` object. Nullish keys
 * are skipped.
 */
export function deepMergeLeftMut<T extends AnyRecord, U extends AnyRecord>(
    left: T,
    right: U
): DeepMerge<T, U> {
    for (const key in right) {
        const a = key in left ? left[key as keyof T] : undefined
        const b = right[key]
        if (right[key] == null) continue
        else if (isObject(a) && isObject(b)) {
            left[key as keyof T] = deepMergeLeftMut(a as AnyRecord, b as AnyRecord) as any
        } else {
            left[key as keyof T] = b as any
        }
    }

    return left as DeepMerge<T, U>
}

export function merge<T extends AnyRecord>(arr: T[]): T
export function merge<T extends AnyRecord, U extends AnyRecord>(arr: [T, U]): DeepMerge<T, U>
export function merge<T extends AnyRecord, U extends AnyRecord, V extends AnyRecord>(
    arr: [T, U, V]
): DeepMerge<DeepMerge<T, U>, V>
export function merge(arr: AnyRecord[]) {
    return arr.reduce(deepMergeLeftMut, {} as AnyRecord)
}
