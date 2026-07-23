# Wireframes — SST MVP

## Purpose

Low-fidelity screen inventory and layout structure for development.

## Audience

Frontend engineers, UX.

## Scope

MVP screens as mermaid wireframes (not Figma). Dense internal-ops pattern.

## Definitions

| Region | Meaning |
|--------|---------|
| Nav | Left navigation |
| Main | Content canvas |
| Filters | Horizontal filter bar |

---

## Screen inventory

| ID | Screen |
|----|--------|
| W-01 | Login |
| W-02 | Dashboard |
| W-03 | Requirements list |
| W-04 | Requirement detail / form |
| W-05 | Candidates list |
| W-06 | Candidate detail |
| W-07 | Offers list / detail |
| W-08 | Onboarding list / detail |
| W-09 | Admin masters |
| W-10 | Admin users |
| W-11 | Admin audit |
| W-12 | Import wizard |

---

## W-01 Login

```text
+--------------------------------------+
|           SST                        |
|  Email [..................]          |
|  Password [..............]           |
|  [ Sign in ]                         |
+--------------------------------------+
```

## W-02 Dashboard

```text
+------+-------------------------------------------+
| Nav  | Filters: TA | Sales | Priority | Client | |
|      | Date From/To                              |
| Dash | [KPI][KPI][KPI][KPI][KPI]                |
| Req  | Stage summary | RAG summary | Escalations |
| Cand |                                           |
| ...  |                                           |
+------+-------------------------------------------+
```

## W-03 Requirements list

```text
| Search + filters + [New]                        |
| Table: ID | Date | Client | Role | Pos | Pri |  |
| TA | Status | SLA | Open | Actions              |
```

## W-04 Requirement detail

- Header: publicId, status, SLA badge  
- Sections: Core, Owners & Dates, Commercials, Remarks  
- Tabs: Candidates | Activity  

## W-05/06 Candidates

- List with duplicate warning icon column  
- Detail: stage timeline, selected toggle, related offer link  

## W-07/08 Offers & Onboarding

- Status stepper  
- TAT/RAG badges  
- Linked candidate/requirement crumbs  

## W-09–W-12 Admin

- Masters as editable tables per lookup type  
- Users table with role select  
- Audit: filters entity/actor/date  
- Import: upload → validate → confirm → report  

## Component reuse map

| Pattern | Components |
|---------|------------|
| Lists | DataTable, FilterBar, RowActions |
| Forms | FormField, DatePicker, Combobox |
| Status | Badge (RAG), StatusSelect |
| Feedback | Toast, AlertBanner, ConfirmDialog |

## Accessibility

- Tables: keyboard sortable headers  
- Focus rings visible in light/dark  
- Color not sole RAG indicator (include text)

## Responsive

| Breakpoint | Behavior |
|------------|----------|
| ≥1280 | Full nav + tables |
| 768–1279 | Collapsible nav; horizontal scroll tables |
| <768 | Card list fallback for key entities |

## References

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
- Excel Dashboard layout cues  
