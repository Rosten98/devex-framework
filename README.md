# devex-framework

TypeScript framework for Golden Path CI/CD pipelines and AWS CDK infrastructure — shared across all engineering teams.

## Overview

`devex-framework` is the infrastructure layer of the DevEx ecosystem. Service repositories install it as a dependency to get type-safe GitHub Actions pipeline generators, reusable AWS CDK Constructs, and standardized DORA telemetry — without writing any boilerplate.

The framework is **polyglot** — the same pipeline and infrastructure patterns work for teams using Python, Go, TypeScript, or Clojure.

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) installed on your machine

## Installation

Install directly from the Git repository — no need to publish to npm:

```bash
pnpm add github:Rosten98/devex-framework
```

## What the Framework Exports

```typescript
import {
  // Types — shared contracts
  Language,
  Environment,
  DoraEvent,
  PipelineConfig,

  // PR Pipeline generator
  generatePrPipeline,

  // CDK Construct
  GoldenPathStack,

  // DORA telemetry
  createDoraEvent,
  emitDoraEvent,
  createAndEmitDoraEvent,
  calculateLeadTime,
  calculateChangeFailureRate,
} from "devex-framework";
```

---

## Usage

### 1. Generate a PR Pipeline

Create a script in your service repo (e.g. `scripts/generate-pipeline.ts`):

```typescript
import { generatePrPipeline } from "devex-framework";
import * as fs from "fs";
import * as path from "path";

const pipeline = generatePrPipeline({
  service: "your-service-name",
  language: "python",               // "python" | "go" | "typescript" | "clojure"
  workIdPattern: /[A-Z]+-\d+/,
  environments: ["sandbox", "staging", "production"],
  testCommand: "pytest tests/ -v",  // your test command
});

fs.writeFileSync(
  path.join(__dirname, "../.github/workflows/pr.yml"),
  pipeline,
  "utf-8"
);
```

Run it to generate the workflow file:

```bash
pnpm generate:pipeline
```

Commit the generated `.github/workflows/pr.yml` to your repository. GitHub Actions will pick it up automatically.

---

### 2. Deploy with GoldenPathStack

In your CDK entrypoint (e.g. `bin/app.ts`):

```typescript
import { App } from "aws-cdk-lib";
import { GoldenPathStack } from "devex-framework";

const app = new App();

new GoldenPathStack(app, "MyServiceStack", {
  service: "my-service",
  language: "python",
  environment: "production",
  codePath: "./src",
  handler: "handler.main",
});
```

The construct provisions:
- AWS Lambda function (ARM64, Python 3.11)
- REST API Gateway with proxy integration
- CloudFormation outputs for API URL and Lambda ARN
- Environment variables: `SERVICE_NAME`, `ENVIRONMENT`, `LANGUAGE`

**Extending for complex services:**

```typescript
import { GoldenPathStack, GoldenPathStackProps } from "devex-framework";

export class MyServiceStack extends GoldenPathStack {
  constructor(scope: Construct, id: string, props: GoldenPathStackProps) {
    super(scope, id, props);

    // Add service-specific resources on top of the Golden Path base
    const table = new dynamodb.Table(this, "Table", { ... });
    this.fn.addEnvironment("TABLE_NAME", table.tableName);
  }
}
```

---

### 3. Emit DORA Telemetry

From within your Lambda or pipeline steps:

```typescript
import { createAndEmitDoraEvent, calculateLeadTime } from "devex-framework";

createAndEmitDoraEvent({
  work_id: "FIN-123",
  service: process.env.SERVICE_NAME!,
  language: "python",
  event_type: "deploy",
  environment: "production",
  commit_sha: process.env.GITHUB_SHA!,
  lead_time_seconds: calculateLeadTime(prOpenedAt),
});
```

Events are emitted as structured JSON to stdout:

```json
{ "dora": { "work_id": "FIN-123", "service": "transactionify", "event_type": "deploy", ... } }
```

This format is queryable via CloudWatch Insights, Datadog, or any log aggregation tool.

---

## DORA Metrics Reference

| Metric | How it's captured |
|--------|-------------------|
| **Deployment Frequency** | Count of `event_type: "deploy"` events per environment per day |
| **Lead Time for Changes** | `lead_time_seconds` in deploy events (PR open → production deploy) |
| **Change Failure Rate** | `calculateChangeFailureRate(totalDeploys, failedDeploys)` |
| **Time to Restore (MTTR)** | Timestamp delta between `failure` and `recovery` events |

---

## Supported Languages

| Language | Lambda Runtime | CI Setup Action |
|----------|---------------|-----------------|
| `python` | `PYTHON_3_11` | `actions/setup-python@v5` |
| `go` | `PROVIDED_AL2023` | `actions/setup-go@v5` |
| `typescript` | `NODEJS_20_X` | `actions/setup-node@v4` |
| `clojure` | `JAVA_21` | `DeLaGuardo/setup-clojure@12.5` |

---

## Development

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Watch mode

```bash
pnpm dev
```

---

## Adding a New Language

The framework is designed to make adding language support straightforward — no changes to existing logic required.

**Step 1:** Add the new language to the `Language` type in `src/types/index.ts`:

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

**Step 4:** Add tests and open a PR. See [CONTRIBUTING.md](./CONTRIBUTING.md).

TypeScript's type system will show a compile error if you miss any of the steps above.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the Inner-Source contribution guide.