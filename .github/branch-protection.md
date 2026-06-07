# Branch Protection Setup

Configure these rules in GitHub → Settings → Branches (or equivalent in Gitea/GitLab).

## `main`
- Require pull request before merging
- Required approvals: **1**
- Dismiss stale reviews on new commits: yes
- Require status checks: `Lint, Typecheck & Test`
- Require branches to be up to date before merging
- Restrict direct pushes: **block everyone** (including admins for safety)
- Allow force pushes: **no**
- Allow deletions: **no**

## `staging`
- Require pull request before merging
- Required approvals: **1**
- Require status checks: `Lint, Typecheck & Test`
- Allow force pushes: **no**
- Allow deletions: **no**

## `develop`
- Require pull request before merging
- Required approvals: **1**
- Require status checks: `Lint, Typecheck & Test`
- Allow force pushes: **no**
- Allow deletions: **no**

## Merge Strategy Per Branch

| Target | Strategy | Delete branch after |
|--------|----------|-------------------|
| `develop` | Squash merge | yes |
| `staging` | Squash merge | yes |
| `main` | Merge commit | yes |
