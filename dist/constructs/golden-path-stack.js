"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoldenPathStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_apigateway_1 = require("aws-cdk-lib/aws-apigateway");
class GoldenPathStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const runtime = getRuntimeForLanguage(props.language);
        /*
          La Lambda recibe variables de entorno con el contexto del servicio.
    
          Decisión: inyectamos SERVICE_NAME, ENVIRONMENT y LANGUAGE
          automáticamente para que el código de la Lambda pueda emitir
          eventos DORA sin necesitar configuración adicional.
          El handler solo necesita importar el SDK de DORA y los datos
          de contexto ya están disponibles en process.env.
        */
        this.fn = new aws_lambda_1.Function(this, "ServiceFunction", {
            functionName: `${props.service}-${props.environment}`,
            runtime,
            handler: props.handler,
            code: aws_lambda_1.Code.fromAsset(props.codePath),
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            /*
              arm64 es más barato y más rápido que x86_64 para la mayoría
              de workloads. Decisión: lo usamos como default para todos los
              equipos — es una optimización de costo que el framework aplica
              automáticamente sin que el equipo tenga que pensarlo.
            */
            architecture: aws_lambda_1.Architecture.ARM_64,
            environment: {
                SERVICE_NAME: props.service,
                ENVIRONMENT: props.environment,
                LANGUAGE: props.language,
            },
        });
        /*
          RestApi crea un API Gateway que expone la Lambda via HTTP.
    
          Decisión: usamos REGIONAL en lugar de EDGE porque la mayoría
          de los servicios internos no necesitan la red de CloudFront.
          EDGE agrega latencia para llamadas internas y costo adicional.
        */
        this.api = new aws_apigateway_1.RestApi(this, "ServiceApi", {
            restApiName: `${props.service}-${props.environment}`,
            description: `Golden Path API — ${props.service} (${props.environment})`,
            endpointTypes: [aws_apigateway_1.EndpointType.REGIONAL],
        });
        const integration = new aws_apigateway_1.LambdaIntegration(this.fn);
        this.api.root.addMethod("ANY", integration);
        this.api.root.addProxy({
            defaultIntegration: integration,
            anyMethod: true,
        });
        /*
          CfnOutput expone valores del stack como outputs de CloudFormation.
    
          Decisión: exportamos la URL del API y el ARN de la Lambda porque
          son los valores que otros stacks o pipelines necesitan para
          hacer llamadas al servicio o para configurar permisos.
        */
        new aws_cdk_lib_1.CfnOutput(this, "ApiUrl", {
            value: this.api.url,
            description: `API URL for ${props.service} in ${props.environment}`,
            exportName: `${props.service}-${props.environment}-api-url`,
        });
        new aws_cdk_lib_1.CfnOutput(this, "FunctionArn", {
            value: this.fn.functionArn,
            description: `Lambda ARN for ${props.service} in ${props.environment}`,
            exportName: `${props.service}-${props.environment}-fn-arn`,
        });
    }
}
exports.GoldenPathStack = GoldenPathStack;
/*
  getRuntimeForLanguage mapea el tipo Language del framework
  al Runtime de AWS Lambda correspondiente.

  Decisión: usamos Record<Language, Runtime> por la misma razón
  que en getLanguageSetupSteps del pipeline — TypeScript nos fuerza
  a definir un runtime para cada lenguaje soportado. Si alguien
  agrega un nuevo Language al tipo pero olvida agregarlo aquí,
  el compilador lo detecta antes de que llegue a producción.

  Nota sobre Go y Clojure: usan PROVIDED_AL2023 y JAVA_21
  respectivamente porque AWS no tiene runtimes oficiales para
  esos lenguajes — se compilan a binarios nativos (Go) o JVM (Clojure).
*/
function getRuntimeForLanguage(language) {
    const runtimes = {
        python: aws_lambda_1.Runtime.PYTHON_3_11,
        go: aws_lambda_1.Runtime.PROVIDED_AL2023,
        typescript: aws_lambda_1.Runtime.NODEJS_20_X,
        clojure: aws_lambda_1.Runtime.JAVA_21,
    };
    return runtimes[language];
}
