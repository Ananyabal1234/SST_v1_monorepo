# ADR-0002: Modular Monolith in a Turborepo

- Status: Accepted  
- Date: 2026-07-15  
- Deciders: Architecture

## Context

SST needs enterprise maintainability for a future larger team, but early stages are solo-developed with local Docker deployment. Microservices would add network/ops overhead without traffic justifying them.

## Decision

Implement a **modular monolith** NestJS API and Vite SPA in a **Turborepo + pnpm** monorepo. Domain modules are folder-bounded with clear dependency rules. Redis/object storage introduced behind ports/adapters when needed. Extract services only when scaling or team ownership demands.

## Consequences

### Positive

- Simple local DX  
- Strong modular boundaries without distributed complexity  
- Shared types package reduces drift  

### Negative

- Requires discipline to avoid muddy module deps  
- Single DB may become hotspot later (mitigate with indexes/caching)  

## Alternatives considered

1. **Microservices per domain** — rejected for MVP ops cost.  
2. **Separate repos** — rejected; slows shared contracts.  

## References

- [../../06-system-design/HIGH_LEVEL_ARCHITECTURE.md](../../06-system-design/HIGH_LEVEL_ARCHITECTURE.md)  
- [../../13-monorepo/MONOREPO_STRUCTURE.md](../../13-monorepo/MONOREPO_STRUCTURE.md)  
