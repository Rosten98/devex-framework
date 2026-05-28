# Contributing to devex-framework

Thank you for investing time in improving the Developer Experience for all engineering teams. This guide explains how to propose and contribute changes to the framework following our Inner-Source model.

---

## Inner-Source Model

The DevEx platform team owns and maintains this repository, but **any engineering team can contribute**. We treat contributions from internal teams the same way open-source projects treat external contributors — through pull requests, code review, and discussion.

The platform team's role is to **review and guide**, not to implement pipeline features on behalf of other teams.

---

## Before You Start

### Check existing issues and discussions

Before opening a PR, check whether there is already an issue or discussion about your proposal. If not, **open an issue first** to describe the problem or feature. This avoids wasted effort and lets the platform team give early feedback on direction.

### Work ID requirement

Every branch, commit, and PR title must include a Work ID referencing your team's ticket:

```bash
devex branch create --id YOUR-123 --desc "your-feature-description" --type feat
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/)

### Install dependencies

```bash
git clone https://github.com/your-org/devex-framework
cd devex-framework
pnpm install
```

### Verify your setup

```bash
pnpm build
pnpm test
```

---

## Project Structure

```
devex-framework/
├── src/
│   ├── index.ts                    ← public barrel — all exports go here
│   ├── types/
│   │   └── index.ts                ← shared contracts: Language, DoraEvent, etc.
│   ├── workflows/
│   │   └── pr-pipeline.ts          ← PR pipeline generator
│   ├── constructs/
│   │   └── golden-path-stack.ts    ← CDK Construct
│   └── dora/
│       └── telemetry.ts            ← DORA telemetry helpers
└── tests/
    ├── index.test.ts
    ├── pr-pipeline.test.ts
    ├── dora.test.ts
    └── golden-path-stack.test.ts
```

**Key rule:** anything exported from `src/index.ts` is public API. Everything else is an internal implementation detail. If you add a new module, export it from `src/index.ts`.

---

## Adding a New Language

This is the most common type of contribution. The framework is designed so that adding language support requires changes in exactly three places.

**Step 1:** Add the language to `src/types/index.ts`:

```typescript
export type Language = "python" | "go" | "typescript" | "clojure" | "rust";
```

**Step 2:** Add the CI setup steps in `src/workflows/pr-pipeline.ts`:

```typescript
const steps: Record<Language, object[]> = {
  // ... existing languages ...
  rust: [
    {
      uses: "actions-rs/toolchain@v1",
      with: { toolchain: "stable" },
    },
  ],
};
```

**Step 3:** Add the Lambda runtime in `src/constructs/golden-path-stack.ts`:

```typescript
const runtimes: Record<Language, Runtime> = {
  // ... existing languages ...
  rust: Runtime.PROVIDED_AL2023,
};
```

**Step 4:** Add tests in `tests/pr-pipeline.test.ts`:

```typescript
it("includes correct setup for Rust", () => {
  const result = generatePrPipeline({
    service: "my-service",
    language: "rust",
    workIdPattern: /[A-Z]+-\d+/,
    environments: ["sandbox"],
    testCommand: "cargo test",
  });

  expect(result).toContain("actions-rs/toolchain");
  expect(result).toContain("cargo test");
});
```

TypeScript's compiler will show an error if you miss step 2 or 3 — `Record<Language, ...>` requires an entry for every language in the union type.

---

## Adding a New Pipeline Stage

If your team needs a custom stage in the PR pipeline (e.g. a security scan):

**Step 1:** Open an issue describing the stage — what it does, when it fires, and whether it should be opt-in or mandatory for all teams.

**Step 2:** Add an optional field to `PipelineConfig` in `src/types/index.ts`:

```typescript
export interface PipelineConfig {
  // ... existing fields ...
  securityScan?: {
    enabled: boolean;
    scanner: "snyk" | "trivy";
  };
}
```

**Step 3:** Use it in `src/workflows/pr-pipeline.ts`:

```typescript
function buildWorkflowObject(config: PipelineConfig): object {
  return {
    // ...
    jobs: {
      validate_conventions: buildValidateConventionsJob(config),
      small_tests: buildSmallTestsJob(config),
      ...(config.securityScan?.enabled && {
        security_scan: buildSecurityScanJob(config),
      }),
    },
  };
}
```

Optional fields keep the change backwards compatible — existing teams that don't set the field are unaffected.

---

## Modifying the CDK Construct

Changes to `GoldenPathStack` affect every team's infrastructure. Follow these rules:

- **Never remove or rename public properties** (`api`, `fn`) — teams may depend on them
- **New behavior must be opt-in** — add optional fields to `GoldenPathStackProps`
- **Default values must be safe** — the construct must work without any optional fields set
- **Test with CDK assertions** — use `Template.fromStack()` to verify CloudFormation output

---

## Testing Requirements

Every PR must include tests for the new or modified behavior.

```bash
# Run all tests
pnpm test

# Run in watch mode during development
pnpm dev
```

**Minimum coverage per contribution type:**

| Contribution | Required tests |
|---|---|
| New language | At least one test verifying the correct setup action is included |
| New pipeline stage | Tests for both enabled and disabled states |
| New CDK resource | CDK assertion verifying the resource is created with correct properties |
| Bug fix | A test that would have caught the bug |

---

## Pull Request Process

1. **Branch** — create a branch using `devex branch create` with your Work ID
2. **Build** — run `pnpm build` and ensure it compiles without errors
3. **Test** — run `pnpm test` and ensure all tests pass
4. **PR title** — must include the Work ID: `feat: add Rust language support [FIN-123]`
5. **PR description** — fill in the template provided when opening the PR
6. **Two reviewers** — at least two approvals required before merging
7. **Merge** — squash merge into `main`, then tag a new version

---

## Versioning

The framework follows [Semantic Versioning](https://semver.org/):

| Change type | Version bump | Example |
|---|---|---|
| Bug fix, internal refactor | Patch | `0.1.0` → `0.1.1` |
| New feature, new language (backwards compatible) | Minor | `0.1.0` → `0.2.0` |
| Breaking change to public API or types | Major | `0.1.0` → `1.0.0` |

After merging, the platform team creates a git tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Teams that pin a specific tag (e.g. `github:your-org/devex-framework#v0.1.0`) are not affected by new versions until they explicitly upgrade.

---

## Commit Message Convention

```
type(scope): short description WORK-ID

Examples:
feat(workflows): add Rust language support FIN-123
fix(dora): handle zero total deploys in CFR calculation FIN-456
chore(deps): upgrade aws-cdk-lib to 2.110.0 FIN-789
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

---

## Questions

Open a GitHub Discussion or reach out to the DevEx platform team directly.