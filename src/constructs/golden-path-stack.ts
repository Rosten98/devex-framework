import { Stack, StackProps, Duration, CfnOutput } from "aws-cdk-lib";
import {
  Function,
  Runtime,
  Code,
  Architecture,
} from "aws-cdk-lib/aws-lambda";
import {
  RestApi,
  LambdaIntegration,
  EndpointType,
} from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { Environment, Language } from "../types";

export interface GoldenPathStackProps extends StackProps {
  service: string;
  language: Language;
  environment: Environment;
  codePath: string;
  handler: string;
}

export class GoldenPathStack extends Stack {
  public readonly api: RestApi;
  public readonly fn: Function;

  constructor(scope: Construct, id: string, props: GoldenPathStackProps) {
    super(scope, id, props);

    const runtime = getRuntimeForLanguage(props.language);

    this.fn = new Function(this, "ServiceFunction", {
      functionName: `${props.service}-${props.environment}`,
      runtime,
      handler: props.handler,
      code: Code.fromAsset(props.codePath),
      timeout: Duration.seconds(30),
      architecture: Architecture.ARM_64,
      environment: {
        SERVICE_NAME: props.service,
        ENVIRONMENT: props.environment,
        LANGUAGE: props.language,
      },
    });

    this.api = new RestApi(this, "ServiceApi", {
      restApiName: `${props.service}-${props.environment}`,
      description: `Golden Path API — ${props.service} (${props.environment})`,
      endpointTypes: [EndpointType.REGIONAL],
    });

    const integration = new LambdaIntegration(this.fn);
    this.api.root.addMethod("ANY", integration);
    this.api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true,
    });

    new CfnOutput(this, "ApiUrl", {
      value: this.api.url,
      description: `API URL for ${props.service} in ${props.environment}`,
      exportName: `${props.service}-${props.environment}-api-url`,
    });

    new CfnOutput(this, "FunctionArn", {
      value: this.fn.functionArn,
      description: `Lambda ARN for ${props.service} in ${props.environment}`,
      exportName: `${props.service}-${props.environment}-fn-arn`,
    });
  }
}

function getRuntimeForLanguage(language: Language): Runtime {
  const runtimes: Record<Language, Runtime> = {
    python: Runtime.PYTHON_3_11,
    go: Runtime.PROVIDED_AL2023,
    typescript: Runtime.NODEJS_20_X,
    clojure: Runtime.JAVA_21,
  };
  return runtimes[language];
}