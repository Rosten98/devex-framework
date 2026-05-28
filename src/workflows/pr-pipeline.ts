import * as yaml from "js-yaml";
import { PipelineConfig, Language } from "../types";

export function generatePrPipeline(config: PipelineConfig): string {
  const workflow = buildWorkflowObject(config);
  return yaml.dump(workflow, { lineWidth: 120 });
}

function buildWorkflowObject(config: PipelineConfig): object {
  return {
    name: `PR Pipeline — ${config.service}`,
    on: {
      pull_request: {
        branches: ["main", "master"],
      },
    },

    env: {
      SERVICE_NAME: config.service,
      LANGUAGE: config.language,
    },

    jobs: {
      validate_conventions: buildValidateConventionsJob(config),
      small_tests: buildSmallTestsJob(config),
    },
  };
}

function buildValidateConventionsJob(config: PipelineConfig): object {
  return {
    name: "Validate conventions",
    "runs-on": "ubuntu-latest",
    steps: [
      { uses: "actions/checkout@v4" },
      {
        name: "Check Work ID in PR title",
        run: [
          `PR_TITLE="\${{ github.event.pull_request.title }}"`,
          `if ! echo "$PR_TITLE" | grep -qE "${config.workIdPattern.source}"; then`,
          `  echo "ERROR: PR title must contain a Work ID (e.g. FIN-123)"`,
          `  exit 1`,
          `fi`,
          `echo "Work ID check passed: $PR_TITLE"`,
        ].join("\n"),
      },
    ],
  };
}

function buildSmallTestsJob(config: PipelineConfig): object {
  return {
    name: "Small tests",
    "runs-on": "ubuntu-latest",
    needs: ["validate_conventions"],
    steps: [
      { uses: "actions/checkout@v4" },
      ...getLanguageSetupSteps(config.language),
      {
        name: "Run tests",
        run: config.testCommand,
      },
    ],
  };
}

function getLanguageSetupSteps(language: Language): object[] {
  const steps: Record<Language, object[]> = {
    python: [
      {
        uses: "actions/setup-python@v5",
        with: { "python-version": "3.11" },
      },
      {
        name: "Install dependencies",
        run: "pip install -r requirements.txt",
      },
    ],
    go: [
      {
        uses: "actions/setup-go@v5",
        with: { "go-version": "1.21" },
      },
    ],
    typescript: [
      {
        uses: "actions/setup-node@v4",
        with: { "node-version": "20" },
      },
      {
        name: "Install dependencies",
        run: "npm ci",
      },
    ],
    clojure: [
      {
        uses: "DeLaGuardo/setup-clojure@12.5",
        with: { cli: "latest" },
      },
    ],
  };

  return steps[language] ?? [];
}