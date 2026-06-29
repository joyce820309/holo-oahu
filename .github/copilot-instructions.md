# Holo — Copilot Development Instructions

## Installed Skills (`.skills/` directory)

This project has three AI development skills installed. Reference and follow their principles during development.

### 1. UI UX Pro Max (`ui-ux-pro-max`)
- **Source**: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Skill file**: `.skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/SKILL.md`
- **Purpose**: Design intelligence for professional UI/UX — includes 67 UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 10 tech stacks.
- **When to use**: Any UI/UX work — designing pages, choosing colors/typography, reviewing UI code, implementing responsive layouts, accessibility checks, animation, forms.
- **Key principles**:
  - Priority 1: Accessibility (contrast 4.5:1, alt text, keyboard nav, aria-labels)
  - Priority 2: Touch & Interaction (min 44×44px targets, loading feedback)
  - Priority 3: Performance (WebP/AVIF, lazy loading, CLS < 0.1)
  - Priority 4: Style Selection (match product type, consistency, SVG icons — no emoji)
  - Priority 5: Layout & Responsive (mobile-first, viewport meta, no horizontal scroll)
  - Pre-delivery: No emojis as icons (use Lucide), cursor-pointer on clickables, hover states with transitions 150-300ms, focus states visible, prefers-reduced-motion respected, responsive breakpoints 375/768/1024/1440px
- **Design system generation**: `python3 .skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p "Holo"`

### 2. gstack (`gstack`)
- **Source**: https://github.com/garrytan/gstack
- **Skill file**: `.skills/gstack/SKILL.md`
- **Purpose**: Complete engineering workflow — think → plan → build → review → test → ship → reflect.
- **Key principles**:
  - Direct, concrete, builder-to-builder communication
  - No filler words, no AI vocabulary (delve, crucial, robust, comprehensive)
  - Mark tasks complete individually, not batch
  - Think before heavy actions — state approach before executing
  - Verify before declaring success
  - Log operational learnings for future sessions
- **Completion status protocol**: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT

### 3. Superpowers (`superpowers`)
- **Source**: https://github.com/obra/superpowers
- **Skill file**: `.skills/superpowers/skills/using-superpowers/SKILL.md`
- **Purpose**: Agentic software development methodology — brainstorming, TDD, systematic debugging, git worktrees, code review, subagent-driven development.
- **Key principles**:
  - **Brainstorming before coding** — refine ideas through questions, explore alternatives, present design for validation
  - **Test-Driven Development** — RED-GREEN-REFACTOR: write failing test first, then minimal code to pass
  - **Systematic debugging** — 4-phase root cause process, no fixes without investigation
  - **YAGNI** — You Aren't Gonna Need It; don't add features beyond what's asked
  - **Verification before completion** — ensure it's actually fixed
  - User instructions say WHAT, not HOW — "Add X" doesn't mean skip workflows

## Project: Holo (Travel PWA)
- **Stack**: React 18 + Vite + Tailwind CSS v3 + Firebase + Leaflet.js
- **Icons**: lucide-react only (no emoji icons)
- **i18n**: react-i18next (zh-TW / en)
- **Target**: Family travel, elder-friendly, clean UI
