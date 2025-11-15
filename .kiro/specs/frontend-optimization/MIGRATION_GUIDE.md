# Component Directory Restructuring - Migration Guide

## Overview

This document describes the component directory restructuring completed as part of Task 1 of the frontend optimization project.

## Changes Made

### New Directory Structure

The component directory has been reorganized from:

```
src/components/
├── common/
├── features/
├── layout/
├── settings/
└── ui/
```

To:

```
src/components/
├── base/           # Atomic-level UI components
├── form/           # Form input components
├── feedback/       # User feedback components
├── data-display/   # Data display components
├── layout/         # Layout components
└── business/       # Business-specific components
```

### Component Mapping

#### Base Components (`base/`)

- `Button.vue` (formerly `ui/GlassButton.vue`)
- `BackToTop.vue` (formerly `ui/BackToTop.vue`)
- `OptimizedImage.vue` (formerly `ui/OptimizedImage.vue`)

#### Form Components (`form/`)

- `Input.vue` (formerly `ui/GlassInput.vue`)

#### Feedback Components (`feedback/`)

- `Toast.vue` (formerly `ui/Toast.vue`)
- `Modal.vue` (formerly `ui/GlassModal.vue`)
- `LoadingSpinner.vue` (formerly `ui/LoadingSpinner.vue`)
- `LoadingProgress.vue` (formerly `ui/LoadingProgress.vue`)
- `BufferIndicator.vue` (formerly `ui/BufferIndicator.vue`)
- `Skeleton.vue` (formerly `ui/Skeleton.vue`)
- `EmptyState.vue` (formerly `ui/EmptyState.vue`)
- `ErrorBoundary.vue` (formerly root `ErrorBoundary.vue`)
- `AccessLimitBanner.vue` (formerly root `AccessLimitBanner.vue`)
- `CookieBanner.vue` (formerly root `CookieBanner.vue`)
- `ApiUnavailableNotice.vue` (formerly `ui/ApiUnavailableNotice.vue`)

#### Data Display Components (`data-display/`)

- `Card.vue` (formerly `ui/Card.vue`)
- `Badge.vue` (formerly `ui/Badge.vue`)
- `Divider.vue` (formerly `ui/Divider.vue`)
- `MediaViewer.vue` (formerly `ui/MediaViewer.vue`)
- `MediaViewerPlyr.vue` (formerly `ui/MediaViewerPlyr.vue`)
- `ImageViewer.vue` (formerly `ui/ImageViewer.vue`)

#### Layout Components (`layout/`)

- No changes - remained in `layout/` directory
- `MainLayout.vue`
- `AppNavbar.vue`
- `AppFooter.vue`
- `Grid.vue`
- `Stack.vue`
- `Section.vue`

#### Business Components (`business/`)

- `PostCard.vue` (formerly `features/PostCard.vue`)
- `FilterBar.vue` (formerly `features/FilterBar.vue`)
- `SearchBar.vue` (formerly `features/SearchBar.vue`)
- `Pagination.vue` (formerly `features/Pagination.vue`)
- `PostPreviewPanel.vue` (formerly `features/PostPreviewPanel.vue`)
- `CacheManagement.vue` (formerly `settings/CacheManagement.vue`)

### Index Files Created

Each category now has an `index.ts` file for easier imports:

- `src/components/base/index.ts`
- `src/components/form/index.ts`
- `src/components/feedback/index.ts`
- `src/components/data-display/index.ts`
- `src/components/layout/index.ts`
- `src/components/business/index.ts`
- `src/components/index.ts` (main export)

### Import Path Updates

All import statements across the codebase have been updated to reflect the new structure:

**Before:**

```typescript
import GlassButton from '@/components/ui/GlassButton.vue'
import PostCard from '@/components/features/PostCard.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
```

**After:**

```typescript
import GlassButton from '@/components/base/Button.vue'
import PostCard from '@/components/business/PostCard.vue'
import ErrorBoundary from '@/components/feedback/ErrorBoundary.vue'
```

### Backward Compatibility

The old `ui/index.ts` file has been updated to re-export components from their new locations with deprecation notices. Legacy component names (like `GlassButton`, `GlassInput`, `GlassModal`) are still exported for backward compatibility.

## Files Updated

### View Files

- `src/views/HomePage.vue`
- `src/views/ExplorePage.vue`
- `src/views/FavoritesPage.vue`
- `src/views/AuthorsPage.vue`
- `src/views/LoginPage.vue`
- `src/views/RegisterPage.vue`
- `src/views/ProfilePage.vue`
- `src/views/PostDetailPage.vue`
- `src/views/PostsView.vue`
- `src/views/SearchPage.vue`
- `src/views/SettingsPage.vue`
- `src/views/NotFoundPage.vue`

### Component Files

- `src/components/business/PostCard.vue`
- `src/components/business/FilterBar.vue`
- `src/components/business/CacheManagement.vue`
- `src/components/feedback/EmptyState.vue`
- `src/components/layout/MainLayout.vue`

### Configuration Files

- `vite.config.ts`
- `src/App.vue`

## Verification

The restructuring has been verified by:

1. ✅ Successful build (`bun run build`)
2. ✅ All import paths updated
3. ✅ No broken references
4. ✅ Old directories removed

## Next Steps

Future tasks can now:

1. Add new components to the appropriate category directory
2. Use the index files for cleaner imports
3. Build upon this organized structure for better maintainability

## Benefits

1. **Clear Organization**: Components are now grouped by their purpose and functionality
2. **Better Discoverability**: Developers can easily find components based on their category
3. **Scalability**: New components can be added to the appropriate category
4. **Maintainability**: Related components are co-located
5. **Type Safety**: Index files provide better TypeScript support
6. **Future-Ready**: Structure supports the planned component enhancements in subsequent tasks

## Notes

- Component file names have been simplified (e.g., `GlassButton.vue` → `Button.vue`)
- Legacy names are still available through index exports for gradual migration
- All internal component references have been updated
- The build process remains unchanged and fully functional
