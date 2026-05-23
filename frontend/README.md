# VedaAI Frontend

Next.js App Router frontend for the VedaAI AI Assessment Creator.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm audit
```

## Notes

- Use the Figma export in `..\design`.
- `package.json` pins PostCSS through npm `overrides` to avoid the known vulnerable transitive version.
- Do not expose backend or Gemini secrets through `NEXT_PUBLIC_*` variables.
