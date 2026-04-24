# Contributing to INTRA

## Branch strategy

Use a branch for every change. Do not work directly on `main`.

### Branch naming

- `feature/<short-description>` for new functionality
- `fix/<short-description>` for bug fixes
- `chore/<short-description>` for maintenance, docs, or tooling

Examples:

- `feature/ci-cd-workflow`
- `fix/auth-open-redirect`
- `chore/update-readme`

## Required delivery flow

Every change should follow this order:

1. Create branch
2. Push branch
3. Open PR
4. Wait for preview and CI validation
5. Review and approval
6. Merge to `main`
7. Automatic deploy from `main`

## Main branch protection

`main` is the protected production branch.

Rules:

- direct pushes to `main` are not allowed
- merge only through pull request
- CI must pass before merge
- at least 1 approval is required before merge

## Validation

The CI workflow currently validates:

- lint
- unit tests
- typecheck
- build

## Notes

- Untracked local utilities, drafts, or QA scripts should not be merged unless they are cleaned up and intentionally documented.
- Production must always reflect code that exists in `main`.
