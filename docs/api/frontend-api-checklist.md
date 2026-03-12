# Frontend API Checklist

## Purpose

This list is for frontend optimization and homepage refactor follow-up.

- Separate what already exists in `src/api` from what is still missing for the new homepage experience.
- Prioritize endpoints that reduce repeated client aggregation, avoid overfetch, and make animation entry states more stable.
- Prefer lightweight list payloads for homepage scenes and reserve detail payloads for modal/detail pages.

## Current Frontend Service Surface

### Core content

- `GET /api/v1/posts`
  - Service: `postService.listPosts`
  - Usage: homepage feed, hero collage source, current tag/author aggregation basis
  - Current issue: homepage now derives hero, trending tags, trending authors, featured cards, and text bubbles from the same post list on the client

- `GET /api/v1/posts/:postId`
  - Service: `postService.getPost`
  - Usage: preview modal and detail page

- `GET /api/v1/posts/:postId/author`
  - Service: `postService.getPostAuthor`

- `GET /api/v1/posts/light`
  - Service: `postsLightService.listPosts`
  - Usage: lightweight list scenarios

- `GET /api/v1/posts/mixed`
  - Service: `postsLightService.listMixedPosts`

### Authors

- `GET /api/v1/authors`
  - Service: `authorService.listAuthors`

- `GET /api/v1/authors/:authorId`
  - Service: `authorService.getAuthor`

- `GET /api/v1/authors/:authorId/posts`
  - Service: `authorService.listAuthorPosts`

### Search

- `GET /api/v1/search/posts`
  - Service: `searchService.searchPosts`

- `GET /api/v1/search/authors`
  - Service: `searchService.searchAuthors`

- `GET /api/v1/search/suggestions`
  - Service: `searchService.getSuggestions`

### Schedule

- `GET /api/v1/schedules`
  - Service: `scheduleService.list`

- `GET /api/v1/schedules/calendar`
  - Service: `scheduleService.calendar`

- `GET /api/v1/schedules/:scheduleId`
  - Service: `scheduleService.getById`

- `POST /api/v1/schedules`
  - Service: `scheduleService.create`

- `DELETE /api/v1/schedules/:scheduleId`
  - Service: `scheduleService.delete`

### Community and discussion

- `GET /api/v1/community/feed`
  - Service: `communityService.getFeed`

- `GET /api/v1/community/hot`
  - Service: `communityService.getTrending`

- `GET /api/v1/community/latest`
  - Service: `communityService.getRecentComments`

- `GET /api/v1/community/my-comments`
  - Service: `communityService.getMyComments`

- `GET /api/v1/community/favorites`
  - Service: `communityService.getFavoriteComments`

- `GET /api/v1/community/my-likes`
  - Service: `communityService.getMyLikes`

- `GET /api/v1/community/stats`
  - Service: `communityService.getStats`

- `GET /api/v1/discussions`
  - Service: `discussionService.list`

- `GET /api/v1/discussions/:discussionId`
  - Service: `discussionService.getById`

- `POST /api/v1/discussions`
  - Service: `discussionService.create`

- `PATCH /api/v1/discussions/:discussionId`
  - Service: `discussionService.update`

- `DELETE /api/v1/discussions/:discussionId`
  - Service: `discussionService.remove`

- `POST|DELETE /api/v1/discussions/:discussionId/like`
  - Service: `discussionService.like`, `discussionService.unlike`

- `POST|DELETE /api/v1/discussions/:discussionId/pin`
  - Service: `discussionService.pin`, `discussionService.unpin`

- `GET /api/v1/discussions/:discussionId/comments`
  - Service: `discussionService.listComments`

- `POST /api/v1/discussions/:discussionId/comments`
  - Service: `discussionService.createComment`

### Comment interaction

- `GET /api/v1/posts/:postId/comments`
  - Service: `commentService.listComments`

- `POST /api/v1/posts/:postId/comments`
  - Service: `commentService.createComment`

- `PATCH /api/v1/comments/:commentId`
  - Service: `commentService.updateComment`

- `DELETE /api/v1/comments/:commentId`
  - Service: `commentService.deleteComment`

- `GET /api/v1/comments/:commentId/thread`
  - Service: `commentService.getThread`

- `POST|DELETE /api/v1/comments/:commentId/like`
  - Service: `commentService.likeComment`, `commentService.unlikeComment`

- `POST|DELETE /api/v1/comments/:commentId/favorite`
  - Service: `commentService.favoriteComment`, `commentService.unfavoriteComment`

### Favorites and history

- `GET /api/v1/favorites/check/:postId`
  - Service: `favoriteService.checkFavorite`

- `POST /api/v1/favorites`
  - Service: `favoriteService.addFavorite`

- `GET /api/v1/favorites`
  - Service: `favoriteService.listFavorites`

- `GET /api/v1/favorites/:favoriteId`
  - Service: `favoriteService.getFavorite`

- `PATCH /api/v1/favorites/:favoriteId`
  - Service: `favoriteService.updateFavorite`

- `DELETE /api/v1/favorites/:favoriteId`
  - Service: `favoriteService.removeFavorite`

- `GET /api/v1/favorites/folders/list`
  - Service: `favoriteService.listFolders`

- `GET /api/v1/favorites/tags/list`
  - Service: `favoriteService.listTagStats`

- `POST /api/v1/history/search`
  - Service: `historyService.addSearchHistory`

- `GET /api/v1/history/search`
  - Service: `historyService.listSearchHistory`

- `POST /api/v1/history/browsing`
  - Service: `historyService.addBrowsingHistory`

- `GET /api/v1/history/browsing`
  - Service: `historyService.listBrowsingHistory`

- `GET /api/v1/history/stats`
  - Service: `historyService.getStats`

### User, device, notification, auth

- `GET /api/auth/me`
  - Service: `authService.getCurrentUser`

- `POST /api/auth/login`
  - Service: `authService.login`

- `POST /api/auth/register`
  - Service: `authService.register`

- `POST /api/auth/refresh`
  - Service: `authService.refreshToken`

- `GET /api/auth/sessions`
  - Service: `authService.getSessions`

- `DELETE /api/auth/sessions/:sessionId`
  - Service: `authService.revokeSession`

- `GET /api/v1/users/me/profile`
  - Service: `userService.getProfile`

- `PATCH /api/v1/users/me/profile`
  - Service: `userService.updateProfile`

- `POST /api/v1/upload/avatar`
  - Service: `userService.uploadAvatar`

- `GET /api/v1/devices`
  - Service: `deviceService.listDevices`

- `GET /api/v1/notifications`
  - Service: `notificationService.listNotifications`

- `GET /api/v1/notifications/unread-count`
  - Service: `notificationService.getUnreadCount`

### Misc

- `GET /api/v1/members`
  - Service: `memberService.listMembers`

- `GET /api/v1/members/:memberId`
  - Service: `memberService.getMember`

- `POST /api/v1/reports`
  - Service: `reportService.createReport`

- `POST /api/v1/feedback`
  - Service: `feedbackService.submit`

- `GET /health`
  - Service: `systemService.getHealth`

- `GET /metrics`
  - Service: `systemService.getMetrics`

## Homepage Refactor: Recommended New APIs

These are the highest-value additions for the current homepage design.

### 1. Homepage aggregate payload

- `GET /api/v1/home`
- Goal: one request for first render
- Why:
  - Avoid deriving hero, editorial card, portal counts, tags, authors, featured slides, and bubble-stage data from a generic `/posts` list
  - Reduce duplicate requests and client-side sorting work
  - Lower CLS risk because each section gets stable, pre-shaped data

Recommended response sections:

- `hero`
  - `kicker`
  - `title`
  - `subtitle`
  - `editorial_card`
  - `spotlight`
  - `stats`

- `portal`
  - `recommended_count`
  - `hot_authors_count`
  - `schedule_count`
  - `community_hot_count`

- `featured`
  - 4 items for the second-screen horizontal scene

- `trends`
  - `authors`
  - `tags`
  - `schedules`

- `latest_text_posts`
  - text-only items for hero editorial and third-screen bubble bloom

- `story_cards`
  - 3 to 5 curated cards for the fourth-screen 3D stack

- `updated_at`
  - frontend can use this for transition gating and stale-while-revalidate hints

### 2. Latest pure-text posts

- `GET /api/v1/posts/text/latest?limit=12`
- Goal: drive hero editorial card and bubble-stage content with true text-post data
- Why:
  - The current homepage now uses latest text-post-derived content, but it is still derived from the general posts flow
  - A dedicated endpoint makes the first-screen editorial feel intentional and the third-screen bloom more stable

Recommended fields per item:

- `id`
- `content`
- `author`
  - `id`
  - `display_name`
  - `avatar_url`
- `published_at`
- `tags`
- `engagement`
  - `like_count`
  - `comment_count`

### 3. Homepage featured carousel set

- `GET /api/v1/home/featured`
- Goal: provide exactly four second-screen full-screen panels
- Why:
  - The current second screen is visually stronger, but content density and hierarchy still depend on generic posts data
  - A dedicated payload lets backend/editorial decide the exact four stories shown that day

Recommended response:

- `items[]`
  - `id`
  - `title`
  - `subtitle`
  - `cover_image_url`
  - `accent`
  - `primary_cta`
  - `secondary_cta`
  - `related_posts[]`
  - `related_authors[]`

### 4. Trending tags and authors snapshot

- `GET /api/v1/trends/summary`
- Goal: replace client-side aggregation for hero tags, hot authors, and quick stats
- Why:
  - Current frontend counts tags and authors from loaded post pages only
  - That means results depend on pagination depth, not platform-wide truth

Recommended response:

- `tags[]`
  - `name`
  - `post_count`
  - `growth_rate`

- `authors[]`
  - `id`
  - `display_name`
  - `avatar_url`
  - `post_count`
  - `engagement_score`

- `stats`
  - `fresh_post_count`
  - `active_author_count`
  - `rising_tag_count`

### 5. Schedule teaser for homepage

- `GET /api/v1/schedules/highlights?limit=6`
- Goal: feed second-screen and trend panel with compact upcoming items
- Why:
  - Full schedule list is heavier than the homepage needs
  - Homepage only needs a teaser list with time proximity and lightweight author info

Recommended fields:

- `id`
- `title`
- `start_date`
- `category`
- `author`
  - `id`
  - `display_name`
- `badge`
- `deep_link`

### 6. Community hot snapshot

- `GET /api/v1/community/highlights?limit=6`
- Goal: support the portal/community panel with lighter discussion cards
- Why:
  - Existing `community/hot` is usable, but homepage ideally needs shorter payloads and stronger editorial structure

Recommended fields:

- `discussion_id`
- `title`
- `excerpt`
- `comment_count`
- `participant_count`
- `updated_at`

### 7. Story deck payload for 3D cards

- `GET /api/v1/home/story-deck`
- Goal: provide fixed-order cards for the fourth-screen 3D transition into the footer
- Why:
  - 3D stacked cards should be narrative units, not arbitrary generic posts
  - This helps content tone, card depth, and footer handoff remain stable

Recommended fields:

- `items[]`
  - `id`
  - `eyebrow`
  - `title`
  - `summary`
  - `image_url`
  - `meta`
  - `cta`

## Payload and Transport Guidelines

These are backend-facing recommendations that will directly improve frontend smoothness.

- Support `fields=` for lightweight list endpoints when possible.
- Prefer cursor pagination for mixed feeds and high-churn homepage blocks.
- Return `etag` or `last_modified` compatible metadata for cache revalidation.
- Keep homepage list items image-light and avoid detail-only fields in list payloads.
- Include a stable `sort_key` or `rank` for homepage-curated blocks.
- Return canonical thumbnail variants so the frontend does not guess image sizes.
- For text-bubble scenes, include pre-sanitized plain text and a bounded character count.
- For top-of-page content, avoid requiring multiple dependent requests before first paint.

## Frontend Priority Order

If backend bandwidth is limited, build in this order:

1. `GET /api/v1/home`
2. `GET /api/v1/posts/text/latest`
3. `GET /api/v1/trends/summary`
4. `GET /api/v1/schedules/highlights`
5. `GET /api/v1/home/story-deck`

## Notes For Current Homepage Implementation

- The current homepage in [`src/views/HomePage.vue`](../src/views/HomePage.vue) mainly depends on `postService.listPosts`.
- Hero editorial, trending tags, trending authors, highlight cards, and bubble-stage content are still heavily derived on the client.
- That works functionally, but it is not the best long-term shape for performance, visual stability, or editorial control.
