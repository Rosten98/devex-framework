"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePrPipeline = generatePrPipeline;
const yaml = __importStar(require("js-yaml"));
/*
  generatePrPipeline toma la configuración de un servicio y devuelve
  el contenido completo de un archivo GitHub Actions YAML.

  Decisión: devolvemos un string en lugar de escribir el archivo directamente
  porque así la función es pura y testeable — el caller decide qué hacer
  con el string (escribirlo a disco, imprimirlo, compararlo en un test).
*/
function generatePrPipeline(config) {
    const workflow = buildWorkflowObject(config);
    return yaml.dump(workflow, { lineWidth: 120 });
}
/*
  buildWorkflowObject construye el objeto JavaScript que representa
  el pipeline completo. Lo separamos de generatePrPipeline para que
  sea más fácil de testear cada sección por separado.
*/
function buildWorkflowObject(config) {
    return {
        name: `PR Pipeline — ${config.service}`,
        /*
          El pipeline se dispara solo en PRs hacia main.
          Decisión: no corremos el pipeline en pushes directos a main
          porque eso es responsabilidad del Integration Pipeline (el otro
          tipo de pipeline que el framework soportará después).
        */
        on: {
            pull_request: {
                branches: ["main", "master"],
            },
        },
        /*
          Variables de entorno globales disponibles en todos los jobs.
          Decisión: las ponemos aquí y no en cada job para evitar repetición
          y garantizar que todos los jobs tienen el mismo contexto.
        */
        env: {
            SERVICE_NAME: config.service,
            LANGUAGE: config.language,
        },
        jobs: {
            /*
              Job 1: validate_conventions
              Propósito: fallar rápido si no se cumplen las convenciones básicas.
              Decisión: este job corre primero y los demás dependen de él (needs).
              Si falla aquí, no gastamos minutos de CI corriendo tests innecesariamente.
            */
            validate_conventions: buildValidateConventionsJob(config),
            /*
              Job 2: small_tests
              Propósito: correr los tests del servicio.
              Decisión: separamos setup del lenguaje en una función aparte
              (getLanguageSetupSteps) para que el framework sea polyglot —
              el mismo pipeline funciona para Python, Go, TypeScript, etc.
            */
            small_tests: buildSmallTestsJob(config),
        },
    };
}
function buildValidateConventionsJob(config) {
    return {
        name: "Validate conventions",
        "runs-on": "ubuntu-latest",
        steps: [
            { uses: "actions/checkout@v4" },
            {
                name: "Check Work ID in PR title",
                /*
                  Decisión: validamos el Work ID en el título del PR (no solo en el branch)
                  porque el título es lo que aparece en el historial de Git cuando se hace
                  squash merge — queremos trazabilidad permanente en el historial.
                */
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
function buildSmallTestsJob(config) {
    return {
        name: "Small tests",
        "runs-on": "ubuntu-latest",
        /*
          needs garantiza que small_tests solo corre si validate_conventions pasó.
          Decisión: esto implementa el principio de "fail fast" — no corremos
          tests si las convenciones básicas no se cumplen.
        */
        needs: ["validate_conventions"],
        steps: [
            { uses: "actions/checkout@v4" },
            /*
              getLanguageSetupSteps devuelve los pasos específicos del lenguaje.
              Decisión clave: esto es lo que hace al framework polyglot.
              El equipo solo declara su lenguaje en PipelineConfig y el framework
              sabe qué versión de Python/Go/Node instalar automáticamente.
            */
            ...getLanguageSetupSteps(config.language),
            {
                name: "Run tests",
                run: config.testCommand,
            },
        ],
    };
}
/*
  getLanguageSetupSteps es la función que hace al framework polyglot.
  
  Decisión: usamos un Record<Language, object[]> en lugar de un switch/if-else
  porque es más fácil de extender — para agregar un nuevo lenguaje solo
  agregas una entrada al objeto, sin tocar la lógica existente.
  Esto implementa el principio Open/Closed: abierto para extensión,
  cerrado para modificación.
*/
function getLanguageSetupSteps(language) {
    const steps = {
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
