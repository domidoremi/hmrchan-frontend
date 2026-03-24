<template>
  <div class="home-page" :style="homePageMotionStyle">
    <HomeQuickNav
      :anchors="homeQuickNavAnchors"
      :active-id="activeHomeSectionId"
      @navigate="scrollToHomeSection"
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
            <div
              class="hero-editorial glass-card"
              :class="{ 'hero-editorial--loaded': heroEditorialVisible }"
              :style="noGlassBackdropStyle"
            >
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

            <div
              v-if="showPreviewNotice"
              class="hero-preview glass-card"
              :style="noGlassBackdropStyle"
            >
              <span class="hero-preview__label">{{ $t('home.preview.label') }}</span>
              <p>{{ $t('home.preview.desc') }}</p>
              <span v-if="error" class="hero-preview__detail">{{ error }}</span>
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
              <div
                v-for="item in heroStats"
                :key="item.key"
                class="hero-stat glass-card"
                :style="noGlassBackdropStyle"
              >
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
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
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
                    :loading="resolveFeaturedRailImageLoading(index)"
                    decoding="async"
                    :fetchpriority="resolveFeaturedRailFetchPriority(index)"
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
                    <span class="trends-authors-highlight__label">
                      {{ $t('home.hero.spotlightLabel') }}
                    </span>
                    <strong class="trends-authors-highlight__title">
                      {{ leadingTrendingAuthor.name }}
                    </strong>
                    <span class="trends-authors-highlight__meta">
                      {{ $t('home.trends.authorCount', { n: leadingTrendingAuthor.count }) }}
                    </span>
                  </span>
                  <span class="trends-authors-highlight__action">
                    {{ $t('home.trends.authorsAction') }}
                  </span>
                </RouterLink>
                <div class="trends-list">
                  <RouterLink
                    v-for="author in trendingAuthors"
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
      :revealed="hasTriggeredBubbleBurst"
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
        <div class="bubble-stage">
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
              v-for="(bubble, index) in bubbleItems"
              :key="`bubble-${bubble.post.id}-${index}`"
              type="button"
              class="latest-bubble glass-card"
              :style="[noGlassBackdropStyle, bubble.style]"
              @click="openPostPreview(bubble.post, bubble.thumbnail)"
            >
              <span class="latest-bubble__inner">
                <span class="latest-bubble__text">{{ bubble.text }}</span>
                <span class="latest-bubble__meta">
                  <span class="latest-bubble__author">{{ bubble.author }}</span>
                  <span v-if="bubble.time" class="latest-bubble__time">{{ bubble.time }}</span>
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
              <div class="media-slice__visual">
                <PostCard
                  :post="card.post"
                  :show-content="false"
                  :style="noGlassBackdropStyle"
                  @click="(_id, thumb) => openPostPreview(card.post, thumb)"
                />
              </div>
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
                    class="media-slice__button"
                    @click="openPostPreview(card.post, card.thumbnail)"
                  >
                    <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
                    {{ $t('home.featured.action') }}
                  </Button>
                  <RouterLink :to="card.detailLink" class="page-inline-cta media-slice__link">
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
import { ArrowUpRight, Compass, Image, Sparkles } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import {
  homeService,
  type HomeAggregateResponse,
  type HomeCommunityHighlight,
  type HomeScheduleHighlight,
  type PostListItem,
} from '@/api'
import { prefersReducedMotion, throttleRAF } from '@/utils/performance'
import { getThumbnailSrcset } from '@/utils/mediaOptimizer'
import { isFilteredAuthor } from '@/config/filters'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { HOME_FALLBACK_POSTS, isHomeFallbackPost } from '@/fallbacks/homepageFallback'
import { buildHomepageBootstrapFallback } from '@/fallbacks/homepageBootstrapFallback'
import {
  buildHomePostsFromAggregate,
  clamp,
  formatHomeAuthorName,
  formatCommunityHighlightMeta as formatCommunityHighlightMetaValue,
  formatScheduleHighlightMeta as formatScheduleHighlightMetaValue,
  normalizeText,
  resolvePostIdFromLink,
  resolvePostLink,
} from '@/views/homepage/homeModel'
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
import { scrollWithSmoothScroll } from '@/composables/useSmoothScroll'

type GsapModule = typeof import('gsap')
type ScrollTriggerModule = typeof import('gsap/ScrollTrigger')
type ScrollTriggerInstance = InstanceType<ScrollTriggerModule['ScrollTrigger']>

let gsapModule: GsapModule['default'] | null = null
let scrollTriggerModule: ScrollTriggerModule['ScrollTrigger'] | null = null
let scrollTriggerReadyPromise: Promise<boolean> | null = null

const SCENE_LAYOUT_REFRESH_THRESHOLD_PX = 24
const PORTAL_LEAD_IMAGE_SIZE = Object.freeze({ width: 1600, height: 1000 })
const PORTAL_LEAD_IMAGE_SIZES = '(min-width: 1280px) 34rem, (min-width: 768px) 92vw, 100vw'

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
const initialHomeAggregate = buildHomepageBootstrapFallback()
const initialHomePosts = buildHomePostsFromAggregate(initialHomeAggregate, t).filter(
  (post) => !isFilteredAuthor(post.author_name)
)

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
const shouldMountHomepagePreviewController = computed(
  () => isPreviewOpen.value || Boolean(previewPostId.value)
)

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
const homeDataSource = ref<'idle' | 'aggregate' | 'support' | 'fallback'>('idle')
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
const featuredSectionRef = useTemplateRef<HomeSectionInstance>('featuredSectionRef')
const storyDeckRef = useTemplateRef<HomeSectionInstance>('storyDeckRef')
const homeQuickNavAnchors = homeSectionAnchors
const activeHomeSectionId = ref<HomeSectionAnchor['id']>(homeSectionAnchors[0]?.id ?? 'home-fold')
let homeSectionObserver: IntersectionObserver | null = null

const railProgress = ref(0)
const storyProgress = ref(0)
const bubbleRevealPhase = ref<'idle' | 'arming' | 'revealed'>('idle')
const hasTriggeredBubbleBurst = computed(() => bubbleRevealPhase.value === 'revealed')
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
  showPreviewNotice,
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
  error,
  total,
  homeScheduleHighlights,
  homeCommunityHighlights,
  shouldAnimate,
  translate: t,
  locale,
})

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

function resolveFeaturedRailImageLoading(index: number): 'eager' | 'lazy' {
  return index === 0 ? 'eager' : 'lazy'
}

function resolveFeaturedRailFetchPriority(index: number): 'high' | 'auto' {
  return index === 0 ? 'high' : 'auto'
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

let storyDeckTrigger: ScrollTriggerInstance | null = null
let featuredRailTrigger: ScrollTriggerInstance | null = null
let sceneSetupFrame: number | null = null
let sceneSetupQueued = false
let scenesEnabled = false
let sceneResizeObserver: ResizeObserver | null = null
let sceneObservedSizes = new WeakMap<HTMLElement, { width: number; height: number }>()
const scheduleSceneRefreshFromResize = throttleRAF(() => {
  scheduleSceneSetup()
})
let bubbleBurstReplayFrame: number | null = null
let viewportSceneFrame: number | null = null
let viewportSceneTrackingBound = false

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

const railTrackStyle = computed(() => ({
  transform: `translate3d(-${
    clamp(railProgress.value) *
    ((Math.max(railSlideCount.value, 1) - 1) * (100 / Math.max(railSlideCount.value, 1)))
  }%, 0, 0)`,
}))

const storySceneStyle = computed(() => ({
  '--story-card-count': String(Math.max(effectiveStoryCardCount.value, 1)),
  '--story-progress': String(storyProgress.value),
  '--story-footer-fade': String(storyFooterFade.value),
}))

function isCompactHomeViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 768
}

const homePageMotionStyle = computed<Record<string, string>>(() => {
  if (isCompactHomeViewport()) {
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
    '--home-hero-opacity': String(clamp(1 - heroExit * 0.08, 0.92, 1)),
    '--home-hero-scale': String(clamp(1 - heroExit * 0.012, 0.988, 1)),
    '--home-hero-y': `${(-1.1 * heroExit).toFixed(4)}rem`,
    '--home-hero-blur': `${(heroExit * 0.12).toFixed(4)}rem`,
    '--home-rail-opacity': String(clamp(0.9 + railEnter * 0.1 - railExit * 0.06, 0.88, 1)),
    '--home-rail-scale': String(clamp(0.985 + railEnter * 0.015 - railExit * 0.01, 0.97, 1)),
    '--home-rail-y': `${((1 - railEnter) * 1.3 - railExit * 0.45).toFixed(4)}rem`,
    '--home-rail-blur': `${((1 - railEnter) * 0.14 + railExit * 0.08).toFixed(4)}rem`,
    '--home-posts-opacity': String(clamp(0.9 + postsEnter * 0.1 - postsExit * 0.06, 0.88, 1)),
    '--home-posts-scale': String(clamp(0.985 + postsEnter * 0.015 - postsExit * 0.01, 0.97, 1)),
    '--home-posts-y': `${((1 - postsEnter) * 1.25 - postsExit * 0.45).toFixed(4)}rem`,
    '--home-posts-blur': `${((1 - postsEnter) * 0.14 + postsExit * 0.08).toFixed(4)}rem`,
    '--home-story-opacity': String(clamp(0.92 + storyEnter * 0.08 - storyOutro * 0.08, 0.86, 1)),
    '--home-story-scale': String(clamp(0.988 + storyEnter * 0.012 - storyOutro * 0.01, 0.97, 1)),
    '--home-story-y': `${((1 - storyEnter) * 1.15 - storyOutro * 0.4).toFixed(4)}rem`,
    '--home-story-blur': `${((1 - storyEnter) * 0.12 + storyOutro * 0.08).toFixed(4)}rem`,
  }
})

watchSyncEffect(() => {
  // 确保全量加载和分页加载状态不会并存，减少 UI 状态抖动。
  if (isLoading.value && isLoadingMore.value) {
    isLoadingMore.value = false
  }
})

onActivated(() => {
  setHomeSceneLifecycleEnabled(true)
  observeHomeSections()
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
  abortHomeSupportRefresh()
  setRailNavbarLock(false)
  disconnectHomeSectionObserver()
})
let homeRequestController: AbortController | null = null

function abortHomeRequest() {
  homeRequestController?.abort()
  homeRequestController = null
}

function applyHomeAggregate(
  payload: HomeAggregateResponse,
  source: 'aggregate' | 'support' | 'fallback'
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
  source: 'aggregate' | 'support' | 'fallback'
): HomeSupportRefreshTargets {
  if (source === 'support' || source === 'fallback') {
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
    error.value =
      result.source === 'fallback' ? (result.reason ?? t('error.serviceUnavailable')) : null

    const refreshTargets = resolveHomeSupportRefreshTargets(result.payload, result.source)
    if (hasPendingHomeSupportRefresh(refreshTargets)) {
      pendingHomeSupportRefresh = refreshTargets
      runHomeSupportRefresh()
    }
    return true
  } catch (err) {
    if (controller.signal.aborted) return false

    const fallbackPayload = buildHomepageBootstrapFallback()
    applyHomeAggregate(fallbackPayload, 'fallback')
    total.value = Math.max(
      total.value,
      fallbackPayload.story_deck.total ?? HOME_FALLBACK_POSTS.length
    )
    error.value = err instanceof Error ? err.message : t('common.error')
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
    delay: 0.04,
    duration: { min: 0.12, max: 0.24 },
    ease: 'power2.out',
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
      .then(([gsapImport, scrollTriggerImport]) => {
        gsapModule = gsapImport.default
        scrollTriggerModule = scrollTriggerImport.ScrollTrigger
        gsapModule.registerPlugin(scrollTriggerModule)
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
      const ready = await ensureScrollTriggerReady()
      if (!ready || !scenesEnabled) return
      bindSceneInteractions()
      bindViewportSceneBlendTracking()
      observeSceneLayout()
      scheduleSceneSetup()
      runAfterNextPaint(() => {
        scheduleViewportSceneBlendUpdate()
        window.dispatchEvent(new Event('scroll'))
      })
    },
    { priority: 'background', delay }
  )
}

function setHomeSceneLifecycleEnabled(enabled: boolean) {
  scenesEnabled = enabled
  setRailNavbarLock(enabled)
  setHomeFooterBlend(enabled)

  if (!enabled) {
    unbindSceneInteractions()
    unbindViewportSceneBlendTracking()
    disconnectSceneLayoutObserver()
    cleanupSceneTriggers()
    clearHeroEditorialRevealTimer()
    return
  }

  scheduleHomeEnhancements()
}

function clearSceneScrollTween() {
  return
}

function clearBubbleBurstReplayFrame() {
  if (typeof window === 'undefined' || bubbleBurstReplayFrame === null) return
  window.cancelAnimationFrame(bubbleBurstReplayFrame)
  bubbleBurstReplayFrame = null
}

function resetBubbleRevealState() {
  clearBubbleBurstReplayFrame()
  bubbleRevealPhase.value = 'idle'
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
    resetBubbleRevealState()
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
    if (bubbleRevealPhase.value === 'idle' && bubbleBurstReplayFrame === null) {
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
    resetBubbleRevealState()
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

  resetBubbleRevealState()

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

  scheduleViewportSceneBlendUpdate()
}

function scheduleSceneSetup() {
  if (typeof window === 'undefined' || !scenesEnabled || sceneSetupQueued) return
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

function openPostPreview(post: PostListItem, thumbnailSrc: string | null) {
  if (isHomeFallbackPost(post)) {
    void router.push('/explore')
    return
  }

  const detailLink = resolvePostLink(post.post_url, post.id)
  const resolvedPostId = resolvePostIdFromLink(detailLink) || post.id
  if (!resolvePostIdFromLink(detailLink) && detailLink !== `/post/${post.id}`) {
    void router.push(detailLink)
    return
  }

  previewPostId.value = resolvedPostId
  previewPost.value = { ...post, id: resolvedPostId }
  previewThumbnailSrc.value = thumbnailSrc
  isPreviewOpen.value = true
}

function openDetailFromPreview(postId: string) {
  if (isHomeFallbackPost({ id: postId })) {
    isPreviewOpen.value = false
    void router.push('/explore')
    return
  }
  storePostNavigationContext(homeSourcePosts.value, postId, 'home')
  cachePostThumbnailPreview(postId, previewThumbnailSrc.value)
  isPreviewOpen.value = false
  router.push(`/post/${postId}`)
}

watch(
  [railSlideCount, () => storyCardCount.value, () => bubbleItems.value.length, shouldAnimate],
  () => {
    resetBubbleRevealState()
    if (!scenesEnabled) return
    scheduleSceneSetup()
  }
)

onMounted(() => {
  setHomeSceneLifecycleEnabled(true)
  observeHomeSections()
  void fetchHomeData()
})

onBeforeUnmount(() => {
  setHomeSceneLifecycleEnabled(false)
  abortHomeRequest()
  abortHomeSupportRefresh()
  setRailNavbarLock(false)
  disconnectHomeSectionObserver()
})
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: var(--home-safe-block-size);
  --home-navbar-stable-height: max(
    var(--navbar-height, 4rem),
    var(--navbar-visible-height, var(--navbar-height, 4rem))
  );
  --home-safe-block-size: calc(100dvh - var(--home-navbar-stable-height));
  --home-safe-block-size-mobile: calc(
    100dvh - var(--home-navbar-stable-height) - env(safe-area-inset-bottom, 0rem)
  );
  --home-stage-safe-top: calc(var(--home-navbar-stable-height) + clamp(0.35rem, 1.2vw, 0.9rem));
  --home-stage-safe-bottom: clamp(1.5rem, 4vw, 2.75rem);
  --home-stage-chrome-height: clamp(2.25rem, 3.2vw, 2.85rem);
  --home-rail-scroll-travel: clamp(10rem, 20dvh, 14rem);
  --home-story-scroll-travel: clamp(11rem, 24dvh, 16rem);
  --home-stage-max-inline: min(100%, 90rem);
  --home-hero-max-inline: min(100%, 66rem);
  --home-hero-copy-max-inline: 38rem;
  --home-hero-aside-max-inline: 28rem;
  --home-feed-max-inline: min(100%, 90rem);
  --home-story-stage-max-inline: min(100%, 90rem);
  --home-story-card-max-inline: 72rem;
  --home-story-copy-max-inline: 27rem;
  --home-story-visual-max-inline: 31rem;
  --home-story-merge-max-inline: 74rem;
  --home-bubble-spread-inline: 1;
  --home-bubble-spread-block: 0.72;
  --home-bubble-max-inline: 18.5rem;
  --home-bubble-inner-max-inline: 15rem;
  --home-blush-rgb: 246, 218, 229;
  --home-mist-rgb: 199, 220, 244;
  --home-lilac-rgb: 219, 211, 245;
  --home-ink: #1f2b44;
  --home-shell-radius: var(--ui-radius-card, var(--radius-2xl));
  --home-card-radius: var(--ui-radius-input, var(--radius-xl));
  --home-chip-radius: var(--ui-radius-button, var(--radius-full));
  --home-section-bg:
    radial-gradient(circle at top left, rgba(var(--home-mist-rgb), 0.42) 0%, transparent 34%),
    radial-gradient(circle at top right, rgba(var(--home-blush-rgb), 0.34) 0%, transparent 28%),
    radial-gradient(circle at 50% 18%, rgba(var(--home-lilac-rgb), 0.24) 0%, transparent 24%),
    linear-gradient(
      180deg,
      rgba(250, 247, 243, 0.98) 0%,
      rgba(245, 246, 251, 0.96) 52%,
      #f6f4f1 100%
    );
  --home-card-shadow: 0 1.25rem 3.5rem -2.25rem rgba(83, 103, 144, 0.35);
  --home-soft-border: rgba(255, 255, 255, 0.7);
  --home-pill-bg: rgba(255, 255, 255, 0.72);
  --home-pill-border: rgba(148, 163, 184, 0.16);
  --home-tag-hover: rgba(255, 255, 255, 0.9);
  --home-accent: #6a88b8;
  --home-accent-soft: #d792aa;
  --home-panel-bg: linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.84));
  --home-panel-bg-soft: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.9),
    rgba(255, 255, 255, 0.74)
  );
  --home-panel-bg-strong: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.98),
    rgba(247, 248, 251, 0.94)
  );
  --home-panel-muted: rgba(255, 255, 255, 0.74);
  --home-panel-muted-strong: rgba(255, 255, 255, 0.86);
  --home-panel-border: rgba(193, 216, 239, 0.56);
  --home-panel-border-strong: rgba(193, 216, 239, 0.82);
  --home-panel-highlight: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.44);
  --home-panel-shadow: 0 1.5rem 3.8rem -2.4rem rgba(35, 53, 85, 0.26);
  --home-panel-shadow-strong: 0 2.5rem 5rem -2.8rem rgba(35, 53, 85, 0.34);
  --home-preview-bg:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.42);
  --home-preview-empty-bg: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.92),
    rgba(245, 248, 252, 0.8)
  );
  --home-preview-border: rgba(255, 255, 255, 0.56);
  --home-preview-overlay: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.72) 100%);
  --home-preview-overlay-ink: rgba(255, 255, 255, 0.94);
  --home-preview-shadow: 0 1rem 2.5rem -1.8rem rgba(15, 23, 42, 0.26);
  --home-community-rgb: 14, 165, 164;
  --home-stage-chip-bg: rgba(255, 255, 255, 0.58);
  --home-stage-chip-border: rgba(255, 255, 255, 0.42);
  --home-stage-backdrop: blur(0rem);
  --home-story-card-bg: linear-gradient(
    150deg,
    rgba(255, 255, 255, 0.99),
    rgba(245, 249, 255, 0.98)
  );
  --home-story-card-border: rgba(193, 216, 239, 0.86);
  --home-story-card-shadow: 0 3.2rem 5.6rem -3rem rgba(59, 78, 112, 0.34);
  --home-story-visual-bg: linear-gradient(
    160deg,
    rgba(248, 251, 255, 0.98),
    rgba(243, 247, 254, 0.92)
  );
  --home-story-stage-bg:
    radial-gradient(circle at 18% 18%, rgba(var(--home-mist-rgb), 0.18) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(var(--home-blush-rgb), 0.16) 0%, transparent 38%),
    linear-gradient(180deg, rgba(248, 247, 244, 0.64) 0%, rgba(248, 247, 244, 0.88) 100%);
  --home-story-stage-footer-bg:
    radial-gradient(circle at 18% 18%, rgba(var(--home-mist-rgb), 0.12) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(var(--home-blush-rgb), 0.12) 0%, transparent 38%),
    linear-gradient(180deg, rgba(246, 244, 241, 0) 0%, rgba(248, 247, 244, 0.66) 100%);
  --home-screen-transition-ms: 640ms;
}

.home-page .home-screen {
  position: relative;
  scroll-margin-top: calc(var(--navbar-visible-height, var(--navbar-height, 4rem)) + 1rem);
}

.home-page .app-footer-shell--home {
  position: relative;
  min-block-size: min(36rem, 100dvh);
  padding-block-start: clamp(1.5rem, 4vw, 3rem);
  background: var(--home-story-stage-footer-bg);
}

.home-page .app-footer-shell--home::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--home-story-stage-footer-bg);
  pointer-events: none;
}

.home-page .app-footer-shell--home > * {
  position: relative;
  z-index: 1;
}

:global(#app[data-theme='dark'] .home-page),
:global([data-theme='dark'] .home-page) {
  --home-section-bg:
    radial-gradient(circle at top left, rgba(var(--home-mist-rgb), 0.08) 0%, transparent 30%),
    radial-gradient(circle at top right, rgba(var(--home-blush-rgb), 0.08) 0%, transparent 24%),
    linear-gradient(180deg, rgba(8, 10, 18, 0.98) 0%, rgba(10, 13, 23, 0.96) 56%, #070910 100%);
  --home-card-shadow: 0 1.5rem 4rem -2rem rgba(0, 0, 0, 0.6);
  --home-soft-border: rgba(255, 255, 255, 0.08);
  --home-pill-bg: rgba(15, 20, 31, 0.76);
  --home-pill-border: rgba(255, 255, 255, 0.08);
  --home-tag-hover: rgba(18, 24, 38, 0.92);
  --home-ink: #f8fafc;
  --home-panel-bg: linear-gradient(160deg, rgba(12, 16, 23, 0.96), rgba(18, 24, 36, 0.88));
  --home-panel-bg-soft: linear-gradient(160deg, rgba(12, 16, 23, 0.88), rgba(18, 24, 36, 0.78));
  --home-panel-bg-strong: linear-gradient(150deg, rgba(13, 19, 28, 0.98), rgba(16, 24, 36, 0.94));
  --home-panel-muted: rgba(18, 24, 36, 0.84);
  --home-panel-muted-strong: rgba(18, 24, 36, 0.92);
  --home-panel-border: rgba(148, 163, 184, 0.14);
  --home-panel-border-strong: rgba(148, 163, 184, 0.24);
  --home-panel-highlight: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.04);
  --home-panel-shadow: 0 1.9rem 4.4rem -2.6rem rgba(0, 0, 0, 0.52);
  --home-panel-shadow-strong: 0 2.8rem 6rem -3rem rgba(0, 0, 0, 0.62);
  --home-preview-bg:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(15, 20, 31, 0.76);
  --home-preview-empty-bg: linear-gradient(155deg, rgba(14, 20, 31, 0.96), rgba(18, 24, 36, 0.84));
  --home-preview-border: rgba(148, 163, 184, 0.2);
  --home-preview-overlay: linear-gradient(180deg, transparent 0%, rgba(2, 6, 23, 0.84) 100%);
  --home-preview-overlay-ink: rgba(248, 250, 252, 0.94);
  --home-preview-shadow: 0 1.4rem 3rem -2rem rgba(0, 0, 0, 0.52);
  --home-community-rgb: 45, 212, 191;
  --home-stage-chip-bg: rgba(15, 21, 32, 0.82);
  --home-stage-chip-border: rgba(255, 255, 255, 0.08);
  --home-stage-backdrop: blur(0rem);
  --home-story-card-bg: linear-gradient(148deg, rgba(12, 18, 28, 0.98), rgba(18, 24, 36, 0.94));
  --home-story-card-border: rgba(148, 163, 184, 0.26);
  --home-story-card-shadow: 0 3.3rem 5.9rem -3rem rgba(0, 0, 0, 0.72);
  --home-story-visual-bg: linear-gradient(160deg, rgba(16, 22, 34, 0.94), rgba(18, 24, 36, 0.86));
  --home-story-stage-bg:
    radial-gradient(circle at 18% 18%, rgba(var(--home-mist-rgb), 0.08) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(var(--home-blush-rgb), 0.08) 0%, transparent 38%),
    linear-gradient(180deg, rgba(8, 12, 18, 0.72) 0%, rgba(8, 12, 18, 0.94) 100%);
  --home-story-stage-footer-bg:
    radial-gradient(circle at 18% 18%, rgba(var(--home-mist-rgb), 0.06) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(var(--home-blush-rgb), 0.06) 0%, transparent 38%),
    linear-gradient(180deg, rgba(7, 10, 16, 0) 0%, rgba(8, 12, 18, 0.82) 100%);
}

:global(#app[data-theme='blue'] .home-page),
:global([data-theme='blue'] .home-page) {
  --home-section-bg:
    radial-gradient(circle at top left, rgba(147, 197, 253, 0.34) 0%, transparent 34%),
    radial-gradient(circle at top right, rgba(129, 140, 248, 0.24) 0%, transparent 28%),
    radial-gradient(circle at 50% 18%, rgba(186, 230, 253, 0.32) 0%, transparent 26%),
    linear-gradient(
      180deg,
      rgba(240, 249, 255, 0.98) 0%,
      rgba(239, 246, 255, 0.96) 52%,
      #eff6ff 100%
    );
  --home-ink: #0f172a;
  --home-accent: #2563eb;
  --home-accent-soft: #6366f1;
  --home-pill-bg: rgba(255, 255, 255, 0.82);
  --home-pill-border: rgba(59, 130, 246, 0.12);
  --home-tag-hover: rgba(255, 255, 255, 0.96);
  --home-panel-bg: linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(240, 249, 255, 0.92));
  --home-panel-bg-soft: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.94),
    rgba(224, 242, 254, 0.84)
  );
  --home-panel-bg-strong: linear-gradient(
    148deg,
    rgba(255, 255, 255, 0.99),
    rgba(224, 242, 254, 0.92)
  );
  --home-panel-muted: rgba(255, 255, 255, 0.82);
  --home-panel-muted-strong: rgba(255, 255, 255, 0.92);
  --home-panel-border: rgba(96, 165, 250, 0.18);
  --home-panel-border-strong: rgba(59, 130, 246, 0.3);
  --home-panel-highlight: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.6);
  --home-panel-shadow: 0 1.7rem 4rem -2.6rem rgba(37, 99, 235, 0.2);
  --home-panel-shadow-strong: 0 2.7rem 5.6rem -3rem rgba(37, 99, 235, 0.24);
  --home-preview-bg:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05)),
    rgba(255, 255, 255, 0.54);
  --home-preview-empty-bg: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.96),
    rgba(224, 242, 254, 0.82)
  );
  --home-preview-border: rgba(96, 165, 250, 0.24);
  --home-preview-overlay: linear-gradient(180deg, transparent 0%, rgba(30, 64, 175, 0.7) 100%);
  --home-preview-overlay-ink: rgba(255, 255, 255, 0.96);
  --home-preview-shadow: 0 1rem 2.5rem -1.6rem rgba(37, 99, 235, 0.24);
  --home-community-rgb: 14, 165, 233;
  --home-stage-chip-bg: rgba(255, 255, 255, 0.74);
  --home-stage-chip-border: rgba(59, 130, 246, 0.14);
  --home-stage-backdrop: blur(0rem);
  --home-story-card-bg: linear-gradient(
    148deg,
    rgba(255, 255, 255, 0.99),
    rgba(239, 246, 255, 0.96)
  );
  --home-story-card-border: rgba(96, 165, 250, 0.3);
  --home-story-card-shadow: 0 3.1rem 5.6rem -3rem rgba(37, 99, 235, 0.26);
  --home-story-visual-bg: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.94),
    rgba(224, 242, 254, 0.84)
  );
  --home-story-stage-bg:
    radial-gradient(circle at 18% 18%, rgba(147, 197, 253, 0.18) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(129, 140, 248, 0.12) 0%, transparent 38%),
    linear-gradient(180deg, rgba(239, 246, 255, 0.72) 0%, rgba(240, 249, 255, 0.92) 100%);
  --home-story-stage-footer-bg:
    radial-gradient(circle at 18% 18%, rgba(147, 197, 253, 0.12) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(129, 140, 248, 0.1) 0%, transparent 38%),
    linear-gradient(180deg, rgba(240, 249, 255, 0) 0%, rgba(239, 246, 255, 0.74) 100%);
}

:global(#app[data-ui-style='material'] .home-page),
:global([data-ui-style='material'] .home-page) {
  --home-shell-radius: var(--ui-radius-card, var(--radius-xl));
  --home-card-radius: var(--ui-radius-input, var(--radius-md));
  --home-chip-radius: var(--ui-radius-button, var(--radius-full));
  --home-stage-backdrop: blur(0rem);
  --home-panel-shadow: var(--shadow-md);
  --home-panel-shadow-strong: var(--shadow-lg);
  --home-panel-highlight: none;
  --home-story-card-shadow: var(--shadow-xl);
}

.home-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--home-section-bg);
  pointer-events: none;
  z-index: 0;
}

.home-page::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(
    circle at 50% 0%,
    rgba(var(--home-mist-rgb), 0.16) 0%,
    transparent 30%
  );
  pointer-events: none;
  z-index: 0;
  opacity: 0.28;
}

.home-screen {
  min-height: var(--home-safe-block-size);
  box-sizing: border-box;
}

.hero,
.rail-stage,
.posts--bubble > .container,
.story-stage {
  transform-origin: center center;
  backface-visibility: hidden;
  will-change: transform, opacity;
  transition: none;
}

.hero {
  opacity: var(--home-hero-opacity, 1);
  transform: translate3d(0, var(--home-hero-y, 0rem), 0) scale(var(--home-hero-scale, 1));
}

.rail-stage {
  opacity: var(--home-rail-opacity, 1);
  transform: translate3d(0, var(--home-rail-y, 0rem), 0) scale(var(--home-rail-scale, 1));
}

.posts--bubble > .container {
  opacity: var(--home-posts-opacity, 1);
  transform: translate3d(0, var(--home-posts-y, 0rem), 0) scale(var(--home-posts-scale, 1));
}

.story-stage {
  opacity: var(--home-story-opacity, 1);
  transform: translate3d(0, var(--home-story-y, 0rem), 0) scale(var(--home-story-scale, 1));
}

.home-page--transition-featured-hero .hero,
.home-page--transition-hero-featured .rail-stage,
.home-page--transition-posts-featured .rail-stage,
.home-page--transition-featured-posts .posts--bubble > .container,
.home-page--transition-story-posts .posts--bubble > .container,
.home-page--transition-posts-story .story-stage {
  opacity: 1;
  transform: translate3d(0, 0rem, 0) scale(1);
}

.home-page--transition-story-footer .story-stage {
  opacity: 0.94;
  transform: translate3d(0, -0.35rem, 0) scale(0.995);
}

.home-page--transition-hero-featured .hero {
  animation: homeScreenExitNorth var(--home-screen-transition-ms) cubic-bezier(0.2, 0.84, 0.24, 1)
    both;
}

.home-page--transition-hero-featured .rail-stage {
  animation: homeScreenEnterRise var(--home-screen-transition-ms) cubic-bezier(0.2, 0.9, 0.25, 1)
    both;
}

.home-page--transition-featured-hero .rail-stage {
  animation: homeScreenExitCompress var(--home-screen-transition-ms)
    cubic-bezier(0.2, 0.84, 0.24, 1) both;
}

.home-page--transition-featured-hero .hero {
  animation: homeScreenEnterRise var(--home-screen-transition-ms) cubic-bezier(0.2, 0.9, 0.25, 1)
    both;
}

.home-page--transition-featured-posts .rail-stage {
  animation: homeScreenExitNorth var(--home-screen-transition-ms) cubic-bezier(0.2, 0.84, 0.24, 1)
    both;
}

.home-page--transition-featured-posts .posts--bubble > .container {
  animation: homeScreenEnterBloom var(--home-screen-transition-ms) cubic-bezier(0.18, 0.9, 0.24, 1)
    both;
}

.home-page--transition-posts-featured .posts--bubble > .container {
  animation: homeScreenExitCompress var(--home-screen-transition-ms)
    cubic-bezier(0.2, 0.84, 0.24, 1) both;
}

.home-page--transition-posts-featured .rail-stage {
  animation: homeScreenEnterRise var(--home-screen-transition-ms) cubic-bezier(0.2, 0.9, 0.25, 1)
    both;
}

.home-page--transition-posts-story .posts--bubble > .container {
  animation: homeScreenExitCompress var(--home-screen-transition-ms)
    cubic-bezier(0.2, 0.84, 0.24, 1) both;
}

.home-page--transition-posts-story .story-stage {
  animation: homeScreenEnterRise var(--home-screen-transition-ms) cubic-bezier(0.2, 0.9, 0.25, 1)
    both;
}

.home-page--transition-story-posts .story-stage {
  animation: homeScreenExitCompress var(--home-screen-transition-ms)
    cubic-bezier(0.2, 0.84, 0.24, 1) both;
}

.home-page--transition-story-posts .posts--bubble > .container {
  animation: homeScreenEnterBloom var(--home-screen-transition-ms) cubic-bezier(0.18, 0.9, 0.24, 1)
    both;
}

.home-page--transition-story-footer .story-stage {
  animation: homeScreenExitSettle var(--home-screen-transition-ms) cubic-bezier(0.18, 0.82, 0.24, 1)
    both;
}

.portal-card.glass-card::before,
.portal-card.glass-card::after,
.hero-spotlight-card.glass-card::before,
.hero-spotlight-card.glass-card::after,
.featured-rail-card.glass-card::before,
.featured-rail-card.glass-card::after,
.trends-card.glass-card::before,
.trends-card.glass-card::after,
.bubble-empty.glass-card::before,
.bubble-empty.glass-card::after,
.media-slice__sticky.glass-card::after {
  display: none;
}

.home-fold {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  position: relative;
  z-index: 1;
}

.page-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(0.875rem, 1.8vw, 1.25rem);
  margin-bottom: clamp(0.9rem, 1.8vw, 1.2rem);
  min-inline-size: 0;
}

.page-section-copy {
  display: flex;
  flex: 1 1 min(100%, 32rem);
  flex-direction: column;
  gap: clamp(0.3rem, 0.8vw, 0.5rem);
  max-inline-size: min(100%, 36rem);
  min-inline-size: 0;
}

.page-section-head--stage .page-inline-cta {
  flex: 0 0 auto;
  align-self: flex-start;
}

.page-section-kicker {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.page-section-copy h2 {
  max-inline-size: 17ch;
  font-size: clamp(1.7rem, 2.25vw, 2.15rem);
  font-weight: var(--font-bold);
  line-height: 1.05;
  margin: 0;
  text-wrap: balance;
}

.page-section-copy p {
  display: -webkit-box;
  overflow: hidden;
  max-inline-size: 30ch;
  font-size: clamp(0.875rem, 0.96vw, 0.98rem);
  color: var(--color-text-secondary);
  line-height: 1.54;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.page-inline-cta {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.4rem;
  min-block-size: 2.125rem;
  max-inline-size: 100%;
  padding: 0.5rem 0.8rem;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--home-panel-muted) 88%, transparent);
  border: 0.0625rem solid color-mix(in srgb, var(--home-panel-border) 88%, transparent);
  box-shadow: none;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.25;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.page-inline-cta:hover {
  color: var(--color-text-primary);
  border-color: var(--home-panel-border-strong);
  background: var(--home-panel-muted-strong);
  box-shadow: none;
}

/* ========== Hero ========== */
.hero {
  position: relative;
  z-index: 1;
  min-height: var(--home-safe-block-size);
  padding-block: clamp(2rem, 6dvh, 4rem) calc(2rem + var(--home-stage-safe-bottom));
  display: flex;
  align-items: center;
}

.hero::before {
  content: '';
  position: absolute;
  inset: -10% auto auto -6%;
  width: clamp(14rem, 30vw, 24rem);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--home-blush-rgb), 0.24) 0%, transparent 72%);
  filter: blur(1rem);
  pointer-events: none;
}

.hero-layout {
  display: grid;
  justify-items: center;
  align-content: center;
  inline-size: 100%;
  max-inline-size: var(--home-stage-max-inline);
  min-block-size: calc(
    var(--home-safe-block-size) - clamp(4rem, 12dvh, 8rem) - var(--home-stage-safe-bottom)
  );
  padding-block: clamp(0.5rem, 1.6vw, 1.25rem);
}

.hero-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: clamp(1rem, 2.4vw, 1.5rem);
  align-items: center;
  inline-size: min(100%, var(--home-hero-max-inline));
  min-block-size: clamp(23rem, 48dvh, 29rem);
}

.hero-copy__left,
.hero-copy__right {
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.6vw, 1rem);
  min-inline-size: 0;
}

.hero-copy__left {
  max-inline-size: min(100%, var(--home-hero-copy-max-inline));
  align-items: flex-end;
  justify-content: center;
  text-align: end;
  padding-inline-end: clamp(0.35rem, 1vw, 0.75rem);
}

.hero-copy__right {
  inline-size: min(100%, var(--home-hero-aside-max-inline));
  justify-content: center;
}

.hero-copy__divider {
  align-self: stretch;
  width: 0.125rem;
  border-radius: var(--radius-full);
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--color-primary-rgb), 0.35) 40%,
    rgba(var(--color-primary-rgb), 0.2) 60%,
    transparent 100%
  );
  opacity: 0.6;
}

.hero-kicker {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--home-accent) 70%, var(--color-text-secondary));
}

.hero-title {
  font-size: clamp(2.25rem, 4vw + 0.75rem, 3.5rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--home-ink);
}

.hero-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 44ch;
  line-height: 1.6;
  margin-inline-start: auto;
}

.hero-editorial {
  position: relative;
  display: grid;
  align-content: start;
  inline-size: min(100%, 28rem);
  min-block-size: clamp(8.75rem, 18dvh, 10.5rem);
  padding: clamp(1rem, 1.8vw, 1.25rem);
  opacity: 0.72;
  transform: translate3d(0, 0.5rem, 0);
  border-color: var(--home-soft-border);
  background: var(--home-panel-bg-strong), var(--home-pill-bg);
  box-shadow: var(--home-card-shadow);
  overflow: clip;
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.hero-editorial::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(125deg, transparent 0%, rgba(255, 255, 255, 0.24) 46%, transparent 68%),
    radial-gradient(circle at top right, rgba(var(--home-mist-rgb), 0.12), transparent 42%);
  pointer-events: none;
  opacity: 0.72;
}

.hero-editorial--loaded {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-editorial__state {
  display: grid;
  grid-area: 1 / 1;
  align-content: start;
  gap: clamp(0.5rem, 1vw, 0.75rem);
  min-block-size: 100%;
  transition:
    opacity 320ms cubic-bezier(0.2, 0.84, 0.24, 1),
    transform 420ms cubic-bezier(0.2, 0.9, 0.25, 1);
}

.hero-editorial__state--loading {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-editorial__state--content {
  position: relative;
  inset: auto;
  opacity: 0;
  transform: translate3d(0, 0.5rem, 0);
  filter: blur(0.25rem);
}

.hero-editorial--loaded .hero-editorial__state--loading {
  opacity: 0;
  transform: translate3d(0, -0.5rem, 0);
  pointer-events: none;
}

.hero-editorial--loaded .hero-editorial__state--content {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  filter: blur(0rem);
}

.hero-editorial__kicker {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-editorial__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--home-accent) 0%, var(--home-accent-soft) 100%);
  box-shadow: 0 0 0.75rem rgba(215, 146, 170, 0.38);
}

.hero-editorial__title {
  font-size: var(--text-lg);
  line-height: 1.32;
  color: var(--color-text-primary);
}

.hero-editorial__text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.hero-editorial__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-editorial__author {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.hero-editorial__time {
  opacity: 0.84;
}

.hero-editorial__skeleton {
  display: block;
  inline-size: 100%;
  block-size: 0.875rem;
  border-radius: var(--radius-full);
}

.hero-editorial__skeleton--title {
  inline-size: 72%;
  block-size: 1.5rem;
}

.hero-editorial__skeleton--short {
  inline-size: 54%;
}

.hero-preview {
  display: grid;
  gap: 0.35rem;
  max-inline-size: min(28rem, 100%);
  padding: clamp(0.75rem, 1.6vw, 1rem);
  border-color: var(--home-preview-border);
  background: var(--home-preview-empty-bg), var(--home-pill-bg);
  box-shadow: var(--home-preview-shadow);
}

.hero-preview__label {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--home-accent) 74%, var(--color-text-secondary));
}

.hero-preview p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.hero-preview__detail {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

.hero-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.hero-tags__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.hero-tag {
  background: var(--home-pill-bg);
  border-color: var(--home-pill-border);
  text-decoration: none;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.hero-tag:hover {
  background: var(--home-tag-hover);
  border-color: var(--home-soft-border);
}

.hero-tags__empty {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: var(--spacing-3);
  min-height: 100%;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.hero-stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-stat__value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--home-ink);
}

.hero-stat__note {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.hero--animated .hero-copy__left {
  animation: heroSplitLeft 1.1s var(--ease-out) both;
}

.hero--animated .hero-copy__right {
  animation: heroSplitRight 1.1s var(--ease-out) both;
}

.hero--animated .hero-copy__divider {
  transform-origin: center;
  animation: heroSplitLine 1.1s var(--ease-out) both;
}

@keyframes heroSplitLeft {
  from {
    opacity: 0;
    transform: translateX(12%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes heroSplitRight {
  from {
    opacity: 0;
    transform: translateX(-12%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes heroSplitLine {
  from {
    opacity: 0;
    transform: scaleY(0.2);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

.hero-collage {
  position: relative;
  padding-bottom: var(--spacing-8);
}

.hero-collage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1.18fr) minmax(0, 1.18fr) minmax(0, 0.9fr);
  gap: var(--spacing-3);
  min-height: clamp(20rem, 46dvh, 30rem);
}

.hero-collage-card {
  position: relative;
  padding: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  overflow: hidden;
  border-color: var(--home-panel-border);
  box-shadow: var(--home-panel-shadow);
  background: var(--home-panel-bg), var(--home-pill-bg);
}

.hero-collage-card:focus-visible {
  outline: 0.125rem solid rgba(var(--color-primary-rgb), 0.7);
  outline-offset: 0.125rem;
}

.hero-collage-card:nth-child(1) {
  grid-column: 1;
  grid-row: 1 / span 2;
}

.hero-collage-card:nth-child(2) {
  grid-column: 2 / span 2;
  grid-row: 1;
}

.hero-collage-card:nth-child(3) {
  grid-column: 2;
  grid-row: 2;
}

.hero-collage-card:nth-child(4) {
  grid-column: 3;
  grid-row: 2;
}

.hero-collage-card:nth-child(5) {
  display: none;
}

.hero-collage-card--placeholder {
  border-radius: var(--home-card-radius);
}

.hero-collage-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-base);
}

.hero-collage-card:hover .hero-collage-image {
  transform: scale(1.015);
}

.hero-collage-placeholder {
  inline-size: 100%;
  block-size: 100%;
  display: grid;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--home-preview-empty-bg);
}

.hero-collage-card--textual {
  display: grid;
  align-content: end;
  padding: clamp(1rem, 1.8vw, 1.25rem);
  border: 0.0625rem solid var(--home-preview-border);
  box-shadow: var(--home-preview-shadow);
}

.hero-collage-card--textual .hero-collage-placeholder {
  display: none;
}

.hero-collage-card--textual .hero-collage-overlay {
  position: static;
  inset: auto;
  padding: 0;
  gap: 0.45rem;
  background: none;
  color: var(--home-ink);
}

.hero-collage-card--textual .hero-collage-title {
  font-size: clamp(1rem, 1.45vw, 1.2rem);
  line-height: 1.35;
}

.hero-collage-card--textual .hero-collage-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  opacity: 1;
}

.hero-collage-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.55) 100%);
  color: var(--color-text-inverse);
}

.hero-collage-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.hero-collage-meta {
  font-size: var(--text-xs);
  opacity: 0.85;
}

.portal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.4vw, 0.95rem);
  padding: clamp(0.875rem, 1.6vw, 1rem);
  min-block-size: 0;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
  overflow: clip;
}

.portal-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.portal-card--primary {
  flex-basis: 100%;
}

.portal-card__copy {
  display: grid;
  gap: clamp(0.625rem, 1.2vw, 0.875rem);
}

.portal-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.portal-card__stat {
  display: grid;
  gap: 0.2rem;
  padding: 0.6875rem 0.8125rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-pill-border);
  box-shadow: var(--home-panel-highlight);
}

.portal-card__stat strong {
  font-size: var(--text-base);
  line-height: 1;
  color: var(--home-ink);
}

.portal-card__stat small {
  font-size: var(--text-xs);
  line-height: 1.2;
  color: var(--color-text-tertiary);
}

.portal-card__icon {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: var(--home-card-radius);
  display: grid;
  place-items: center;
  background: var(--home-panel-muted);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight);
  color: var(--color-text-primary);
}

.portal-card__icon--primary {
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.portal-card__icon--authors {
  background: rgba(var(--color-warning-rgb), 0.12);
  color: var(--color-warning);
}

.portal-card__icon--schedule {
  background: rgba(var(--color-info-rgb), 0.12);
  color: var(--color-info);
}

.portal-card__icon--community {
  background: rgba(var(--home-community-rgb), 0.14);
  color: rgb(var(--home-community-rgb));
}

.portal-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex: 1;
}

.portal-card__body h3 {
  font-size: clamp(1rem, 1.35vw, 1.14rem);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 0;
}

.portal-card__body p {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.55;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.portal-card__arrow {
  align-self: flex-end;
  color: var(--color-text-tertiary);
  opacity: 0.58;
  transition:
    color var(--transition-fast),
    opacity var(--transition-fast);
}

.portal-card:hover .portal-card__arrow {
  opacity: 0.84;
}

.portal-card__preview {
  position: relative;
  flex: 1;
  min-block-size: clamp(12rem, 20vw, 16rem);
  overflow: clip;
  border-radius: calc(var(--home-card-radius) - 0.25rem);
  border: 0.0625rem solid var(--home-preview-border);
  background: var(--home-preview-bg);
}

.portal-card__preview--empty {
  min-block-size: clamp(12rem, 20vw, 16rem);
}

.portal-card__preview--lead {
  min-block-size: auto;
  aspect-ratio: 16 / 10;
}

.portal-card__preview-image {
  inline-size: 100%;
  block-size: 100%;
  display: block;
  object-fit: cover;
}

.portal-card__preview-empty {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  gap: 0.4rem;
  padding: clamp(0.875rem, 1.8vw, 1.125rem);
  background: var(--home-preview-empty-bg);
  color: var(--color-text-secondary);
}

.portal-card__preview-empty strong {
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  line-height: 1.25;
  color: var(--home-ink);
}

.portal-card__preview-empty span {
  font-size: var(--text-sm);
  line-height: 1.55;
}

.portal-card__preview-overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: grid;
  gap: 0.375rem;
  padding: clamp(0.875rem, 1.6vw, 1.125rem);
  background: var(--home-preview-overlay);
  color: var(--home-preview-overlay-ink);
}

.portal-card__preview-kicker {
  font-size: var(--text-xs);
  opacity: 0.78;
}

.portal-card__preview-title {
  font-size: clamp(1rem, 1.45vw, 1.25rem);
  line-height: 1.3;
}

.trends-card {
  padding: clamp(0.875rem, 1.6vw, 1rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.3vw, 0.9rem);
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.trends-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.trends-card__header h3 {
  font-size: clamp(0.98rem, 1.15vw, 1.08rem);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 0;
}

.trends-link {
  display: inline-flex;
  align-items: center;
  min-block-size: 2rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-full);
  border: 0.0625rem solid color-mix(in srgb, var(--home-panel-border) 88%, transparent);
  background: color-mix(in srgb, var(--home-panel-muted) 86%, transparent);
  box-shadow: none;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.trends-link:hover {
  color: var(--color-text-primary);
  border-color: var(--home-panel-border-strong);
  background: var(--home-panel-muted-strong);
}

.trends-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: minmax(5.5rem, auto);
  gap: 0.75rem;
}

.trend-author {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  min-block-size: 100%;
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text-primary);
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border-subtle);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.trend-author:hover {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
}

.trend-author__avatar.ui-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
}

.trend-author__avatar:deep(.ui-avatar__fallback) {
  background: var(--glass-bg-light);
  color: var(--color-text-tertiary);
}

.trend-author__meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.trend-author__name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.trend-author__count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.trend-tags__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.625rem;
  margin-top: auto;
}

.trend-tags__stat {
  display: grid;
  gap: 0.2rem;
  padding: 0.6875rem 0.8125rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-pill-border);
  box-shadow: var(--home-panel-highlight);
}

.trend-tags__stat strong {
  font-size: var(--text-base);
  line-height: 1;
  color: var(--home-ink);
}

.trend-tags__stat span {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trends-empty {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.schedule-cta {
  display: grid;
  min-block-size: 0;
  align-content: start;
  gap: 1rem;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.schedule-cta__intro {
  display: grid;
  gap: 0.4rem;
  padding: 0.875rem 1rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted), var(--home-pill-bg);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow);
}

.schedule-cta__eyebrow,
.schedule-cta__meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.schedule-cta__title {
  font-size: clamp(1rem, 1.24vw, 1.08rem);
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--home-ink);
}

.schedule-cta__intro p {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.schedule-btn {
  align-self: flex-start;
}

.schedule-cta__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.625rem;
  margin-top: auto;
}

.schedule-cta__stat {
  display: grid;
  gap: 0.25rem;
  padding: 0.6875rem 0.8125rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-pill-border);
  box-shadow: var(--home-panel-highlight);
}

.schedule-cta__stat strong {
  font-size: var(--text-base);
  line-height: 1;
  color: var(--home-ink);
}

.schedule-cta__stat span {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trends-card--schedule .schedule-cta__stats {
  display: none;
}

/* ========== Posts Section ========== */
.posts {
  position: relative;
  min-block-size: var(--home-safe-block-size);
  padding-block: calc(var(--home-stage-safe-top) + clamp(0.35rem, 1vw, 0.75rem))
    calc(var(--home-stage-safe-bottom) + clamp(0.6rem, 1.8vw, 1.15rem));
  z-index: 1;
  display: flex;
  align-items: stretch;
}

.posts > .container {
  flex: 1;
}

.posts-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.posts-header__title {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.posts-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.posts-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.posts-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.posts-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-4);
  border-radius: var(--radius-2xl);
  background: var(--home-pill-bg);
  border: 1px solid var(--home-pill-border);
  box-shadow: var(--home-card-shadow);
}

.tags-row,
.filters-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.tags-label,
.filters-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.tags-list,
.filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.tags-empty {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  text-decoration: none;
  color: var(--color-text-secondary);
  border: 1px solid var(--home-pill-border);
  background: var(--home-pill-bg);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.filter-pill:hover {
  color: var(--color-text-primary);
  border-color: var(--home-soft-border);
  background: var(--home-tag-hover);
}

.posts--bubble > .container {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: clamp(0.875rem, 1.8vw, 1.25rem);
  min-block-size: calc(
    var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
      clamp(0.95rem, 2.4vw, 1.9rem)
  );
}

.rail-panel__content,
.portal-grid,
.portal-grid > *,
.portal-sidebar,
.portal-sidebar__row,
.rail-featured-grid,
.rail-featured-grid > *,
.trends-grid,
.trends-grid > *,
.rail-highlight,
.rail-highlight > *,
.hero-spotlight-stack,
.story-merge-panel,
.story-merge-panel > *,
.media-slice__sticky,
.media-slice__visual,
.media-slice__copy,
.media-slice__actions {
  min-inline-size: 0;
}

.latest-bubble__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.latest-bubble__author {
  font-weight: var(--font-medium);
}

.latest-bubble__time {
  opacity: 0.8;
}

.bubble-empty {
  position: absolute;
  inset: var(--spacing-4);
  display: grid;
  place-items: center;
  text-align: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.media-slice__author {
  font-weight: var(--font-medium);
}

/* ========== Scroll Narrative Overrides ========== */
.hero {
  min-block-size: var(--home-safe-block-size);
  padding-block: max(var(--home-stage-safe-top), clamp(0.75rem, 1.8vw, 1.25rem))
    clamp(1.25rem, 3vw, 2.25rem);
}

.hero-layout {
  display: grid;
  align-items: center;
  align-content: center;
  justify-content: center;
  justify-items: center;
  min-block-size: calc(
    var(--home-safe-block-size) - var(--home-stage-safe-top) - clamp(1.25rem, 3vw, 2.25rem)
  );
}

.hero-copy {
  inline-size: min(100%, var(--home-hero-max-inline));
  max-inline-size: min(100%, var(--home-hero-max-inline));
  min-block-size: clamp(23rem, 48dvh, 29rem);
  margin-inline: auto;
  align-items: center;
  gap: clamp(1rem, 2.4vw, 1.5rem);
}

.hero-copy__left {
  max-inline-size: min(100%, var(--home-hero-copy-max-inline));
  align-items: flex-end;
  justify-content: center;
  text-align: end;
  padding-inline-end: clamp(0.35rem, 1vw, 0.75rem);
}

.hero-copy__right {
  inline-size: min(100%, var(--home-hero-aside-max-inline));
  justify-content: center;
}

.hero-copy__line {
  margin: 0;
}

.hero--animated .hero-copy__left,
.hero--animated .hero-copy__right,
.hero--animated .hero-copy__divider {
  animation: none;
}

.hero--animated .hero-copy__line {
  opacity: 0;
  animation: heroLineStageIn 900ms cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
}

.hero--animated .hero-copy__line--kicker {
  --hero-entry-x: 0rem;
  --hero-entry-y: -2.75rem;
  animation-delay: 0.08s;
}

.hero--animated .hero-copy__line--title {
  --hero-entry-x: -3.5rem;
  --hero-entry-y: 0rem;
  animation-delay: 0.16s;
}

.hero--animated .hero-copy__line--subtitle {
  --hero-entry-x: 2.75rem;
  --hero-entry-y: 2.5rem;
  animation-delay: 0.28s;
}

.hero--animated .hero-copy__right > * {
  opacity: 0;
  animation: heroMetaRise 820ms cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
}

.hero--animated .hero-copy__right > :nth-child(1) {
  animation-delay: 0.34s;
}

.hero--animated .hero-copy__right > :nth-child(2) {
  animation-delay: 0.44s;
}

.hero--animated .hero-copy__right > :nth-child(3) {
  animation-delay: 0.54s;
}

.hero--animated .hero-copy__right > :nth-child(4) {
  animation-delay: 0.62s;
}

.rail {
  position: relative;
  min-block-size: calc(
    var(--home-safe-block-size) +
      ((var(--rail-slide-count, 1) - 1) * var(--home-rail-scroll-travel))
  );
  padding: 0;
}

.rail-sticky {
  position: sticky;
  inset-block-start: 0;
  block-size: var(--home-safe-block-size);
  overflow: clip;
}

.rail-stage {
  position: relative;
  block-size: 100%;
}

.rail-stage__chrome {
  position: absolute;
  inset-block-start: var(--home-stage-safe-top);
  inset-inline: clamp(1rem, 3vw, 2.5rem);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.rail-stage__eyebrow,
.story-progress {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--home-chip-radius);
  background: var(--home-stage-chip-bg);
  border: 0.0625rem solid var(--home-stage-chip-border);
  backdrop-filter: var(--home-stage-backdrop);
}

.rail-stage__index {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.12em;
}

.rail-stage__label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.rail-stage__dots {
  display: inline-flex;
  gap: 0.5rem;
}

.rail-stage__dot {
  inline-size: 2rem;
  block-size: 0.1875rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.18);
  transition:
    transform var(--transition-fast),
    background-color var(--transition-fast);
}

.rail-stage__dot.is-active {
  transform: scaleX(1.1);
  background: linear-gradient(135deg, var(--home-accent) 0%, var(--home-accent-soft) 100%);
}

.rail-track {
  display: flex;
  inline-size: calc(var(--rail-slide-count, 1) * 100%);
  block-size: 100%;
  gap: 0;
  overflow: visible;
  padding: 0;
  margin: 0;
  scroll-snap-type: none;
  will-change: transform;
  backface-visibility: hidden;
}

.rail-track::-webkit-scrollbar {
  display: none;
}

.rail-panel {
  flex: 0 0 calc(100% / var(--rail-slide-count, 1));
  block-size: 100%;
  display: grid;
  padding: calc(
      var(--home-stage-safe-top) + var(--home-stage-chrome-height) + clamp(0.4rem, 0.8vw, 0.65rem)
    )
    clamp(1rem, 3vw, 2.5rem) clamp(1rem, 2.4vw, 1.6rem);
  overflow: clip;
}

.rail-panel__content {
  inline-size: min(100%, var(--home-stage-max-inline));
  block-size: 100%;
  margin-inline: auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  min-block-size: 0;
  gap: clamp(0.55rem, 1.2vw, 0.85rem);
  overflow: clip;
}

.page-section-head--stage {
  margin-block-end: clamp(0.35rem, 0.8vw, 0.6rem);
}

.rail-panel__meta {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.rail-panel__content--highlight .page-section-head {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(14rem, 0.84fr);
  align-items: start;
  gap: clamp(0.875rem, 1.8vw, 1.2rem);
}

.rail-panel__content--highlight .page-section-copy {
  gap: clamp(0.375rem, 0.9vw, 0.6rem);
  max-inline-size: min(100%, 52rem);
}

.rail-panel__content--highlight .page-section-copy h2 {
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(1.65rem, 2.2vw, 2.3rem);
  line-height: 1.08;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rail-panel__content--highlight .page-section-copy p {
  display: -webkit-box;
  overflow: hidden;
  max-inline-size: 54ch;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rail-panel__meta--spotlight {
  display: grid;
  justify-items: start;
  align-content: start;
  gap: 0.45rem;
  align-self: stretch;
  inline-size: min(100%, 18rem);
  padding: clamp(0.9rem, 1.8vw, 1.1rem);
  border: 0.0625rem solid var(--home-panel-border);
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow);
}

.rail-panel__meta-label {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.rail-panel__meta-title {
  font-size: clamp(1rem, 1.3vw, 1.12rem);
  line-height: 1.35;
  color: var(--home-ink);
}

.rail-panel__meta-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.625rem;
  border-radius: var(--home-chip-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-panel-border);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.portal-grid,
.trends-grid,
.rail-featured-grid,
.rail-highlight {
  gap: clamp(1rem, 2.2vw, 1.5rem);
  min-block-size: 0;
}

.portal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rail-panel--portal .portal-grid {
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 0;
  align-self: stretch;
  grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
  grid-template-rows: minmax(0, 1fr);
  max-block-size: none;
  align-items: stretch;
}

.rail-panel--portal .portal-grid > .portal-card--primary {
  min-block-size: 0;
  block-size: 100%;
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(0.75rem, 1.4vw, 1rem);
  align-content: stretch;
  padding: clamp(0.875rem, 1.6vw, 1rem);
}

.portal-sidebar {
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(0.75rem, 1.4vw, 1rem);
  block-size: 100%;
  min-block-size: 0;
  align-content: stretch;
}

.portal-sidebar__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.4vw, 1rem);
  block-size: 100%;
  min-block-size: 0;
  align-items: stretch;
}

.rail-panel--portal .rail-panel__content,
.rail-panel--trends .rail-panel__content {
  grid-template-rows: auto auto;
  align-content: start;
}

.portal-card {
  min-block-size: clamp(8.75rem, 13dvh, 11rem);
}

.rail-panel--portal .portal-card--secondary {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  align-content: start;
  gap: clamp(0.75rem, 1.4vw, 1rem);
  min-block-size: 0;
  block-size: 100%;
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
}

.portal-card--secondary-lead {
  min-block-size: clamp(10rem, 16dvh, 12rem);
}

.portal-card--secondary-compact {
  min-block-size: clamp(8.5rem, 12dvh, 9.75rem);
}

.portal-card--secondary-compact .portal-card__micro {
  gap: 0.25rem;
  padding: 0.6875rem 0.8125rem;
}

.portal-card--secondary-compact .portal-card__micro-text {
  display: none;
}

.rail-panel--portal .portal-card--secondary .portal-card__body {
  flex: 1;
  justify-content: center;
}

.rail-panel--portal .portal-card--secondary .portal-card__body p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.portal-card__micro {
  display: grid;
  align-content: start;
  gap: 0.35rem;
  min-block-size: 0;
  margin-top: 0;
  align-self: stretch;
  padding: 0.75rem 0.875rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow);
}

.portal-card__micro-label,
.portal-card__micro-meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.portal-card__micro-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(0.98rem, 1.28vw, 1.08rem);
  line-height: 1.35;
  color: var(--home-ink);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.portal-card__micro-text {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-secondary);
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rail-panel--portal .portal-card--primary .portal-card__preview {
  min-block-size: auto;
  aspect-ratio: 16 / 9.6;
  box-shadow: inset 0 -5rem 6rem -4rem rgba(15, 23, 42, 0.48);
}

.rail-panel--portal .portal-card--primary .portal-card__copy {
  position: relative;
  inset: auto;
  inline-size: 100%;
  max-inline-size: none;
  margin-block-start: 0;
  margin-inline: 0;
  padding: clamp(0.875rem, 1.6vw, 1rem);
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-strong), var(--home-pill-bg);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-preview-shadow);
  z-index: 2;
}

.rail-panel--portal .portal-card--primary .portal-card__body {
  flex: 0;
}

.rail-panel--portal .portal-card--primary .portal-card__preview-overlay {
  display: none;
}

.rail-highlight {
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(16rem, 0.78fr);
  gap: clamp(0.875rem, 1.8vw, 1.2rem);
  align-items: stretch;
  min-block-size: 0;
}

.hero-collage {
  display: block;
}

.rail-highlight > .hero-collage {
  block-size: 100%;
  min-block-size: 0;
  padding-bottom: 0;
}

.rail-highlight .hero-collage-grid {
  block-size: 100%;
  min-height: 0;
  grid-template-columns: minmax(0, 1.16fr) minmax(0, 0.84fr) minmax(0, 0.84fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.hero-spotlight-stack {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: clamp(0.75rem, 1.5vw, 1rem);
  min-block-size: 0;
  align-content: stretch;
}

.hero-spotlight-card {
  inline-size: 100%;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  align-content: stretch;
  gap: 0.5rem;
  text-align: start;
  cursor: pointer;
  font: inherit;
  color: inherit;
  padding: clamp(0.875rem, 1.8vw, 1.15rem);
  min-block-size: 0;
  border: 0.0625rem solid var(--home-panel-border);
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  box-shadow: var(--home-panel-shadow);
}

.hero-spotlight-card--lead {
  min-block-size: clamp(9.75rem, 14dvh, 11rem);
}

.hero-spotlight-card--dense {
  align-content: start;
  grid-template-rows: auto auto auto;
}

.hero-spotlight-card--lead.hero-spotlight-card--dense {
  min-block-size: clamp(8.25rem, 11dvh, 9.5rem);
}

.hero-spotlight-card--empty {
  min-block-size: 100%;
}

.hero-spotlight-card__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-spotlight-card__title {
  font-size: clamp(1rem, 1.45vw, 1.18rem);
  line-height: 1.28;
  letter-spacing: -0.01em;
}

.hero-spotlight-card__summary {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--color-text-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero-spotlight-card--lead .hero-spotlight-card__summary {
  -webkit-line-clamp: 3;
}

.hero-spotlight-card__meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.rail-featured-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rail-panel--featured .rail-featured-grid {
  align-self: start;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 0;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr) minmax(0, 0.9fr);
  align-items: stretch;
  align-content: start;
  gap: clamp(0.875rem, 1.8vw, 1.15rem);
}

.rail-panel--featured .rail-featured-grid > :first-child {
  grid-column: 1 / span 6;
  grid-row: 1 / span 2;
}

.rail-panel--featured .rail-featured-grid > :nth-child(2) {
  grid-column: 7 / -1;
  grid-row: 1;
}

.rail-panel--featured .rail-featured-grid > :nth-child(3) {
  grid-column: 7 / span 3;
  grid-row: 2;
}

.rail-panel--featured .rail-featured-grid > :nth-child(4) {
  grid-column: 10 / -1;
  grid-row: 2;
}

.featured-rail-card {
  position: relative;
  display: grid;
  min-block-size: 0;
  block-size: 100%;
  align-self: start;
  padding: clamp(0.875rem, 1.5vw, 1rem);
  gap: clamp(0.75rem, 1.4vw, 0.95rem);
  text-align: start;
  font: inherit;
  color: inherit;
  cursor: pointer;
  overflow: clip;
  border: 0.0625rem solid var(--home-panel-border);
  border-radius: var(--home-card-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  box-shadow: var(--home-panel-shadow);
  transition:
    box-shadow var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.featured-rail-card:hover {
  border-color: var(--home-panel-border-strong);
  box-shadow: var(--home-panel-shadow);
}

.featured-rail-card--lead {
  grid-template-columns: minmax(0, 1.08fr) minmax(13rem, 0.92fr);
  min-block-size: clamp(16rem, 42dvh, 24rem);
}

.featured-rail-card--support {
  grid-template-columns: minmax(9.5rem, 0.9fr) minmax(0, 1.1fr);
  min-block-size: clamp(11rem, 18dvh, 14rem);
}

.featured-rail-card--textual {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  min-block-size: clamp(8.75rem, 15dvh, 10.5rem);
}

.featured-rail-card--compact {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  align-content: start;
}

.featured-rail-card__media {
  position: relative;
  min-block-size: 0;
  block-size: auto;
  border-radius: calc(var(--home-card-radius) - 0.125rem);
  overflow: clip;
  background:
    radial-gradient(circle at top left, rgba(var(--home-mist-rgb), 0.34) 0%, transparent 42%),
    linear-gradient(155deg, rgba(190, 206, 230, 0.3), rgba(247, 231, 236, 0.4));
}

.featured-rail-card--lead .featured-rail-card__media {
  min-block-size: clamp(15rem, 22vw, 18rem);
  aspect-ratio: 0.88 / 1;
}

.featured-rail-card--support .featured-rail-card__media {
  min-block-size: clamp(8.5rem, 11vw, 10rem);
  aspect-ratio: 1.18 / 1;
}

.featured-rail-card--compact .featured-rail-card__media {
  aspect-ratio: 16 / 9;
  min-block-size: clamp(7rem, 10dvh, 8.5rem);
}

.featured-rail-card__media::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.06) 0%, rgba(15, 23, 42, 0.42) 100%),
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.2) 0%, transparent 38%);
  pointer-events: none;
}

.featured-rail-card__media--empty {
  display: grid;
  place-items: center;
}

.featured-rail-card--textual .featured-rail-card__media {
  display: none;
}

.featured-rail-card--textual .featured-rail-card__body {
  padding: 0;
  justify-content: space-between;
}

.featured-rail-card__image {
  inline-size: 100%;
  block-size: 100%;
  display: block;
  object-fit: cover;
}

.featured-rail-card__placeholder {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  color: var(--color-text-tertiary);
}

.featured-rail-card__overlay {
  position: absolute;
  inset-inline: clamp(0.75rem, 1.4vw, 1rem);
  inset-block-start: clamp(0.75rem, 1.4vw, 1rem);
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.featured-rail-card__kicker,
.featured-rail-card__time {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.625rem;
  border-radius: var(--radius-full);
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(0.75rem);
  color: rgba(255, 255, 255, 0.94);
  font-size: var(--text-xs);
  line-height: 1;
}

.featured-rail-card__kicker {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.featured-rail-card__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  inline-size: 100%;
  block-size: 100%;
  gap: clamp(0.4rem, 0.85vw, 0.58rem);
  min-inline-size: 0;
  min-block-size: 0;
  padding: clamp(0.2rem, 0.6vw, 0.35rem) 0 clamp(0.2rem, 0.6vw, 0.35rem);
}

.featured-rail-card--lead .featured-rail-card__body {
  padding-inline-end: clamp(0.25rem, 0.8vw, 0.55rem);
  gap: 0.75rem;
}

.featured-rail-card--dense .featured-rail-card__body {
  gap: 0.45rem;
}

.featured-rail-card--compact .featured-rail-card__body {
  gap: clamp(0.35rem, 0.8vw, 0.5rem);
}

.featured-rail-card__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.featured-rail-card__title {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(1.02rem, 1.35vw, 1.22rem);
  line-height: 1.22;
  letter-spacing: -0.01em;
  color: var(--home-ink);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.featured-rail-card--lead .featured-rail-card__title {
  font-size: clamp(1.32rem, 2.1vw, 1.8rem);
  -webkit-line-clamp: 4;
}

.featured-rail-card--compact .featured-rail-card__title {
  -webkit-line-clamp: 2;
}

.featured-rail-card__summary {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  max-inline-size: 32ch;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.featured-rail-card--lead .featured-rail-card__summary {
  font-size: var(--text-sm);
  max-inline-size: 28ch;
  -webkit-line-clamp: 3;
}

.featured-rail-card--dense .featured-rail-card__summary {
  display: none;
}

.featured-rail-card--compact .featured-rail-card__summary {
  -webkit-line-clamp: 2;
}

.featured-rail-card__meta {
  display: flex;
  flex-wrap: wrap;
  max-inline-size: 100%;
  gap: 0.35rem 0.65rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.featured-rail-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.15rem;
  align-self: flex-start;
}

.featured-rail-card__stat {
  display: grid;
  gap: 0.2rem;
  padding: 0.6875rem 0.8125rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight);
}

.featured-rail-card__stat strong {
  font-size: var(--text-base);
  line-height: 1;
  color: var(--home-ink);
}

.featured-rail-card__stat span {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.featured-rail-card__action {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.4rem;
  flex-wrap: wrap;
  inline-size: fit-content;
  max-inline-size: 100%;
  min-block-size: 2rem;
  min-inline-size: 0;
  margin-top: 0.25rem;
  padding: 0.4rem 0.68rem;
  border-radius: var(--radius-full);
  border: 0.0625rem solid color-mix(in srgb, var(--home-panel-border) 88%, transparent);
  background: color-mix(in srgb, var(--home-panel-muted) 86%, transparent);
  box-shadow: none;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.3;
  color: var(--color-text-secondary);
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
  justify-content: center;
}

.featured-rail-card__meta + .featured-rail-card__action {
  margin-top: 0.3rem;
}

.featured-rail-card__stats + .featured-rail-card__action {
  margin-top: 0.3rem;
}

.rail-feature-card {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-self: stretch;
  min-block-size: 0;
  block-size: 100%;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.84)),
    var(--home-pill-bg);
}

:deep(.rail-feature-card .post-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.5rem;
  padding: 0.8rem 0.95rem 0.95rem;
}

:deep(.rail-feature-card .post-excerpt) {
  font-size: var(--text-sm);
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

:deep(.rail-feature-card--lead .post-title) {
  font-size: clamp(1.05rem, 1.35vw, 1.28rem);
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

:deep(.rail-feature-card--support .post-title) {
  font-size: clamp(0.92rem, 1.1vw, 1.02rem);
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

:deep(.rail-feature-card--support .post-content) {
  gap: 0.45rem;
  padding: 0.7rem 0.85rem 0.85rem;
}

:deep(.rail-feature-card .post-meta) {
  margin-top: auto;
}

:deep(.rail-feature-card--support .post-meta) {
  gap: 0.5rem;
}

:deep(.rail-feature-card .post-image-wrapper) {
  flex: 0 0 auto;
}

:deep(.rail-feature-card--lead .post-image-wrapper) {
  aspect-ratio: 4 / 3;
}

:deep(.rail-feature-card--support .post-image-wrapper) {
  aspect-ratio: 1.18 / 1;
}

.trends-grid,
.rail-panel--trends .trends-grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: stretch;
  inline-size: 100%;
  gap: clamp(0.75rem, 1.6vw, 1rem);
  block-size: auto;
  max-block-size: none;
}

.rail-panel--trends .trends-card {
  flex: 1 1 clamp(18rem, 24vw, 22rem);
  min-inline-size: min(100%, clamp(18rem, 24vw, 22rem));
  block-size: auto;
  align-self: stretch;
}

.trends-card {
  display: grid;
  align-content: start;
  gap: clamp(0.75rem, 1.3vw, 0.95rem);
  min-block-size: 0;
  align-self: start;
  block-size: auto;
}

.trends-card--authors {
  flex-basis: clamp(24rem, 34vw, 31rem);
  min-block-size: clamp(12rem, 22dvh, 16rem);
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
}

.trends-card--authors .trends-list {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  grid-auto-rows: minmax(0, auto);
}

.trends-authors-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.625rem;
  min-block-size: 0;
  align-items: start;
  align-content: start;
}

.trends-card--tags {
  flex-basis: clamp(15rem, 20vw, 18rem);
  min-block-size: clamp(10rem, 18dvh, 13rem);
  grid-template-rows: auto minmax(0, 1fr) auto;
  align-content: stretch;
}

.trends-card--editorial {
  flex-basis: clamp(18rem, 24vw, 22rem);
  min-block-size: clamp(10rem, 18dvh, 13rem);
  grid-template-rows: auto minmax(0, 1fr);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
}

.trends-card--schedule {
  flex-basis: clamp(22rem, 30vw, 28rem);
  min-block-size: clamp(12rem, 20dvh, 15rem);
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
}

.trends-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  align-content: start;
  gap: 0.625rem;
}

.trend-author {
  min-block-size: 4rem;
}

.trend-author__meta {
  min-inline-size: 0;
}

.trends-authors-highlight {
  margin-top: 0;
}

.trends-card--tags .trend-tags {
  align-content: start;
}

.trends-authors-highlight {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.625rem;
  align-items: center;
  padding: 0.75rem 0.875rem;
  min-block-size: auto;
  align-self: start;
  border-radius: var(--home-card-radius);
  color: var(--color-text-primary);
  text-decoration: none;
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.trends-authors-highlight:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: var(--home-panel-border-strong);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow-strong);
}

.trends-authors-highlight__avatar.ui-avatar {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-panel-border);
}

.trends-authors-highlight__avatar:deep(.ui-avatar__fallback) {
  color: var(--color-text-tertiary);
}

.trends-authors-highlight__copy {
  display: grid;
  gap: 0.2rem;
  min-inline-size: 0;
}

.trends-authors-highlight__label {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.trends-authors-highlight__title {
  font-size: clamp(1rem, 1.3vw, 1.12rem);
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--home-ink);
}

.trends-authors-highlight__meta {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.trends-authors-highlight__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: 2rem;
  padding-inline: 0.75rem;
  border-radius: var(--home-chip-radius);
  background: var(--home-panel-muted);
  border: 0.0625rem solid var(--home-panel-border);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
  box-shadow: var(--home-panel-highlight);
}

.trends-card__hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trends-editorial {
  display: grid;
  gap: 0.45rem;
  min-block-size: 0;
  align-content: start;
  padding: 0.8125rem 0.9375rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow);
}

.trends-editorial--compact {
  gap: 0.65rem;
}

.trends-editorial__title {
  font-size: clamp(1rem, 1.32vw, 1.12rem);
  line-height: 1.34;
  letter-spacing: -0.01em;
  color: var(--home-ink);
}

.trends-editorial__text {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.trends-editorial__meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trends-card--tags {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.74)),
    var(--home-pill-bg);
}

.schedule-highlight-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  align-content: start;
  gap: 0.625rem;
}

.schedule-highlight-list--paired {
  grid-auto-rows: minmax(0, 1fr);
}

.schedule-highlight {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem 0.875rem;
  border-radius: var(--home-card-radius);
  text-decoration: none;
  color: var(--color-text-primary);
  background: var(--home-panel-muted);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-shadow);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.schedule-highlight:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: var(--home-panel-border-strong);
  background: var(--home-panel-muted-strong);
}

.schedule-highlight--companion {
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  box-shadow: var(--home-panel-highlight), var(--home-panel-shadow);
}

.schedule-highlight__copy {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.schedule-highlight__label,
.schedule-highlight__meta,
.trends-community-note__eyebrow,
.trends-community-note__meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.schedule-highlight__title,
.trends-community-note__title {
  font-size: clamp(1rem, 1.24vw, 1.08rem);
  line-height: 1.35;
  color: var(--home-ink);
}

.trends-community-note {
  display: grid;
  gap: 0.45rem;
  padding: 1rem 1.125rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-shadow);
}

.trends-community-note__text {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.trends-empty {
  display: grid;
  place-items: center;
  min-block-size: 100%;
  color: var(--color-text-tertiary);
  text-align: center;
}

.posts--bubble {
  display: grid;
  align-items: stretch;
  block-size: var(--home-safe-block-size);
  min-block-size: var(--home-safe-block-size);
  padding-block: calc(var(--home-stage-safe-top) + clamp(0.3rem, 0.8vw, 0.55rem))
    calc(clamp(0.7rem, 1.4vw, 1rem) + var(--home-stage-safe-bottom));
  overflow: clip;
}

.posts--bubble > .container {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  align-content: stretch;
  gap: clamp(0.7rem, 1.2vw, 0.95rem);
  min-block-size: 100%;
}

.posts-header {
  margin-block-end: 0;
}

.posts-toolbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(12rem, 0.78fr);
  gap: clamp(0.5rem, 1vw, 0.8rem);
  margin-bottom: 0;
  padding: clamp(0.625rem, 1vw, 0.8125rem);
  border-radius: var(--home-shell-radius);
  background: var(--home-panel-bg-soft), var(--home-pill-bg);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-shadow);
  overflow: clip;
}

.posts-toolbar::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 50%, rgba(var(--home-mist-rgb), 0.2), transparent 42%),
    radial-gradient(circle at 88% 50%, rgba(var(--home-blush-rgb), 0.18), transparent 40%);
  pointer-events: none;
}

.posts-toolbar__panel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.5rem;
  align-content: start;
  padding: 0.6875rem 0.75rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-highlight);
}

.posts-toolbar__panel--tags {
  min-inline-size: 0;
}

.posts-toolbar__panel--filters {
  justify-self: stretch;
  justify-items: start;
  min-inline-size: 0;
  inline-size: 100%;
  max-inline-size: none;
  align-content: center;
}

.posts-toolbar__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.posts-toolbar__stats--with-tags {
  margin-block-start: 0.125rem;
  padding-block-start: 0.4375rem;
  border-block-start: 0.0625rem solid rgba(255, 255, 255, 0.34);
}

.posts-toolbar__stat {
  display: inline-grid;
  gap: 0.2rem;
  min-inline-size: clamp(4.25rem, 6vw, 5rem);
  padding: 0.5rem 0.625rem;
  border-radius: var(--home-card-radius);
  background: var(--home-panel-muted-strong);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-shadow);
}

.posts-toolbar__stat strong {
  font-size: var(--text-base);
  line-height: 1;
}

.posts-toolbar__stat span {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.bubble-stage {
  position: relative;
  margin-top: 0;
  block-size: 100%;
  min-block-size: 0;
  max-block-size: 100%;
  align-self: stretch;
  contain: layout paint;
  border-radius: var(--home-shell-radius);
  background:
    radial-gradient(circle at 50% 52%, rgba(255, 255, 255, 0.12) 0%, transparent 17rem),
    radial-gradient(circle at 18% 18%, rgba(var(--home-mist-rgb), 0.14) 0%, transparent 34%),
    radial-gradient(circle at 82% 80%, rgba(var(--home-blush-rgb), 0.1) 0%, transparent 32%),
    var(--home-panel-bg);
  border: 0.0625rem solid var(--home-panel-border);
  box-shadow: var(--home-panel-shadow);
  isolation: isolate;
  overflow: clip;
}

.bubble-stage::before,
.bubble-stage::after {
  content: '';
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  border-radius: 50%;
  pointer-events: none;
}

.bubble-stage::before {
  inline-size: clamp(12rem, 24vw, 18rem);
  block-size: clamp(7rem, 14vw, 10rem);
  background: radial-gradient(
    ellipse,
    rgba(var(--home-mist-rgb), 0.18) 0%,
    rgba(var(--home-blush-rgb), 0.08) 42%,
    transparent 76%
  );
  transform: translate3d(-50%, -50%, 0);
  filter: blur(0.3rem);
  opacity: 0.44;
}

.bubble-stage::after {
  inline-size: clamp(22rem, 50vw, 36rem);
  block-size: clamp(22rem, 50vw, 36rem);
  background: conic-gradient(
    from 0deg,
    rgba(var(--home-mist-rgb), 0.08),
    rgba(var(--home-blush-rgb), 0.16),
    rgba(var(--home-lilac-rgb), 0.1),
    rgba(var(--home-mist-rgb), 0.08)
  );
  transform: translate3d(-50%, -50%, 0) rotate(12deg);
  filter: blur(0.35rem);
  opacity: 0.14;
}

.latest-bubble {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0;
  max-inline-size: min(var(--home-bubble-max-inline), calc(100% - 3rem));
  max-width: none;
  opacity: 0;
  filter: none;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  pointer-events: none;
  transform: translate3d(
      calc(-50% + var(--bubble-x-intro, 0rem)),
      calc(-50% + var(--bubble-y-intro, 0rem)),
      0
    )
    scale(0.72);
  transition:
    opacity 220ms var(--ease-out-smooth),
    transform 320ms var(--ease-fluid);
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.latest-bubble::after {
  content: '';
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: clamp(0.9rem, 1.6vw, 1.1rem);
  block-size: clamp(0.9rem, 1.6vw, 1.1rem);
  border-radius: 0 0 0.35rem 0;
  background: var(--home-panel-bg-strong);
  box-shadow: 0 0.65rem 1.8rem rgba(15, 23, 42, 0.12);
  transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-tail-angle, 45deg)) translateX(1rem)
    rotate(45deg);
}

.latest-bubble__inner {
  display: grid;
  gap: 0.5625rem;
  inline-size: clamp(12rem, 14vw, var(--home-bubble-inner-max-inline));
  max-inline-size: min(100%, var(--home-bubble-inner-max-inline));
  padding: 0.8125rem 0.9375rem;
  border-radius: var(--home-card-radius) var(--home-shell-radius) var(--home-shell-radius)
    calc(var(--home-card-radius) * 0.9);
  border: 0.0625rem solid var(--home-panel-border-strong);
  background: var(--home-panel-bg-strong), var(--home-panel-muted-strong);
  box-shadow: var(--home-panel-shadow-strong);
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  text-shadow: 0 0.5rem 1.5rem rgba(15, 23, 42, 0.08);
  transform: translate3d(0, 0.35rem, 0) scale(0.99);
  transition:
    opacity 220ms var(--ease-out-smooth),
    transform 320ms var(--ease-fluid);
  backface-visibility: hidden;
}

.latest-bubble__text {
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(0.92rem, 1.35vw, 1.18rem);
  font-weight: var(--font-semibold);
  line-height: 1.44;
  text-wrap: pretty;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 7;
}

.posts--revealed .latest-bubble {
  opacity: 1;
  pointer-events: auto;
  transform: translate3d(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)), 0)
    scale(var(--bubble-scale, 1));
  transition-delay: var(--bubble-delay, 0s);
}

.posts--revealed .latest-bubble__inner {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition-delay: var(--bubble-delay, 0s);
}

.media-slices {
  position: relative;
  min-block-size: calc(
    var(--home-safe-block-size) +
      ((var(--story-card-count, 1) - 1) * var(--home-story-scroll-travel))
  );
  padding: 0;
  background: linear-gradient(
    180deg,
    rgba(248, 247, 244, 0) 0%,
    rgba(248, 247, 244, 0.22) 22%,
    rgba(248, 247, 244, 0.78) 100%
  );
}

.story-stage {
  position: sticky;
  inset-block-start: 0;
  block-size: var(--home-safe-block-size);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(0.95rem, 1.8vw, 1.25rem);
  padding-block: calc(var(--home-stage-safe-top) + clamp(0.95rem, 1.9vw, 1.2rem))
    calc(clamp(1.15rem, 2.2vw, 1.55rem) + var(--home-stage-safe-bottom));
  overflow: clip;
}

.story-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--home-story-stage-bg);
  opacity: calc(1 - (var(--story-footer-fade, 0) * 0.24));
  pointer-events: none;
}

.story-stage > * {
  position: relative;
  z-index: 1;
}

.media-slices::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: min(48dvh, 28rem);
  background: var(--home-story-stage-footer-bg);
  opacity: calc(0.08 + (var(--story-footer-fade, 0) * 0.46));
  pointer-events: none;
}

:global(#app[data-theme='dark'] .media-slices),
:global([data-theme='dark'] .media-slices) {
  background: linear-gradient(
    180deg,
    rgba(8, 12, 18, 0.06) 0%,
    rgba(8, 12, 18, 0.26) 22%,
    rgba(8, 12, 18, 0.78) 100%
  );
}

:global(#app[data-theme='blue'] .media-slices),
:global([data-theme='blue'] .media-slices) {
  background: linear-gradient(
    180deg,
    rgba(239, 246, 255, 0.08) 0%,
    rgba(239, 246, 255, 0.22) 22%,
    rgba(239, 246, 255, 0.76) 100%
  );
}

.media-slice-list {
  position: relative;
  block-size: 100%;
  min-block-size: 0;
  display: grid;
  place-items: center;
  gap: 0;
  padding-block: clamp(1.6rem, 3vw, 2rem) clamp(2.35rem, 4vw, 3.1rem);
  perspective: clamp(20rem, 32vw, 34rem);
  perspective-origin: 48% 36%;
  transform-style: preserve-3d;
  isolation: isolate;
  overflow: clip;
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgb(0 0 0 / 100%) 11%,
    rgb(0 0 0 / 100%) 90%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgb(0 0 0 / 100%) 11%,
    rgb(0 0 0 / 100%) 90%,
    transparent 100%
  );
}

.story-merge-panel {
  position: absolute;
  inset-inline: clamp(1rem, 2vw, 1.75rem);
  inset-block-end: clamp(1.125rem, 2.4vw, 1.75rem);
  z-index: 4;
  display: grid;
  inline-size: min(100%, var(--home-story-merge-max-inline));
  margin-inline: auto;
  grid-template-columns: minmax(0, 0.8fr) minmax(14rem, 0.92fr);
  gap: clamp(0.75rem, 1.4vw, 1rem);
  align-items: center;
  padding: clamp(0.8rem, 1.5vw, 1rem);
  border-radius: clamp(1.35rem, 2vw, 1.75rem);
  border: 0.0625rem solid rgba(255, 255, 255, 0.56);
  background:
    radial-gradient(circle at top right, rgba(199, 220, 244, 0.14), transparent 42%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.93), rgba(255, 255, 255, 0.78)),
    var(--home-pill-bg);
  box-shadow: 0 2.3rem 4rem -2.4rem rgba(35, 53, 85, 0.38);
  backdrop-filter: blur(0.75rem);
  opacity: var(--story-merge-opacity, 0);
  transform: translate3d(0, var(--story-merge-y, 3.5rem), 0);
  pointer-events: none;
  transition:
    opacity 320ms ease,
    transform 420ms cubic-bezier(0.2, 0.9, 0.25, 1);
}

.media-slices--merge .story-merge-panel {
  pointer-events: auto;
}

.story-merge-panel__copy {
  display: grid;
  gap: 0.35rem;
}

.story-merge-panel__kicker,
.story-merge-panel__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.story-merge-panel__copy h3,
.story-merge-panel__spotlight strong {
  margin: 0;
  font-size: clamp(1.1rem, 1.8vw, 1.5rem);
  line-height: 1.25;
  color: var(--home-ink);
}

.story-merge-panel__copy p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.story-merge-panel__spotlight {
  display: grid;
  gap: 0.35rem;
  padding: clamp(0.75rem, 1.2vw, 0.9rem) clamp(0.8rem, 1.5vw, 1rem);
  border-radius: clamp(1rem, 1.8vw, 1.25rem);
  background: var(--home-panel-bg-soft);
  border: 0.0625rem solid var(--home-panel-border);
}

.story-merge-panel__spotlight-meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.story-merge-panel__links {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.story-merge-panel__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-full);
  background: var(--home-pill-bg);
  border: 0.0625rem solid var(--home-pill-border);
  color: var(--color-text-primary);
  text-decoration: none;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.story-merge-panel__link:hover {
  transform: translate3d(0, -0.125rem, 0);
  background: var(--home-tag-hover);
  border-color: var(--home-soft-border);
}

.media-slice {
  position: absolute;
  inset-block: clamp(0.45rem, 0.9vw, 0.75rem);
  inset-inline: clamp(0.75rem, 1.4vw, 1rem);
  block-size: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: clip;
  transform-origin: var(--story-origin-inline, 50%) var(--story-origin-block, 92%);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  will-change: transform, opacity, filter;
  opacity: var(--story-opacity, 1);
  transform: translate3d(
      var(--story-translate-x, 0rem),
      var(--story-translate-y, 0rem),
      var(--story-translate-z, 0rem)
    )
    rotateX(var(--story-rotate-x, 0deg)) rotateY(var(--story-rotate-y, 0deg))
    rotateZ(var(--story-rotate-z, 0deg)) scale(var(--story-scale, 1));
  filter: blur(var(--story-blur, 0rem));
  transition: none;
  pointer-events: none;
}

.media-slice.is-active {
  pointer-events: auto;
}

.media-slice__sticky {
  position: relative;
  top: auto;
  inline-size: min(calc(100% - 1rem), var(--home-story-card-max-inline));
  block-size: min(
    100%,
    calc(
      var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
        clamp(3rem, 6vw, 4.75rem)
    )
  );
  max-block-size: 100%;
  min-block-size: clamp(22rem, 54dvh, 30rem);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.74fr);
  gap: clamp(0.95rem, 1.8vw, 1.45rem);
  padding: clamp(1rem, 2vw, 1.5rem);
  justify-items: stretch;
  align-items: center;
  overflow: clip;
  border: 0.0625rem solid var(--home-story-card-border) !important;
  border-radius: var(--home-shell-radius);
  background:
    radial-gradient(circle at top right, rgba(var(--home-mist-rgb), 0.14), transparent 40%),
    radial-gradient(circle at bottom left, rgba(var(--home-blush-rgb), 0.12), transparent 34%),
    var(--home-story-card-bg) !important;
  box-shadow:
    0 calc(2rem + (var(--story-shadow-strength, 1) * 0.6rem))
      calc(3.3rem + (var(--story-shadow-strength, 1) * 1.2rem))
      calc(-2.2rem - (var(--story-shadow-strength, 1) * 0.4rem))
      rgba(35, 53, 85, calc(0.24 + (var(--story-shadow-strength, 1) * 0.08))),
    0 0.875rem 1.8rem -1.45rem rgba(15, 23, 42, 0.16) !important;
  backdrop-filter: none !important;
  isolation: isolate;
  transform-style: preserve-3d;
  transform: translate3d(0, 0, var(--story-card-lift, 0rem))
    rotateY(calc(var(--story-rotate-y, 0deg) * -0.14));
  transform-origin: var(--story-origin-inline, 50%) var(--story-origin-block, 86%);
}

.media-slice__sticky::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 32%),
    radial-gradient(circle at 14% 82%, rgba(var(--home-blush-rgb), 0.08), transparent 38%);
  pointer-events: none;
}

.media-slice__sticky > * {
  position: relative;
  z-index: 1;
}

.media-slice.is-active .media-slice__sticky {
  box-shadow:
    0 calc(2.15rem + (var(--story-shadow-strength, 1) * 0.7rem))
      calc(3.5rem + (var(--story-shadow-strength, 1) * 1.3rem))
      calc(-2.1rem - (var(--story-shadow-strength, 1) * 0.42rem))
      rgba(35, 53, 85, calc(0.28 + (var(--story-shadow-strength, 1) * 0.08))),
    0 1rem 2rem -1.4rem rgba(15, 23, 42, 0.18) !important;
}

.media-slice__visual,
.media-slice__copy {
  min-height: 0;
}

.media-slice__visual {
  inline-size: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(0.75rem, 1.8vw, 1rem);
  border-radius: var(--home-card-radius);
  background: var(--home-story-visual-bg);
  border: 0.0625rem solid var(--home-story-card-border);
  box-shadow: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.12);
  transform: translate3d(0, var(--story-visual-y, 0rem), calc(var(--story-card-lift, 0rem) * 0.5))
    scale(var(--story-visual-scale, 1));
  transform-origin: 50% 100%;
  will-change: transform;
}

.media-slice__copy {
  inline-size: min(100%, var(--home-story-copy-max-inline));
  display: grid;
  align-content: center;
  justify-items: start;
  gap: clamp(0.72rem, 1.2vw, 0.92rem);
  margin-inline: auto;
  align-self: center;
  transform: translate3d(0, var(--story-copy-y, 0rem), 0) rotateX(var(--story-copy-tilt, 0deg));
  transform-origin: 50% 100%;
  opacity: var(--story-copy-opacity, 1);
  will-change: transform, opacity;
}

.media-slice__eyebrow {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.media-slice__copy h3 {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  max-inline-size: 13ch;
  font-size: clamp(1.4rem, 2vw, 1.85rem);
  line-height: 1.08;
  text-wrap: balance;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  transform: translate3d(0, var(--story-copy-title-y, 0rem), 0);
  transform-origin: 50% 100%;
  will-change: transform;
}

.media-slice__copy > p {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  max-inline-size: 27ch;
  color: var(--color-text-secondary);
  line-height: 1.66;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.media-slice__meta {
  justify-content: flex-start;
  gap: 0.75rem 1rem;
  flex-wrap: wrap;
}

.media-slice__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.media-slice__button.btn {
  min-block-size: 2.5rem;
  padding-inline: 1rem;
  border-radius: var(--radius-full);
  border-color: var(--home-pill-border);
  background: var(--home-pill-bg);
  color: var(--color-text-primary);
  box-shadow: none;
}

.media-slice__button.btn:hover {
  border-color: var(--home-soft-border);
  background: var(--home-tag-hover);
}

.media-slice__link {
  color: var(--color-text-secondary);
}

.media-empty {
  position: relative;
  display: grid;
  place-items: center;
  min-height: min(62dvh, 30rem);
}

:deep(.post-card.glass-card),
:deep(.post-card.glass-card::before),
:deep(.post-card.glass-card::after) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

:deep(.media-slice__visual .post-card.glass-card) {
  inline-size: min(100%, var(--home-story-visual-max-inline));
  block-size: auto;
  margin-inline: auto;
  border-color: var(--home-story-card-border) !important;
  background: var(--home-panel-bg-strong) !important;
  box-shadow: 0 calc(1.7rem + (var(--story-shadow-strength, 1) * 0.4rem))
    calc(3rem + (var(--story-shadow-strength, 1) * 0.75rem)) -2rem
    rgba(35, 53, 85, calc(0.18 + (var(--story-shadow-strength, 1) * 0.05))) !important;
}

:deep(.media-slice__visual .post-card.glass-card::before),
:deep(.media-slice__visual .post-card.glass-card::after) {
  display: none !important;
}

:deep(.media-slice__visual .post-image-wrapper) {
  background: var(--home-story-visual-bg);
}

:deep(.media-slice__visual .platform-badge),
:deep(.media-slice__visual .duration-badge),
:deep(.media-slice__visual .time-badge) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.media-sentinel {
  min-height: 1.5rem;
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
}

.hero-editorial.glass-card,
.hero-preview.glass-card,
.hero-stat.glass-card,
.portal-card.glass-card,
.hero-collage-card.glass-card,
.hero-spotlight-card.glass-card,
.featured-rail-card.glass-card,
.trends-card.glass-card,
.bubble-empty.glass-card {
  border-color: var(--home-panel-border-strong) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.latest-bubble.glass-card,
.media-slice__sticky.glass-card {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.hero-editorial.glass-card::before,
.hero-editorial.glass-card::after,
.hero-preview.glass-card::before,
.hero-preview.glass-card::after,
.hero-stat.glass-card::before,
.hero-stat.glass-card::after,
.portal-card.glass-card::before,
.portal-card.glass-card::after,
.hero-collage-card.glass-card::before,
.hero-collage-card.glass-card::after,
.hero-spotlight-card.glass-card::before,
.hero-spotlight-card.glass-card::after,
.featured-rail-card.glass-card::before,
.featured-rail-card.glass-card::after,
.trends-card.glass-card::before,
.trends-card.glass-card::after,
.bubble-empty.glass-card::before,
.bubble-empty.glass-card::after,
.media-slice__sticky.glass-card::before,
.media-slice__sticky.glass-card::after {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

@keyframes heroLineStageIn {
  from {
    opacity: 0;
    transform: translate3d(var(--hero-entry-x), var(--hero-entry-y), 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes heroMetaRise {
  from {
    opacity: 0;
    transform: translate3d(0, 1.75rem, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes homeScreenExitNorth {
  from {
    opacity: 1;
    transform: translate3d(0, 0rem, 0) scale(1);
  }

  to {
    opacity: 0.22;
    transform: translate3d(0, -5rem, 0) scale(0.92);
  }
}

@keyframes homeScreenEnterRise {
  from {
    opacity: 0.3;
    transform: translate3d(0, 5rem, 0) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0rem, 0) scale(1);
  }
}

@keyframes homeScreenEnterBloom {
  from {
    opacity: 0.24;
    transform: translate3d(0, 2.75rem, 0) scale(0.9);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0rem, 0) scale(1);
  }
}

@keyframes homeScreenExitCompress {
  from {
    opacity: 1;
    transform: translate3d(0, 0rem, 0) scale(1);
  }

  to {
    opacity: 0.18;
    transform: translate3d(0, -2rem, 0) scale(0.88);
  }
}

@keyframes homeScreenExitSettle {
  from {
    opacity: 1;
    transform: translate3d(0, 0rem, 0) scale(1);
  }

  to {
    opacity: 0.78;
    transform: translate3d(0, -1rem, 0) scale(0.985);
  }
}

@keyframes bubbleBurstFromCenter {
  0% {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.72);
  }

  58% {
    opacity: 1;
    transform: translate3d(
        calc(-50% + (var(--bubble-x) * 0.9)),
        calc(-50% + (var(--bubble-y) * 0.9)),
        0
      )
      scale(calc(var(--bubble-scale, 1) * 1.01));
  }

  100% {
    opacity: 1;
    transform: translate3d(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)), 0)
      scale(var(--bubble-scale, 1));
  }
}

@media (max-width: 1200px) {
  .rail-highlight,
  .media-slice__sticky {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-spotlight-stack {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .hero-spotlight-card--lead {
    min-block-size: auto;
  }

  .posts-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (min-width: 120rem) {
  .home-page {
    --home-stage-max-inline: min(100%, 108rem);
    --home-hero-max-inline: min(100%, 82rem);
    --home-hero-copy-max-inline: 44rem;
    --home-hero-aside-max-inline: 32rem;
    --home-feed-max-inline: min(100%, 96rem);
    --home-story-stage-max-inline: min(100%, 96rem);
    --home-story-card-max-inline: 78rem;
    --home-story-copy-max-inline: 29rem;
    --home-story-visual-max-inline: 33rem;
    --home-story-merge-max-inline: 80rem;
    --home-bubble-spread-inline: 1.14;
    --home-bubble-spread-block: 0.82;
    --home-bubble-max-inline: 20.5rem;
    --home-bubble-inner-max-inline: 16.25rem;
  }
}

@media (min-width: 180rem) {
  .home-page {
    --home-stage-max-inline: min(100%, 124rem);
    --home-hero-max-inline: min(100%, 96rem);
    --home-hero-copy-max-inline: 52rem;
    --home-hero-aside-max-inline: 36rem;
    --home-feed-max-inline: min(100%, 110rem);
    --home-story-stage-max-inline: min(100%, 110rem);
    --home-story-card-max-inline: 92rem;
    --home-story-copy-max-inline: 33rem;
    --home-story-visual-max-inline: 39rem;
    --home-story-merge-max-inline: 94rem;
    --home-bubble-spread-inline: 1.34;
    --home-bubble-spread-block: 0.92;
    --home-bubble-max-inline: 22.75rem;
    --home-bubble-inner-max-inline: 18.25rem;
  }

  .hero {
    align-items: flex-start;
    padding-block: max(var(--home-stage-safe-top), clamp(1.5rem, 2vw, 2rem))
      clamp(1.75rem, 3vw, 2.5rem);
  }

  .home-page .hero-layout {
    align-content: start;
    min-block-size: min(
      68rem,
      calc(var(--home-safe-block-size) - var(--home-stage-safe-top) - clamp(1.75rem, 3vw, 2.5rem))
    );
    padding-block-start: clamp(3.5rem, 4.8vw, 5rem);
  }

  .hero-copy {
    min-block-size: clamp(27rem, 52dvh, 34rem);
    gap: clamp(1.5rem, 2.6vw, 2rem);
  }

  .hero-title {
    font-size: clamp(3rem, 2.2vw, 4.6rem);
    line-height: 1.02;
    max-inline-size: 11ch;
  }

  .hero-subtitle {
    max-inline-size: 48ch;
    font-size: clamp(1.06rem, 0.8vw + 0.55rem, 1.28rem);
  }

  .bubble-stage::before {
    inline-size: clamp(16rem, 24vw, 22rem);
    block-size: clamp(9rem, 16vw, 13rem);
    opacity: 0.52;
  }

  .bubble-stage::after {
    inline-size: clamp(28rem, 44vw, 40rem);
    block-size: clamp(28rem, 44vw, 40rem);
    opacity: 0.18;
  }

  .latest-bubble__inner {
    padding: 0.95rem 1.1rem;
  }

  .latest-bubble__text {
    font-size: clamp(1rem, 0.74vw + 0.55rem, 1.28rem);
    line-height: 1.5;
  }

  .story-stage {
    gap: clamp(1.1rem, 1.6vw, 1.4rem);
    padding-block: calc(var(--home-stage-safe-top) + clamp(0.7rem, 1vw, 0.9rem))
      calc(clamp(1.1rem, 1.8vw, 1.45rem) + var(--home-stage-safe-bottom));
  }

  .media-slice-list {
    place-items: start center;
    padding-block: clamp(0.85rem, 1.3vw, 1.1rem) clamp(2rem, 3vw, 2.5rem);
    perspective-origin: 47% 20%;
  }

  .story-progress {
    padding: 0.75rem 1rem;
  }

  .media-slice__sticky {
    min-height: min(58dvh, 36rem);
    grid-template-columns: minmax(0, 1.08fr) minmax(21rem, 0.92fr);
    gap: clamp(1.5rem, 2.2vw, 2rem);
  }

  .media-slice__copy h3 {
    max-inline-size: 12ch;
    font-size: clamp(1.7rem, 1.7vw, 2.2rem);
  }

  .media-slice__copy > p {
    max-inline-size: 32ch;
    font-size: clamp(1rem, 0.62vw + 0.65rem, 1.16rem);
    -webkit-line-clamp: 3;
  }
}

@media (max-width: 1024px) {
  .hero-copy {
    grid-template-columns: 1fr;
    min-block-size: auto;
  }

  .hero-copy__left,
  .hero-copy__right {
    align-items: flex-start;
    text-align: start;
    padding-inline-end: 0;
  }

  .hero-subtitle {
    margin-inline-start: 0;
  }

  .hero-copy__divider {
    display: none;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .story-merge-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .portal-grid,
  .rail-featured-grid,
  .trends-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-panel--portal .portal-grid,
  .rail-panel--featured .rail-featured-grid,
  .rail-panel--trends .trends-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .rail-panel--portal .portal-grid > .portal-card--primary,
  .rail-panel--featured .rail-featured-grid > :first-child {
    grid-row: auto;
    min-block-size: clamp(15rem, 30vw, 20rem);
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(2),
  .rail-panel--featured .rail-featured-grid > :nth-child(3),
  .rail-panel--featured .rail-featured-grid > :nth-child(4),
  .rail-panel--trends .trends-card--authors,
  .rail-panel--trends .trends-card--tags,
  .rail-panel--trends .trends-card--editorial,
  .rail-panel--trends .trends-card--schedule {
    grid-column: auto;
    grid-row: auto;
  }

  .portal-sidebar,
  .portal-sidebar__row,
  .trends-authors-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .trends-card {
    min-block-size: auto;
  }

  .featured-rail-card--lead,
  .featured-rail-card--support,
  .featured-rail-card--compact {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 0.82fr) auto;
  }

  .featured-rail-card__media {
    min-block-size: clamp(10.5rem, 28vw, 15rem);
  }

  .schedule-highlight-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-collage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .hero-collage-card:nth-child(1),
  .hero-collage-card:nth-child(2),
  .hero-collage-card:nth-child(3),
  .hero-collage-card:nth-child(4),
  .hero-collage-card:nth-child(5) {
    grid-column: auto;
    grid-row: auto;
  }

  .hero-collage-card {
    grid-column: auto;
    grid-row: auto;
    min-height: clamp(7rem, 22dvh, 10rem);
  }

  .hero-collage-card--primary {
    grid-column: span 2;
  }
}

@media (min-width: 769px) and (max-width: 1280px), (min-width: 769px) and (max-height: 860px) {
  .page-section-head--stage {
    margin-block-end: clamp(0.3rem, 0.7vw, 0.45rem);
  }

  .page-section-copy h2 {
    max-inline-size: 14ch;
    font-size: clamp(1.45rem, 1.9vw, 1.9rem);
  }

  .page-section-copy p,
  .rail-panel--portal .portal-card--primary .portal-card__body p,
  .portal-card__micro-text,
  .featured-rail-card__summary,
  .trends-editorial__text,
  .trends-community-note__text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .rail-panel {
    padding: calc(
        var(--home-stage-safe-top) + var(--home-stage-chrome-height) +
          clamp(0.25rem, 0.6vw, 0.45rem)
      )
      clamp(0.875rem, 2vw, 1.5rem) clamp(0.75rem, 1.6vw, 1.15rem);
  }

  .rail-panel__content,
  .portal-grid,
  .rail-highlight,
  .rail-featured-grid,
  .trends-grid {
    gap: clamp(0.7rem, 1.3vw, 0.95rem);
  }

  .rail-panel--portal .portal-grid {
    grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  }

  .rail-panel--portal .portal-card--primary {
    gap: clamp(0.5rem, 1vw, 0.75rem);
    padding: clamp(0.75rem, 1.2vw, 0.9rem);
  }

  .rail-panel--portal .portal-card--primary .portal-card__preview {
    aspect-ratio: 16 / 8.6;
  }

  .rail-panel--portal .portal-card--primary .portal-card__copy,
  .portal-card,
  .hero-spotlight-card,
  .featured-rail-card,
  .trends-card {
    padding: clamp(0.75rem, 1.2vw, 0.9rem);
  }

  .portal-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .portal-card__stat:nth-child(n + 3) {
    display: none;
  }

  .rail-highlight {
    grid-template-columns: minmax(0, 1.08fr) minmax(13.5rem, 0.92fr);
  }

  .hero-spotlight-stack {
    gap: clamp(0.55rem, 1vw, 0.75rem);
  }

  .featured-rail-card__media {
    min-block-size: clamp(8.75rem, 17dvh, 10.5rem);
  }

  .featured-rail-card--lead .featured-rail-card__media {
    min-block-size: clamp(10.5rem, 22dvh, 13rem);
  }

  .posts-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .bubble-stage {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
    align-content: stretch;
    gap: clamp(0.55rem, 1vw, 0.75rem);
    padding: clamp(0.625rem, 1.2vw, 0.875rem);
  }

  .bubble-stage::before,
  .bubble-stage::after,
  .latest-bubble::after {
    display: none;
  }

  .latest-bubble {
    position: relative;
    inset: auto;
    inline-size: 100%;
    block-size: 100%;
    max-inline-size: none;
    opacity: 1;
    pointer-events: auto;
    transform: none !important;
    display: grid;
    min-block-size: 0;
  }

  .latest-bubble:nth-child(n + 5) {
    display: none;
  }

  .latest-bubble__inner {
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 0;
    max-inline-size: none;
    padding: clamp(0.625rem, 1.1vw, 0.8rem);
    gap: 0.375rem;
    transform: none;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .latest-bubble__text {
    -webkit-line-clamp: 3;
  }

  .rail-panel--trends .trends-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    block-size: 100%;
    align-content: stretch;
  }

  .rail-panel--trends .trends-card {
    block-size: 100%;
    min-block-size: 0;
  }

  .rail-panel--trends .trends-card--authors {
    grid-column: 1;
    grid-row: 1;
  }

  .rail-panel--trends .trends-card--tags {
    grid-column: 2;
    grid-row: 1;
  }

  .rail-panel--trends .trends-card--editorial {
    display: none;
  }

  .rail-panel--trends .trends-card--schedule {
    grid-column: 1 / -1;
    grid-row: 2;
    min-block-size: 0;
  }

  .trends-list > :nth-child(n + 4),
  .schedule-highlight-list > :nth-child(n + 3) {
    display: none;
  }

  .trends-authors-highlight {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 0.625rem 0.75rem;
  }

  .trends-authors-highlight__action {
    display: none;
  }

  .trends-list {
    gap: 0.5rem;
  }

  .trends-list > :nth-child(n + 3) {
    display: none;
  }

  .trend-author {
    min-block-size: 3.5rem;
    padding: 0.5rem 0.625rem;
  }

  .trend-author__name,
  .trend-author__count,
  .schedule-highlight__meta {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .trend-tags__stats,
  .schedule-cta__stats {
    display: none;
  }

  .schedule-highlight {
    gap: 0.25rem;
    padding: 0.5625rem 0.6875rem;
  }

  .schedule-highlight__title,
  .schedule-highlight__copy {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
  }

  .schedule-highlight__title {
    font-size: var(--text-sm);
    -webkit-line-clamp: 2;
  }

  .schedule-highlight__copy {
    display: none;
  }

  .media-slice-list {
    padding-block: clamp(1rem, 2vw, 1.4rem) clamp(1.5rem, 3vw, 2rem);
    perspective: clamp(16rem, 24vw, 26rem);
  }

  .media-slice__sticky {
    block-size: min(
      100%,
      calc(
        var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
          clamp(3.5rem, 7vw, 5rem)
      )
    );
    grid-template-columns: minmax(0, 1fr) minmax(13rem, 0.76fr);
    gap: clamp(0.85rem, 1.6vw, 1.2rem);
    padding: clamp(0.9rem, 1.6vw, 1.25rem);
  }

  .media-slice__copy {
    gap: clamp(0.55rem, 1vw, 0.75rem);
  }

  .media-slice__copy h3 {
    max-inline-size: 12ch;
    font-size: clamp(1.22rem, 1.7vw, 1.58rem);
  }
}

@media (min-width: 769px) and (max-height: 760px) {
  .trends-card {
    gap: 0.625rem;
    padding: 0.75rem;
  }

  .trends-card__header {
    gap: 0.5rem;
  }

  .trends-authors-shell {
    gap: 0.375rem;
  }

  .trends-authors-highlight {
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
  }

  .trends-authors-highlight__avatar.ui-avatar {
    inline-size: 2.25rem;
    block-size: 2.25rem;
  }

  .trend-author {
    min-block-size: 3rem;
    padding: 0.4375rem 0.5625rem;
  }

  .trend-author__avatar.ui-avatar {
    inline-size: 1.75rem;
    block-size: 1.75rem;
  }

  .trends-list > :nth-child(n + 2) {
    display: none;
  }

  .schedule-highlight__title {
    -webkit-line-clamp: 1;
  }
}

@media (max-width: 768px) {
  .home-page {
    --home-safe-block-size: var(--home-safe-block-size-mobile);
    --home-stage-safe-bottom: clamp(0.9rem, 2vw, 1.25rem);
    --home-screen-transition-ms: 0ms;
  }

  .hero,
  .rail-stage,
  .posts--bubble > .container,
  .story-stage {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    will-change: auto;
  }

  .hero {
    min-block-size: var(--home-safe-block-size-mobile);
    padding-block: max(var(--home-stage-safe-top), clamp(0.75rem, 3vw, 1.1rem))
      calc(env(safe-area-inset-bottom, 0rem) + clamp(1rem, 4vw, 1.35rem));
  }

  .hero-layout {
    grid-template-columns: minmax(0, 1fr);
    min-block-size: calc(
      var(--home-safe-block-size-mobile) - var(--home-stage-safe-top) - clamp(1rem, 4vw, 1.35rem)
    );
    align-items: center;
    align-content: center;
    justify-items: stretch;
    padding-block: 0;
  }

  .hero-copy {
    inline-size: 100%;
    max-inline-size: none;
    min-block-size: 0;
    gap: 0.875rem;
    align-self: center;
    justify-self: stretch;
    margin-block: auto;
  }

  .hero-copy__left,
  .hero-copy__right {
    gap: 0.75rem;
  }

  .hero-copy__right {
    inline-size: 100%;
    max-inline-size: 25rem;
    align-items: stretch;
  }

  .rail {
    block-size: auto;
    min-block-size: 0;
    padding-block: clamp(0.625rem, 3vw, 0.875rem) calc(0.875rem + var(--home-stage-safe-bottom));
    overflow: visible;
  }

  .rail-sticky,
  .rail-stage {
    position: relative;
    block-size: auto;
    min-block-size: 0;
    overflow: visible;
  }

  .hero-title {
    max-inline-size: 10ch;
    font-size: clamp(1.95rem, 8vw, 2.7rem);
    line-height: 1.02;
  }

  .hero-subtitle {
    max-inline-size: 28ch;
    font-size: var(--text-sm);
    line-height: 1.55;
  }

  .hero-editorial,
  .hero-preview {
    min-block-size: auto;
    padding: 0.875rem;
  }

  .hero-editorial__state {
    gap: 0.45rem;
  }

  .hero-editorial__title {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--text-base);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .hero-editorial__text,
  .hero-preview p {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .hero--animated .hero-copy__line,
  .hero--animated .hero-copy__right > * {
    opacity: 1;
    animation: none;
  }

  .page-section-head,
  .posts-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .rail-stage__chrome {
    display: none;
  }

  .rail-stage__dot {
    inline-size: 1.75rem;
  }

  .rail-stage__eyebrow,
  .story-progress {
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
  }

  .page-section-head--stage {
    margin-block-end: 0.35rem;
  }

  .page-section-copy {
    gap: 0.25rem;
  }

  .page-section-copy h2 {
    max-inline-size: 11ch;
    font-size: clamp(1.35rem, 6vw, 1.85rem);
    line-height: 1.06;
  }

  .page-section-copy p {
    max-inline-size: 26ch;
    font-size: var(--text-sm);
    line-height: 1.48;
  }

  .rail-track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: clamp(18.5rem, calc(100vw - 1.75rem), 22.625rem);
    inline-size: auto;
    block-size: auto;
    gap: 0.75rem;
    transform: none !important;
    will-change: auto;
    overflow-x: auto;
    overflow-y: visible;
    padding-inline: 0.875rem;
    padding-block-end: 0.375rem;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 0.875rem;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;
    scrollbar-width: none;
  }

  .rail-panel {
    flex: none;
    block-size: auto;
    min-inline-size: 0;
    padding: 0;
    overflow: visible;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  .rail-panel__content {
    inline-size: 100%;
    max-inline-size: none;
    block-size: auto;
    align-content: start;
    gap: 0.75rem;
    overflow: visible;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.625rem;
  }

  .hero-stats > :last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .hero-stats > :nth-child(n + 3) {
    display: none;
  }

  .hero-stat {
    min-inline-size: 0;
    padding: 0.75rem;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    inline-size: min(100%, 24rem);
    gap: 0.625rem;
    margin-top: 0;
  }

  .hero-btn {
    inline-size: 100%;
    min-inline-size: 0;
  }

  .hero-tags {
    display: grid;
    justify-items: start;
    gap: 0.4rem;
    margin-top: 0;
  }

  .hero-tag-list {
    gap: 0.4rem;
  }

  .hero-tag-list .hero-tag:nth-child(n + 5) {
    display: none;
  }

  .rail-panel__content--highlight .page-section-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-panel__meta--spotlight {
    display: none;
  }

  .rail-highlight {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.625rem;
  }

  .rail-panel__content--highlight .page-section-copy p {
    -webkit-line-clamp: 1;
  }

  .bubble-stage {
    min-block-size: 0;
  }

  .story-merge-panel {
    inset-inline: 0;
    gap: 0.625rem;
    padding: 0.75rem;
  }

  .hero-spotlight-stack {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .latest-bubble__inner {
    max-inline-size: min(18ch, 12rem);
  }

  .portal-card {
    gap: 0.75rem;
    padding: 0.875rem;
  }

  .portal-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .portal-card__icon {
    inline-size: 2.5rem;
    block-size: 2.5rem;
  }

  .portal-card__body h3 {
    font-size: var(--text-base);
  }

  .posts-toolbar__panel {
    padding: 0.75rem 0.875rem;
  }

  .posts--bubble {
    padding-block-end: calc(1rem + var(--home-stage-safe-bottom));
  }

  .story-stage {
    block-size: var(--home-safe-block-size);
    min-block-size: var(--home-safe-block-size);
    gap: 0.75rem;
    padding-block: calc(var(--home-stage-safe-top) + 0.625rem)
      calc(0.75rem + var(--home-stage-safe-bottom));
  }

  .media-slice-list {
    padding-block: 0.5rem 1.25rem;
    perspective: 16rem;
    perspective-origin: 50% 22%;
  }

  .rail-panel--portal .portal-grid > .portal-card--primary {
    min-block-size: clamp(9.5rem, 28dvh, 11rem);
    grid-template-rows: auto auto;
    align-content: stretch;
    gap: 0.625rem;
    padding: 0.75rem;
  }

  .rail-panel--portal .portal-card--primary .portal-card__preview {
    min-block-size: clamp(7.75rem, 20dvh, 9rem);
  }

  .rail-panel--portal .portal-card--primary .portal-card__copy {
    position: relative;
    inset: auto;
    inline-size: 100%;
    max-inline-size: none;
    margin-block-start: 0;
    margin-inline: 0;
    padding: 0.625rem 0.75rem;
    border-radius: var(--home-card-radius);
    background: var(--home-panel-bg-strong), var(--home-pill-bg);
    border: 0.0625rem solid var(--home-panel-border);
    box-shadow: var(--home-preview-shadow);
  }

  .rail-panel--portal .portal-card--primary .portal-card__body p,
  .rail-panel--portal .portal-card__micro-text {
    display: none;
  }

  .rail-panel--portal .portal-card--primary .portal-card__stats {
    display: none;
  }

  .rail-panel--portal .portal-card--primary .portal-card__body h3 {
    font-size: var(--text-base);
  }

  .rail-panel--portal .portal-card--primary .portal-card__header {
    gap: 0.5rem;
  }

  .rail-panel--portal .portal-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    gap: 0.625rem;
  }

  .portal-sidebar__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .portal-sidebar__row > :nth-child(n + 2) {
    display: none;
  }

  .rail-panel--portal .portal-card--secondary {
    gap: 0.625rem;
    min-block-size: 0;
  }

  .rail-panel--portal .portal-card__micro {
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
  }

  .portal-card__micro-title {
    font-size: var(--text-sm);
  }

  .rail-highlight {
    gap: 0.75rem;
  }

  .rail-highlight .hero-collage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr) minmax(0, 0.66fr);
    min-height: clamp(8rem, 18dvh, 9.75rem);
    gap: 0.375rem;
  }

  .rail-highlight .hero-collage-grid .hero-collage-card:nth-child(1) {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .rail-highlight .hero-collage-grid .hero-collage-card:nth-child(2) {
    grid-column: 1;
    grid-row: 2;
  }

  .rail-highlight .hero-collage-grid .hero-collage-card:nth-child(3) {
    grid-column: 2;
    grid-row: 2;
  }

  .rail-highlight .hero-collage-grid .hero-collage-card:nth-child(n + 4) {
    display: none;
  }

  .hero-spotlight-card {
    padding: 0.75rem;
    gap: 0.4rem;
  }

  .hero-spotlight-card--lead {
    min-block-size: clamp(6rem, 14dvh, 7.5rem);
  }

  .hero-spotlight-card:nth-child(n + 2) {
    display: none;
  }

  .hero-spotlight-card__summary {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .hero-spotlight-card__title {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--text-base);
    line-height: 1.3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .hero-collage-overlay {
    padding: 0.625rem;
  }

  .hero-collage-title {
    font-size: var(--text-xs);
  }

  .hero-collage-meta {
    font-size: 0.6875rem;
  }

  .rail-panel--featured .rail-featured-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-content: start;
  }

  .rail-panel--featured .rail-featured-grid > :first-child {
    grid-column: 1 / -1;
    grid-row: 1;
    min-block-size: 0;
  }

  .rail-feature-card {
    block-size: auto;
  }

  :deep(.rail-feature-card--lead .post-image-wrapper) {
    aspect-ratio: 16 / 10;
  }

  .featured-rail-card--lead,
  .featured-rail-card--support,
  .featured-rail-card--compact {
    min-block-size: 0;
    padding: 0.75rem;
    gap: 0.625rem;
  }

  .featured-rail-card__media {
    min-block-size: clamp(8.5rem, 20dvh, 10rem);
  }

  .featured-rail-card--lead .featured-rail-card__media {
    min-block-size: clamp(9.5rem, 22dvh, 11.5rem);
    aspect-ratio: 1.06 / 1;
  }

  .featured-rail-card__overlay {
    inset-inline: 0.625rem;
    inset-block-start: 0.625rem;
  }

  .featured-rail-card__kicker,
  .featured-rail-card__time {
    padding: 0.3125rem 0.5rem;
  }

  .featured-rail-card__body {
    gap: 0.375rem;
    padding: 0;
  }

  .featured-rail-card__title {
    font-size: clamp(0.98rem, 4.4vw, 1.12rem);
    line-height: 1.2;
    -webkit-line-clamp: 2;
  }

  .featured-rail-card--lead .featured-rail-card__title {
    font-size: clamp(1.14rem, 5vw, 1.34rem);
    -webkit-line-clamp: 3;
  }

  .featured-rail-card__summary,
  .featured-rail-card--lead .featured-rail-card__summary {
    max-inline-size: 100%;
    line-height: 1.5;
    -webkit-line-clamp: 2;
  }

  .featured-rail-card__stats {
    display: none;
  }

  .featured-rail-card__action {
    inline-size: 100%;
    gap: 0.35rem;
    padding: 0.5rem 0.75rem;
    overflow-wrap: anywhere;
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(3) {
    display: none;
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(4) {
    display: none;
  }

  .rail-panel--trends .trends-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .rail-panel--trends .trends-card--authors {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .rail-panel--trends .trends-card--tags {
    display: none;
  }

  .rail-panel--trends .trends-card--editorial {
    display: none;
  }

  .rail-panel--trends .trends-card--schedule {
    grid-column: 1 / -1;
    grid-row: 2;
    padding-inline-end: clamp(1.25rem, 16vw, 3.5rem);
    padding-block-end: clamp(1.25rem, 14vw, 2rem);
  }

  .trends-card {
    gap: 0.75rem;
    padding: 0.875rem;
  }

  .trends-card__header {
    align-items: flex-start;
  }

  .trends-list > :nth-child(n + 3) {
    display: none;
  }

  .trend-tags__stats,
  .schedule-cta__stats {
    display: none;
  }

  .trends-editorial__text,
  .trends-community-note__text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .trends-authors-highlight {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 0.625rem 0.75rem;
  }

  .trends-authors-highlight__action {
    display: none;
  }

  .trend-tags {
    gap: 0.375rem;
  }

  .trend-tags > :nth-child(n + 6) {
    display: none;
  }

  .schedule-highlight-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .schedule-highlight-list > :nth-child(n + 3) {
    display: none;
  }

  .trends-editorial {
    padding: 0.6875rem 0.75rem;
  }

  .trends-editorial__title {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .posts,
  .posts--bubble {
    block-size: var(--home-safe-block-size);
    min-block-size: var(--home-safe-block-size);
    padding-block: calc(var(--home-stage-safe-top) + 0.5rem)
      calc(0.875rem + var(--home-stage-safe-bottom));
    overflow: visible;
  }

  .posts--bubble > .container {
    min-block-size: calc(
      var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
        clamp(0.75rem, 3vw, 1rem)
    );
    gap: 0.625rem;
  }

  .posts-header {
    gap: 0.5rem;
  }

  .posts-header h2 {
    font-size: clamp(1.35rem, 6vw, 1.85rem);
  }

  .posts-subtitle {
    max-inline-size: 24ch;
    line-height: 1.45;
  }

  .posts-header__actions {
    inline-size: 100%;
    justify-content: flex-start;
  }

  .posts-toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    padding: 0.625rem;
  }

  .posts-toolbar__panel {
    gap: 0.375rem;
    padding: 0.625rem 0.6875rem;
  }

  .posts-toolbar__panel--filters {
    align-content: start;
  }

  .posts-toolbar__stats {
    gap: 0.375rem;
  }

  .posts-toolbar__stat:nth-child(n + 3),
  .tags-list .glass-tag:nth-child(n + 5),
  .filters-list .filter-pill:nth-child(n + 4) {
    display: none;
  }

  .bubble-stage {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 0.625rem;
    align-content: stretch;
    align-items: stretch;
    padding: 0.625rem;
    block-size: 100%;
    min-block-size: 0;
    max-block-size: 100%;
    overflow: clip;
  }

  .bubble-stage::before,
  .bubble-stage::after {
    display: none;
  }

  .latest-bubble {
    position: relative;
    inset: auto;
    inline-size: 100%;
    block-size: 100%;
    max-inline-size: none;
    opacity: 1;
    pointer-events: auto;
    transform: none !important;
    display: grid;
    min-block-size: 0;
  }

  .posts--revealed .latest-bubble {
    animation: none;
  }

  .latest-bubble:nth-child(n + 5) {
    display: none;
  }

  .latest-bubble::after {
    display: none;
  }

  .latest-bubble__inner {
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 0;
    grid-template-rows: minmax(0, 1fr) auto;
    max-inline-size: none;
    padding: 0.75rem 0.8125rem;
    border-radius: 1.125rem;
    transform: none;
    gap: 0.375rem;
  }

  .latest-bubble__text {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--text-base);
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
  }

  .latest-bubble__meta {
    gap: 0.35rem 0.5rem;
    flex-wrap: wrap;
  }

  .media-slice-list {
    inline-size: 100%;
    padding-block: 0.375rem 0.875rem;
    perspective: 14rem;
    perspective-origin: 50% 18%;
  }

  .media-slice {
    inset-inline: 0;
    filter: none;
    transform-origin: 50% 100%;
    transform: translate3d(0, calc(var(--story-translate-y, 0rem) * 0.68), 0)
      scale(var(--story-scale, 1));
  }

  .media-slice:not(.is-active) {
    opacity: 0.14 !important;
  }

  .media-slice:not(.is-active) .media-slice__copy {
    opacity: 0 !important;
  }

  .media-slice__sticky {
    inline-size: 100%;
    block-size: min(
      100%,
      calc(
        var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
          clamp(2.75rem, 8vw, 3.75rem)
      )
    );
    min-block-size: min(100%, 22rem);
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .media-slice__visual {
    inline-size: 100%;
    max-inline-size: none;
    margin-inline: auto;
    padding: 0.5rem;
    transform: none;
    will-change: auto;
  }

  .media-slice__copy {
    inline-size: 100%;
    max-inline-size: none;
    align-content: start;
    gap: 0.5rem;
    transform: none;
    opacity: 1;
    will-change: auto;
  }

  .media-slice__copy h3 {
    display: -webkit-box;
    overflow: hidden;
    max-inline-size: 15ch;
    font-size: clamp(1.18rem, 5.4vw, 1.42rem);
    line-height: 1.12;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    transform: none;
    will-change: auto;
  }

  .media-slice__copy > p {
    max-inline-size: 28ch;
    font-size: var(--text-sm);
    line-height: 1.55;
    -webkit-line-clamp: 2;
  }

  .media-slice__meta {
    gap: 0.5rem 0.75rem;
  }

  .media-slice__actions {
    gap: 0.625rem;
  }

  .media-slice__button.btn {
    min-block-size: 2.375rem;
    padding-inline: 0.875rem;
  }

  :deep(.media-slice__visual .post-card.glass-card) {
    inline-size: 100%;
    max-inline-size: none;
  }

  :deep(.media-slice__visual .post-image-wrapper) {
    aspect-ratio: 16 / 10;
  }

  :deep(.media-slice__visual .post-content) {
    gap: 0.35rem;
    padding: 0.625rem 0.75rem;
  }

  :deep(.media-slice__visual .post-title) {
    display: -webkit-box;
    overflow: hidden;
    font-size: clamp(1rem, 4.8vw, 1.15rem);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-height: 1.28;
  }

  :deep(.media-slice__visual .post-excerpt) {
    display: none;
  }

  :deep(.media-slice__visual .post-tags),
  :deep(.media-slice__visual .post-stats) {
    display: none;
  }
}

@media (max-width: 560px) {
  .hero-actions,
  .media-slice__actions,
  .story-merge-panel__links {
    inline-size: 100%;
  }

  .schedule-cta__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .trend-tags__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .portal-card__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-btn,
  .media-slice__button,
  .story-merge-panel__link {
    inline-size: 100%;
  }

  .bubble-stage {
    min-block-size: 0;
  }
}

@media (max-width: 420px) {
  .hero-actions,
  .hero-stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .rail-stage,
  .posts--bubble > .container,
  .story-stage,
  .story-merge-panel {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }

  .hero--animated .hero-copy__line,
  .hero--animated .hero-copy__right > *,
  .posts--revealed .latest-bubble,
  .posts--revealed .latest-bubble__inner {
    animation: none;
  }

  .rail-track {
    transition: none;
  }

  .hero-collage-image,
  .portal-card,
  .filter-pill,
  .page-inline-cta {
    transition: none;
  }

  .latest-bubble {
    opacity: 1;
    transform: translate3d(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)), 0)
      scale(var(--bubble-scale, 1));
  }

  .media-slice {
    transition: none;
  }
}
</style>
<style>
/* Extracted home sections render wrapper DOM inside child components, so their stage/layout
   styles must remain reachable without scoped attribute matching. */
.home-page .hero-layout {
  display: grid;
  align-items: center;
  align-content: center;
  justify-content: center;
  justify-items: center;
  inline-size: 100%;
  max-inline-size: var(--home-stage-max-inline);
  min-block-size: calc(
    var(--home-safe-block-size) - var(--home-stage-safe-top) - clamp(1.25rem, 3vw, 2.25rem)
  );
}

.home-page .rail-stage,
.home-page .posts--bubble > .container,
.home-page .story-stage {
  transform-origin: center center;
  backface-visibility: hidden;
  will-change: transform, opacity;
  transition: none;
}

.home-page .rail-stage {
  position: relative;
  block-size: 100%;
  opacity: var(--home-rail-opacity, 1);
  transform: translate3d(0, var(--home-rail-y, 0rem), 0) scale(var(--home-rail-scale, 1));
}

.home-page .posts--bubble > .container {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: clamp(0.875rem, 1.8vw, 1.25rem);
  inline-size: min(100%, var(--home-feed-max-inline));
  max-inline-size: var(--home-feed-max-inline);
  margin-inline: auto;
  min-block-size: calc(
    var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
      clamp(0.95rem, 2.4vw, 1.9rem)
  );
  opacity: var(--home-posts-opacity, 1);
  transform: translate3d(0, var(--home-posts-y, 0rem), 0) scale(var(--home-posts-scale, 1));
}

.home-page .rail-sticky {
  position: sticky;
  inset-block-start: 0;
  block-size: var(--home-safe-block-size);
  overflow: clip;
}

.home-page .rail-stage__chrome {
  position: absolute;
  inset-block-start: var(--home-stage-safe-top);
  inset-inline: clamp(1rem, 3vw, 2.5rem);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.home-page .rail-stage__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--home-chip-radius);
  background: var(--home-stage-chip-bg);
  border: 0.0625rem solid var(--home-stage-chip-border);
  backdrop-filter: var(--home-stage-backdrop);
}

.home-page .rail-stage__index {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.12em;
}

.home-page .rail-stage__label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.home-page .rail-stage__dots {
  display: inline-flex;
  gap: 0.5rem;
}

.home-page .rail-stage__dot {
  inline-size: 2rem;
  block-size: 0.1875rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.18);
  transition:
    transform var(--transition-fast),
    background-color var(--transition-fast);
}

.home-page .rail-stage__dot.is-active {
  transform: scaleX(1.1);
  background: linear-gradient(135deg, var(--home-accent) 0%, var(--home-accent-soft) 100%);
}

.home-page .rail-track {
  display: flex;
  inline-size: calc(var(--rail-slide-count, 1) * 100%);
  block-size: 100%;
  gap: 0;
  overflow: visible;
  padding: 0;
  margin: 0;
  scroll-snap-type: none;
  will-change: transform;
  transition: none;
}

.home-page .story-stage {
  position: sticky;
  inset-block-start: 0;
  inline-size: min(100%, var(--home-story-stage-max-inline));
  max-inline-size: var(--home-story-stage-max-inline);
  margin-inline: auto;
  block-size: var(--home-safe-block-size);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(0.95rem, 1.8vw, 1.25rem);
  padding-block: calc(var(--home-stage-safe-top) + clamp(0.95rem, 1.9vw, 1.2rem))
    calc(clamp(1.15rem, 2.2vw, 1.55rem) + var(--home-stage-safe-bottom));
  overflow: clip;
  opacity: var(--home-story-opacity, 1);
  transform: translate3d(0, var(--home-story-y, 0rem), 0) scale(var(--home-story-scale, 1));
}

.home-page .story-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--home-story-stage-bg);
  opacity: calc(1 - (var(--story-footer-fade, 0) * 0.24));
  pointer-events: none;
}

.home-page .story-stage > * {
  position: relative;
  z-index: 1;
}

@media (min-width: 180rem) {
  .home-page .hero-layout {
    align-content: start;
    min-block-size: min(
      68rem,
      calc(var(--home-safe-block-size) - var(--home-stage-safe-top) - clamp(1.75rem, 3vw, 2.5rem))
    );
    padding-block-start: clamp(3rem, 4vw, 4.5rem);
  }

  .home-page .hero-copy {
    min-block-size: clamp(24rem, 44dvh, 31rem);
    gap: clamp(1.35rem, 2.3vw, 1.85rem);
  }

  .home-page .posts--bubble > .container {
    gap: clamp(0.95rem, 1.4vw, 1.15rem);
  }

  .home-page .story-stage {
    gap: clamp(1.1rem, 1.6vw, 1.4rem);
    padding-block: calc(var(--home-stage-safe-top) + clamp(0.7rem, 1vw, 0.9rem))
      calc(clamp(1.1rem, 1.8vw, 1.45rem) + var(--home-stage-safe-bottom));
  }
}

@media (max-width: 768px) {
  .home-page {
    --home-story-scroll-travel: clamp(7rem, 14dvh, 9.5rem);
  }

  .home-page .rail,
  .home-page .posts,
  .home-page .posts--bubble {
    min-block-size: var(--home-safe-block-size);
  }

  .home-page .media-slices {
    min-block-size: calc(
      var(--home-safe-block-size) +
        ((var(--story-card-count, 1) - 1) * var(--home-story-scroll-travel))
    );
  }

  .home-page .rail-stage,
  .home-page .posts--bubble > .container,
  .home-page .story-stage {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    will-change: auto;
  }

  .home-page .hero-layout {
    grid-template-columns: minmax(0, 1fr);
    min-block-size: calc(
      var(--home-safe-block-size-mobile) - var(--home-stage-safe-top) - clamp(1rem, 4vw, 1.35rem)
    );
    align-items: center;
    align-content: center;
    justify-items: stretch;
    padding-block: 0;
  }

  .home-page .rail-sticky,
  .home-page .rail-stage {
    position: relative;
    block-size: auto;
    min-block-size: var(--home-safe-block-size);
    overflow: visible;
  }

  .home-page .posts--bubble > .container {
    min-block-size: calc(
      var(--home-safe-block-size) - var(--home-stage-safe-top) - var(--home-stage-safe-bottom) -
        clamp(0.75rem, 3vw, 1rem)
    );
  }

  .home-page .rail-stage__chrome {
    display: none;
  }

  .home-page .rail-stage__dot {
    inline-size: 1.75rem;
  }

  .home-page .rail-stage__eyebrow,
  .home-page .story-progress {
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
  }

  .home-page .rail-track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: clamp(18.5rem, calc(100vw - 1.75rem), 22.625rem);
    inline-size: auto;
    block-size: auto;
    gap: 0.75rem;
    transform: none !important;
    will-change: auto;
    overflow-x: auto;
    overflow-y: visible;
    padding-inline: 0.875rem;
    padding-block-end: 0.375rem;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 0.875rem;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .home-page .story-stage {
    block-size: var(--home-safe-block-size);
    min-block-size: var(--home-safe-block-size);
    gap: 0.75rem;
    padding-block: calc(var(--home-stage-safe-top) + 0.625rem)
      calc(0.75rem + var(--home-stage-safe-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page .rail-stage,
  .home-page .posts--bubble > .container,
  .home-page .story-stage,
  .home-page .story-merge-panel {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }

  .home-page .rail-track {
    transition: none;
  }
}
</style>
