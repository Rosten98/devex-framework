import { describe, it, expect } from "vitest";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { GoldenPathStack } from "../src/index";

/*
  Template.fromStack sintetiza el stack a CloudFormation en memoria
  y nos permite hacer assertions sobre los recursos generados
  sin necesitar una cuenta de AWS ni hacer ningún deploy.
*/
function buildTemplate() {
  const app = new App();
  const stack = new GoldenPathStack(app, "TestStack", {
    service: "transactionify",
    language: "python",
    environment: "sandbox",
    codePath: "./src",
    handler: "handler.main",
  });
  return Template.fromStack(stack);
}

describe("GoldenPathStack", () => {
  it("crea una Lambda Function con el nombre correcto", () => {
    const template = buildTemplate();
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "transactionify-sandbox",
      Handler: "handler.main",
    });
  });

  it("inyecta las variables de entorno de contexto en la Lambda", () => {
    const template = buildTemplate();
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          SERVICE_NAME: "transactionify",
          ENVIRONMENT: "sandbox",
          LANGUAGE: "python",
        },
      },
    });
  });

  it("crea un API Gateway REST API", () => {
    const template = buildTemplate();
    template.resourceCountIs("AWS::ApiGateway::RestApi", 1);
  });

  it("usa arquitectura ARM64", () => {
    const template = buildTemplate();
    template.hasResourceProperties("AWS::Lambda::Function", {
      Architectures: ["arm64"],
    });
  });
});