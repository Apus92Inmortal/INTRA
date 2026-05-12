const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const repoRoot = process.cwd()
const mapPath = path.join(repoRoot, 'scripts', 'workflows-impact-map.json')
const outputPath = process.env.WORKFLOWS_ANALYSIS_OUT
  ? path.resolve(process.env.WORKFLOWS_ANALYSIS_OUT)
  : path.join(repoRoot, 'generated', 'pending-analysis.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function runGit(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function normalizePattern(value) {
  return String(value || '').replace(/^\/+/, '')
}

function fileMatches(filePath, rawPattern) {
  const pattern = normalizePattern(rawPattern)
  if (!pattern) return false
  if (pattern.endsWith('/**')) return filePath.startsWith(pattern.slice(0, -3))
  if (pattern.endsWith('/*')) return filePath.startsWith(pattern.slice(0, -1))
  if (pattern.endsWith('/')) return filePath.startsWith(pattern)
  return filePath === pattern || filePath.startsWith(`${pattern}/`)
}

function getChangedFiles(baseSha, headSha) {
  if (baseSha && headSha && baseSha !== '0000000000000000000000000000000000000000') {
    const output = runGit(['diff', '--name-only', baseSha, headSha])
    return output ? output.split('\n').filter(Boolean) : []
  }

  const output = runGit(['show', '--pretty=', '--name-only', headSha || 'HEAD'])
  return output ? output.split('\n').filter(Boolean) : []
}

function pickRelevantCodeRefs(flow, changedFiles) {
  const direct = flow.codeRefs.filter((ref) =>
    changedFiles.some((file) => file === ref || file.startsWith(`${ref}/`) || ref.startsWith(file))
  )

  if (direct.length > 0) return direct
  return flow.codeRefs.slice(0, 4)
}

function buildPayload() {
  const map = readJson(mapPath)
  const baseSha = process.env.WORKFLOWS_BASE_SHA || ''
  const headSha = process.env.WORKFLOWS_HEAD_SHA || process.env.GITHUB_SHA || runGit(['rev-parse', 'HEAD'])
  const changedFiles = getChangedFiles(baseSha, headSha)
  const eventName = process.env.GITHUB_EVENT_NAME || 'manual'
  const prNumber = process.env.WORKFLOWS_PR_NUMBER ? Number(process.env.WORKFLOWS_PR_NUMBER) : null
  const prUrl = process.env.WORKFLOWS_PR_URL || null

  const impactedFlows = map.flows
    .map((flow) => {
      const matchedFiles = changedFiles.filter((file) => flow.watchPaths.some((pattern) => fileMatches(file, pattern)))
      if (matchedFiles.length === 0) return null

      return {
        slug: flow.slug,
        title: flow.title,
        matchedFiles,
        codeRefs: pickRelevantCodeRefs(flow, matchedFiles),
        checklist: flow.checklist,
      }
    })
    .filter(Boolean)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      repo: process.env.GITHUB_REPOSITORY || 'Apus92Inmortal/INTRA',
      event: eventName,
      baseSha: baseSha || null,
      headSha,
      headShortSha: headSha.slice(0, 7),
      prNumber,
      prUrl,
      commitUrl: `https://github.com/${process.env.GITHUB_REPOSITORY || 'Apus92Inmortal/INTRA'}/commit/${headSha}`,
      workflowsRepo: map.workflowsRepo,
    },
    summary: {
      changedFilesCount: changedFiles.length,
      impactedFlowsCount: impactedFlows.length,
    },
    changedFiles,
    impactedFlows,
  }
}

const payload = buildPayload()
ensureDir(outputPath)
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, out: outputPath, impactedFlows: payload.summary.impactedFlowsCount, changedFiles: payload.summary.changedFilesCount }, null, 2))
