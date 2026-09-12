# SPEC-020: System Health & Monitoring

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P2 — Operational  
> **Dependencies:** None (infrastructure layer)

---

## 1. What

Internal monitoring and alerting system:

**API Monitoring:**
- Response time: p50, p95, p99 per endpoint
- Error rate: % of 5xx responses
- Throughput: requests per minute
- Top slow endpoints

**Queue Monitoring:**
- BullMQ queue depth per queue
- Job failure rate
- Processing time per job type
- Dead letter queue size

**Database Monitoring:**
- Slow queries: >200ms execution time
- Connection pool usage
- Replication lag (if replicated)
- Table size growth

**Error Tracking:**
- Centralized error logging
- Stack traces with source maps
- User context (user ID, session, request path)
- Request ID correlation across services

**Alerting:**
- Email + Slack alerts for threshold breaches
- Alert rules configurable per environment
- Alert history and acknowledgment

**Health Checks:**
- `/health` endpoint for load balancer
- Checks: DB, Redis, critical external services
- Public status page

---

## 2. Why

Proactive monitoring prevents outages and performance degradation. Currently, issues are discovered by users reporting them. Monitoring reduces MTTR (mean time to recovery) by 80%.

**Business Impact:**
- Reduce MTTR: -80%
- Prevent outages: catch issues before users
- Improve performance: identify bottlenecks
- Reduce firefighting: proactive vs reactive

---

## 3. Who

| Role | Access |
|------|--------|
| **DevOps/Tech Lead** | All metrics, alerts, system configuration |
| **Developers** | Error logs, traces, debugging tools |
| **Admin** | High-level system status dashboard |

---

## 4. Success Criteria

### Functional
- [ ] API monitoring: response time, error rate, throughput per endpoint
- [ ] Queue monitoring: depth, failure rate, processing time per job type
- [ ] DB monitoring: slow queries, connections, replication lag
- [ ] Error tracking: centralized with context, stack traces, request ID
- [ ] Alerting: email + Slack for thresholds, configurable rules
- [ ] Health checks: `/health` endpoint, public status page
- [ ] Uptime dashboard: service availability percentage
- [ ] Log aggregation: searchable logs with filtering
- [ ] Performance trends: 7-day, 30-day, 90-day comparisons

### Non-Functional
- [ ] Metrics collection: <1% performance overhead
- [ ] Alert delivery: <30s from threshold breach
- [ ] Log retention: 30 days hot, 1 year cold
- [ ] Dashboard load: <2s

---

## 5. Out of Scope

- AIOps / AI-powered anomaly detection
- Automated remediation (self-healing)
- Infrastructure cost optimization
- Distributed tracing (Phase 1.5)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/health/health.controller.ts` | Health check endpoint |
| `backend/src/modules/health/health.service.ts` | Health check logic |
| `backend/src/modules/monitoring/monitoring.service.ts` | Metrics collection |
| `backend/src/middleware/request-logger.middleware.ts` | Request logging |
| `backend/src/filters/exception.filter.ts` | Global exception handling |
| `scripts/monitoring/` | Monitoring scripts and dashboards |
| `docker-compose.monitoring.yml` | Monitoring stack (Prometheus, Grafana) |
