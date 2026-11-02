import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const jsRoot = resolve(scriptDir, '..')
const repoRoot = resolve(jsRoot, '..')
const require = createRequire(import.meta.url)

const requiredReadmeMarkers = [
  'npm install id-agent',
  'pnpm add id-agent',
  'pip install id-agent',
  'uv add id-agent',
  "import { idAgent } from 'id-agent'",
  'from id_agent import generate',
  'idAgent.from',
  'generate_deterministic',
  'createAliasMap',
  'AliasMap',
  'detectDuplicates',
  'detect_duplicates',
  'wordCount',
  'word_count',
]

const args = process.argv.slice(2)
const packDestination = parsePackDestination(args)
const ownedTempDirs = []
let subprocessEnv = process.env

function parsePackDestination(argv) {
  const index = argv.indexOf('--pack-destination')
  if (index === -1) return null
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error('--pack-destination requires a directory path')
  }
  return resolve(process.cwd(), value)
}

async function createTempDir(prefix) {
  const dir = await mkdtemp(resolve(tmpdir(), prefix))
  ownedTempDirs.push(dir)
  return dir
}

function configureSubprocessEnv(npmCacheDir, npmLogsDir) {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (/^npm_config_(dir|verify_deps_before_run|manage_package_manager_versions)$/i.test(key)) {
      delete env[key]
    }
  }

  subprocessEnv = {
    ...env,
    npm_config_audit: 'false',
    npm_config_cache: npmCacheDir,
    npm_config_fund: 'false',
    npm_config_logs_dir: npmLogsDir,
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_CACHE: npmCacheDir,
    NPM_CONFIG_FUND: 'false',
    NPM_CONFIG_LOGS_DIR: npmLogsDir,
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: subprocessEnv,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })

  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout}` : ''
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}${detail}`)
  }

  return result.stdout
}

function resolvePackageDir(packageName) {
  let current = dirname(require.resolve(packageName, { paths: [jsRoot] }))
  while (current !== dirname(current)) {
    if (existsSync(resolve(current, 'package.json'))) return current
    current = dirname(current)
  }
  throw new Error(`Could not resolve package directory for ${packageName}`)
}

async function stagePackage(stagingDir) {
  const packageJsonPath = resolve(jsRoot, 'package.json')
  const distPath = resolve(jsRoot, 'dist')
  const readmePath = resolve(repoRoot, 'README.md')
  const licensePath = resolve(repoRoot, 'LICENSE')

  const rawPackageJson = await readFile(packageJsonPath, 'utf8')
  const packageJson = JSON.parse(rawPackageJson)

  if (packageJson.name !== 'id-agent') {
    throw new Error(`Expected package name id-agent, got ${packageJson.name}`)
  }
  if (!packageJson.version) {
    throw new Error('Expected package version to be present')
  }
  if (!packageJson.exports?.['.']) {
    throw new Error('Expected package exports for "." to be present')
  }

  await writeFile(resolve(stagingDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
  await cp(distPath, resolve(stagingDir, 'dist'), { recursive: true })
  await cp(readmePath, resolve(stagingDir, 'README.md'))
  await cp(licensePath, resolve(stagingDir, 'LICENSE'))
  await validateReadmeMarkers(resolve(stagingDir, 'README.md'))
}

async function validateReadmeMarkers(readmePath) {
  const readme = await readFile(readmePath, 'utf8')
  const missing = requiredReadmeMarkers.filter(marker => !readme.includes(marker))
  if (missing.length > 0) {
    throw new Error(`Staged README.md is missing required markers: ${missing.join(', ')}`)
  }
}

function parsePackJson(output) {
  const pack = JSON.parse(output)
  // npm 11 prints an array of entries, npm 12 an object keyed by package name
  const entries = Array.isArray(pack) ? pack : Object.values(pack ?? {})
  if (entries.length === 0) {
    throw new Error('npm pack returned no package entries')
  }
  return entries[0]
}

function validateFiles(packEntry) {
  const files = new Set(packEntry.files.map(file => file.path))
  const paths = [...files]
  const required = ['package.json', 'README.md', 'LICENSE']
  const forbiddenPrefixes = [
    'src/',
    'tests/',
    'scripts/',
    '.github/',
    '.planning/',
    'node_modules/',
  ]
  const forbiddenFiles = new Set([
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lockb',
  ])

  for (const file of required) {
    if (!files.has(file)) {
      throw new Error(`Missing expected package file: ${file}`)
    }
  }

  if (!paths.some(file => file.startsWith('dist/'))) {
    throw new Error('Missing dist/ files from package tarball')
  }

  const leaked = paths.filter(file =>
    forbiddenFiles.has(file) || forbiddenPrefixes.some(prefix => file.startsWith(prefix))
  )
  if (leaked.length > 0) {
    throw new Error(`Unexpected package files: ${leaked.join(', ')}`)
  }
}

async function createTarball(stagingDir) {
  const destination = packDestination ?? await createTempDir('id-agent-pack-')
  await mkdir(destination, { recursive: true })

  const output = run('npm', ['pack', '--json', '--pack-destination', destination], {
    cwd: stagingDir,
    capture: true,
  })
  const packEntry = parsePackJson(output)
  validateFiles(packEntry)

  if (!packEntry.filename) {
    throw new Error('npm pack did not return a tarball filename')
  }

  const tarballPath = resolve(destination, packEntry.filename)
  console.log(`tarball=${tarballPath}`)
  return tarballPath
}

async function smokeInstall(tarballPath) {
  const consumerDir = await createTempDir('id-agent-consumer-')
  const zodDir = resolvePackageDir('zod')
  run('npm', ['init', '-y'], { cwd: consumerDir, capture: true })
  run(
    'npm',
    [
      'install',
      tarballPath,
      zodDir,
      '--ignore-scripts',
      '--prefer-offline',
      '--no-audit',
      '--fund=false',
      '--package-lock=false',
    ],
    { cwd: consumerDir },
  )
  run('node', [
    '--input-type=module',
    '-e',
    "import { idAgent } from 'id-agent'; if (typeof idAgent !== 'function') process.exit(1)",
  ], { cwd: consumerDir })
  run('node', [
    '-e',
    "const { idAgent } = require('id-agent'); if (typeof idAgent !== 'function') process.exit(1)",
  ], { cwd: consumerDir })
}

async function main() {
  try {
    const npmCacheDir = await createTempDir('id-agent-npm-cache-')
    const npmLogsDir = await createTempDir('id-agent-npm-logs-')
    configureSubprocessEnv(npmCacheDir, npmLogsDir)

    const stagingDir = await createTempDir('id-agent-stage-')
    await stagePackage(stagingDir)

    const dryRunOutput = run('npm', ['pack', '--dry-run', '--json'], {
      cwd: stagingDir,
      capture: true,
    })
    validateFiles(parsePackJson(dryRunOutput))

    const tarballPath = await createTarball(stagingDir)
    await smokeInstall(tarballPath)
  } finally {
    await Promise.all(
      ownedTempDirs.map(dir => rm(dir, { recursive: true, force: true })),
    )
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
