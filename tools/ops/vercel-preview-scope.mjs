// Reviewable operational tool. Default: GET only and a metadata-only plan.
// --apply requires a previously reviewed plan. Never prints or changes values.
// No login, deployment, project creation, billing change or record deletion.
import { lstat, readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import path from 'node:path'

const projectId = 'prj_vZUXhxgCzrRu7iRt4u4rN1UkzVXn'
const teamId = 'team_Ol4y0BzimnFUPgzQUcEIJ5AX'
const protectedNames = new Set([
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY',
  'INTRA_WOMPI_PRIVATE_KEY', 'INTRA_WOMPI_EVENTS_KEY', 'INTRA_WOMPI_INTEGRITY_KEY',
  'WOMPI_PRIVATE_KEY', 'WOMPI_EVENTS_KEY', 'WOMPI_INTEGRITY_KEY',
  'NEXT_PUBLIC_WOMPI_SANDBOX', 'ADMIN_USER_IDS', 'ADMIN_EMAILS',
  'CRON_SECRET', 'INTERNAL_CRON_SECRET', 'NEXT_PUBLIC_SITE_URL',
])
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const planAt = args.indexOf('--plan')
const planFile = planAt >= 0 ? args[planAt + 1] : undefined
if (args.some(a => !['--apply', '--plan', planFile].includes(a)) || !planFile) {
  throw new Error('Usage: node tools/ops/vercel-preview-scope.mjs --plan <local-plan.json> [--apply]')
}
const planPath = path.resolve(planFile)
if (path.extname(planPath).toLowerCase() !== '.json' || planPath.split(path.sep).includes('.git')) {
  throw new Error('Plan must be a .json file outside .git; this tool never reads environment files.')
}
if (!process.env.VERCEL_TOKEN) throw new Error('Set VERCEL_TOKEN privately; do not pass its value as a CLI argument.')

async function api(endpoint, method = 'GET', body) {
  const response = await fetch('https://api.vercel.com' + endpoint, {
    method,
    headers: { Authorization: 'Bearer ' + process.env.VERCEL_TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error('Vercel request failed: HTTP ' + response.status + ' (' + method + ')')
  // API objects can contain secret-bearing fields. Keep them in memory only.
  return response.json()
}
async function metadata() {
  const response = await api('/v10/projects/' + projectId + '/env?teamId=' + teamId + '&decrypt=false')
  assert.ok(Array.isArray(response.envs), 'Unexpected environment metadata response.')
  return response.envs.map(e => ({
    id: e.id, key: e.key, type: e.type,
    target: Array.isArray(e.target) ? [...e.target].sort() : [e.target].filter(Boolean),
    gitBranch: e.gitBranch ?? null,
    customEnvironmentIds: Array.isArray(e.customEnvironmentIds) ? [...e.customEnvironmentIds].sort() : [],
  })).sort((a, b) => a.id.localeCompare(b.id))
}
function candidates(records) {
  return records.filter(e => protectedNames.has(e.key) && e.target.includes('production') && e.target.includes('preview')
    && !e.gitBranch && e.customEnvironmentIds.length === 0).map(e => ({
      ...e, newTarget: e.target.filter(t => t !== 'preview'),
    }))
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b) }
async function main() {
  const current = await metadata()
  const proposed = candidates(current)
  if (!apply) {
    const plan = {
      inputType: 'intra-vercel-preview-scope-plan-v1', projectId, teamId,
      generatedAt: new Date().toISOString(), reviewed: false,
      note: 'PATCH target only; preserve production/development and all values. Separate preview-only and custom-environment records require manual inspection.',
      records: current,
      patches: proposed,
    }
    await writeFile(planPath, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    console.log('READ ONLY: metadata plan saved; ' + current.length + ' records, ' + proposed.length + ' shared production/preview candidates.')
    return
  }
  const planStat = await lstat(planPath)
  assert.ok(planStat.isFile() && !planStat.isSymbolicLink() && planStat.size <= 1024 * 1024,
    'Plan must be a regular JSON file smaller than 1 MiB.')
  const approved = JSON.parse(await readFile(planPath, 'utf8'))
  assert.ok(approved && !Array.isArray(approved) && approved.inputType === 'intra-vercel-preview-scope-plan-v1'
    && approved.projectId === projectId && approved.teamId === teamId && approved.reviewed === true,
    'Review the plan and set reviewed=true before applying it to this exact project/team.')
  assert.ok(Array.isArray(approved.patches) && approved.patches.length > 0, 'No approved changes.')
  assert.equal(new Set(approved.patches.map(p => p.id)).size, approved.patches.length, 'Duplicate record IDs.')
  for (const patch of approved.patches) {
    const fresh = proposed.find(p => p.id === patch.id)
    assert.ok(fresh && same(fresh, patch), 'Metadata drift or unsupported patch; generate a new plan.')
  }
  for (const patch of approved.patches) {
    // Intentionally no value, key, type or DELETE in the mutation body.
    await api('/v9/projects/' + projectId + '/env/' + encodeURIComponent(patch.id) + '?teamId=' + teamId,
      'PATCH', { target: patch.newTarget })
    console.log('PATCH complete: ' + patch.key + ' retained scopes ' + patch.newTarget.join(','))
  }
  const after = await metadata()
  for (const patch of approved.patches) {
    const result = after.find(e => e.id === patch.id)
    assert.ok(result && same(result.target, patch.newTarget) && result.key === patch.key, 'Postflight scope verification failed.')
  }
  console.log('PASS scope postflight. Existing deployments require separate review/redeployment.')
}
try { await main() } catch (error) {
  // Do not print API response bodies, headers or environment values.
  console.error(error instanceof Error ? error.message : 'Operational tool failed.')
  process.exitCode = 1
}
