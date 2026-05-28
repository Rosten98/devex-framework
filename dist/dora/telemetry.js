"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDoraEvent = createDoraEvent;
exports.emitDoraEvent = emitDoraEvent;
exports.createAndEmitDoraEvent = createAndEmitDoraEvent;
exports.calculateLeadTime = calculateLeadTime;
exports.calculateChangeFailureRate = calculateChangeFailureRate;
/*
  createDoraEvent es una factory function — recibe los datos del evento
  y agrega el timestamp automáticamente.
  
  Decisión: separamos la creación del evento de su emisión porque
  así podemos testear la estructura del evento sin side effects.
*/
function createDoraEvent(input) {
    return {
        ...input,
        timestamp: new Date().toISOString(),
    };
}
/*
  emitDoraEvent escribe el evento a stdout en formato JSON estructurado.
  
  Decisión: usamos JSON.stringify con una clave "dora" como wrapper
  para que sea fácil filtrar estos eventos en los logs de GitHub Actions
  con herramientas como jq o CloudWatch Insights.
  
  Ejemplo de query en CloudWatch:
  fields @message | filter dora.event_type = "deploy"
*/
function emitDoraEvent(event) {
    console.log(JSON.stringify({ dora: event }));
}
/*
  createAndEmitDoraEvent combina las dos funciones anteriores.
  
  Decisión: esta es la función que los pipelines generados usarán
  en la práctica — es más conveniente que llamar a las dos por separado.
  La mantenemos separada de las otras dos para que cada función
  tenga una sola responsabilidad.
*/
function createAndEmitDoraEvent(input) {
    const event = createDoraEvent(input);
    emitDoraEvent(event);
    return event;
}
/*
  calculateLeadTime calcula el tiempo en segundos entre dos timestamps.
  
  Uso principal: Lead Time for Changes.
  Se llama con el timestamp de cuando se abrió el PR y el timestamp
  de cuando se completó el deploy a producción.
  
  Decisión: devolvemos segundos (no minutos ni horas) porque es la
  unidad más granular y el caller puede convertir según necesite.
*/
function calculateLeadTime(startedAt, completedAt = new Date().toISOString()) {
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    return Math.floor((end - start) / 1000);
}
/*
  calculateChangeFailureRate calcula el porcentaje de deploys fallidos.
  
  Uso principal: Change Failure Rate.
  Recibe el total de deploys y cuántos causaron un incidente.
  
  Decisión: devolvemos un número entre 0 y 1 (no un porcentaje)
  porque es más fácil de comparar programáticamente.
  0.05 significa 5% de failure rate.
*/
function calculateChangeFailureRate(totalDeploys, failedDeploys) {
    if (totalDeploys === 0)
        return 0;
    return failedDeploys / totalDeploys;
}
