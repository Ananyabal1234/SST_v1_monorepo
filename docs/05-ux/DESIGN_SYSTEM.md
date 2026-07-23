# Design System — SST

## Purpose

Define design tokens, ShadCN usage, accessibility, themes, and state patterns.

## Audience

Frontend engineers, UX.

## Scope

MVP web SPA. Avoid generic AI aesthetic tropes; favor sober enterprise ops tool.

## Definitions

| Term | Definition |
|------|------------|
| Token | CSS variable for color/spacing/type |
| ShadCN | Component primitives on Radix + Tailwind |

---

## 1. Visual direction

- **Look:** Clean operational tool — slate neutrals, single accent (teal/cyan), subtle page background gradient or faint grid for atmosphere (not purple/indigo clichés, not cream/serif editorial).  
- **Typography:** Distinct UI fonts via Google/fonts CDN or self-host — e.g. **Source Sans 3** (UI) + **IBM Plex Mono** (IDs). Avoid Inter/Roboto/Arial as primary.  
- **Density:** Compact row height for tables; comfortable forms.

## 2. Design tokens (CSS variables)

```css
:root {
  --background: 210 20% 98%;
  --foreground: 215 25% 15%;
  --card: 0 0% 100%;
  --primary: 174 60% 32%;      /* teal */
  --primary-foreground: 0 0% 100%;
  --muted: 210 16% 93%;
  --border: 214 16% 86%;
  --destructive: 0 72% 51%;
  --warning: 38 92% 50%;
  --success: 152 60% 36%;
  --radius: 0.375rem;
  --font-sans: "Source Sans 3", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

.dark {
  --background: 215 28% 10%;
  --foreground: 210 20% 96%;
  --card: 215 25% 13%;
  --primary: 174 55% 42%;
  --muted: 215 20% 18%;
  --border: 215 16% 22%;
}
```

## 3. RAG tokens

| RAG | Token | Text label |
|-----|-------|------------|
| Green | `--success` | Healthy |
| Amber | `--warning` | Warning |
| Red | `--destructive` | Escalation |

## 4. ShadCN component library mapping

| Need | ShadCN |
|------|--------|
| Buttons, inputs, select | Button, Input, Select, Textarea |
| Dialogs | Dialog, AlertDialog |
| Tables | Table (+ tanstack table) |
| Tabs, dropdown | Tabs, DropdownMenu |
| Toast | Sonner |
| Theme | next-themes pattern adapted for Vite |
| Form | Form + RHF + Zod |

Install via shadcn CLI into `apps/web` (or `packages/ui`).

## 5. Spacing & layout

- Page padding: 16–24px  
- Section gap: 16px  
- Table cell py: 8px  
- Max content width: fluid full-bleed for lists (ops), constrained 720px for focused forms optional  

## 6. Dark mode

- System preference default + user toggle in header  
- Persist `localStorage` key `sst-theme`  
- Ensure RAG contrast ≥ 4.5:1 against surfaces  

## 7. Loading / error / empty

| State | Pattern |
|-------|---------|
| Loading | Skeleton (KPI cards, table rows) |
| Error | Alert destructive + Retry |
| Empty | Title + one sentence + primary CTA |
| Partial | Inline field errors from Zod |

## 8. Motion

Intentional, minimal (2–3):

1. Sidebar collapse transition 150ms  
2. Toast slide-in  
3. KPI value fade on filter change  

Avoid decorative parallax.

## 9. Accessibility checklist

- [ ] Focus visible  
- [ ] Labels on all inputs  
- [ ] `aria-live` for async filter results count  
- [ ] Sortable column `aria-sort`  
- [ ] Do not rely on color alone for RAG  

## Trade-offs

Cards are **not** used in hero/marketing sense; tables and filter bars are primary containers for interaction.

## References

- shadcn/ui docs  
- WCAG 2.2 AA  
- [INFORMATION_ARCHITECTURE.md](./INFORMATION_ARCHITECTURE.md)  
