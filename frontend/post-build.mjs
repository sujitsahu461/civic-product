/**
 * post-build.mjs
 * Copies React build output into Django's template and static folders.
 * Patches asset paths from /assets/ → /static/react/
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, 'dist')
const DJANGO_TEMPLATES = join(__dirname, '..', 'templates')
const DJANGO_STATIC_REACT = join(__dirname, '..', 'static', 'react')

// 1. Clear and copy assets → static/react/
if (existsSync(DJANGO_STATIC_REACT)) {
  rmSync(DJANGO_STATIC_REACT, { recursive: true })
}
mkdirSync(DJANGO_STATIC_REACT, { recursive: true })

const assetsDir = join(DIST, 'assets')
if (existsSync(assetsDir)) {
  readdirSync(assetsDir).forEach(file => {
    copyFileSync(join(assetsDir, file), join(DJANGO_STATIC_REACT, file))
    console.log(`✅ Copied assets/${file} → static/react/${file}`)
  })
}

// 1b. Copy public assets directly into static/
const publicDir = join(__dirname, 'public')
const DJANGO_STATIC = join(__dirname, '..', 'static')
if (existsSync(publicDir)) {
  readdirSync(publicDir).forEach(file => {
    const srcFile = join(publicDir, file)
    if (existsSync(srcFile) && !file.startsWith('.')) {
      copyFileSync(srcFile, join(DJANGO_STATIC, file))
      const staticImgDir = join(DJANGO_STATIC, 'images')
      if (existsSync(staticImgDir) && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.ico') || file.endsWith('.svg') || file.endsWith('.webp'))) {
        copyFileSync(srcFile, join(staticImgDir, file))
      }
    }
  })
  console.log('✅ Copied public assets → static/ & static/images/')
}

// 2. Patch and write index.html → Django templates/index.html
//    Vite outputs /assets/xxx.js  — Django serves them at /static/react/xxx.js
let html = readFileSync(join(DIST, 'index.html'), 'utf-8')
html = html.replaceAll('src="/assets/', 'src="/static/react/')
html = html.replaceAll('href="/assets/', 'href="/static/react/')
writeFileSync(join(DJANGO_TEMPLATES, 'index.html'), html, 'utf-8')
console.log('✅ Patched and copied index.html → templates/index.html')

console.log('\n🚀 Django is now serving the React SPA at http://127.0.0.1:8000/')
console.log('   Run: python manage.py collectstatic --noinput (for production)\n')

