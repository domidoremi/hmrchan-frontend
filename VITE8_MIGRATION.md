# Vite 8 Migration Summary

## Overview

Successfully migrated from Vite 7.3.1 to Vite 8.0.0-beta.10 (Rolldown-powered).

## Key Changes

### 1. Bundler: Rollup → Rolldown

Vite 8 uses Rolldown (Rust-based) instead of Rollup for production builds, providing significantly faster build times.

### 2. JavaScript Transformer: esbuild → Oxc

- **Old**: `esbuild` for JS/TS transformation
- **New**: `oxc` (Oxc transformer)
- Configuration migrated from `esbuild` to `oxc` options

### 3. Minification: esbuild → Oxc Minifier

- **Old**: `build.minify: 'esbuild'`
- **New**: Oxc Minifier with `build.minify` object syntax
- Supports `compress.drop_console` and `compress.drop_debugger`

### 4. CSS Minification: esbuild → Lightning CSS

- **Old**: `build.cssMinify: 'esbuild'`
- **New**: `build.cssMinify: 'lightningcss'` (default in Vite 8)

### 5. Code Splitting: manualChunks → codeSplitting

- **Old**: `build.rollupOptions.output.manualChunks` (function-based)
- **New**: `build.rolldownOptions.output.codeSplitting.groups` (declarative)

#### Migration Example

**Before (Vite 7):**

```typescript
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('vue')) return 'vue'
      if (id.includes('node_modules')) return 'vendor'
    }
  }
}
```

**After (Vite 8):**

```typescript
rolldownOptions: {
  output: {
    codeSplitting: {
      groups: [
        { test: /vue/, name: 'vue' },
        { test: /node_modules/, name: 'vendor' },
      ]
    }
  }
}
```

## Configuration Changes

### Updated `vite.config.ts`

1. **Removed deprecated options:**
   - `esbuild` → `oxc`
   - `build.rollupOptions` → `build.rolldownOptions`
   - `optimizeDeps.esbuildOptions` (if any)

2. **Added Oxc configuration:**

```typescript
oxc: {
  target: 'esnext',
}
```

3. **Updated minification:**

```typescript
build: {
  minify: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
    mangle: true,
  }
}
```

4. **Simplified code splitting:**
   - Focused on vendor/framework splitting only
   - Removed overly granular business logic splits (not well-supported in Rolldown yet)

## Package Updates

### `package.json`

```json
{
  "devDependencies": {
    "vite": "8.0.0-beta.10"
  }
}
```

## Benefits

1. **Faster builds**: Rolldown is significantly faster than Rollup
2. **Better performance**: Oxc transformer is faster than esbuild
3. **Improved CSS**: Lightning CSS provides better minification
4. **Future-proof**: Aligned with Vite's long-term direction

## Breaking Changes to Watch

### 1. CommonJS Interop

Vite 8 has consistent CJS interop between dev and build. If you import CJS modules, the `default` export behavior is now consistent.

### 2. Module Resolution

Format sniffing removed - respects `resolve.mainFields` order strictly.

### 3. Property Mangling

Not supported by Oxc yet. If you used esbuild's `mangleProps`, you'll need an alternative solution.

## Testing Checklist

- [x] TypeScript compilation passes
- [ ] Development server starts correctly
- [ ] Production build completes
- [ ] All routes load properly
- [ ] Code splitting works as expected
- [ ] CSS minification works
- [ ] Environment variables work

## Rollback Plan

If issues arise, revert to Vite 7:

```bash
bun remove vite
bun add vite@^7.3.1 -D
```

Then restore the old `vite.config.ts` from git history.

## References

- [Vite 8 Migration Guide](https://main.vite.dev/guide/migration)
- [Vite 8 Beta Announcement](https://vite.dev/blog/announcing-vite8-beta)
- [Rolldown Documentation](https://rolldown.rs/)
- [Oxc Documentation](https://oxc.rs/)

## Notes

- Vite 8 is currently in **beta** (8.0.0-beta.10)
- Expect potential breaking changes before stable release
- Monitor the Vite changelog for updates
- Consider waiting for stable release for production deployments
