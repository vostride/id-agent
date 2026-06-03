import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { basename, delimiter, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const [command, ...args] = process.argv.slice(2)
if (!command) {
  console.error('Usage: node scripts/run-package-tool.mjs <command> [...args]')
  process.exit(1)
}

const tempDirs = []

function createTempDir(prefix) {
  const dir = mkdtempSync(resolve(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

function buildEnv() {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (/^npm_config_(dir|verify_deps_before_run|manage_package_manager_versions)$/i.test(key)) {
      delete env[key]
    }
  }

  const pathParts = []
  for (const candidate of [process.env._, process.env.npm_execpath]) {
    if (candidate && basename(candidate).startsWith('pnpm')) {
      pathParts.push(dirname(candidate))
    }
  }

  const npmCacheDir = createTempDir('id-agent-npm-cache-')
  const npmLogsDir = createTempDir('id-agent-npm-logs-')

  return {
    ...env,
    PATH: [...pathParts, env.PATH].filter(Boolean).join(delimiter),
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
    env: buildEnv(),
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  return result.stdout ?? ''
}

function createValidatedTarball() {
  const destination = createTempDir('id-agent-package-')
  const output = run(
    'node',
    ['scripts/validate-package.mjs', '--pack-destination', destination],
    { capture: true },
  )
  process.stdout.write(output)

  const tarballLine = output
    .split('\n')
    .findLast(line => line.startsWith('tarball='))
  if (!tarballLine) {
    console.error('Validated package tarball was not produced.')
    process.exit(1)
  }

  return tarballLine.slice('tarball='.length)
}

try {
  if (command === 'publint' || command === 'attw') {
    const tarball = createValidatedTarball()
    const toolArgs = args.filter(arg => arg !== '--pack')
    run(command, [tarball, ...toolArgs])
  } else {
    run(command, args)
  }
} finally {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
}
