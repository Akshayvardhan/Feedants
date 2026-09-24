import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import type { RequestHandler } from 'express';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });
const requests = new Counter({ name: 'feedants_http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'route', 'status'], registers: [metricsRegistry] });
const duration = new Histogram({ name: 'feedants_http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'route'], registers: [metricsRegistry] });

export const requestMetrics: RequestHandler = (request, response, next) => {
  const start = process.hrtime.bigint();
  response.on('finish', () => {
    const route = request.route?.path || request.path;
    requests.inc({ method: request.method, route, status: response.statusCode });
    duration.observe({ method: request.method, route }, Number(process.hrtime.bigint() - start) / 1e9);
  });
  next();
};