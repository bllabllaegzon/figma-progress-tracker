Run a full npm security audit, attempt to fix vulnerabilities, and verify the project still passes tests.

## Steps

1. **Run audit** — show current vulnerabilities before touching anything:
```bash
npm audit
```

2. **Fix automatically** — apply safe, semver-compatible fixes:
```bash
npm audit fix
```

3. **Run tests** — confirm nothing broke:
```bash
npm test
```

## If tests fail after `npm audit fix`

- Check `git diff package.json package-lock.json` to see what changed.
- If a dependency bump introduced a breaking change, revert it with `git checkout package.json package-lock.json && npm install`, then investigate the specific package manually.
- Report which package caused the failure and what the breakage is.

## If `npm audit fix` leaves unresolved issues

- Run `npm audit fix --force` only if the user explicitly approves it — force-fixes can include breaking major-version bumps.
- Otherwise list the remaining advisories and their severity so the user can decide how to proceed.
