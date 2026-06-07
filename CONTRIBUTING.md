# Contributing to Crewly

## Branch Model

```
main      ← production (auto-deploy on push)
staging   ← pre-prod QA (auto-deploy on push)
develop   ← integration branch (all feature PRs land here)
feature/* ← new work (branch from develop)
fix/*     ← bug fixes (branch from develop)
hotfix/*  ← emergency prod fixes (branch from main)
```

## Workflow

### Normal feature
```bash
git checkout develop
git pull
git checkout -b feature/my-thing
# ... work ...
# PR → develop (squash merge)
```

### Hotfix
```bash
git checkout main
git pull
git checkout -b hotfix/critical-fix
# ... fix ...
# PR → main (merge commit, requires 1 approval)
# then immediately: PR → develop to backport
git tag v1.x.x  # tag on main after merge
```

### Promoting to staging / production
```
develop → PR → staging   (squash merge)
staging → PR → main      (merge commit)
```

## Commit Convention

```
feat(scope): short description
fix(scope): short description
chore|docs|refactor|test: short description
```

- Subject ≤ 72 chars
- Body only when "why" isn't obvious from the subject

## PR Rules

- Title must follow conventional commit format
- Squash merge into `develop` and `staging`
- Merge commit into `main`
- Delete branch after merge
- At least 1 approval required for `main`

## What Jenkins Does Per Branch

| Branch | CI Actions |
|--------|-----------|
| `feature/*`, `fix/*` | lint + typecheck + test |
| `develop` | lint + test + build images (no deploy) |
| `staging` | full pipeline → deploy to staging |
| `main` | full pipeline + security scan → deploy to production |
