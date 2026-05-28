import { Stack, StackProps } from "aws-cdk-lib";
import { Function } from "aws-cdk-lib/aws-lambda";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { Environment, Language } from "../types";
export interface GoldenPathStackProps extends StackProps {
    service: string;
    language: Language;
    environment: Environment;
    codePath: string;
    handler: string;
}
export declare class GoldenPathStack extends Stack {
    readonly api: RestApi;
    readonly fn: Function;
    constructor(scope: Construct, id: string, props: GoldenPathStackProps);
}
