# manyak-web Gemini Code Review Style Guide

## Review tone

- Write review comments and PR summaries in polite Korean.
- Avoid speculative comments. Leave only issues that are reproducible from the actual changed diff.
- Prioritize issues in the following order: correctness, security, accessibility, performance, and maintainability.
- Do not treat simple formatting issues that ESLint, TypeScript, or Prettier can automatically catch as major defects. Limit those comments to suggesting an auto-fix command.
- Each issue should include the user impact, why it is a problem, and a possible direction for fixing it.

## Project baseline

- This repository uses Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, and shadcn/ui-style Base UI components.
- Application code should live under `src/`, and the `@/*` alias points to `./src/*`.
- Routes and global styles should live under `src/app/`. Shared UI should primarily live under `src/components/ui/`, providers under `src/components/providers/`, hooks under `src/hooks/`, and utilities under `src/lib/`.
- The package manager is `pnpm`. Recommend the following validation commands by default: `pnpm run lint`, `pnpm run typecheck`, and `pnpm exec prettier --check <changed files>`.
- Since production console removal is enabled in `next.config.ts`, allow new `console.*` calls only when their intent and environment guard are clear.

## Next.js and React Server Components

- In the App Router, `page`, `layout`, and route segment components are Server Components by default. Recommend adding `'use client'` only to the smallest components that need state, effects, event handlers, or browser APIs.
- Client Component files should not be `async` components, and they should not import server-only modules, secrets, database access code, or Node-only APIs.
- In Next.js 16, dynamic route `params` and `searchParams` should be treated as Promises and awaited. For new `page` and `layout` types, also consider using helper types such as `PageProps<'/...'>` and `LayoutProps<'/...'>`.
- Keep `metadata` and `generateMetadata` in the Server Component layer.
- Review request preprocessing logic according to the Next.js 16 naming convention by using `proxy.ts` instead of `middleware.ts`. For simple redirects, consider `redirects` in `next.config.ts` first. Warn against slow fetches or full session authorization checks inside `proxy.ts`.
- Server Component data fetching should preserve the benefit of keeping secrets on the server. Check whether unnecessary waterfalls can be reduced with `Promise.all`, route-level `loading.tsx`, or nearby `<Suspense>` boundaries.
- For browser-only interaction data, prefer the already configured `QueryProvider` and React Query. Point out duplicated ad-hoc client fetch state management.

## TypeScript and imports

- Maintain strict TypeScript standards. Point out `any`, broad type assertions, and ignored nullable values unless there is a clear runtime guard or justification.
- Check that type-only imports follow the existing ESLint rule using the `import { type Foo } from ...` form.
- Import order should follow the `eslint-plugin-simple-import-sort` groups: side effects, React, third-party packages, `@/`, relative imports, and assets.
- If an internal path becomes a long deep relative path where the `@/*` alias can be used, suggest using the `@/` alias.

## Styling and components

- New UI should prioritize existing `src/components/ui/*` primitives, `cn`, `cva`, and Tailwind semantic tokens. Review against unnecessarily reimplementing existing primitives such as Button, Sheet, Sidebar, and Tooltip.
- Prefer semantic tokens from `src/app/globals.css`, such as `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `bg-muted`, and `bg-secondary`.
- Tailwind class ordering is handled by `prettier-plugin-tailwindcss`. For changes that only affect class order, recommend running Prettier instead of debating the order manually.
- Allow arbitrary values only when the design cannot reasonably be expressed with design tokens or existing variants.
- Prefer `lucide-react` for icons when possible, and require meaningful `aria-label` values for icon-only buttons.
- Korean UI copy should use natural polite wording or noun-style phrasing. Check that tones are not mixed within the same screen.

## Accessibility

- Clickable elements should use semantic elements such as `button`, `a`, or `Link`. Point out patterns where only a click handler is attached to a `div`.
- Input elements should not rely only on placeholders. Provide a `label`, `aria-label`, or another accessible name.
- Changes that remove or weaken `focus-visible` styles should only be allowed when an alternative focus indicator exists.
- For `next/image`, check for meaningful `alt` text, stable `width` and `height`, and appropriate use of `priority`. Decorative images may use an empty `alt`.
- Make sure not to break `html lang="ko"` or the dark mode hydration setup.

## Performance

- Ask for justification when a large area is converted into a Client Component and increases the client bundle size.
- Since React Compiler is enabled, point out patterns that break compiler assumptions or React rules, such as mutations during render, conditional hooks, or impure calculations.
- Recommend `useMemo`, `useCallback`, and `memo` only when there is an API boundary requiring stable references or a concrete performance reason.
- Use `priority` only for the first-screen logo or likely LCP candidate images. Keep default lazy loading for other images.
- Animations should consider the `motion` configuration and the user's reduced motion preference.

## Security

- Secrets should remain in Server Components, Route Handlers, Server Functions, or server-only modules. Check whether `NEXT_PUBLIC_*` usage is intentionally exposing a public value.
- Route handlers and server actions should clearly validate inputs and perform authentication and authorization checks.
- Point out changes that render user input as HTML unless there is a clear sanitization basis.
- Patterns that store tokens or sensitive session information in `localStorage` should generally be flagged.
- When adding external image domains, check both the image allowlist in `next.config.ts` and the security impact.

## Tests and verification

- Do not require unit tests unconditionally for small UI changes when no test runner exists.
- For hooks, state transitions, data fetching, route handlers, and server actions where edge cases can occur, request tests or clear manual verification scenarios.
- When possible, include a short list of commands to verify in the review summary: `pnpm run lint`, `pnpm run typecheck`, and `pnpm exec prettier --check <changed files>`.
- For UI changes, recommend checking layout, focus, hover, and dark mode in both desktop and mobile viewports.
