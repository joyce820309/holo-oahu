#!/usr/bin/env node
/**
 * bump-version.mjs
 * 自動將 package.json 版號更新為 YYMMDD-N 格式。
 * 若今天已有版號，流水號 +1；否則從 1 開始。
 *
 * 用法：node scripts/bump-version.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

const now = new Date()
const yy = String(now.getFullYear()).slice(2)
const mm = String(now.getMonth() + 1).padStart(2, '0')
const dd = String(now.getDate()).padStart(2, '0')
const today = `${yy}${mm}${dd}`

const current = pkg.version ?? ''
const match = current.match(/^(\d{6})-(\d+)$/)

let n = 1
if (match && match[1] === today) {
  n = parseInt(match[2], 10) + 1
}

const next = `${today}-${n}`
pkg.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

console.log(`✓ version: ${current || '(none)'} → ${next}`)
