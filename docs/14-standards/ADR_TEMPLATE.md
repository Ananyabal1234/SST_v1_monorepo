# ADR Template — Architecture Decision Record

## Purpose

Standard template for architectural decisions.

## Audience

Anyone proposing a lasting technical decision.

## Scope

Repo ADRs under `docs/14-standards/adr/`.

## Definitions

ADR = Architecture Decision Record.

---

## Template

```markdown
# ADR-XXXX: Title

- Status: Proposed | Accepted | Deprecated | Superseded
- Date: YYYY-MM-DD
- Deciders: names/roles

## Context

What problem or force requires a decision?

## Decision

What did we choose?

## Consequences

Positive, negative, neutral.

## Alternatives considered

Option A — why rejected
Option B — why rejected

## References

Links to docs/PRs
```

## Numbering

Zero-padded sequential: `0001`, `0002`, …

## When to write an ADR

- Stack choices  
- Auth model  
- Monolith vs services  
- MVP scope boundaries  

## References

- Michael Nygard ADR pattern  
- [adr/0001-mvp-pipeline-first.md](./adr/0001-mvp-pipeline-first.md)  
