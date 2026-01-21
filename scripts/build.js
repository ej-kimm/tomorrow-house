const path = require('path')
const fs = require('fs-extra')

const postcss = require('postcss')
const cssnano = require('cssnano')
const autoprefixer = require('autoprefixer')
const sharp = require('sharp')

const REPOSITORY_NAME = 'tomorrow-house'
const buildDir = path.resolve(__dirname, '../build')

const faviconFileList = [
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
  'apple-touch-icon.png',
  'favicon-96x96.png',
  'favicon.ico',
  'favicon.svg',
  'site.webmanifest',
]

const faviconUrlList = [
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/site.webmanifest',
]

function throwError(err) {
  if (err) {
    console.error('💥 Oops! Something went wrong')
    console.error(err)
  }
}

/* =====================
   HTML
===================== */
async function buildHtml() {
  try {
    const srcPath = path.resolve(__dirname, '../index.html')
    const destPath = path.join(buildDir, 'index.html')

    let html = await fs.readFile(srcPath, 'utf-8')

    // GitHub Pages base path
    html = html.replaceAll('href="/"', `href="/${REPOSITORY_NAME}/"`)

    faviconUrlList.forEach((favicon) => {
      const newUrl = `/${REPOSITORY_NAME}${favicon}`
      html = html.replaceAll(favicon, newUrl)
    })

    await fs.writeFile(destPath, html)
  } catch (err) {
    throwError(err)
  }
}

/* =====================
   CSS
===================== */
async function buildCss() {
  try {
    const cssPath = path.resolve(__dirname, '../style.css')
    const css = await fs.readFile(cssPath)

    const result = await postcss([autoprefixer, cssnano]).process(css, {
      from: cssPath,
    })

    await fs.writeFile(path.join(buildDir, 'style.css'), result.css)
  } catch (err) {
    throwError(err)
  }
}

/* =====================
   Favicons
===================== */
async function copyFavicons() {
  for (const filename of faviconFileList) {
    await fs.copy(
      path.resolve(__dirname, `../${filename}`),
      path.join(buildDir, filename)
    )
  }
}

/* =====================
   Images (sharp)
===================== */
async function optimizeImageAssets() {
  const srcDir = path.resolve(__dirname, '../assets/images')
  const destDir = path.join(buildDir, 'assets/images')

  await fs.ensureDir(destDir)

  const files = await fs.readdir(srcDir)

  await Promise.all(
    files.map(async (file) => {
      const srcFile = path.join(srcDir, file)
      const destFile = path.join(destDir, file)

      const ext = path.extname(file).toLowerCase()

      if (ext === '.jpg' || ext === '.jpeg') {
        await sharp(srcFile).jpeg({ quality: 75 }).toFile(destFile)
      } else if (ext === '.png') {
        await sharp(srcFile).png({ compressionLevel: 8 }).toFile(destFile)
      } else {
        // svg 등은 그대로 복사
        await fs.copy(srcFile, destFile)
      }
    })
  )
}

/* =====================
   Build
===================== */
async function build() {
  console.log('------------------------')
  console.log('Start building...')

  await fs.remove(buildDir)
  await fs.ensureDir(buildDir)

  await Promise.all([buildHtml(), buildCss(), copyFavicons()])

  // js, fonts 복사
  await fs.copy(path.resolve(__dirname, '../js'), path.join(buildDir, 'js'))

  await fs.copy(
    path.resolve(__dirname, '../assets/fonts'),
    path.join(buildDir, 'assets/fonts')
  )

  await optimizeImageAssets()

  console.log('🎉 Successfully built your project')
  console.log('🔜 Ready to deploy')
}

build()
