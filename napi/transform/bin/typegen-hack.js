#!/usr/bin/env node
// @ts-check
const path = require('path')
const fs = require('fs')
const assert = require('assert')

const TYPEDEF_PATH = path.resolve(__dirname, '..', 'index.d.ts')
const INJECT_HEADER = `
import type { CompressOption } from './options'

`

const INJECT_FOOTER = `
export type { CompressOption }
`


const typeDefs = fs.readFileSync(TYPEDEF_PATH, 'utf8')

const startOfCode = typeDefs.indexOf('export')
assert(startOfCode !== -1)

const modified = typeDefs.slice(0, startOfCode) +
    INJECT_HEADER +
    typeDefs.slice(startOfCode) +
    INJECT_FOOTER

fs.writeFileSync(TYPEDEF_PATH, modified)
console.log('done')
