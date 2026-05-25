<template>
  <div class="home-page" :style="homePageMotionStyle">
    <HomeQuickNav
      :anchors="homeQuickNavAnchors"
      :active-id="activeHomeSectionId"
      :side="settings.homeQuickNavSide"
      @navigate="scrollToHomeSection"
      @update:side="updateHomeQuickNavSide"
    />

    <!-- Hero + 今日入口 -->
    <section id="home-fold" class="home-fold home-screen">
      <!-- Hero Section -->
      <HeroSection :enabled="settings.showHeroSection" :animated="shouldAnimate">
        <div class="hero-copy">
          <div class="hero-copy__left">
            <p class="hero-kicker hero-copy__line hero-copy__line--kicker">
              {{ $t('home.hero.kicker') }}
            </p>
            <h1 class="hero-title gradient-text hero-copy__line hero-copy__line--title">
              {{ $t('home.hero.title') }}
            </h1>
            <p class="hero-subtitle hero-copy__line hero-copy__line--subtitle">
              {{ $t('home.hero.subtitle') }}
            </p>
          </div>

          <span class="hero-copy__divider" aria-hidden="true" />

          <div class="hero-copy__right">
            <div class="hero-editorial" :class="{ 'hero-editorial--loaded': heroEditorialVisible }">
              <div class="hero-editorial__state hero-editorial__state--loading" aria-hidden="true">
                <div class="hero-editorial__kicker">
                  <span class="hero-editorial__dot" />
                  {{ $t('home.hero.editorialLabel') }}
                </div>
                <span
                  class="hero-editorial__skeleton hero-editorial__skeleton--title glass-skeleton"
                />
                <span class="hero-editorial__skeleton glass-skeleton" />
                <span
                  class="hero-editorial__skeleton hero-editorial__skeleton--short glass-skeleton"
                />
              </div>

              <div
                v-if="heroEditorialCard"
                class="hero-editorial__state hero-editorial__state--content"
              >
                <div class="hero-editorial__kicker">
                  <span class="hero-editorial__dot" />
                  {{ $t('home.hero.editorialLabel') }}
                </div>
                <strong class="hero-editorial__title">{{ heroEditorialCard.title }}</strong>
                <p v-if="heroEditorialSupportText" class="hero-editorial__text">
                  {{ heroEditorialSupportText }}
                </p>
                <div class="hero-editorial__meta">
                  <span class="hero-editorial__author">{{ heroEditorialCard.author }}</span>
                  <span v-if="heroEditorialCard.time" class="hero-editorial__time">
                    {{ heroEditorialCard.time }}
                  </span>
                </div>
              </div>
            </div>

            <div class="hero-actions">
              <Button size="lg" variant="primary" class="hero-btn" @click="goToExplore">
                <AnimatedIcon name="explore" :fallback-icon="Compass" size="md" />
                {{ $t('home.hero.primaryAction') }}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                class="hero-btn hero-btn--secondary"
                @click="scrollToFeatured"
              >
                <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="md" />
                {{ $t('home.hero.secondaryAction') }}
              </Button>
            </div>

            <div class="hero-tags">
              <span class="hero-tags__label">{{ $t('home.hero.trendingLabel') }}</span>
              <div v-if="heroTags.length > 0" class="hero-tag-list">
                <RouterLink
                  v-for="tag in heroTags"
                  :key="`hero-tag-${tag}`"
                  :to="{ name: 'search', query: { q: tag } }"
                  class="glass-tag hero-tag"
                >
                  #{{ tag }}
                </RouterLink>
              </div>
              <span v-else class="hero-tags__empty">{{ $t('home.hero.tagsEmpty') }}</span>
            </div>

            <div class="hero-stats" :aria-label="$t('home.hero.stats.ariaLabel')">
              <div v-for="item in heroStats" :key="item.key" class="hero-stat">
                <span class="hero-stat__label">{{ item.label }}</span>
                <strong class="hero-stat__value">{{ item.value }}</strong>
                <span class="hero-stat__note">{{ item.note }}</span>
              </div>
            </div>
          </div>
        </div>
      </HeroSection>
    </section>
    <!-- /.home-fold -->

    <!-- Horizontal Rail -->
    <FeaturedRailSection
      id="home-rail"
      ref="featuredSectionRef"
      class="rail home-screen"
      :scene-style="featuredSceneStyle"
      :track-style="railTrackStyle"
      :slides="railSlides"
      :active-index="activeRailIndex"
      :active-key="activeRailSlide?.key"
      :active-label="activeRailSlide?.label"
    >
      <article
        class="rail-panel rail-panel--portal"
        role="listitem"
        data-scroll-anchor="home-featured-portal"
        data-scroll-anchor-step="0"
      >
        <div class="rail-panel__content">
          <header class="page-section-head page-section-head--stage">
            <div class="page-section-copy">
              <h2>{{ $t('home.portal.title') }}</h2>
              <p>{{ $t('home.portal.subtitle') }}</p>
            </div>
            <RouterLink to="/explore" class="page-inline-cta">
              <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
              {{ $t('home.portal.action') }}
            </RouterLink>
          </header>

          <div class="portal-grid">
            <RouterLink
              :to="portalRecommendLink"
              class="portal-card portal-card--primary glass-card"
              :style="noGlassBackdropStyle"
            >
              <div
                v-if="portalLeadCard"
                class="portal-card__preview portal-card__preview--lead"
                :style="
                  portalLeadCard.thumbnail ? undefined : { background: 'var(--home-pill-bg)' }
                "
              >
                <img
                  v-if="portalLeadCard.thumbnail && !isHomeMediaFailed(portalLeadCard.thumbnail)"
                  :src="portalLeadCard.thumbnail"
                  :srcset="resolveHomeImageSrcset(portalLeadCard.thumbnail) || undefined"
                  :sizes="PORTAL_LEAD_IMAGE_SIZES"
                  :alt="portalLeadCard.title"
                  class="portal-card__preview-image"
                  :width="PORTAL_LEAD_IMAGE_SIZE.width"
                  :height="PORTAL_LEAD_IMAGE_SIZE.height"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="auto"
                  @error="markHomeMediaFailed(portalLeadCard.thumbnail)"
                />
                <div v-else class="portal-card__preview-empty">
                  <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="lg" />
                  <strong>{{ $t('home.portal.items.recommend.title') }}</strong>
                  <span>{{ $t('home.portal.subtitle') }}</span>
                </div>
                <div class="portal-card__preview-overlay">
                  <span class="portal-card__preview-kicker">{{ portalLeadEyebrow }}</span>
                  <strong class="portal-card__preview-title">
                    {{ portalLeadPreviewTitle }}
                  </strong>
                </div>
              </div>
              <div
                v-else
                class="portal-card__preview portal-card__preview--lead portal-card__preview--empty glass-skeleton"
              />
              <div class="portal-card__copy">
                <div class="portal-card__header">
                  <div class="portal-card__icon portal-card__icon--primary">
                    <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="lg" />
                  </div>
                  <AnimatedIcon
                    name="explore"
                    :fallback-icon="ArrowUpRight"
                    size="sm"
                    class="portal-card__arrow"
                  />
                </div>
                <div class="portal-card__body">
                  <h3>{{ $t('home.portal.items.recommend.title') }}</h3>
                  <p>{{ portalRecommendDescription }}</p>
                </div>
                <div class="portal-card__stats">
                  <span
                    v-for="stat in portalOverviewStats"
                    :key="`portal-stat-${stat.key}`"
                    class="portal-card__stat"
                  >
                    <strong>{{ stat.value }}</strong>
                    <small>{{ stat.label }}</small>
                  </span>
                </div>
              </div>
            </RouterLink>

            <div class="portal-sidebar">
              <RouterLink
                v-if="portalPanels[0]"
                :to="portalPanels[0].to"
                class="portal-card portal-card--secondary portal-card--secondary-lead glass-card"
                :style="noGlassBackdropStyle"
              >
                <div class="portal-card__header">
                  <div
                    class="portal-card__icon"
                    :class="`portal-card__icon--${portalPanels[0].key}`"
                  >
                    <AnimatedIcon
                      :name="portalPanels[0].animation"
                      :fallback-icon="portalPanels[0].icon"
                      size="lg"
                    />
                  </div>
                  <AnimatedIcon
                    name="explore"
                    :fallback-icon="ArrowUpRight"
                    size="sm"
                    class="portal-card__arrow"
                  />
                </div>
                <div class="portal-card__body">
                  <h3>{{ portalPanels[0].title }}</h3>
                  <p>{{ portalPanels[0].desc }}</p>
                </div>
                <div class="portal-card__micro">
                  <span class="portal-card__micro-label">{{ portalPanels[0].noteLabel }}</span>
                  <strong class="portal-card__micro-title">{{ portalPanels[0].noteTitle }}</strong>
                  <p class="portal-card__micro-text">{{ portalPanels[0].noteText }}</p>
                  <span class="portal-card__micro-meta">{{ portalPanels[0].noteMeta }}</span>
                </div>
              </RouterLink>

              <div class="portal-sidebar__row">
                <RouterLink
                  v-for="panel in portalPanels.slice(1)"
                  :key="panel.key"
                  :to="panel.to"
                  class="portal-card portal-card--secondary portal-card--secondary-compact glass-card"
                  :style="noGlassBackdropStyle"
                >
                  <div class="portal-card__header">
                    <div class="portal-card__icon" :class="`portal-card__icon--${panel.key}`">
                      <AnimatedIcon :name="panel.animation" :fallback-icon="panel.icon" size="lg" />
                    </div>
                    <AnimatedIcon
                      name="explore"
                      :fallback-icon="ArrowUpRight"
                      size="sm"
                      class="portal-card__arrow"
                    />
                  </div>
                  <div class="portal-card__body">
                    <h3>{{ panel.title }}</h3>
                    <p>{{ panel.desc }}</p>
                  </div>
                  <div class="portal-card__micro">
                    <span class="portal-card__micro-label">{{ panel.noteLabel }}</span>
                    <strong class="portal-card__micro-title">{{ panel.noteTitle }}</strong>
                    <p class="portal-card__micro-text">{{ panel.noteText }}</p>
                    <span class="portal-card__micro-meta">{{ panel.noteMeta }}</span>
                  </div>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article
        class="rail-panel rail-panel--spotlight"
        role="listitem"
        data-scroll-anchor="home-featured-spotlight"
        data-scroll-anchor-step="1"
      >
        <div class="rail-panel__content rail-panel__content--highlight">
          <header class="page-section-head page-section-head--stage">
            <div class="page-section-copy">
              <h2>{{ heroEditorialTitle }}</h2>
              <p>{{ heroEditorialText }}</p>
            </div>
            <div class="rail-panel__meta rail-panel__meta--spotlight">
              <span class="rail-panel__meta-label">{{ $t('home.hero.editorialLabel') }}</span>
              <strong class="rail-panel__meta-title">{{ heroSpotlightMeta }}</strong>
              <span v-if="heroSpotlightTag" class="rail-panel__meta-tag">
                #{{ heroSpotlightTag }}
              </span>
            </div>
          </header>

          <div class="rail-highlight">
            <div class="hero-collage">
              <div class="hero-collage-grid">
                <template v-if="spotlightMediaCards.length > 0">
                  <button
                    v-for="(card, index) in spotlightMediaCards"
                    :key="`hero-highlight-${card.post.id}`"
                    type="button"
                    class="hero-collage-card glass-card"
                    :style="noGlassBackdropStyle"
                    :class="{
                      'hero-collage-card--primary': index === 0,
                      'hero-collage-card--textual': !card.thumbnail,
                    }"
                    @click="openPostPreview(card.post, card.thumbnail)"
                  >
                    <img
                      v-if="card.thumbnail && !isHomeMediaFailed(card.thumbnail)"
                      class="hero-collage-image"
                      :src="card.thumbnail"
                      :srcset="resolveHomeImageSrcset(card.thumbnail) || undefined"
                      :sizes="resolveHeroCollageImageSizes(index)"
                      :alt="card.title"
                      :width="resolveHeroCollageImageDimensions(index).width"
                      :height="resolveHeroCollageImageDimensions(index).height"
                      :loading="resolveHeroCollageImageLoading(index)"
                      decoding="async"
                      :fetchpriority="resolveHeroCollageFetchPriority(index)"
                      @error="markHomeMediaFailed(card.thumbnail)"
                    />
                    <div v-else class="hero-collage-placeholder">
                      <AnimatedIcon name="image" :fallback-icon="Image" size="lg" />
                    </div>
                    <div class="hero-collage-overlay">
                      <span class="hero-collage-title">{{ card.title }}</span>
                      <span class="hero-collage-meta">{{ card.author }}</span>
                    </div>
                  </button>
                </template>
                <template v-else>
                  <div
                    v-for="i in 4"
                    :key="`hero-placeholder-${i}`"
                    class="hero-collage-card hero-collage-card--placeholder glass-skeleton"
                  />
                </template>
              </div>
            </div>

            <div class="hero-spotlight-stack">
              <button
                v-for="(card, index) in spotlightTextCards"
                :key="`spotlight-text-${card.post.id}`"
                type="button"
                class="hero-spotlight-card glass-card"
                :style="noGlassBackdropStyle"
                :class="{
                  'hero-spotlight-card--lead': index === 0,
                  'hero-spotlight-card--dense': !card.supportText,
                }"
                @click="openPostPreview(card.post, null)"
              >
                <span class="hero-spotlight-card__label">
                  {{ index === 0 ? $t('home.hero.editorialLabel') : card.author }}
                </span>
                <strong class="hero-spotlight-card__title">{{ card.title }}</strong>
                <p v-if="card.supportText" class="hero-spotlight-card__summary">
                  {{ card.supportText }}
                </p>
                <span class="hero-spotlight-card__meta">
                  <span>{{ card.author }}</span>
                  <span v-if="card.time">{{ card.time }}</span>
                </span>
              </button>
              <div
                v-if="spotlightTextCards.length === 0"
                class="hero-spotlight-card hero-spotlight-card--empty glass-skeleton"
              />
            </div>
          </div>
        </div>
      </article>

      <article
        class="rail-panel rail-panel--featured"
        role="listitem"
        data-scroll-anchor="home-featured-featured"
        data-scroll-anchor-step="2"
      >
        <div class="rail-panel__content">
          <header class="page-section-head page-section-head--stage">
            <div class="page-section-copy">
              <h2>{{ $t('home.featured.title') }}</h2>
              <p>{{ $t('home.featured.subtitle') }}</p>
            </div>
            <RouterLink to="/explore" class="page-inline-cta">
              <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
              {{ $t('home.featured.action') }}
            </RouterLink>
          </header>

          <div class="rail-featured-grid">
            <template v-if="featuredRailCards.length > 0">
              <button
                v-for="(card, index) in featuredRailCards"
                :key="`featured-rail-${card.id}`"
                type="button"
                class="featured-rail-card glass-card"
                :style="noGlassBackdropStyle"
                :class="[
                  index === 0 ? 'featured-rail-card--lead' : 'featured-rail-card--support',
                  index > 1 ? 'featured-rail-card--compact' : null,
                  !card.summary ? 'featured-rail-card--dense' : null,
                  !card.thumbnail ? 'featured-rail-card--textual' : null,
                ]"
                @click="openPostPreview(card.post, card.thumbnail)"
              >
                <div
                  class="featured-rail-card__media"
                  :class="{ 'featured-rail-card__media--empty': !card.thumbnail }"
                >
                  <img
                    v-if="card.thumbnail && !isHomeMediaFailed(card.thumbnail)"
                    :src="card.thumbnail"
                    :srcset="resolveHomeImageSrcset(card.thumbnail) || undefined"
                    :sizes="resolveFeaturedRailImageSizes(index)"
                    :alt="card.title"
                    class="featured-rail-card__image"
                    :width="resolveFeaturedRailImageSize(index).width"
                    :height="resolveFeaturedRailImageSize(index).height"
                    :loading="resolveFeaturedRailImageLoading()"
                    decoding="async"
                    :fetchpriority="resolveFeaturedRailFetchPriority()"
                    @error="markHomeMediaFailed(card.thumbnail)"
                  />
                  <div v-else class="featured-rail-card__placeholder">
                    <AnimatedIcon name="image" :fallback-icon="Image" size="lg" />
                  </div>
                  <div class="featured-rail-card__overlay">
                    <span class="featured-rail-card__kicker">{{ card.kicker }}</span>
                    <span v-if="card.time" class="featured-rail-card__time">
                      {{ card.time }}
                    </span>
                  </div>
                </div>

                <div class="featured-rail-card__body">
                  <span class="featured-rail-card__eyebrow">{{ card.eyebrow }}</span>
                  <strong class="featured-rail-card__title">{{ card.title }}</strong>
                  <p v-if="card.summary" class="featured-rail-card__summary">
                    {{ card.summary }}
                  </p>
                  <div class="featured-rail-card__meta">
                    <span>{{ card.author }}</span>
                    <span v-if="card.time">{{ card.time }}</span>
                  </div>
                  <div v-if="card.stats.length > 0" class="featured-rail-card__stats">
                    <span
                      v-for="stat in card.stats"
                      :key="`${card.id}-${stat.key}`"
                      class="featured-rail-card__stat"
                    >
                      <strong>{{ stat.value }}</strong>
                      <span>{{ stat.label }}</span>
                    </span>
                  </div>
                  <span class="featured-rail-card__action">
                    <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                    {{ $t('home.featured.action') }}
                  </span>
                </div>
              </button>
            </template>
            <template v-else-if="featuredRailPosts.length > 0">
              <PostCard
                v-for="(post, index) in featuredRailPosts"
                :key="`featured-rail-${post.id}`"
                :class="[
                  'rail-feature-card',
                  index === 0 ? 'rail-feature-card--lead' : 'rail-feature-card--support',
                ]"
                :post="post"
                :aspect-ratio="index === 0 ? '4 / 3' : '16 / 9'"
                :thumbnail-size="index === 0 ? 'large' : 'medium'"
                :prefetch-on-hover="index < 2"
                :preload-large-image-on-hover="index < 2"
                :show-excerpt="index === 0"
                @click="(_id, thumb) => openPostPreview(post, thumb)"
              />
            </template>
            <template v-else>
              <PostCardSkeleton v-for="i in 4" :key="`featured-rail-skeleton-${i}`" />
            </template>
          </div>
        </div>
      </article>

      <article
        class="rail-panel rail-panel--trends"
        role="listitem"
        data-scroll-anchor="home-featured-trends"
        data-scroll-anchor-step="3"
      >
        <div class="rail-panel__content">
          <header class="page-section-head page-section-head--stage">
            <div class="page-section-copy">
              <h2>{{ $t('home.trends.authorsTitle') }}</h2>
              <p>{{ $t('home.trends.authorsHint') }}</p>
            </div>
          </header>

          <div class="trends-grid">
            <div class="trends-card trends-card--authors glass-card" :style="noGlassBackdropStyle">
              <div class="trends-card__header">
                <h3>{{ $t('home.trends.authorsTitle') }}</h3>
                <RouterLink to="/authors" class="trends-link">
                  {{ $t('home.trends.authorsAction') }}
                </RouterLink>
              </div>
              <div v-if="trendingAuthors.length > 0" class="trends-authors-shell">
                <RouterLink
                  v-if="leadingTrendingAuthor"
                  :to="leadingTrendingAuthor.link"
                  class="trends-authors-highlight"
                >
                  <Avatar
                    class="trends-authors-highlight__avatar"
                    size="custom"
                    shape="square"
                    :src="leadingTrendingAuthor.avatar || undefined"
                    :alt="leadingTrendingAuthor.name"
                    loading="lazy"
                    decoding="async"
                  >
                    <template #fallback>
                      <AnimatedIcon name="user" :fallback-icon="Users" size="sm" />
                    </template>
                  </Avatar>
                  <span class="trends-authors-highlight__copy">
                    <strong class="trends-authors-highlight__title">
                      {{ leadingTrendingAuthor.name }}
                    </strong>
                    <span class="trends-authors-highlight__meta">
                      {{ $t('home.trends.authorCount', { n: leadingTrendingAuthor.count }) }}
                    </span>
                  </span>
                  <span class="trends-authors-highlight__arrow" aria-hidden="true">
                    <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                  </span>
                </RouterLink>
                <div class="trends-list">
                  <RouterLink
                    v-for="author in secondaryTrendingAuthors"
                    :key="`trend-author-${author.key}`"
                    :to="author.link"
                    class="trend-author"
                  >
                    <Avatar
                      class="trend-author__avatar"
                      size="custom"
                      :src="author.avatar || undefined"
                      :alt="author.name"
                      loading="lazy"
                      decoding="async"
                    >
                      <template #fallback>
                        <AnimatedIcon name="user" :fallback-icon="Users" size="sm" />
                      </template>
                    </Avatar>
                    <div class="trend-author__meta">
                      <span class="trend-author__name">{{ author.name }}</span>
                      <span class="trend-author__count">
                        {{ $t('home.trends.authorCount', { n: author.count }) }}
                      </span>
                    </div>
                  </RouterLink>
                </div>
                <RouterLink
                  v-if="hiddenTrendingAuthorCount > 0"
                  to="/authors"
                  class="trends-link trends-link--footer"
                >
                  {{ $t('home.trends.authorsAction') }} · +{{ hiddenTrendingAuthorCount }}
                </RouterLink>
              </div>
              <div v-else class="trends-empty">{{ $t('home.trends.authorsEmpty') }}</div>
            </div>

            <div class="trends-card trends-card--tags glass-card" :style="noGlassBackdropStyle">
              <div class="trends-card__header">
                <h3>{{ $t('home.trends.tagsTitle') }}</h3>
                <RouterLink to="/search" class="trends-link">
                  {{ $t('home.trends.tagsAction') }}
                </RouterLink>
              </div>
              <div v-if="trendingTags.length > 0" class="trend-tags">
                <RouterLink
                  v-for="tag in trendingTags"
                  :key="`trend-tag-${tag}`"
                  :to="{ name: 'search', query: { q: tag } }"
                  class="glass-tag trend-tag"
                >
                  #{{ tag }}
                </RouterLink>
              </div>
              <div v-else class="trends-empty">{{ $t('home.trends.tagsEmpty') }}</div>
              <div class="trend-tags__stats">
                <span
                  v-for="stat in heroStats"
                  :key="`tag-stat-${stat.key}`"
                  class="trend-tags__stat"
                >
                  <strong>{{ stat.value }}</strong>
                  <span>{{ stat.label }}</span>
                </span>
              </div>
            </div>

            <div
              class="trends-card trends-card--editorial glass-card"
              :style="noGlassBackdropStyle"
            >
              <div class="trends-card__header">
                <h3>{{ $t('home.hero.editorialLabel') }}</h3>
                <span v-if="heroEditorialCard?.time" class="trends-card__hint">
                  {{ heroEditorialCard.time }}
                </span>
              </div>
              <template v-if="heroEditorialCard">
                <div
                  class="trends-editorial"
                  :class="{ 'trends-editorial--compact': !heroEditorialSupportText }"
                >
                  <strong class="trends-editorial__title">{{ heroEditorialCard.title }}</strong>
                  <p v-if="heroEditorialSupportText" class="trends-editorial__text">
                    {{ heroEditorialSupportText }}
                  </p>
                  <div class="trends-editorial__meta">
                    <span>{{ heroEditorialCard.author }}</span>
                    <span v-if="heroEditorialCard.time">{{ heroEditorialCard.time }}</span>
                  </div>
                </div>
              </template>
              <div v-else class="trends-empty">
                {{ $t('home.hero.editorialFallbackTitle') }}
              </div>
            </div>

            <div class="trends-card trends-card--schedule glass-card" :style="noGlassBackdropStyle">
              <div class="trends-card__header">
                <h3>{{ $t('home.trends.scheduleTitle') }}</h3>
                <RouterLink to="/schedule" class="trends-link">
                  {{ $t('home.trends.scheduleAction') }}
                </RouterLink>
              </div>
              <div
                v-if="primaryScheduleHighlights.length > 0"
                class="schedule-highlight-list"
                :class="{
                  'schedule-highlight-list--paired': Boolean(trendsScheduleCompanion),
                }"
              >
                <RouterLink
                  v-for="item in primaryScheduleHighlights"
                  :key="`schedule-highlight-${item.id}`"
                  :to="item.deep_link || '/schedule'"
                  class="schedule-highlight"
                >
                  <span class="schedule-highlight__label">
                    {{ item.badge || getScheduleCategoryLabel(item.category) }}
                  </span>
                  <strong class="schedule-highlight__title">{{ item.title }}</strong>
                  <span class="schedule-highlight__meta">
                    {{
                      formatScheduleHighlightMeta(item) ||
                      formatHomeAuthorName(item.author) ||
                      $t('home.trends.scheduleAction')
                    }}
                  </span>
                </RouterLink>
                <RouterLink
                  v-if="trendsScheduleCompanion"
                  :to="trendsScheduleCompanion.to"
                  class="schedule-highlight schedule-highlight--companion"
                  :class="`schedule-highlight--${trendsScheduleCompanion.kind}`"
                >
                  <span class="schedule-highlight__label">
                    {{ trendsScheduleCompanion.label }}
                  </span>
                  <strong class="schedule-highlight__title">
                    {{ trendsScheduleCompanion.title }}
                  </strong>
                  <p v-if="trendsScheduleCompanion.text" class="schedule-highlight__copy">
                    {{ trendsScheduleCompanion.text }}
                  </p>
                  <span class="schedule-highlight__meta">
                    {{ trendsScheduleCompanion.meta }}
                  </span>
                </RouterLink>
              </div>
              <div v-else-if="communityHighlightPreview" class="trends-community-note">
                <span class="trends-community-note__eyebrow">{{ $t('nav.community') }}</span>
                <strong class="trends-community-note__title">
                  {{ communityHighlightPreview.title }}
                </strong>
                <p class="trends-community-note__text">
                  {{ communityHighlightPreview.excerpt }}
                </p>
                <span class="trends-community-note__meta">
                  {{ formatCommunityHighlightMeta(communityHighlightPreview) }}
                </span>
              </div>
              <div v-else class="schedule-cta">
                <div class="schedule-cta__intro">
                  <span class="schedule-cta__eyebrow">{{ scheduleFallbackCard.label }}</span>
                  <strong class="schedule-cta__title">{{ scheduleFallbackCard.title }}</strong>
                  <p>{{ scheduleFallbackCard.text }}</p>
                  <span class="schedule-cta__meta">{{ scheduleFallbackCard.meta }}</span>
                </div>
                <Button size="sm" variant="secondary" class="schedule-btn" @click="goToSchedule">
                  <AnimatedIcon name="calendar" :fallback-icon="Calendar" size="sm" />
                  {{ $t('home.trends.scheduleAction') }}
                </Button>
                <div class="schedule-cta__stats">
                  <span
                    v-for="stat in heroStats"
                    :key="`trend-stat-${stat.key}`"
                    class="schedule-cta__stat"
                  >
                    <strong>{{ stat.value }}</strong>
                    <span>{{ stat.label }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </FeaturedRailSection>

    <!-- Latest Posts -->
    <LatestPostsSection
      id="home-posts"
      ref="postsSectionRef"
      class="posts posts--bubble home-screen"
      :reveal-phase="bubbleRevealPhase"
    >
      <header class="posts-header">
        <div class="posts-header__title">
          <h2>{{ $t('home.latest') }}</h2>
          <p class="posts-subtitle">{{ $t('home.latestSubtitle') }}</p>
        </div>
        <div class="posts-header__actions">
          <RouterLink to="/explore" class="page-inline-cta">
            <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
            {{ $t('home.latestAction') }}
          </RouterLink>
          <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
        </div>
      </header>

      <div class="posts-toolbar">
        <div class="posts-toolbar__panel posts-toolbar__panel--tags">
          <span class="tags-label">{{ $t('home.tags.label') }}</span>
          <div v-if="postsToolbarTags.length > 0" class="tags-list">
            <RouterLink
              v-for="tag in postsToolbarTags"
              :key="`latest-tag-${tag}`"
              :to="{ name: 'search', query: { q: tag } }"
              class="glass-tag"
            >
              #{{ tag }}
            </RouterLink>
          </div>
          <div
            class="posts-toolbar__stats"
            :class="{ 'posts-toolbar__stats--with-tags': postsToolbarTags.length > 0 }"
          >
            <span
              v-for="stat in heroStats"
              :key="`latest-stat-${stat.key}`"
              class="posts-toolbar__stat"
            >
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </span>
          </div>
        </div>

        <div class="posts-toolbar__panel posts-toolbar__panel--filters">
          <span class="filters-label">{{ $t('home.filters.label') }}</span>
          <div class="filters-list">
            <RouterLink
              v-for="filter in quickFilters"
              :key="`quick-filter-${filter.key}`"
              :to="filter.to"
              class="filter-pill"
            >
              {{ filter.label }}
            </RouterLink>
          </div>
        </div>
      </div>

      <StateIndicator
        v-if="error && !isUsingFallbackPosts"
        variant="error"
        :description="error"
        @action="fetchHomeData"
      />

      <template v-else>
        <div
          ref="bubbleStageRef"
          class="bubble-stage"
          :class="[
            `bubble-stage--${bubbleLayoutTier}`,
            {
              'has-active-bubble': hasActiveBubble,
              'is-motion-active': bubbleMotionFrameActive,
            },
          ]"
          @pointerenter="handleBubbleStagePointerEnter"
          @pointermove="handleBubbleStagePointerMove"
          @pointerleave="handleBubbleStagePointerLeave"
        >
          <canvas ref="bubbleCanvasRef" class="bubble-stage__canvas" aria-hidden="true" />
          <div
            v-if="isLoading && bubbleItems.length === 0"
            class="bubble-empty glass-card"
            :style="noGlassBackdropStyle"
          >
            <span class="spinner spinner-sm" />
            <span>{{ $t('common.loading') }}</span>
          </div>
          <template v-else-if="bubbleItems.length > 0">
            <button
              v-for="bubble in bubbleItems"
              :key="bubble.id"
              :ref="(element) => registerBubbleElement(bubble.id, element)"
              type="button"
              class="latest-bubble glass-card"
              :class="bubbleStateClasses(bubble.id)"
              :style="[noGlassBackdropStyle, bubble.style]"
              :aria-pressed="isBubblePersistentSelected(bubble.id)"
              :data-bubble-slot="bubble.slotKey"
              @pointerenter="handleBubblePointerEnter(bubble.id, $event)"
              @pointerleave="handleBubblePointerLeave(bubble.id)"
              @focus="handleBubbleFocus(bubble.id)"
              @blur="handleBubbleBlur(bubble.id)"
              @click="openPostPreview(bubble.post, bubble.thumbnail)"
            >
              <span class="latest-bubble__float">
                <span class="latest-bubble__inner">
                  <span class="latest-bubble__text">{{ bubble.text }}</span>
                  <span class="latest-bubble__meta">
                    <span class="latest-bubble__author">{{ bubble.author }}</span>
                    <span v-if="bubble.time" class="latest-bubble__time">{{ bubble.time }}</span>
                  </span>
                </span>
              </span>
            </button>
          </template>
          <div v-else class="bubble-empty glass-card" :style="noGlassBackdropStyle">
            <span>{{ $t('common.noResults') }}</span>
          </div>
        </div>
      </template>
    </LatestPostsSection>

    <StoryDeckSection
      id="home-media"
      ref="storyDeckRef"
      class="media-slices home-screen"
      :scene-style="storySceneStyle"
    >
      <header class="page-section-head page-section-head--stage">
        <div class="page-section-copy">
          <p class="page-section-kicker">{{ $t('home.featured.kicker') }}</p>
          <h2>{{ $t('home.featured.title') }}</h2>
          <p>{{ $t('home.featured.subtitle') }}</p>
        </div>
        <div class="story-progress">
          <span>{{ String(activeStoryIndex + 1).padStart(2, '0') }}</span>
          <span>/</span>
          <span>{{ String(Math.max(effectiveStoryCardCount, 1)).padStart(2, '0') }}</span>
        </div>
      </header>

      <div class="media-slice-list">
        <template v-if="storyCards.length > 0">
          <article
            v-for="(card, index) in storyCards"
            :key="`media-${card.post.id}`"
            class="media-slice"
            :class="{ 'is-active': activeStoryIndex === index }"
            :style="getStoryCardStyle(index)"
          >
            <div class="media-slice__sticky glass-card" :style="noGlassBackdropStyle">
              <PostCard
                class="media-slice__visual"
                :post="card.post"
                :show-content="false"
                :style="noGlassBackdropStyle"
                @click="(_id, thumb) => openPostPreview(card.post, thumb)"
              />
              <div class="media-slice__copy">
                <p class="media-slice__eyebrow">{{ card.eyebrow }}</p>
                <h3>{{ card.title }}</h3>
                <p>{{ card.excerpt }}</p>
                <div class="media-slice__meta">
                  <span class="media-slice__author">{{ card.author }}</span>
                  <span v-if="card.time" class="media-slice__time">{{ card.time }}</span>
                </div>
                <div class="media-slice__actions">
                  <Button
                    size="sm"
                    variant="primary"
                    class="media-slice__action media-slice__button"
                    @click="openPostPreview(card.post, card.thumbnail)"
                  >
                    <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
                    {{ $t('home.featured.action') }}
                  </Button>
                  <RouterLink
                    :to="card.detailLink"
                    class="page-inline-cta media-slice__action media-slice__link"
                  >
                    <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                    {{ $t('home.latestAction') }}
                  </RouterLink>
                </div>
              </div>
            </div>
          </article>
        </template>
        <div v-else class="media-empty glass-card">
          <span>{{ $t('common.noResults') }}</span>
        </div>
      </div>
    </StoryDeckSection>

    <section id="home-footer" class="app-footer-shell app-footer-shell--home home-screen">
      <AppFooter variant="home" />
    </section>

    <HomepagePreviewController
      v-if="shouldMountHomepagePreviewController"
      v-model:isOpen="isPreviewOpen"
      :post-id="previewPostId"
      :initial-post="previewPost"
      :initial-thumbnail-src="previewThumbnailSrc"
      @open-detail="openDetailFromPreview"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import {
  ref,
  computed,
  type ComponentPublicInstance,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  watch,
  watchSyncEffect,
  useTemplateRef,
} from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ArrowUpRight, Calendar, Compass, Image, Sparkles, Users } from '@lucide/vue'
import { useSettingsStore } from '@/stores'
import {
  homeService,
  type HomeAggregateResponse,
  type HomeCommunityHighlight,
  type HomeScheduleHighlight,
} from '@/api/homeService'
import type { PostListItem } from '@/api/postService'
import { prefersReducedMotion, throttleRAF } from '@/utils/performance'
import { getThumbnailSrcset } from '@/utils/mediaOptimizer'
import { isFilteredAuthor } from '@/config/filters'
import { getContractResourceId } from '@/utils/contractResourceId'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { prewarmPublicHomeContent } from '@/utils/cache'
import {
  type BubbleLayoutTier,
  buildHomePostsFromAggregate,
  clamp,
  formatHomeAuthorName,
  formatCommunityHighlightMeta as formatCommunityHighlightMetaValue,
  formatScheduleHighlightMeta as formatScheduleHighlightMetaValue,
  normalizeText,
  resolveBubbleLayoutTier,
  resolvePostIdFromLink,
  resolvePreviewablePostLink,
} from '@/views/homepage/homeModel'
import {
  computeBubbleFrameState,
  type BubbleAnchorMetrics,
  type BubbleFrameState,
  type BubblePointerState,
  type BubbleStageMetrics,
} from '@/views/homepage/bubbleMotion'
import { resolveBubbleRevealWindow } from '@/views/homepage/bubbleRevealState'
import { buildStoryCardMotion } from '@/views/homepage/storyDeckMotion'
import { useHomeViewModel } from '@/views/homepage/useHomeViewModel'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Avatar from '@/components/ui/Avatar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import HeroSection from '@/components/home/HeroSection.vue'
import HomeQuickNav from '@/components/home/HomeQuickNav.vue'
import {
  computeScrollAnchorTop,
  readNavbarVisibleOffset,
  resolveDocumentAnchorTop,
} from '@/components/ui/scrollAnchorTargets'
import { createResizeObserver, createVisibilityObserver, scheduleTask } from '@/utils/modernAPIs'
import { homeSectionAnchors, type HomeSectionAnchor } from '@/config/homeSections'
import {
  ensureSmoothScrollTriggerBridge,
  scrollWithSmoothScroll,
} from '@/composables/useSmoothScroll'

type GsapModule = typeof import('gsap')
type ScrollTriggerModule = typeof import('gsap/ScrollTrigger')
type ScrollTriggerInstance = InstanceType<ScrollTriggerModule['ScrollTrigger']>

let gsapModule: GsapModule['default'] | null = null
let scrollTriggerModule: ScrollTriggerModule['ScrollTrigger'] | null = null
let scrollTriggerReadyPromise: Promise<boolean> | null = null
let homeEnhancementsDisposed = false

const SCENE_LAYOUT_REFRESH_THRESHOLD_PX = 24
const BUBBLE_EXIT_DURATION_MS = 420
const BUBBLE_POINTER_ATTACK_MS = 220
const BUBBLE_POINTER_RELEASE_MS = 360
const BUBBLE_FORCE_CENTER_LERP_MS = 180
const HOME_ENHANCEMENTS_DELAY_MS = 1200
const HOME_SCENE_ACTIVATION_DELAY_MS = 140
const HOME_LIGHTWEIGHT_VIEWPORT_MAX_WIDTH = 1024
const HOME_FALLBACK_PREFIX = '__home_fallback__'
const PORTAL_LEAD_IMAGE_SIZE = Object.freeze({ width: 1600, height: 1000 })
const PORTAL_LEAD_IMAGE_SIZES = '(min-width: 1280px) 34rem, (min-width: 768px) 92vw, 100vw'

function createEmptyHomeAggregate(): HomeAggregateResponse {
  return {
    version: 'empty',
    generated_at: '',
    ttl_seconds: 0,
    hero: {
      editorial_card: null,
      spotlight: null,
      stats: [],
      trending_tags: [],
    },
    portal: {
      items: [],
    },
    featured: {
      items: [],
    },
    trends: {
      authors: [],
      tags: [],
      schedules: [],
      community: [],
    },
    latest_text_posts: [],
    story_deck: {
      items: [],
      total: 0,
    },
  }
}

let homepageBootstrapFallbackPromise: Promise<HomeAggregateResponse> | null = null

async function loadHomepageBootstrapFallback(): Promise<HomeAggregateResponse> {
  if (!homepageBootstrapFallbackPromise) {
    homepageBootstrapFallbackPromise = import('@/fallbacks/homepageBootstrapFallback').then(
      ({ buildHomepageBootstrapFallback }) => buildHomepageBootstrapFallback()
    )
  }

  return homepageBootstrapFallbackPromise
}

function isHomeFallbackPost(post: Pick<PostListItem, 'id'> | null | undefined): boolean {
  return Boolean(post?.id?.startsWith(HOME_FALLBACK_PREFIX))
}

function defineHomeAsyncComponent<T extends object>(loader: () => Promise<T>) {
  return defineAsyncComponent({
    loader,
    suspensible: false,
  })
}

const FeaturedRailSection = defineHomeAsyncComponent(
  () => import('@/components/home/FeaturedRailSection.vue')
)
const LatestPostsSection = defineHomeAsyncComponent(
  () => import('@/components/home/LatestPostsSection.vue')
)
const StoryDeckSection = defineHomeAsyncComponent(
  () => import('@/components/home/StoryDeckSection.vue')
)
const PostCard = defineHomeAsyncComponent(() => import('@/components/business/PostCard.vue'))
const PostCardSkeleton = defineHomeAsyncComponent(
  () => import('@/components/business/PostCardSkeleton.vue')
)
const HomepagePreviewController = defineHomeAsyncComponent(
  () => import('@/components/home/HomepagePreviewController.vue')
)

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { t, locale } = useI18n()

const shouldAnimate = computed(() => settings.value.enableAnimations && !prefersReducedMotion())
const noGlassBackdropStyle = Object.freeze({
  backdropFilter: 'blur(0rem)',
  WebkitBackdropFilter: 'blur(0rem)',
}) as Readonly<Record<string, string>>
const initialHomeAggregate = createEmptyHomeAggregate()
const initialHomePosts: PostListItem[] = []

let homeSupportRefreshController: AbortController | null = null
let pendingHomeSupportRefresh: HomeSupportRefreshTargets = {
  schedule: false,
  community: false,
}

// Posts state
const posts = ref<PostListItem[]>(initialHomePosts)
const allPosts = ref<PostListItem[]>(initialHomePosts)

// Home click → preview modal
const isPreviewOpen = ref(false)
const previewPostId = ref<string | null>(null)
const previewThumbnailSrc = ref<string | null>(null)
const previewPost = ref<PostListItem | null>(null)
const shouldMountHomepagePreviewController = computed(() => isPreviewOpen.value)
const hoveredBubbleId = ref<string | null>(null)
const hoveredBubbleSource = ref<'pointer' | 'focus' | null>(null)
const selectedBubbleId = computed(() =>
  isPreviewOpen.value ? normalizeText(previewPostId.value) || null : null
)
const hasActiveBubble = computed(() => Boolean(selectedBubbleId.value || hoveredBubbleId.value))
const pointerInsideBubbleStage = ref(false)
const pointerOverBubbleId = ref<string | null>(null)
const pointerStagePosition = ref<{
  x: number | null
  y: number | null
  normalizedX: number
  normalizedY: number
}>({
  x: null,
  y: null,
  normalizedX: 0.5,
  normalizedY: 0.5,
})
const bubbleMotionFrameActive = ref(false)

// Loading & error state
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const total = ref(Math.max(initialHomePosts.length, initialHomeAggregate.story_deck.total ?? 0))
const homeAggregate = ref<HomeAggregateResponse | null>(initialHomeAggregate)
const homeScheduleHighlights = ref<HomeScheduleHighlight[]>(
  initialHomeAggregate.trends.schedules ?? []
)
const homeCommunityHighlights = ref<HomeCommunityHighlight[]>(
  initialHomeAggregate.trends.community ?? []
)
const homeDataSource = ref<'idle' | 'aggregate' | 'support' | 'cached' | 'fallback'>('idle')
const failedHomeMediaUrls = ref<Set<string>>(new Set())

type HomeSectionInstance = {
  element: HTMLElement | null
}

type HomeSupportRefreshTargets = {
  schedule: boolean
  community: boolean
}

// DOM refs
const postsSectionRef = useTemplateRef<HomeSectionInstance>('postsSectionRef')
const bubbleStageRef = useTemplateRef<HTMLElement>('bubbleStageRef')
const bubbleCanvasRef = useTemplateRef<HTMLCanvasElement>('bubbleCanvasRef')
const featuredSectionRef = useTemplateRef<HomeSectionInstance>('featuredSectionRef')
const storyDeckRef = useTemplateRef<HomeSectionInstance>('storyDeckRef')
const homeQuickNavAnchors = homeSectionAnchors
const activeHomeSectionId = ref<HomeSectionAnchor['id']>(homeSectionAnchors[0]?.id ?? 'home-fold')
let homeSectionObserver: IntersectionObserver | null = null

function updateHomeQuickNavSide(side: 'left' | 'right') {
  settingsStore.setHomeQuickNavSide(side)
}

const railProgress = ref(0)
const storyProgress = ref(0)
const bubbleLayoutTier = ref<BubbleLayoutTier>('desktop')
const bubbleRevealPhase = ref<'idle' | 'arming' | 'revealed' | 'exiting'>('idle')
const viewportSceneBlend = ref({
  heroRail: 0,
  railPosts: 0,
  postsStory: 0,
  storyFooter: 0,
})

const {
  bubbleItems,
  clearHeroEditorialRevealTimer,
  communityHighlightPreview,
  featuredRailCards,
  featuredRailPosts,
  heroEditorialCard,
  heroEditorialSupportText,
  heroEditorialText,
  heroEditorialTitle,
  heroEditorialVisible,
  heroSpotlightMeta,
  heroSpotlightTag,
  heroStats,
  heroTags,
  homeSourcePosts,
  isUsingFallbackPosts,
  leadingTrendingAuthor,
  portalLeadCard,
  portalLeadEyebrow,
  portalLeadPreviewTitle,
  portalOverviewStats,
  portalPanels,
  portalRecommendDescription,
  portalRecommendLink,
  postsToolbarTags,
  primaryScheduleHighlights,
  quickFilters,
  scheduleFallbackCard,
  spotlightMediaCards,
  spotlightTextCards,
  storyCardCount,
  storyCards,
  trendingAuthors,
  trendingTags,
  trendsScheduleCompanion,
} = useHomeViewModel({
  homeAggregate,
  allPosts,
  homeDataSource,
  total,
  homeScheduleHighlights,
  homeCommunityHighlights,
  shouldAnimate,
  bubbleLayoutTier,
  translate: t,
  locale,
})

const secondaryTrendingAuthors = computed(() => {
  const secondary = trendingAuthors.value.slice(1)

  if (bubbleLayoutTier.value === 'mobile') {
    return secondary.slice(0, 1)
  }

  if (bubbleLayoutTier.value === 'tablet') {
    return secondary.slice(0, 2)
  }

  return secondary.slice(0, 3)
})

const hiddenTrendingAuthorCount = computed(() =>
  Math.max(trendingAuthors.value.length - 1 - secondaryTrendingAuthors.value.length, 0)
)

function formatScheduleHighlightMeta(item: HomeScheduleHighlight | null | undefined): string {
  return formatScheduleHighlightMetaValue(item, locale.value)
}

function formatCommunityHighlightMeta(item: HomeCommunityHighlight | null | undefined): string {
  return formatCommunityHighlightMetaValue(item, t)
}

function resolveHomeImageSrcset(url: string | null | undefined): string | null {
  return getThumbnailSrcset(url)
}

function resolveHeroCollageImageDimensions(index: number): { width: number; height: number } {
  return index === 0 ? { width: 1600, height: 1000 } : { width: 1000, height: 1000 }
}

function resolveHeroCollageImageSizes(index: number): string {
  return index === 0
    ? '(min-width: 1280px) 30rem, (min-width: 768px) 92vw, 100vw'
    : '(min-width: 1280px) 14rem, (min-width: 768px) 44vw, 50vw'
}

function resolveHeroCollageImageLoading(index: number): 'eager' | 'lazy' {
  return index === 0 ? 'eager' : 'lazy'
}

function resolveHeroCollageFetchPriority(index: number): 'high' | 'auto' {
  return index === 0 ? 'high' : 'auto'
}

function resolveFeaturedRailImageSize(index: number): { width: number; height: number } {
  if (index === 0) return { width: 880, height: 1000 }
  if (index > 1) return { width: 1600, height: 900 }
  return { width: 1180, height: 1000 }
}

function resolveFeaturedRailImageSizes(index: number): string {
  if (index === 0) return '(min-width: 1280px) 22rem, (min-width: 768px) 88vw, 100vw'
  if (index > 1) return '(min-width: 1280px) 16rem, (min-width: 768px) 42vw, 50vw'
  return '(min-width: 1280px) 18rem, (min-width: 768px) 48vw, 100vw'
}

function resolveFeaturedRailImageLoading(): 'eager' | 'lazy' {
  return 'lazy'
}

function resolveFeaturedRailFetchPriority(): 'high' | 'auto' {
  return 'auto'
}

function resolveSectionElement(
  section: HomeSectionInstance | null | undefined
): HTMLElement | null {
  return section?.element ?? null
}

function getHomeSectionElement(id: HomeSectionAnchor['id']): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(id)
}

function disconnectHomeSectionObserver() {
  homeSectionObserver?.disconnect()
  homeSectionObserver = null
}

function observeHomeSections() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  disconnectHomeSectionObserver()

  if (typeof window.IntersectionObserver !== 'function') return

  const visibility = new Map<HomeSectionAnchor['id'], number>()
  homeSectionObserver = createVisibilityObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute('id') as HomeSectionAnchor['id'] | null
        if (!id) continue
        visibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0)
      }

      let nextActive = activeHomeSectionId.value
      let maxRatio = -1
      for (const anchor of homeQuickNavAnchors) {
        const ratio = visibility.get(anchor.id) ?? 0
        if (ratio > maxRatio) {
          maxRatio = ratio
          nextActive = anchor.id
        }
      }

      if (maxRatio > 0) {
        activeHomeSectionId.value = nextActive
      }
    },
    {
      threshold: [0.2, 0.35, 0.55, 0.75],
      rootMargin: '-18% 0% -18% 0%',
    }
  )

  for (const anchor of homeQuickNavAnchors) {
    const element = getHomeSectionElement(anchor.id)
    if (element) {
      homeSectionObserver.observe(element)
    }
  }
}

function scrollToHomeSection(id: HomeSectionAnchor['id']) {
  if (typeof document === 'undefined') return

  const target = getHomeSectionElement(id)
  if (!target) return

  activeHomeSectionId.value = id

  const targetTop = resolveDocumentAnchorTop(target, document)
  const top = computeScrollAnchorTop(targetTop, readNavbarVisibleOffset(document))
  scrollWithSmoothScroll(top, {
    immediate: !shouldAnimate.value,
  })
}

function refreshBubbleLayoutTier() {
  const width = Math.round(bubbleStageRef.value?.getBoundingClientRect().width ?? 0)
  bubbleLayoutTier.value = resolveBubbleLayoutTier(width)
}

function disconnectBubbleStageLayoutObserver() {
  bubbleStageResizeObserver?.disconnect()
  bubbleStageResizeObserver = null
}

function observeBubbleStageLayout() {
  if (typeof window === 'undefined') return

  disconnectBubbleStageLayoutObserver()
  refreshBubbleLayoutTier()
  if (shouldUseHomeBubbleCanvasScene()) {
    resizeBubbleCanvasScene()
  } else {
    stopBubbleCanvasScene()
  }

  if (!bubbleStageRef.value) return

  bubbleStageResizeObserver = createResizeObserver((entries) => {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue
      bubbleLayoutTier.value = resolveBubbleLayoutTier(Math.round(entry.contentRect.width))
      scheduleBubbleMotionMeasurement()
      if (shouldUseHomeBubbleCanvasScene()) {
        resizeBubbleCanvasScene()
      } else {
        stopBubbleCanvasScene()
      }
    }
  })

  bubbleStageResizeObserver?.observe(bubbleStageRef.value)
  scheduleBubbleMotionMeasurement()
  if (shouldUseHomeBubbleCanvasScene()) {
    startBubbleCanvasScene()
  }
}

const isBubbleInteractiveTier = computed(() => bubbleLayoutTier.value !== 'mobile')

function resolveBubbleCanvasOrbCount(): number {
  if (bubbleLayoutTier.value === 'mobile') return 5
  if (bubbleLayoutTier.value === 'tablet') return 8
  return 11
}

function seedBubbleCanvasOrbs(width: number, height: number) {
  const count = resolveBubbleCanvasOrbCount()
  bubbleCanvasOrbs = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.min(width, height) * (0.08 + Math.random() * 0.12),
    driftX: (Math.random() - 0.5) * (bubbleLayoutTier.value === 'mobile' ? 0.5 : 0.85),
    driftY: (Math.random() - 0.5) * (bubbleLayoutTier.value === 'mobile' ? 0.4 : 0.75),
    alpha: 0.08 + Math.random() * 0.12,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.2 + Math.random() * 0.35,
    hueMix: index % 2 === 0 ? 1 : -1,
  }))
}

function resizeBubbleCanvasScene() {
  if (typeof window === 'undefined') return

  const canvas = bubbleCanvasRef.value
  const stage = bubbleStageRef.value
  if (!canvas || !stage) return

  const rect = stage.getBoundingClientRect()
  const width = Math.max(Math.round(rect.width), 1)
  const height = Math.max(Math.round(rect.height), 1)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  if (bubbleCanvasOrbs.length !== resolveBubbleCanvasOrbCount()) {
    seedBubbleCanvasOrbs(width, height)
  } else {
    bubbleCanvasOrbs = bubbleCanvasOrbs.map((orb) => ({
      ...orb,
      x: clamp(orb.x, 0, width),
      y: clamp(orb.y, 0, height),
      radius: Math.min(orb.radius, Math.min(width, height) * 0.24),
    }))
  }
}

function stopBubbleCanvasScene() {
  if (typeof window !== 'undefined' && bubbleCanvasFrame !== null) {
    window.cancelAnimationFrame(bubbleCanvasFrame)
  }
  bubbleCanvasFrame = null
  bubbleCanvasLastTimestamp = null
}

function renderBubbleCanvasFrame(timestamp: number) {
  const canvas = bubbleCanvasRef.value
  const stage = bubbleStageRef.value
  if (typeof window === 'undefined' || !canvas || !stage) {
    stopBubbleCanvasScene()
    return
  }

  if (bubbleCanvasOrbs.length === 0) {
    resizeBubbleCanvasScene()
  }

  const rect = stage.getBoundingClientRect()
  const context = canvas.getContext('2d')
  if (!context) {
    stopBubbleCanvasScene()
    return
  }

  const deltaMs =
    bubbleCanvasLastTimestamp === null ? 16 : Math.min(timestamp - bubbleCanvasLastTimestamp, 34)
  bubbleCanvasLastTimestamp = timestamp
  const width = Math.max(rect.width, 1)
  const height = Math.max(rect.height, 1)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pointerX =
    pointerStagePosition.value.x === null ? width * 0.5 : pointerStagePosition.value.x
  const pointerY =
    pointerStagePosition.value.y === null ? height * 0.5 : pointerStagePosition.value.y
  const reducedMotion = !shouldAnimate.value

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  context.globalCompositeOperation = 'source-over'

  const mistGradient = context.createRadialGradient(
    pointerX,
    pointerY,
    0,
    pointerX,
    pointerY,
    width * 0.55
  )
  mistGradient.addColorStop(0, 'rgba(167, 139, 250, 0.14)')
  mistGradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.08)')
  mistGradient.addColorStop(1, 'rgba(15, 23, 42, 0)')
  context.fillStyle = mistGradient
  context.fillRect(0, 0, width, height)

  for (const orb of bubbleCanvasOrbs) {
    const motionFactor = reducedMotion ? 0.15 : 1
    orb.phase += (deltaMs / 1000) * orb.phaseSpeed * motionFactor
    orb.x = (orb.x + orb.driftX * motionFactor + width) % width
    orb.y = (orb.y + orb.driftY * motionFactor + height) % height

    const pulse = 0.92 + Math.sin(orb.phase) * 0.08
    const parallaxX = (pointerX / width - 0.5) * 24 * orb.hueMix
    const parallaxY = (pointerY / height - 0.5) * 16
    const x = orb.x + parallaxX
    const y = orb.y + parallaxY
    const radius = orb.radius * pulse
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(
      0,
      `rgba(${orb.hueMix > 0 ? '147, 197, 253' : '244, 114, 182'}, ${orb.alpha})`
    )
    gradient.addColorStop(
      0.55,
      `rgba(${orb.hueMix > 0 ? '59, 130, 246' : '236, 72, 153'}, ${orb.alpha * 0.44})`
    )
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  bubbleCanvasFrame = window.requestAnimationFrame(renderBubbleCanvasFrame)
}

function startBubbleCanvasScene() {
  if (
    typeof window === 'undefined' ||
    bubbleCanvasFrame !== null ||
    !bubbleCanvasRef.value ||
    !shouldUseHomeBubbleCanvasScene()
  )
    return
  resizeBubbleCanvasScene()
  bubbleCanvasFrame = window.requestAnimationFrame(renderBubbleCanvasFrame)
}

function clearBubbleMotionMeasureFrame() {
  if (typeof window === 'undefined' || bubbleMotionMeasureFrame === null) return
  window.cancelAnimationFrame(bubbleMotionMeasureFrame)
  bubbleMotionMeasureFrame = null
}

function clearBubbleMotionFrame() {
  if (typeof window === 'undefined' || bubbleMotionFrame === null) return
  window.cancelAnimationFrame(bubbleMotionFrame)
  bubbleMotionFrame = null
}

function clearBubbleRuntimeClasses(element: HTMLButtonElement) {
  element.classList.remove('is-displaced', 'is-under-pressure')
}

function resetBubbleFrameStateStyle(element: HTMLButtonElement) {
  element.style.setProperty('--bubble-live-x', '0rem')
  element.style.setProperty('--bubble-live-y', '0rem')
  element.style.setProperty('--bubble-live-rotate', '0deg')
  element.style.setProperty('--bubble-live-scale', '1')
  element.style.setProperty('--bubble-live-opacity', '1')
  element.style.setProperty('--bubble-live-shadow-x', '0rem')
  element.style.setProperty('--bubble-live-shadow-y', '0rem')
  clearBubbleRuntimeClasses(element)
}

function resetAllBubbleFrameStateStyles() {
  for (const element of bubbleElementMap.values()) {
    resetBubbleFrameStateStyle(element)
  }
  bubbleFrameStateMap.clear()
}

function stopBubbleMotionLoop(options: { resetStyles?: boolean } = {}) {
  clearBubbleMotionFrame()
  bubbleMotionFrameActive.value = false
  bubbleMotionLastTimestamp = null
  bubbleMotionPointerStrength = 0
  bubbleMotionForceCenter = null

  if (options.resetStyles ?? true) {
    resetAllBubbleFrameStateStyles()
  }
}

function resolveBubbleButtonElement(
  value: Element | ComponentPublicInstance | null
): HTMLButtonElement | null {
  if (value instanceof HTMLButtonElement) return value
  if (value instanceof HTMLElement && value.tagName === 'BUTTON') {
    return value as HTMLButtonElement
  }
  return null
}

function registerBubbleElement(bubbleId: string, value: Element | ComponentPublicInstance | null) {
  const normalizedId = normalizeText(bubbleId)
  if (!normalizedId) return

  const element = resolveBubbleButtonElement(value)
  if (!element) {
    bubbleElementMap.delete(normalizedId)
    bubbleAnchorMetricsMap.delete(normalizedId)
    bubbleFrameStateMap.delete(normalizedId)
    return
  }

  bubbleElementMap.set(normalizedId, element)
  if (!bubbleFrameStateMap.has(normalizedId)) {
    resetBubbleFrameStateStyle(element)
  }
  if (bubbleEnhancementsPrimed) {
    scheduleBubbleMotionMeasurement()
  }
}

function measureBubbleMotionAnchors() {
  if (typeof window === 'undefined' || !bubbleStageRef.value) return

  const stageRect = bubbleStageRef.value.getBoundingClientRect()
  bubbleStageMetrics.value = {
    width: Math.max(stageRect.width, 0),
    height: Math.max(stageRect.height, 0),
    viewportWidth: Math.max(window.innerWidth, stageRect.width, 0),
  }

  bubbleAnchorMetricsMap.clear()

  for (const [bubbleId, element] of bubbleElementMap.entries()) {
    const rect = element.getBoundingClientRect()
    const currentState = bubbleFrameStateMap.get(bubbleId)
    const translateX = (currentState?.translateX ?? 0) * 16
    const translateY = (currentState?.translateY ?? 0) * 16
    const width = element.offsetWidth || rect.width
    const height = element.offsetHeight || rect.height
    const left = rect.left - stageRect.left - translateX
    const top = rect.top - stageRect.top - translateY

    bubbleAnchorMetricsMap.set(bubbleId, {
      left,
      top,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height / 2,
    })
  }
}

function scheduleBubbleMotionMeasurement() {
  if (typeof window === 'undefined') return

  clearBubbleMotionMeasureFrame()
  bubbleMotionMeasureFrame = window.requestAnimationFrame(() => {
    bubbleMotionMeasureFrame = null
    measureBubbleMotionAnchors()
    syncBubbleMotionLoop()
  })
}

function writeBubbleFrameState(element: HTMLButtonElement, state: BubbleFrameState) {
  element.style.setProperty('--bubble-live-x', `${state.translateX.toFixed(4)}rem`)
  element.style.setProperty('--bubble-live-y', `${state.translateY.toFixed(4)}rem`)
  element.style.setProperty('--bubble-live-rotate', `${state.rotateDeg.toFixed(4)}deg`)
  element.style.setProperty('--bubble-live-scale', state.liveScale.toFixed(4))
  element.style.setProperty('--bubble-live-opacity', state.opacity.toFixed(4))
  element.style.setProperty('--bubble-live-shadow-x', `${state.shadowShiftX.toFixed(4)}rem`)
  element.style.setProperty('--bubble-live-shadow-y', `${state.shadowShiftY.toFixed(4)}rem`)
  element.classList.toggle('is-displaced', state.isDisplaced)
  element.classList.toggle('is-under-pressure', state.isUnderPressure)
}

function updateBubbleStagePointerPosition(event: PointerEvent) {
  if (typeof window === 'undefined' || !bubbleStageRef.value) return

  const stageRect = bubbleStageRef.value.getBoundingClientRect()
  const nextX = clamp(event.clientX - stageRect.left, 0, stageRect.width)
  const nextY = clamp(event.clientY - stageRect.top, 0, stageRect.height)

  pointerStagePosition.value = {
    x: nextX,
    y: nextY,
    normalizedX: stageRect.width > 0 ? clamp(nextX / stageRect.width) : 0.5,
    normalizedY: stageRect.height > 0 ? clamp(nextY / stageRect.height) : 0.5,
  }
  bubbleStageMetrics.value = {
    width: Math.max(stageRect.width, 0),
    height: Math.max(stageRect.height, 0),
    viewportWidth: Math.max(window.innerWidth, stageRect.width, 0),
  }
}

function handleBubbleStagePointerEnter(event: PointerEvent) {
  activateHomeBubbleEnhancements()
  pointerInsideBubbleStage.value = true
  updateBubbleStagePointerPosition(event)
  syncBubbleMotionLoop()
}

function handleBubbleStagePointerMove(event: PointerEvent) {
  activateHomeBubbleEnhancements()
  pointerInsideBubbleStage.value = true
  updateBubbleStagePointerPosition(event)
  syncBubbleMotionLoop()
}

function handleBubbleStagePointerLeave() {
  pointerInsideBubbleStage.value = false
  pointerOverBubbleId.value = null
  clearHoveredBubble(undefined, 'pointer')
  syncBubbleMotionLoop()
}

function handleBubblePointerEnter(bubbleId: string, event: PointerEvent) {
  activateHomeBubbleEnhancements()
  pointerInsideBubbleStage.value = true
  pointerOverBubbleId.value = normalizeText(bubbleId) || null
  updateBubbleStagePointerPosition(event)
  setHoveredBubble(bubbleId, 'pointer')
  syncBubbleMotionLoop()
}

function handleBubblePointerLeave(bubbleId: string) {
  const normalizedId = normalizeText(bubbleId)
  if (pointerOverBubbleId.value === normalizedId) {
    pointerOverBubbleId.value = null
  }
  clearHoveredBubble(bubbleId, 'pointer')
  syncBubbleMotionLoop()
}

function handleBubbleFocus(bubbleId: string) {
  activateHomeBubbleEnhancements()
  setHoveredBubble(bubbleId, 'focus')
}

function handleBubbleBlur(bubbleId: string) {
  clearHoveredBubble(bubbleId, 'focus')
}

function resolveBubbleMotionLerpFactor(deltaMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1
  return 1 - Math.exp(-deltaMs / durationMs)
}

function buildBubblePointerState(): BubblePointerState {
  const hoverAnchor =
    hoveredBubbleId.value !== null
      ? (bubbleAnchorMetricsMap.get(hoveredBubbleId.value) ?? null)
      : null

  if (hoverAnchor) {
    return {
      insideStage: pointerInsideBubbleStage.value,
      overBubbleId: pointerOverBubbleId.value,
      x: pointerStagePosition.value.x,
      y: pointerStagePosition.value.y,
      normalizedX: pointerStagePosition.value.normalizedX,
      normalizedY: pointerStagePosition.value.normalizedY,
      activeCenterX: bubbleMotionForceCenter?.x ?? hoverAnchor.centerX,
      activeCenterY: bubbleMotionForceCenter?.y ?? hoverAnchor.centerY,
      intensity: bubbleMotionPointerStrength,
      mode: 'hover',
    }
  }

  if (
    pointerInsideBubbleStage.value &&
    isBubbleInteractiveTier.value &&
    pointerStagePosition.value.x !== null &&
    pointerStagePosition.value.y !== null
  ) {
    return {
      insideStage: true,
      overBubbleId: pointerOverBubbleId.value,
      x: pointerStagePosition.value.x,
      y: pointerStagePosition.value.y,
      normalizedX: pointerStagePosition.value.normalizedX,
      normalizedY: pointerStagePosition.value.normalizedY,
      activeCenterX: bubbleMotionForceCenter?.x ?? pointerStagePosition.value.x,
      activeCenterY: bubbleMotionForceCenter?.y ?? pointerStagePosition.value.y,
      intensity: bubbleMotionPointerStrength,
      mode: 'pointer',
    }
  }

  return {
    insideStage: false,
    overBubbleId: pointerOverBubbleId.value,
    x: pointerStagePosition.value.x,
    y: pointerStagePosition.value.y,
    normalizedX: pointerStagePosition.value.normalizedX,
    normalizedY: pointerStagePosition.value.normalizedY,
    activeCenterX: bubbleMotionForceCenter?.x ?? null,
    activeCenterY: bubbleMotionForceCenter?.y ?? null,
    intensity: bubbleMotionPointerStrength,
    mode: 'idle',
  }
}

function shouldRunBubbleMotionLoop(): boolean {
  return (
    typeof window !== 'undefined' &&
    !isLightweightHomeViewport() &&
    bubbleRevealPhase.value === 'revealed' &&
    bubbleItems.value.length > 0 &&
    shouldAnimate.value &&
    bubbleStageRef.value !== null &&
    bubbleAnchorMetricsMap.size >= bubbleItems.value.length &&
    (hasActiveBubble.value || pointerInsideBubbleStage.value || bubbleMotionPointerStrength > 0.001)
  )
}

function runBubbleMotionFrame(timestamp: number) {
  bubbleMotionFrame = null

  if (!shouldRunBubbleMotionLoop()) {
    stopBubbleMotionLoop({
      resetStyles: bubbleRevealPhase.value !== 'exiting',
    })
    return
  }

  const deltaMs =
    bubbleMotionLastTimestamp === null ? 16 : Math.min(timestamp - bubbleMotionLastTimestamp, 34)
  bubbleMotionLastTimestamp = timestamp

  const hoverAnchor =
    hoveredBubbleId.value !== null
      ? (bubbleAnchorMetricsMap.get(hoveredBubbleId.value) ?? null)
      : null
  const pointerTargetCenter =
    pointerInsideBubbleStage.value &&
    isBubbleInteractiveTier.value &&
    pointerStagePosition.value.x !== null &&
    pointerStagePosition.value.y !== null
      ? {
          x: pointerStagePosition.value.x,
          y: pointerStagePosition.value.y,
        }
      : null
  const targetCenter = hoverAnchor
    ? {
        x: hoverAnchor.centerX,
        y: hoverAnchor.centerY,
      }
    : pointerTargetCenter
  const targetStrength = targetCenter ? 1 : 0
  const pointerSettleDuration = targetCenter ? BUBBLE_POINTER_ATTACK_MS : BUBBLE_POINTER_RELEASE_MS
  const pointerLerp = resolveBubbleMotionLerpFactor(deltaMs, pointerSettleDuration)

  bubbleMotionPointerStrength += (targetStrength - bubbleMotionPointerStrength) * pointerLerp

  if (targetCenter) {
    if (!bubbleMotionForceCenter) {
      bubbleMotionForceCenter = { ...targetCenter }
    } else {
      const centerLerp = resolveBubbleMotionLerpFactor(deltaMs, BUBBLE_FORCE_CENTER_LERP_MS)
      bubbleMotionForceCenter.x += (targetCenter.x - bubbleMotionForceCenter.x) * centerLerp
      bubbleMotionForceCenter.y += (targetCenter.y - bubbleMotionForceCenter.y) * centerLerp
    }
  } else if (bubbleMotionPointerStrength <= 0.001) {
    bubbleMotionForceCenter = null
    bubbleMotionPointerStrength = 0
  }

  const pointerState = buildBubblePointerState()

  for (const bubble of bubbleItems.value) {
    const element = bubbleElementMap.get(bubble.id)
    if (!element) continue

    const frameState = computeBubbleFrameState({
      bubbleId: bubble.id,
      tier: bubbleLayoutTier.value,
      nowMs: timestamp,
      profile: bubble.motionProfile,
      anchor: bubbleAnchorMetricsMap.get(bubble.id),
      stage: bubbleStageMetrics.value,
      pointer: pointerState,
      isHoverActive: isBubbleHoverActive(bubble.id),
      isPersistentSelected: isBubblePersistentSelected(bubble.id),
    })

    bubbleFrameStateMap.set(bubble.id, frameState)
    writeBubbleFrameState(element, frameState)
  }

  bubbleMotionFrameActive.value = true
  bubbleMotionFrame = window.requestAnimationFrame(runBubbleMotionFrame)
}

function syncBubbleMotionLoop() {
  if (!shouldRunBubbleMotionLoop()) {
    stopBubbleMotionLoop({
      resetStyles: bubbleRevealPhase.value !== 'exiting',
    })
    return
  }

  if (bubbleMotionFrame !== null) return
  bubbleMotionFrame = window.requestAnimationFrame(runBubbleMotionFrame)
}

let storyDeckTrigger: ScrollTriggerInstance | null = null
let featuredRailTrigger: ScrollTriggerInstance | null = null
let sceneSetupFrame: number | null = null
let sceneSetupQueued = false
let scenesEnabled = false
let sceneResizeObserver: ResizeObserver | null = null
let bubbleStageResizeObserver: ResizeObserver | null = null
let bubbleMotionFrame: number | null = null
let bubbleMotionMeasureFrame: number | null = null
let bubbleMotionLastTimestamp: number | null = null
let bubbleMotionPointerStrength = 0
let bubbleMotionForceCenter: {
  x: number
  y: number
} | null = null
const bubbleElementMap = new Map<string, HTMLButtonElement>()
const bubbleAnchorMetricsMap = new Map<string, BubbleAnchorMetrics>()
const bubbleFrameStateMap = new Map<string, BubbleFrameState>()
const bubbleStageMetrics = ref<BubbleStageMetrics | null>(null)
type BubbleCanvasOrb = {
  x: number
  y: number
  radius: number
  driftX: number
  driftY: number
  alpha: number
  phase: number
  phaseSpeed: number
  hueMix: number
}
let bubbleCanvasFrame: number | null = null
let bubbleCanvasOrbs: BubbleCanvasOrb[] = []
let bubbleCanvasLastTimestamp: number | null = null
let sceneObservedSizes = new WeakMap<HTMLElement, { width: number; height: number }>()
const scheduleSceneRefreshFromResize = throttleRAF(() => {
  scheduleSceneSetup()
})
let bubbleBurstReplayFrame: number | null = null
let bubbleExitResetTimer: ReturnType<typeof setTimeout> | null = null
let viewportSceneFrame: number | null = null
let viewportSceneTrackingBound = false
let sceneProgressFrame: number | null = null
let sceneProgressTrackingBound = false
let homeDeferredEnhancementObserver: IntersectionObserver | null = null
let homeDeferredSceneIntentBound = false
let sceneEnhancementsPrimed = false
let bubbleEnhancementsPrimed = false

const storyTravel = computed(() => Math.max(effectiveStoryCardCount.value - 1, 0))
const storyProgressIndex = computed(() => storyProgress.value * storyTravel.value)
const storyMergeProgress = computed(() => clamp((storyProgress.value - 0.86) / 0.14))
const storyFooterFade = computed(() => clamp((storyProgress.value - 0.9) / 0.1))
const activeStoryIndex = computed(() =>
  effectiveStoryCardCount.value > 1 ? Math.round(storyProgressIndex.value) : 0
)
const effectiveStoryCardCount = computed(() => storyCardCount.value)

const railSlides = computed(() => [
  { key: 'portal', label: t('home.portal.title') },
  { key: 'spotlight', label: t('home.hero.spotlightLabel') },
  { key: 'featured', label: t('home.featured.title') },
  { key: 'trends', label: t('home.trends.authorsTitle') },
])

const railSlideCount = computed(() => railSlides.value.length)
const activeRailIndex = computed(() =>
  railSlideCount.value > 1 ? Math.round(railProgress.value * (railSlideCount.value - 1)) : 0
)
const activeRailSlide = computed(
  () => railSlides.value[activeRailIndex.value] ?? railSlides.value[0]
)

const featuredSceneStyle = computed(() => ({
  '--rail-slide-count': String(Math.max(railSlideCount.value, 1)),
}))

const railTrackStyle = computed(() => {
  if (isCompactHomeViewport()) {
    return {
      transform: 'none',
    }
  }

  return {
    transform: `translate3d(-${
      clamp(railProgress.value) *
      ((Math.max(railSlideCount.value, 1) - 1) * (100 / Math.max(railSlideCount.value, 1)))
    }%, 0, 0)`,
  }
})

const storySceneStyle = computed(() => ({
  '--story-card-count': String(Math.max(effectiveStoryCardCount.value, 1)),
  '--story-progress': String(storyProgress.value),
  '--story-footer-fade': String(storyFooterFade.value),
}))

function isCompactHomeViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 768
}

function isLightweightHomeViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.innerWidth > 768 &&
    window.innerWidth <= HOME_LIGHTWEIGHT_VIEWPORT_MAX_WIDTH
  )
}

function shouldUseHomeSectionBlendEffects(): boolean {
  return typeof window !== 'undefined' && shouldAnimate.value && !isLightweightHomeViewport()
}

function shouldUseHomeScrollScrubScenes(): boolean {
  return shouldUseHomeSectionBlendEffects()
}

function shouldUseHomeBubbleCanvasScene(): boolean {
  return typeof window !== 'undefined' && shouldAnimate.value && !isLightweightHomeViewport()
}

function disconnectDeferredHomeEnhancementObserver() {
  homeDeferredEnhancementObserver?.disconnect()
  homeDeferredEnhancementObserver = null
}

function unbindDeferredHomeSceneIntent() {
  if (typeof window === 'undefined' || !homeDeferredSceneIntentBound) return
  homeDeferredSceneIntentBound = false
  window.removeEventListener('scroll', handleDeferredHomeSceneIntent)
  window.removeEventListener('wheel', handleDeferredHomeSceneIntent)
  window.removeEventListener('touchstart', handleDeferredHomeSceneIntent)
  window.removeEventListener('keydown', handleDeferredHomeSceneIntent)
}

function bindDeferredHomeSceneIntent() {
  if (typeof window === 'undefined' || homeDeferredSceneIntentBound || sceneEnhancementsPrimed)
    return
  homeDeferredSceneIntentBound = true
  window.addEventListener('scroll', handleDeferredHomeSceneIntent, { passive: true })
  window.addEventListener('wheel', handleDeferredHomeSceneIntent, { passive: true })
  window.addEventListener('touchstart', handleDeferredHomeSceneIntent, { passive: true })
  window.addEventListener('keydown', handleDeferredHomeSceneIntent)
}

function maybeCleanupDeferredHomeEnhancementObserver() {
  if (sceneEnhancementsPrimed && bubbleEnhancementsPrimed) {
    disconnectDeferredHomeEnhancementObserver()
  }
}

function syncBubbleRevealLifecycle() {
  resetBubbleRevealState()

  if (!bubbleEnhancementsPrimed || bubbleItems.value.length === 0) return

  if (isLightweightHomeViewport()) {
    bubbleRevealPhase.value = 'revealed'
    return
  }

  if (shouldAnimate.value) {
    restartBubbleBurst()
    return
  }

  bubbleRevealPhase.value = 'revealed'
}

function activateHomeSceneEnhancements(delay = HOME_SCENE_ACTIVATION_DELAY_MS) {
  if (homeEnhancementsDisposed || sceneEnhancementsPrimed) return
  sceneEnhancementsPrimed = true
  unbindDeferredHomeSceneIntent()
  if (isLightweightHomeViewport()) {
    setHomeSceneLifecycleEnabled(false)
    maybeCleanupDeferredHomeEnhancementObserver()
    return
  }
  setHomeSceneLifecycleEnabled(true, delay)
  maybeCleanupDeferredHomeEnhancementObserver()
}

function activateHomeBubbleEnhancements() {
  if (homeEnhancementsDisposed || bubbleEnhancementsPrimed) return
  bubbleEnhancementsPrimed = true
  syncBubbleRevealLifecycle()
  void nextTick(() => {
    if (homeEnhancementsDisposed || !bubbleEnhancementsPrimed) return
    observeBubbleStageLayout()
    scheduleBubbleMotionMeasurement()
  })
  maybeCleanupDeferredHomeEnhancementObserver()
}

function observeDeferredHomeEnhancements() {
  if (typeof window === 'undefined') return

  disconnectDeferredHomeEnhancementObserver()
  if (!isLightweightHomeViewport()) {
    bindDeferredHomeSceneIntent()
  }

  const postsElement = resolveSectionElement(postsSectionRef.value)

  if (!postsElement) return

  if (typeof window.IntersectionObserver !== 'function') {
    if (!isLightweightHomeViewport()) {
      activateHomeSceneEnhancements(0)
    }
    activateHomeBubbleEnhancements()
    return
  }

  homeDeferredEnhancementObserver = createVisibilityObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue

        if (postsElement && entry.target === postsElement) {
          if (!isLightweightHomeViewport()) {
            activateHomeSceneEnhancements(0)
          }
          activateHomeBubbleEnhancements()
        }
      }
    },
    {
      threshold: [0, 0.01],
      rootMargin: '35% 0% 35% 0%',
    }
  )

  if (postsElement) {
    homeDeferredEnhancementObserver.observe(postsElement)
  }
}

function handleDeferredHomeSceneIntent() {
  activateHomeSceneEnhancements(0)
}

const homePageMotionStyle = computed<Record<string, string>>(() => {
  if (isCompactHomeViewport() || !shouldUseHomeSectionBlendEffects()) {
    return {
      '--home-hero-opacity': '1',
      '--home-hero-scale': '1',
      '--home-hero-y': '0rem',
      '--home-hero-blur': '0rem',
      '--home-rail-opacity': '1',
      '--home-rail-scale': '1',
      '--home-rail-y': '0rem',
      '--home-rail-blur': '0rem',
      '--home-posts-opacity': '1',
      '--home-posts-scale': '1',
      '--home-posts-y': '0rem',
      '--home-posts-blur': '0rem',
      '--home-story-opacity': '1',
      '--home-story-scale': '1',
      '--home-story-y': '0rem',
      '--home-story-blur': '0rem',
    }
  }

  const heroExit = viewportSceneBlend.value.heroRail
  const railEnter = viewportSceneBlend.value.heroRail
  const railExit = viewportSceneBlend.value.railPosts
  const postsEnter = viewportSceneBlend.value.railPosts
  const postsExit = viewportSceneBlend.value.postsStory
  const storyEnter = viewportSceneBlend.value.postsStory
  const storyOutro = viewportSceneBlend.value.storyFooter

  return {
    '--home-hero-opacity': String(clamp(1 - heroExit * 0.14, 0.86, 1)),
    '--home-hero-scale': String(clamp(1 - heroExit * 0.022, 0.972, 1)),
    '--home-hero-y': `${(-1.45 * heroExit).toFixed(4)}rem`,
    '--home-hero-blur': `${(heroExit * 0.14).toFixed(4)}rem`,
    '--home-rail-opacity': String(clamp(0.82 + railEnter * 0.18 - railExit * 0.12, 0.76, 1)),
    '--home-rail-scale': String(clamp(0.974 + railEnter * 0.026 - railExit * 0.018, 0.95, 1)),
    '--home-rail-y': `${((1 - railEnter) * 1.45 - railExit * 0.62).toFixed(4)}rem`,
    '--home-rail-blur': `${((1 - railEnter) * 0.18 + railExit * 0.09).toFixed(4)}rem`,
    '--home-posts-opacity': String(clamp(0.82 + postsEnter * 0.18 - postsExit * 0.12, 0.76, 1)),
    '--home-posts-scale': String(clamp(0.974 + postsEnter * 0.026 - postsExit * 0.018, 0.952, 1)),
    '--home-posts-y': `${((1 - postsEnter) * 1.28 - postsExit * 0.56).toFixed(4)}rem`,
    '--home-posts-blur': `${((1 - postsEnter) * 0.16 + postsExit * 0.09).toFixed(4)}rem`,
    '--home-story-opacity': String(clamp(0.84 + storyEnter * 0.16 - storyOutro * 0.14, 0.72, 1)),
    '--home-story-scale': String(clamp(0.968 + storyEnter * 0.024 - storyOutro * 0.018, 0.94, 1)),
    '--home-story-y': `${((1 - storyEnter) * 1.18 - storyOutro * 0.48).toFixed(4)}rem`,
    '--home-story-blur': `${((1 - storyEnter) * 0.14 + storyOutro * 0.08).toFixed(4)}rem`,
  }
})

watchSyncEffect(() => {
  // 确保全量加载和分页加载状态不会并存，减少 UI 状态抖动。
  if (isLoading.value && isLoadingMore.value) {
    isLoadingMore.value = false
  }
})

watch(isPreviewOpen, (open) => {
  if (!open) {
    clearHoveredBubble(undefined, 'all')
    previewPostId.value = null
    previewThumbnailSrc.value = null
    previewPost.value = null
  }
})

onActivated(() => {
  observeHomeSections()
  void nextTick(() => {
    observeDeferredHomeEnhancements()
    if (sceneEnhancementsPrimed) {
      setHomeSceneLifecycleEnabled(true, 0)
    }
    if (bubbleEnhancementsPrimed) {
      observeBubbleStageLayout()
      scheduleBubbleMotionMeasurement()
    }
  })
  if (
    (homeDataSource.value === 'idle' || homeDataSource.value === 'fallback') &&
    !isLoading.value
  ) {
    void fetchHomeData()
  }
})

onDeactivated(() => {
  setHomeSceneLifecycleEnabled(false)
  abortHomeRequest()
  cancelPublicHomePrewarm()
  abortHomeSupportRefresh()
  setRailNavbarLock(false)
  disconnectHomeSectionObserver()
  disconnectDeferredHomeEnhancementObserver()
  unbindDeferredHomeSceneIntent()
  disconnectBubbleStageLayoutObserver()
  clearBubbleMotionMeasureFrame()
  stopBubbleMotionLoop()
  stopBubbleCanvasScene()
})
let homeRequestController: AbortController | null = null
let homePublicPrewarmCancel: (() => void) | null = null

function abortHomeRequest() {
  homeRequestController?.abort()
  homeRequestController = null
}

function cancelPublicHomePrewarm() {
  homePublicPrewarmCancel?.()
  homePublicPrewarmCancel = null
}

function collectHomePrewarmMedia(payload: HomeAggregateResponse): Array<string | null | undefined> {
  return [
    payload.hero.spotlight?.image?.thumbnail_url,
    payload.hero.spotlight?.image?.url,
    ...payload.featured.items.flatMap((item) => [
      item.cover?.thumbnail_url,
      item.cover?.url,
      ...(item.related_posts ?? []).flatMap((post) => [
        post.thumbnail?.thumbnail_url,
        post.thumbnail?.url,
        post.image?.thumbnail_url,
        post.image?.url,
      ]),
    ]),
    ...payload.story_deck.items.flatMap((item) => [item.image?.thumbnail_url, item.image?.url]),
  ]
}

function schedulePublicHomePrewarm(payload: HomeAggregateResponse) {
  if (typeof window === 'undefined') return
  cancelPublicHomePrewarm()

  const mediaLimit = window.innerWidth < 768 ? 2 : 6
  const listLimit = window.innerWidth < 768 ? 8 : 20
  const mediaUrls = collectHomePrewarmMedia(payload)

  homePublicPrewarmCancel = scheduleTask(
    () => {
      homePublicPrewarmCancel = null
      void prewarmPublicHomeContent({
        explore: async () => {
          const { postService } = await import('@/api/postService')
          const { getPublicPostList } = await import('@/utils/cache')
          await getPublicPostList({ limit: listLimit, cursor: null }, (params, config) =>
            postService.listPosts(params, { ...config, skipErrorToast: true })
          )
        },
        authors: async () => {
          const { authorService } = await import('@/api/authorService')
          const { getPublicAuthorList } = await import('@/utils/cache')
          await getPublicAuthorList({ limit: listLimit, cursor: null }, (params, config) =>
            authorService.listAuthors(params, { ...config, skipErrorToast: true })
          )
        },
        mediaUrls,
        mediaLimit,
      })
    },
    { priority: 'background', delay: 1200 }
  )
}

function applyHomeAggregate(
  payload: HomeAggregateResponse,
  source: 'aggregate' | 'support' | 'cached' | 'fallback'
) {
  homeAggregate.value = payload
  homeDataSource.value = source
  homeScheduleHighlights.value = payload.trends.schedules ?? []
  homeCommunityHighlights.value = payload.trends.community ?? []

  const normalizedPosts = buildHomePostsFromAggregate(payload, t).filter(
    (post) => !isFilteredAuthor(post.author_name)
  )

  posts.value = normalizedPosts
  allPosts.value = normalizedPosts
  total.value = normalizedPosts.length
}

function createEmptyHomeSupportRefreshTargets(): HomeSupportRefreshTargets {
  return {
    schedule: false,
    community: false,
  }
}

function hasPendingHomeSupportRefresh(targets: HomeSupportRefreshTargets): boolean {
  return targets.schedule || targets.community
}

function resolveHomeSupportRefreshTargets(
  payload: HomeAggregateResponse,
  source: 'aggregate' | 'support' | 'cached' | 'fallback'
): HomeSupportRefreshTargets {
  if (source === 'support' || source === 'cached' || source === 'fallback') {
    return createEmptyHomeSupportRefreshTargets()
  }

  const scheduleCount = payload.portal.items.find((item) => item.key === 'schedule')?.count ?? 0
  const communityCount = payload.portal.items.find((item) => item.key === 'community')?.count ?? 0
  const hasScheduleDetails = (payload.trends.schedules ?? []).length > 0
  const hasCommunityDetails = (payload.trends.community ?? []).length > 0

  return {
    schedule: scheduleCount > 0 && !hasScheduleDetails,
    community: communityCount > 0 && !hasCommunityDetails,
  }
}

async function refreshHomeSupportBlocks(
  signal: AbortSignal,
  targets: HomeSupportRefreshTargets
): Promise<void> {
  const tasks = [
    ...(targets.schedule
      ? [
          homeService
            .getScheduleHighlights(4, { signal, skipErrorToast: true })
            .then((result) => ({ kind: 'schedule' as const, result })),
        ]
      : []),
    ...(targets.community
      ? [
          homeService
            .getCommunityHighlights(4, { signal, skipErrorToast: true })
            .then((result) => ({ kind: 'community' as const, result })),
        ]
      : []),
  ]

  if (tasks.length === 0) return

  const results = await Promise.allSettled(tasks)

  if (signal.aborted) return

  for (const task of results) {
    if (task.status !== 'fulfilled') continue

    if (task.value.kind === 'schedule') {
      homeScheduleHighlights.value = task.value.result.payload.items
      continue
    }

    homeCommunityHighlights.value = task.value.result.payload.items
  }
}

function abortHomeSupportRefresh() {
  homeSupportRefreshController?.abort()
  homeSupportRefreshController = null
}

function runHomeSupportRefresh() {
  if (!hasPendingHomeSupportRefresh(pendingHomeSupportRefresh)) return

  abortHomeSupportRefresh()
  const refreshTargets = { ...pendingHomeSupportRefresh }
  pendingHomeSupportRefresh = createEmptyHomeSupportRefreshTargets()

  const controller = new AbortController()
  homeSupportRefreshController = controller
  void refreshHomeSupportBlocks(controller.signal, refreshTargets).finally(() => {
    if (homeSupportRefreshController === controller) {
      homeSupportRefreshController = null
    }
  })
}

async function fetchHomeData(): Promise<boolean> {
  abortHomeRequest()
  abortHomeSupportRefresh()
  isLoading.value = true
  isLoadingMore.value = false
  error.value = null
  failedHomeMediaUrls.value = new Set()
  homeScheduleHighlights.value = []
  homeCommunityHighlights.value = []
  pendingHomeSupportRefresh = createEmptyHomeSupportRefreshTargets()

  const controller = new AbortController()
  homeRequestController = controller

  try {
    const result = await homeService.loadHomepageBootstrap({
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted) return false

    applyHomeAggregate(result.payload, result.source)
    total.value = Math.max(total.value, result.payload.story_deck.total ?? 0)
    error.value = null

    const refreshTargets = resolveHomeSupportRefreshTargets(result.payload, result.source)
    if (hasPendingHomeSupportRefresh(refreshTargets)) {
      pendingHomeSupportRefresh = refreshTargets
      runHomeSupportRefresh()
    }
    schedulePublicHomePrewarm(result.payload)
    return true
  } catch {
    if (controller.signal.aborted) return false

    const fallbackPayload = await loadHomepageBootstrapFallback()
    applyHomeAggregate(fallbackPayload, 'fallback')
    total.value = Math.max(total.value, fallbackPayload.story_deck.total ?? 0)
    error.value = null
    schedulePublicHomePrewarm(fallbackPayload)
    return false
  } finally {
    if (homeRequestController === controller) {
      homeRequestController = null
    }
    isLoading.value = false
    scheduleSceneSetup()
  }
}

function resolveSceneTravelDistance(element: HTMLElement | null, pinnedSelector?: string): number {
  if (typeof window === 'undefined' || !element) return 1

  const pinnedElement = pinnedSelector ? element.querySelector<HTMLElement>(pinnedSelector) : null
  const pinnedBlockSize = pinnedElement?.offsetHeight ?? window.innerHeight

  return Math.max(element.offsetHeight - pinnedBlockSize, 1)
}

function resolveSceneProgress(element: HTMLElement | null, pinnedSelector?: string): number {
  if (typeof window === 'undefined' || !element) return 0
  const travel = resolveSceneTravelDistance(element, pinnedSelector)
  const distance = window.scrollY - element.offsetTop
  return clamp(distance / travel)
}

function buildSceneSnap(stepCount: number) {
  if (stepCount <= 1) return false

  return {
    snapTo: 1 / Math.max(stepCount - 1, 1),
    delay: 0.12,
    duration: { min: 0.16, max: 0.3 },
    ease: 'power1.inOut',
    directional: false,
    inertia: false,
  }
}

function syncSceneProgressFromViewport() {
  if (typeof window === 'undefined') return

  railProgress.value =
    featuredRailTrigger && railSlideCount.value > 1
      ? clamp(featuredRailTrigger.progress)
      : railSlideCount.value > 1
        ? resolveSceneProgress(resolveSectionElement(featuredSectionRef.value), '.rail-sticky')
        : clamp(railProgress.value)
  storyProgress.value =
    effectiveStoryCardCount.value > 1
      ? resolveSceneProgress(resolveSectionElement(storyDeckRef.value), '.story-stage')
      : clamp(storyProgress.value)
}

function cleanupScrollTrigger(trigger: ScrollTriggerInstance | null) {
  trigger?.animation?.kill()
  trigger?.kill()
}

async function ensureScrollTriggerReady(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (scrollTriggerModule && gsapModule) return true
  if (!scrollTriggerReadyPromise) {
    scrollTriggerReadyPromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(async ([gsapImport, scrollTriggerImport]) => {
        gsapModule = gsapImport.default
        scrollTriggerModule = scrollTriggerImport.ScrollTrigger
        gsapModule.registerPlugin(scrollTriggerModule)
        await ensureSmoothScrollTriggerBridge().catch(() => undefined)
        return true
      })
      .catch(() => false)
      .finally(() => {
        scrollTriggerReadyPromise = null
      })
  }
  return scrollTriggerReadyPromise
}

function scheduleHomeEnhancements(delay = 1800) {
  if (typeof window === 'undefined' || !scenesEnabled) return
  scheduleTask(
    async () => {
      if (!scenesEnabled) return
      bindSceneInteractions()
      bindSceneProgressTracking()

      if (!shouldUseHomeScrollScrubScenes()) {
        runAfterNextPaint(() => {
          scheduleSceneProgressUpdate()
          if (shouldUseHomeSectionBlendEffects()) {
            bindViewportSceneBlendTracking()
            scheduleViewportSceneBlendUpdate()
          }
        })
        return
      }

      const ready = await ensureScrollTriggerReady()
      if (!ready || !scenesEnabled) return
      observeSceneLayout()
      scheduleSceneSetup()
      runAfterNextPaint(() => {
        if (shouldUseHomeSectionBlendEffects()) {
          bindViewportSceneBlendTracking()
          scheduleViewportSceneBlendUpdate()
          window.dispatchEvent(new Event('scroll'))
        }
      })
    },
    { priority: 'background', delay }
  )
}

function setHomeSceneLifecycleEnabled(
  enabled: boolean,
  enhancementDelay = HOME_ENHANCEMENTS_DELAY_MS
) {
  scenesEnabled = enabled
  setRailNavbarLock(enabled && shouldUseHomeSectionBlendEffects())
  setHomeFooterBlend(enabled && shouldUseHomeSectionBlendEffects())

  if (!enabled) {
    unbindSceneInteractions()
    unbindSceneProgressTracking()
    unbindViewportSceneBlendTracking()
    disconnectSceneLayoutObserver()
    cleanupSceneTriggers()
    clearHeroEditorialRevealTimer()
    return
  }

  scheduleHomeEnhancements(enhancementDelay)
}

function clearSceneScrollTween() {
  return
}

function clearBubbleBurstReplayFrame() {
  if (typeof window === 'undefined' || bubbleBurstReplayFrame === null) return
  window.cancelAnimationFrame(bubbleBurstReplayFrame)
  bubbleBurstReplayFrame = null
}

function clearBubbleExitResetTimer() {
  if (bubbleExitResetTimer === null) return
  clearTimeout(bubbleExitResetTimer)
  bubbleExitResetTimer = null
}

function resetBubbleRevealState() {
  clearBubbleBurstReplayFrame()
  clearBubbleExitResetTimer()
  stopBubbleMotionLoop()
  bubbleRevealPhase.value = 'idle'
}

function startBubbleRetreat() {
  clearBubbleBurstReplayFrame()
  clearBubbleExitResetTimer()
  stopBubbleMotionLoop({ resetStyles: false })

  if (!shouldAnimate.value) {
    bubbleRevealPhase.value = 'idle'
    return
  }

  bubbleRevealPhase.value = 'exiting'
  bubbleExitResetTimer = window.setTimeout(() => {
    bubbleExitResetTimer = null
    bubbleRevealPhase.value = 'idle'
  }, BUBBLE_EXIT_DURATION_MS)
}

function clearViewportSceneFrame() {
  if (typeof window === 'undefined' || viewportSceneFrame === null) return
  window.cancelAnimationFrame(viewportSceneFrame)
  viewportSceneFrame = null
}

function setRailNavbarLock(locked: boolean) {
  if (typeof document === 'undefined') return
  if (locked) {
    document.documentElement.dataset.homeRailNavLock = 'true'
    return
  }
  delete document.documentElement.dataset.homeRailNavLock
}

function setHomeFooterBlend(enabled: boolean) {
  if (typeof document === 'undefined') return
  if (!enabled) {
    document.documentElement.style.removeProperty('--home-footer-opacity')
    document.documentElement.style.removeProperty('--home-footer-y')
    document.documentElement.style.removeProperty('--home-footer-scale')
    document.documentElement.style.removeProperty('--home-footer-marquee-opacity')
    document.documentElement.style.removeProperty('--home-footer-marquee-speed-progress')
    document.documentElement.style.removeProperty('--home-footer-marquee-play-state')
    return
  }

  document.documentElement.style.setProperty('--home-footer-opacity', '0.76')
  document.documentElement.style.setProperty('--home-footer-y', '1.75rem')
  document.documentElement.style.setProperty('--home-footer-scale', '0.986')
  document.documentElement.style.setProperty('--home-footer-marquee-opacity', '0.58')
  document.documentElement.style.setProperty('--home-footer-marquee-speed-progress', '0')
  document.documentElement.style.setProperty('--home-footer-marquee-play-state', 'running')
}

function setHomeFooterBlendProgress(progress: number) {
  if (typeof document === 'undefined') return
  const clamped = clamp(progress)
  document.documentElement.style.setProperty(
    '--home-footer-opacity',
    (0.76 + clamped * 0.24).toFixed(3)
  )
  document.documentElement.style.setProperty(
    '--home-footer-y',
    `${((1 - clamped) * 1.75).toFixed(3)}rem`
  )
  document.documentElement.style.setProperty(
    '--home-footer-scale',
    (0.986 + clamped * 0.014).toFixed(4)
  )
  document.documentElement.style.setProperty(
    '--home-footer-marquee-opacity',
    (0.58 + clamped * 0.42).toFixed(3)
  )
  document.documentElement.style.setProperty(
    '--home-footer-marquee-speed-progress',
    (clamped * 0.7).toFixed(3)
  )
  document.documentElement.style.setProperty('--home-footer-marquee-play-state', 'running')
}

function measureViewportBlend(
  element: HTMLElement | null,
  startRatio = 1.02,
  endRatio = 0.18
): number {
  if (typeof window === 'undefined' || !element) return 0
  const rect = element.getBoundingClientRect()
  const start = window.innerHeight * startRatio
  const end = window.innerHeight * endRatio
  if (Math.abs(start - end) < Number.EPSILON) return 0
  return clamp((start - rect.top) / (start - end))
}

function updateViewportSceneBlend() {
  if (typeof window === 'undefined') return

  if (isCompactHomeViewport()) {
    clearBubbleBurstReplayFrame()
    clearBubbleExitResetTimer()
    bubbleRevealPhase.value = bubbleItems.value.length > 0 ? 'revealed' : 'idle'
    viewportSceneBlend.value = {
      heroRail: 0,
      railPosts: 0,
      postsStory: 0,
      storyFooter: 0,
    }
    setRailNavbarLock(false)
    setHomeFooterBlend(false)
    return
  }

  syncSceneProgressFromViewport()

  const nextBlend = {
    heroRail: measureViewportBlend(resolveSectionElement(featuredSectionRef.value), 1.04, 0.16),
    railPosts: measureViewportBlend(resolveSectionElement(postsSectionRef.value), 1.04, 0.18),
    postsStory: measureViewportBlend(resolveSectionElement(storyDeckRef.value), 1.04, 0.18),
    storyFooter: measureViewportBlend(document.getElementById('home-footer'), 1.04, 0.24),
  }

  const footerBlendProgress = nextBlend.storyFooter > 0.04 ? nextBlend.storyFooter : 0
  const postsElement = resolveSectionElement(postsSectionRef.value)
  const featuredElement = resolveSectionElement(featuredSectionRef.value)
  const bubbleRevealWindow = resolveBubbleRevealWindow(
    postsElement?.getBoundingClientRect() ?? null,
    window.innerHeight,
    bubbleItems.value.length
  )
  const railLockBoundary =
    postsElement?.offsetTop ??
    (featuredElement?.offsetTop ?? 0) + (featuredElement?.offsetHeight ?? 0)
  const railLockActive = window.scrollY < Math.max(railLockBoundary - window.innerHeight * 0.08, 0)

  viewportSceneBlend.value = {
    ...nextBlend,
    storyFooter: footerBlendProgress,
  }

  if (bubbleRevealWindow.shouldReveal) {
    if (
      (bubbleRevealPhase.value === 'idle' || bubbleRevealPhase.value === 'exiting') &&
      bubbleBurstReplayFrame === null
    ) {
      if (shouldAnimate.value) {
        restartBubbleBurst()
      } else {
        bubbleRevealPhase.value = 'revealed'
      }
    }
  } else if (
    bubbleRevealWindow.shouldReset &&
    bubbleRevealPhase.value === 'revealed' &&
    bubbleBurstReplayFrame === null
  ) {
    startBubbleRetreat()
  }

  setRailNavbarLock(railLockActive)
  setHomeFooterBlendProgress(footerBlendProgress)
}

function scheduleViewportSceneBlendUpdate() {
  if (typeof window === 'undefined' || viewportSceneFrame !== null) return
  viewportSceneFrame = window.requestAnimationFrame(() => {
    viewportSceneFrame = null
    updateViewportSceneBlend()
  })
}

function clearSceneProgressFrame() {
  if (typeof window === 'undefined' || sceneProgressFrame === null) return
  window.cancelAnimationFrame(sceneProgressFrame)
  sceneProgressFrame = null
}

function scheduleSceneProgressUpdate() {
  if (typeof window === 'undefined' || sceneProgressFrame !== null) return
  sceneProgressFrame = window.requestAnimationFrame(() => {
    sceneProgressFrame = null
    syncSceneProgressFromViewport()
  })
}

function bindSceneProgressTracking() {
  if (typeof window === 'undefined' || sceneProgressTrackingBound) return
  sceneProgressTrackingBound = true
  window.addEventListener('scroll', scheduleSceneProgressUpdate, { passive: true })
  window.addEventListener('resize', scheduleSceneProgressUpdate)
  scheduleSceneProgressUpdate()
}

function unbindSceneProgressTracking() {
  if (typeof window === 'undefined' || !sceneProgressTrackingBound) return
  sceneProgressTrackingBound = false
  clearSceneProgressFrame()
  window.removeEventListener('scroll', scheduleSceneProgressUpdate)
  window.removeEventListener('resize', scheduleSceneProgressUpdate)
}

function bindViewportSceneBlendTracking() {
  if (typeof window === 'undefined' || viewportSceneTrackingBound) return
  viewportSceneTrackingBound = true
  window.addEventListener('scroll', scheduleViewportSceneBlendUpdate, { passive: true })
  window.addEventListener('resize', scheduleViewportSceneBlendUpdate)
  scheduleViewportSceneBlendUpdate()
}

function unbindViewportSceneBlendTracking() {
  if (typeof window === 'undefined' || !viewportSceneTrackingBound) return
  viewportSceneTrackingBound = false
  clearViewportSceneFrame()
  window.removeEventListener('scroll', scheduleViewportSceneBlendUpdate)
  window.removeEventListener('resize', scheduleViewportSceneBlendUpdate)
}

function restartBubbleBurst() {
  if (typeof window === 'undefined') return

  clearBubbleExitResetTimer()
  clearBubbleBurstReplayFrame()
  stopBubbleMotionLoop()
  bubbleRevealPhase.value = 'idle'

  if (bubbleItems.value.length === 0) return
  if (!shouldAnimate.value) {
    bubbleRevealPhase.value = 'revealed'
    return
  }

  bubbleRevealPhase.value = 'arming'
  bubbleBurstReplayFrame = window.requestAnimationFrame(() => {
    bubbleBurstReplayFrame = window.requestAnimationFrame(() => {
      bubbleRevealPhase.value = 'revealed'
      bubbleBurstReplayFrame = null
    })
  })
}

function runAfterNextPaint(callback: () => void) {
  if (typeof window === 'undefined') return
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback)
  })
}

function bindSceneInteractions() {
  clearSceneScrollTween()
}

function unbindSceneInteractions() {
  clearSceneScrollTween()
}

function cancelScheduledSceneSetup() {
  sceneSetupQueued = false
  if (typeof window === 'undefined' || sceneSetupFrame === null) return
  window.cancelAnimationFrame(sceneSetupFrame)
  sceneSetupFrame = null
}

function cleanupSceneTriggers(options: { preserveBubbleReveal?: boolean } = {}) {
  cancelScheduledSceneSetup()
  clearSceneScrollTween()
  if (!options.preserveBubbleReveal) {
    resetBubbleRevealState()
  }
  cleanupScrollTrigger(featuredRailTrigger)
  featuredRailTrigger = null
  cleanupScrollTrigger(storyDeckTrigger)
  storyDeckTrigger = null
}

function disconnectSceneLayoutObserver() {
  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null
  sceneObservedSizes = new WeakMap()
  scheduleSceneRefreshFromResize.cancel?.()
}

function observeSceneLayout() {
  if (typeof window === 'undefined') return

  disconnectSceneLayoutObserver()

  const trackedElements = [
    resolveSectionElement(featuredSectionRef.value),
    resolveSectionElement(postsSectionRef.value),
    resolveSectionElement(storyDeckRef.value),
  ].filter((element): element is HTMLElement => Boolean(element))

  if (trackedElements.length === 0) return

  sceneResizeObserver = createResizeObserver((entries) => {
    let shouldRefresh = false

    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue

      const nextSize = {
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }
      const previousSize = sceneObservedSizes.get(entry.target)

      sceneObservedSizes.set(entry.target, nextSize)

      if (
        previousSize &&
        (Math.abs(previousSize.width - nextSize.width) >= SCENE_LAYOUT_REFRESH_THRESHOLD_PX ||
          Math.abs(previousSize.height - nextSize.height) >= SCENE_LAYOUT_REFRESH_THRESHOLD_PX)
      ) {
        shouldRefresh = true
      }
    }

    if (shouldRefresh) {
      scheduleSceneRefreshFromResize()
    }
  })

  for (const element of trackedElements) {
    sceneObservedSizes.set(element, {
      width: Math.round(element.getBoundingClientRect().width),
      height: Math.round(element.getBoundingClientRect().height),
    })
    sceneResizeObserver.observe(element)
  }
}

async function setupSceneTriggers() {
  cleanupSceneTriggers({ preserveBubbleReveal: true })
  syncSceneProgressFromViewport()

  if (typeof window === 'undefined' || !scenesEnabled) return
  if (!shouldUseHomeScrollScrubScenes()) return

  const ready = await ensureScrollTriggerReady()
  if (!ready || !scrollTriggerModule || !scenesEnabled) return

  const featuredElement = resolveSectionElement(featuredSectionRef.value)
  if (featuredElement && railSlideCount.value > 1 && !isCompactHomeViewport()) {
    featuredRailTrigger = scrollTriggerModule.create({
      trigger: featuredElement,
      start: 'top top',
      end: () => `+=${resolveSceneTravelDistance(featuredElement, '.rail-sticky')}`,
      invalidateOnRefresh: true,
      scrub: 0.28,
      snap: buildSceneSnap(railSlideCount.value),
      onUpdate: (self) => {
        railProgress.value = self.progress
      },
      onRefresh: (self) => {
        railProgress.value = self.progress
      },
    })
  }

  const storyElement = resolveSectionElement(storyDeckRef.value)
  if (storyElement && effectiveStoryCardCount.value > 1) {
    storyDeckTrigger = scrollTriggerModule.create({
      trigger: storyElement,
      start: 'top top',
      end: () => `+=${resolveSceneTravelDistance(storyElement, '.story-stage')}`,
      invalidateOnRefresh: true,
      scrub: 0.4,
      snap: buildSceneSnap(effectiveStoryCardCount.value),
      onUpdate: (self) => {
        storyProgress.value = self.progress
      },
      onRefresh: (self) => {
        storyProgress.value = self.progress
      },
    })
  }

  if (shouldUseHomeSectionBlendEffects()) {
    scheduleViewportSceneBlendUpdate()
  }
}

function scheduleSceneSetup() {
  if (typeof window === 'undefined' || !scenesEnabled || sceneSetupQueued) return
  if (!shouldUseHomeScrollScrubScenes()) {
    scheduleSceneProgressUpdate()
    return
  }
  sceneSetupQueued = true
  void nextTick(() => {
    if (typeof window === 'undefined' || !scenesEnabled) {
      sceneSetupQueued = false
      return
    }
    sceneSetupFrame = window.requestAnimationFrame(() => {
      sceneSetupFrame = null
      sceneSetupQueued = false
      if (!scenesEnabled) return
      setupSceneTriggers()
    })
  })
}

function getStoryCardStyle(index: number): Record<string, string> {
  return buildStoryCardMotion({
    index,
    storyProgressIndex: storyProgressIndex.value,
    storyCardCount: effectiveStoryCardCount.value,
    storyMergeProgress: storyMergeProgress.value,
    storyFooterFade: storyFooterFade.value,
  })
}

function goToExplore() {
  router.push('/explore')
}

function goToSchedule() {
  router.push('/schedule')
}

function scrollToFeatured() {
  scrollToHomeSection('home-rail')
}

function isHomeMediaFailed(source: string | null | undefined): boolean {
  const key = normalizeText(source)
  return key ? failedHomeMediaUrls.value.has(key) : false
}

function markHomeMediaFailed(source: string | null | undefined) {
  const key = normalizeText(source)
  if (!key || failedHomeMediaUrls.value.has(key)) return
  const next = new Set(failedHomeMediaUrls.value)
  next.add(key)
  failedHomeMediaUrls.value = next
}

function setHoveredBubble(bubbleId: string, source: 'pointer' | 'focus' = 'pointer') {
  const nextId = normalizeText(bubbleId)
  if (!nextId) return
  hoveredBubbleId.value = nextId
  hoveredBubbleSource.value = source
  syncBubbleMotionLoop()
}

function clearHoveredBubble(bubbleId?: string | null, source: 'pointer' | 'focus' | 'all' = 'all') {
  if (
    source !== 'all' &&
    hoveredBubbleSource.value !== null &&
    hoveredBubbleSource.value !== source
  ) {
    return
  }

  if (!bubbleId) {
    hoveredBubbleId.value = null
    hoveredBubbleSource.value = null
    syncBubbleMotionLoop()
    return
  }

  const nextId = normalizeText(bubbleId)
  if (hoveredBubbleId.value === nextId) {
    hoveredBubbleId.value = null
    hoveredBubbleSource.value = null
    syncBubbleMotionLoop()
  }
}

function isBubblePersistentSelected(bubbleId: string): boolean {
  return selectedBubbleId.value === normalizeText(bubbleId)
}

function isBubbleHoverActive(bubbleId: string): boolean {
  const normalizedId = normalizeText(bubbleId)
  if (!normalizedId) return false
  return hoveredBubbleId.value === normalizedId
}

function bubbleStateClasses(bubbleId: string) {
  return {
    'is-hover-active': isBubbleHoverActive(bubbleId),
    'is-hovered': isBubbleHoverActive(bubbleId),
    'is-persistent-selected': isBubblePersistentSelected(bubbleId),
    'is-selected': isBubblePersistentSelected(bubbleId),
  }
}

function openPostPreview(post: PostListItem, thumbnailSrc: string | null) {
  if (isHomeFallbackPost(post)) {
    void router.push('/explore')
    return
  }

  const detailLink = resolvePreviewablePostLink(post.post_url, post.id)
  const resolvedPostId = resolvePostIdFromLink(detailLink) || post.id
  if (!resolvedPostId || !resolvePostIdFromLink(detailLink)) {
    void router.push(detailLink)
    return
  }

  previewPostId.value = resolvedPostId
  previewPost.value = { ...post, id: resolvedPostId }
  previewThumbnailSrc.value = thumbnailSrc
  setHoveredBubble(resolvedPostId, pointerInsideBubbleStage.value ? 'pointer' : 'focus')
  isPreviewOpen.value = true
}

function openDetailFromPreview(postId: string) {
  if (isHomeFallbackPost({ id: postId })) {
    isPreviewOpen.value = false
    void router.push('/explore')
    return
  }
  const detailPostId = getContractResourceId(postId)
  if (!detailPostId) {
    isPreviewOpen.value = false
    void router.push('/explore')
    return
  }
  const previewSummary =
    previewPost.value && previewPost.value.id === postId ? [previewPost.value] : []
  const navigationContextPosts =
    previewSummary.length > 0
      ? [...previewSummary, ...homeSourcePosts.value.filter((item) => item.id !== postId)]
      : homeSourcePosts.value
  storePostNavigationContext(navigationContextPosts, postId, 'home')
  cachePostThumbnailPreview(postId, previewThumbnailSrc.value)
  isPreviewOpen.value = false
  router.push(`/post/${detailPostId}`)
}

watch(
  [
    railSlideCount,
    () => storyCardCount.value,
    () => bubbleItems.value.map((bubble) => bubble.id).join('|'),
    shouldAnimate,
  ],
  () => {
    syncBubbleRevealLifecycle()
    if (bubbleEnhancementsPrimed) {
      void nextTick(() => {
        scheduleBubbleMotionMeasurement()
      })
    }
    if (!scenesEnabled) return
    scheduleSceneSetup()
  },
  { immediate: true }
)

watch(
  [
    bubbleRevealPhase,
    bubbleLayoutTier,
    shouldAnimate,
    () => bubbleItems.value.map((bubble) => bubble.id).join('|'),
  ],
  () => {
    if (!bubbleEnhancementsPrimed) return
    void nextTick(() => {
      scheduleBubbleMotionMeasurement()
    })
  }
)

onMounted(() => {
  homeEnhancementsDisposed = false
  void fetchHomeData()
  observeHomeSections()
  scheduleTask(
    () => {
      if (homeEnhancementsDisposed) return
      void nextTick(() => {
        if (homeEnhancementsDisposed) return
        observeDeferredHomeEnhancements()
      })
    },
    { priority: 'background', delay: HOME_SCENE_ACTIVATION_DELAY_MS }
  )
})

onBeforeUnmount(() => {
  homeEnhancementsDisposed = true
  setHomeSceneLifecycleEnabled(false)
  abortHomeRequest()
  cancelPublicHomePrewarm()
  abortHomeSupportRefresh()
  setRailNavbarLock(false)
  disconnectHomeSectionObserver()
  disconnectDeferredHomeEnhancementObserver()
  unbindDeferredHomeSceneIntent()
  disconnectBubbleStageLayoutObserver()
  clearBubbleMotionMeasureFrame()
  stopBubbleMotionLoop()
  stopBubbleCanvasScene()
  bubbleElementMap.clear()
  bubbleAnchorMetricsMap.clear()
})
</script>

<style scoped src="../styles/page-systems/home-page-view.css"></style>
