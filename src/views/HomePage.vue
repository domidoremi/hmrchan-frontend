<template>
  <div class="home-page" :style="homePageMotionStyle">
    <HomeQuickNav
      :anchors="homeQuickNavAnchors"
      :active-id="activeHomeSectionId"
      :side="settings.homeQuickNavSide"
      @navigate="scrollToHomeSection"
      @update:side="updateHomeQuickNavSide"
    />

    <section id="home-fold" class="home-fold home-screen">
      <HeroSection :enabled="settings.showHeroSection" :animated="shouldAnimate">
        <div class="hero-copy">
          <div class="hero-copy__left">
            <h1 class="hero-title hero-copy__line hero-copy__line--title">
              {{ $t('home.hero.title') }}
            </h1>
            <p class="hero-subtitle hero-copy__line hero-copy__line--subtitle">
              {{ $t('home.hero.subtitle') }}
            </p>
          </div>

          <span class="hero-copy__divider" aria-hidden="true" />

          <div class="hero-copy__right">
            <div class="hero-letterbook-media" :aria-label="$t('home.letterbook.mediaLabel')">
              <template v-if="spotlightMediaCards.length > 0">
                <button
                  v-for="(card, index) in spotlightMediaCards.slice(0, 2)"
                  :key="`hero-letterbook-${card.post.id}`"
                  type="button"
                  class="hero-letterbook-frame"
                  :class="`hero-letterbook-frame--${index + 1}`"
                  :aria-label="card.title"
                  @click="openPostPreview(card.post, card.thumbnail)"
                >
                  <img
                    v-if="shouldRenderHomeMedia(card.thumbnail)"
                    :src="card.thumbnail"
                    :srcset="resolveHomeImageSrcsetAttribute(card.thumbnail)"
                    :alt="card.title"
                    :sizes="
                      index === 0
                        ? '(max-width: 48rem) 68vw, 32vw'
                        : '(max-width: 48rem) 48vw, 18vw'
                    "
                    class="hero-letterbook-image"
                    decoding="async"
                    :loading="index === 0 ? 'eager' : 'lazy'"
                    :fetchpriority="index === 0 ? 'high' : 'auto'"
                    @error="markHomeMediaFailed(card.thumbnail)"
                  />
                  <span v-else class="hero-letterbook-placeholder">
                    <AnimatedIcon name="image" :fallback-icon="Image" size="lg" />
                    <span>{{ card.title }}</span>
                  </span>
                  <span v-if="index === 0" class="hero-letterbook-caption">
                    {{ card.title }}
                  </span>
                </button>
              </template>
              <template v-else>
                <RouterLink to="/explore" class="hero-letterbook-frame hero-letterbook-frame--1">
                  <img
                    :src="'/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp'"
                    :alt="$t('home.letterbook.todayTitle')"
                    sizes="(max-width: 48rem) 68vw, 32vw"
                    class="hero-letterbook-image"
                    decoding="async"
                    loading="eager"
                    fetchpriority="high"
                  />
                  <span class="hero-letterbook-caption">
                    {{ $t('home.letterbook.photoCaption') }}
                  </span>
                </RouterLink>
                <RouterLink
                  to="/schedule"
                  class="hero-letterbook-frame hero-letterbook-frame--2"
                  :aria-label="$t('home.letterbook.scheduleTitle')"
                >
                  <img
                    :src="'/snapshot-media/home/story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp'"
                    :alt="$t('home.letterbook.scheduleTitle')"
                    sizes="(max-width: 48rem) 48vw, 18vw"
                    class="hero-letterbook-image"
                    decoding="async"
                    loading="eager"
                  />
                </RouterLink>
              </template>
            </div>

            <div class="hero-editorial" :class="resolveHeroEditorialClasses(heroEditorialVisible)">
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

      <nav class="home-letterbook-index" :aria-label="$t('home.letterbook.indexLabel')">
        <RouterLink to="/explore" class="home-letterbook-index__item">
          <span class="home-letterbook-index__number">01</span>
          <span>
            <strong>{{ $t('home.letterbook.todayTitle') }}</strong>
            <small>{{ $t('home.letterbook.todayText') }}</small>
          </span>
        </RouterLink>
        <RouterLink to="/schedule" class="home-letterbook-index__item">
          <span class="home-letterbook-index__number">02</span>
          <span>
            <strong>{{ $t('home.letterbook.scheduleTitle') }}</strong>
            <small>{{ $t('home.letterbook.scheduleText') }}</small>
          </span>
        </RouterLink>
        <RouterLink to="/community" class="home-letterbook-index__item">
          <span class="home-letterbook-index__number">03</span>
          <span>
            <strong>{{ $t('home.letterbook.communityTitle') }}</strong>
            <small>{{ $t('home.letterbook.communityText') }}</small>
          </span>
        </RouterLink>
      </nav>
    </section>

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
                :style="resolvePortalLeadPreviewStyle(Boolean(portalLeadCard.thumbnail))"
              >
                <img
                  v-if="shouldRenderHomeMedia(portalLeadCard.thumbnail)"
                  :src="portalLeadCard.thumbnail"
                  :srcset="resolveHomeImageSrcsetAttribute(portalLeadCard.thumbnail)"
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
                    :class="resolvePortalCardIconClasses(portalPanels[0].key)"
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
                    <div class="portal-card__icon" :class="resolvePortalCardIconClasses(panel.key)">
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
                    :class="resolveHeroCollageCardClasses(index, Boolean(card.thumbnail))"
                    @click="openPostPreview(card.post, card.thumbnail)"
                  >
                    <img
                      v-if="shouldRenderHomeMedia(card.thumbnail)"
                      class="hero-collage-image"
                      :src="card.thumbnail"
                      :srcset="resolveHomeImageSrcsetAttribute(card.thumbnail)"
                      :alt="card.title"
                      v-bind="resolveHeroCollageImagePresentation(index)"
                      decoding="async"
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
                :class="resolveHeroSpotlightCardClasses(index, Boolean(card.supportText))"
                @click="openPostPreview(card.post, null)"
              >
                <span class="hero-spotlight-card__label">
                  {{
                    resolveHeroSpotlightLabel(index, $t('home.hero.editorialLabel'), card.author)
                  }}
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
                :class="
                  resolveFeaturedRailCardPresentationClasses(index, card.summary, card.thumbnail)
                "
                @click="openPostPreview(card.post, card.thumbnail)"
              >
                <div
                  class="featured-rail-card__media"
                  :class="resolveFeaturedRailMediaClasses(Boolean(card.thumbnail))"
                >
                  <img
                    v-if="shouldRenderHomeMedia(card.thumbnail)"
                    :src="card.thumbnail"
                    :srcset="resolveHomeImageSrcsetAttribute(card.thumbnail)"
                    :alt="card.title"
                    class="featured-rail-card__image"
                    v-bind="resolveFeaturedRailImagePresentation(index)"
                    decoding="async"
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
                v-bind="resolveFeaturedRailPostPresentation(index)"
                :post="post"
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
                    :src="resolveHomeImageSourceAttribute(leadingTrendingAuthor.avatar)"
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
                      :src="resolveHomeImageSourceAttribute(author.avatar)"
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
                  :class="resolveTrendsEditorialClasses(Boolean(heroEditorialSupportText))"
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
                :class="resolveScheduleHighlightListClasses(Boolean(trendsScheduleCompanion))"
              >
                <RouterLink
                  v-for="item in primaryScheduleHighlights"
                  :key="`schedule-highlight-${item.id}`"
                  :to="resolveScheduleHighlightRoute(item.deep_link)"
                  class="schedule-highlight"
                >
                  <span class="schedule-highlight__label">
                    {{
                      resolveScheduleHighlightLabel(
                        item.badge,
                        getScheduleCategoryLabel(item.category, t)
                      )
                    }}
                  </span>
                  <strong class="schedule-highlight__title">{{ item.title }}</strong>
                  <span class="schedule-highlight__meta">
                    {{
                      resolveScheduleHighlightMetaText(
                        formatScheduleHighlightMeta(item),
                        formatHomeAuthorName(item.author),
                        $t('home.trends.scheduleAction')
                      )
                    }}
                  </span>
                </RouterLink>
                <RouterLink
                  v-if="trendsScheduleCompanion"
                  :to="trendsScheduleCompanion.to"
                  class="schedule-highlight schedule-highlight--companion"
                  :class="resolveScheduleHighlightCompanionClasses(trendsScheduleCompanion.kind)"
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
            :class="resolvePostsToolbarStatsClasses(postsToolbarTags.length > 0)"
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
          :class="
            resolveBubbleStageClasses({
              layoutTier: bubbleLayoutTier,
              hasActiveBubble,
              isMotionActive: bubbleMotionFrameActive,
            })
          "
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
          <span>{{ formatHomeStoryProgressNumber(activeStoryIndex + 1) }}</span>
          <span>/</span>
          <span>{{ formatHomeStoryProgressNumber(effectiveStoryCardCount) }}</span>
        </div>
      </header>

      <div class="media-slice-list">
        <template v-if="storyCards.length > 0">
          <article
            v-for="(card, index) in storyCards"
            :key="`media-${card.post.id}`"
            class="media-slice"
            :class="resolveHomeMediaSliceClasses(activeStoryIndex === index)"
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
import { isFilteredAuthor } from '@/config/filters'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { prewarmPublicHomeContent } from '@/utils/cache'
import {
  type BubbleLayoutTier,
  buildHomePostsFromAggregate,
  clamp,
  formatHomeAuthorName,
  getScheduleCategoryLabel,
  hasHomeActiveBubble,
  isHomeBubbleInteractiveTier,
  normalizeText,
  resolveHomeSelectedBubbleId,
  resolveBubbleLayoutTier,
  shouldMountHomePreviewController,
} from '@/views/homepage/homeModel'
import {
  resolveHomePostDetailAction,
  resolveHomePostPreviewAction,
} from '@/views/homepage/homePostPreviewAction'
import {
  resolveFeaturedRailCardPresentationClasses,
  resolveFeaturedRailImagePresentation,
  resolveFeaturedRailMediaClasses,
  resolveFeaturedRailPostPresentation,
  resolveHeroCollageCardClasses,
  resolveHeroCollageImagePresentation,
  resolveHeroEditorialClasses,
  resolveHeroSpotlightCardClasses,
  resolveHeroSpotlightLabel,
  resolveHomeImageSourceAttribute,
  resolveHomeImageSrcsetAttribute,
  resolvePortalCardIconClasses,
  resolvePortalLeadPreviewStyle,
  resolveTrendsEditorialClasses,
} from '@/views/homepage/homeImagePolicy'
import {
  collectHomePrewarmMedia,
  createEmptyHomeAggregate,
  createEmptyHomeSupportRefreshTargets,
  hasPendingHomeSupportRefresh,
  resolveHomeMediaFailureMarkState,
  resolveHomePublicPrewarmLimits,
  resolveHomeTotalCount,
  resolveHomeSupportRefreshKinds,
  resolveHomeSupportRefreshRunState,
  resolveHomeSupportRefreshTargets,
  resolveHomeSupportRefreshUpdates,
  resolvePostsToolbarStatsClasses,
  resolveScheduleHighlightCompanionClasses,
  resolveScheduleHighlightLabel,
  resolveScheduleHighlightListClasses,
  resolveScheduleHighlightMetaText,
  resolveScheduleHighlightRoute,
  shouldRenderHomeMediaSource,
  type HomeDataSource,
  type HomeSupportRefreshKind,
  type HomeSupportRefreshResult,
  type HomeSupportRefreshTargets,
} from '@/views/homepage/homeSupportPolicy'
import {
  buildHomeFooterBlendStyle,
  buildHomeFeaturedSceneStyle,
  buildHomePageMotionStyle,
  buildHomeRailSlides,
  buildHomeRailTrackStyle,
  buildHomeSceneSnap,
  buildHomeStoryCardStyle,
  buildHomeStorySceneStyle,
  formatHomeStoryProgressNumber,
  HOME_FOOTER_BLEND_PROPERTIES,
  HOME_NO_GLASS_BACKDROP_STYLE,
  measureHomeViewportBlend,
  resolveHomeActiveRailIndex,
  resolveHomeActiveRailSlide,
  resolveHomeBubbleCanvasFrameParameters,
  resolveHomeBubbleCanvasOrbCount,
  resolveHomeBubbleCanvasOrbFrameState,
  resolveHomeBubbleCanvasOrbSeedState,
  resolveHomeBubbleCanvasRetainedOrbState,
  resolveHomeBubbleCanvasResizeState,
  resolveHomeMeasuredSceneGeometry,
  resolveHomeMediaSliceClasses,
  resolveHomeRailLockActive,
  resolveHomeSceneCapabilities,
  resolveHomeSceneLayoutRefresh,
  resolveHomeSceneLayoutSize,
  resolveHomeStorySceneProgress,
  resolveHomeViewportSceneBlendState,
  shouldUseHomeAnimations,
  type HomeBubbleCanvasOrbSeedState,
  type HomeMeasuredSceneGeometryInput,
  type HomeSceneLayoutSize,
} from '@/views/homepage/homeScenePolicy'
import {
  resolveDeferredHomeEnhancementIntersectionAction,
  resolveDeferredHomeEnhancementStartupDecision,
  resolveHomeEnhancementScheduleDecision,
  resolveHomeSceneActivationDecision,
  shouldActivateHomeBubbleEnhancements,
  shouldBindDeferredHomeSceneIntent,
  shouldCleanupDeferredHomeEnhancementObserver,
  shouldContinueHomeBubbleEnhancementSetup,
  shouldScheduleHomeEnhancements,
  shouldStartHomeBubbleCanvasScene,
  shouldUnbindDeferredHomeSceneIntent,
} from '@/views/homepage/homeSceneActivationPolicy'
import {
  resolveBubbleActivePresentationState,
  resolveBubbleFramePresentationState,
  resolveBubbleFrameResetPresentationState,
  resolveBubbleStageClasses,
} from '@/views/homepage/bubbleFramePresentation'
import {
  computeBubbleFrameState,
  resolveBubbleElementRegistrationState,
  resolveBubbleActiveState,
  resolveBubbleFrameDeltaMs,
  resolveBubbleHoverClearState,
  resolveBubbleHoverSetState,
  resolveBubbleInteractionState,
  resolveBubbleMotionStepState,
  resolveBubbleMotionTargetDecision,
  resolveBubblePointerState,
  resolveBubblePointerOverState,
  resolveBubbleStageMetrics,
  resolveBubbleStagePointerPresenceState,
  resolveBubbleStagePointerState,
  shouldRunBubbleMotionLoop as shouldRunBubbleMotionLoopPolicy,
  type BubbleAnchorMetrics,
  type BubbleForceCenter,
  type BubbleFrameState,
  type BubbleHoverSource,
  type BubbleInteractionAction,
  type BubblePointerPosition,
  type BubblePointerState,
  type BubbleStagePointerPresenceAction,
  type BubbleStageMetrics,
} from '@/views/homepage/bubbleMotion'
import {
  resolveBubbleRevealLifecycleAction,
  resolveBubbleRevealResetState,
  resolveBubbleRevealRetreatState,
  resolveBubbleRevealRestartState,
  resolveBubbleRevealViewportAction,
  resolveBubbleRevealWindow,
  shouldResetBubbleFrameStylesOnMotionStop,
  type BubbleRevealLifecycleAction,
  type BubbleRevealPhase,
} from '@/views/homepage/bubbleRevealState'
import { useHomeViewModel } from '@/views/homepage/useHomeViewModel'
import { useHomeQuickNav } from '@/views/homepage/useHomeQuickNav'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Avatar from '@/components/ui/Avatar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { HeroSection, HomeQuickNav } from '@/components/home'
import { createResizeObserver, createVisibilityObserver, scheduleTask } from '@/utils/modernAPIs'
import { ensureSmoothScrollTriggerBridge } from '@/composables/useSmoothScroll'
type GsapModule = typeof import('gsap')
type ScrollTriggerModule = typeof import('gsap/ScrollTrigger')
type ScrollTriggerInstance = InstanceType<ScrollTriggerModule['ScrollTrigger']>
let gsapModule: GsapModule['default'] | null = null
let scrollTriggerModule: ScrollTriggerModule['ScrollTrigger'] | null = null
let scrollTriggerReadyPromise: Promise<boolean> | null = null
let homeEnhancementsDisposed = false
const BUBBLE_EXIT_DURATION_MS = 420
const BUBBLE_POINTER_ATTACK_MS = 220
const BUBBLE_POINTER_RELEASE_MS = 360
const BUBBLE_FORCE_CENTER_LERP_MS = 180
const HOME_ENHANCEMENTS_DELAY_MS = 1200
const HOME_SCENE_ACTIVATION_DELAY_MS = 140
const PORTAL_LEAD_IMAGE_SIZE = Object.freeze({ width: 1600, height: 1000 })
const PORTAL_LEAD_IMAGE_SIZES = '(min-width: 1280px) 34rem, (min-width: 768px) 92vw, 100vw'
let homepageBootstrapFallbackPromise: Promise<HomeAggregateResponse> | null = null
async function loadHomepageBootstrapFallback(): Promise<HomeAggregateResponse> {
  if (!homepageBootstrapFallbackPromise) {
    homepageBootstrapFallbackPromise = import('@/fallbacks/homepageBootstrapFallback').then(
      ({ buildHomepageBootstrapFallback }) => buildHomepageBootstrapFallback()
    )
  }
  return homepageBootstrapFallbackPromise
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
const shouldAnimate = computed(() =>
  shouldUseHomeAnimations(settings.value.enableAnimations, prefersReducedMotion())
)
const noGlassBackdropStyle = HOME_NO_GLASS_BACKDROP_STYLE
const initialHomeAggregate = createEmptyHomeAggregate()
const initialHomePosts: PostListItem[] = []
let homeSupportRefreshController: AbortController | null = null
let pendingHomeSupportRefresh: HomeSupportRefreshTargets = {
  schedule: false,
  community: false,
}
const posts = ref<PostListItem[]>(initialHomePosts)
const allPosts = ref<PostListItem[]>(initialHomePosts)
const isPreviewOpen = ref(false)
const previewPostId = ref<string | null>(null)
const previewThumbnailSrc = ref<string | null>(null)
const previewPost = ref<PostListItem | null>(null)
const shouldMountHomepagePreviewController = computed(() =>
  shouldMountHomePreviewController(isPreviewOpen.value)
)
const hoveredBubbleId = ref<string | null>(null)
const hoveredBubbleSource = ref<BubbleHoverSource | null>(null)
const selectedBubbleId = computed(() =>
  resolveHomeSelectedBubbleId({
    previewOpen: isPreviewOpen.value,
    previewPostId: previewPostId.value,
  })
)
const hasActiveBubble = computed(() =>
  hasHomeActiveBubble({
    selectedBubbleId: selectedBubbleId.value,
    hoveredBubbleId: hoveredBubbleId.value,
  })
)
const pointerInsideBubbleStage = ref(false)
const pointerOverBubbleId = ref<string | null>(null)
const pointerStagePosition = ref<BubblePointerPosition>({
  x: null,
  y: null,
  normalizedX: 0.5,
  normalizedY: 0.5,
})
const bubbleMotionFrameActive = ref(false)

const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const total = ref(
  resolveHomeTotalCount({
    postCount: initialHomePosts.length,
    storyDeckTotal: initialHomeAggregate.story_deck.total,
  })
)
const homeAggregate = ref<HomeAggregateResponse | null>(initialHomeAggregate)
const homeScheduleHighlights = ref<HomeScheduleHighlight[]>(
  initialHomeAggregate.trends.schedules ?? []
)
const homeCommunityHighlights = ref<HomeCommunityHighlight[]>(
  initialHomeAggregate.trends.community ?? []
)
const homeDataSource = ref<'idle' | HomeDataSource>('idle')
const failedHomeMediaUrls = ref<Set<string>>(new Set())
type HomeSectionInstance = {
  element: HTMLElement | null
}
const postsSectionRef = useTemplateRef<HomeSectionInstance>('postsSectionRef')
const bubbleStageRef = useTemplateRef<HTMLElement>('bubbleStageRef')
const bubbleCanvasRef = useTemplateRef<HTMLCanvasElement>('bubbleCanvasRef')
const featuredSectionRef = useTemplateRef<HomeSectionInstance>('featuredSectionRef')
const storyDeckRef = useTemplateRef<HomeSectionInstance>('storyDeckRef')
const {
  activeHomeSectionId,
  disconnectHomeSectionObserver,
  homeQuickNavAnchors,
  observeHomeSections,
  scrollToHomeSection,
  updateHomeQuickNavSide,
} = useHomeQuickNav({
  setHomeQuickNavSide: (side) => settingsStore.setHomeQuickNavSide(side),
  shouldAnimate,
})
const railProgress = ref(0)
const storyProgress = ref(0)
const bubbleLayoutTier = ref<BubbleLayoutTier>('desktop')
const bubbleRevealPhase = ref<BubbleRevealPhase>('idle')
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
  formatCommunityHighlightMeta,
  formatScheduleHighlightMeta,
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
  hiddenTrendingAuthorCount,
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
  secondaryTrendingAuthors,
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
function resolveSectionElement(
  section: HomeSectionInstance | null | undefined
): HTMLElement | null {
  return section?.element ?? null
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
const isBubbleInteractiveTier = computed(() => isHomeBubbleInteractiveTier(bubbleLayoutTier.value))
function seedBubbleCanvasOrbs(width: number, height: number) {
  const count = resolveHomeBubbleCanvasOrbCount(bubbleLayoutTier.value)
  bubbleCanvasOrbs = Array.from({ length: count }, (_, index) =>
    resolveHomeBubbleCanvasOrbSeedState({
      width,
      height,
      tier: bubbleLayoutTier.value,
      index,
      randoms: {
        x: Math.random(),
        y: Math.random(),
        radius: Math.random(),
        driftX: Math.random(),
        driftY: Math.random(),
        alpha: Math.random(),
        phase: Math.random(),
        phaseSpeed: Math.random(),
      },
    })
  )
}

function resizeBubbleCanvasScene() {
  if (typeof window === 'undefined') return

  const canvas = bubbleCanvasRef.value
  const stage = bubbleStageRef.value
  if (!canvas || !stage) return

  const rect = stage.getBoundingClientRect()
  const resizeState = resolveHomeBubbleCanvasResizeState({
    width: rect.width,
    height: rect.height,
    devicePixelRatio: window.devicePixelRatio,
    tier: bubbleLayoutTier.value,
    currentOrbCount: bubbleCanvasOrbs.length,
  })
  const { width, height } = resizeState

  canvas.width = resizeState.canvasWidth
  canvas.height = resizeState.canvasHeight
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  if (resizeState.shouldSeedOrbs) {
    seedBubbleCanvasOrbs(width, height)
  } else {
    bubbleCanvasOrbs = bubbleCanvasOrbs.map((orb) => ({
      ...orb,
      ...resolveHomeBubbleCanvasRetainedOrbState({
        x: orb.x,
        y: orb.y,
        radius: orb.radius,
        width,
        height,
        maxOrbRadius: resizeState.maxOrbRadius,
      }),
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

  const deltaMs = resolveBubbleFrameDeltaMs(timestamp, bubbleCanvasLastTimestamp)
  bubbleCanvasLastTimestamp = timestamp
  const frameParameters = resolveHomeBubbleCanvasFrameParameters({
    width: rect.width,
    height: rect.height,
    devicePixelRatio: window.devicePixelRatio,
    pointerX: pointerStagePosition.value.x,
    pointerY: pointerStagePosition.value.y,
    shouldAnimate: shouldAnimate.value,
  })
  const { width, height, dpr, pointerX, pointerY, motionFactor } = frameParameters

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
    const orbFrameState = resolveHomeBubbleCanvasOrbFrameState({
      ...orb,
      width,
      height,
      pointerX,
      pointerY,
      motionFactor,
      deltaMs,
    })
    orb.phase = orbFrameState.phase
    orb.x = orbFrameState.x
    orb.y = orbFrameState.y

    const gradient = context.createRadialGradient(
      orbFrameState.drawX,
      orbFrameState.drawY,
      0,
      orbFrameState.drawX,
      orbFrameState.drawY,
      orbFrameState.drawRadius
    )
    gradient.addColorStop(0, orbFrameState.innerColor)
    gradient.addColorStop(0.55, orbFrameState.middleColor)
    gradient.addColorStop(1, orbFrameState.outerColor)
    context.fillStyle = gradient
    context.beginPath()
    context.arc(orbFrameState.drawX, orbFrameState.drawY, orbFrameState.drawRadius, 0, Math.PI * 2)
    context.fill()
  }

  bubbleCanvasFrame = window.requestAnimationFrame(renderBubbleCanvasFrame)
}

function startBubbleCanvasScene() {
  if (
    !shouldStartHomeBubbleCanvasScene({
      hasWindow: typeof window !== 'undefined',
      frameActive: bubbleCanvasFrame !== null,
      hasCanvasElement: bubbleCanvasRef.value !== null,
      useCanvasScene: shouldUseHomeBubbleCanvasScene(),
    })
  ) {
    return
  }
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

function applyBubbleFramePresentationState(
  element: HTMLButtonElement,
  presentationState: ReturnType<typeof resolveBubbleFramePresentationState>
) {
  for (const [propertyName, value] of Object.entries(presentationState.styleProperties)) {
    element.style.setProperty(propertyName, value)
  }
  element.classList.toggle('is-displaced', presentationState.classStates.isDisplaced)
  element.classList.toggle('is-under-pressure', presentationState.classStates.isUnderPressure)
}

function resetBubbleFrameStateStyle(element: HTMLButtonElement) {
  applyBubbleFramePresentationState(element, resolveBubbleFrameResetPresentationState())
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
  const element = resolveBubbleButtonElement(value)
  const registrationState = resolveBubbleElementRegistrationState({
    bubbleId,
    hasElement: element !== null,
    hasFrameState: element !== null && bubbleFrameStateMap.has(normalizeText(bubbleId)),
    enhancementsPrimed: bubbleEnhancementsPrimed,
  })
  if (registrationState.action === 'skip') return

  if (registrationState.action === 'remove') {
    bubbleElementMap.delete(registrationState.normalizedId)
    bubbleAnchorMetricsMap.delete(registrationState.normalizedId)
    bubbleFrameStateMap.delete(registrationState.normalizedId)
    return
  }

  if (!element) return
  bubbleElementMap.set(registrationState.normalizedId, element)
  if (registrationState.initializeFrameState) {
    resetBubbleFrameStateStyle(element)
  }
  if (registrationState.scheduleMeasurement) {
    scheduleBubbleMotionMeasurement()
  }
}

function measureBubbleMotionAnchors() {
  if (typeof window === 'undefined' || !bubbleStageRef.value) return

  const stageRect = bubbleStageRef.value.getBoundingClientRect()
  bubbleStageMetrics.value = resolveBubbleStageMetrics({
    stageWidth: stageRect.width,
    stageHeight: stageRect.height,
    viewportWidth: window.innerWidth,
  })

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
  applyBubbleFramePresentationState(element, resolveBubbleFramePresentationState(state))
}

function updateBubbleStagePointerPosition(event: PointerEvent) {
  if (typeof window === 'undefined' || !bubbleStageRef.value) return

  const stageRect = bubbleStageRef.value.getBoundingClientRect()
  const pointerState = resolveBubbleStagePointerState({
    clientX: event.clientX,
    clientY: event.clientY,
    stageLeft: stageRect.left,
    stageTop: stageRect.top,
    stageWidth: stageRect.width,
    stageHeight: stageRect.height,
    viewportWidth: window.innerWidth,
  })

  pointerStagePosition.value = pointerState.pointerPosition
  bubbleStageMetrics.value = pointerState.stageMetrics
}

function applyBubbleStagePointerPresence(
  action: BubbleStagePointerPresenceAction,
  event?: PointerEvent
) {
  const stagePointerState = resolveBubbleStagePointerPresenceState(action)
  pointerInsideBubbleStage.value = stagePointerState.pointerInsideStage
  if (event && stagePointerState.updatePointerPosition) updateBubbleStagePointerPosition(event)
  if (stagePointerState.clearPointerOver) {
    pointerOverBubbleId.value = resolveBubblePointerOverState({
      action: 'stage-leave',
      currentPointerOverBubbleId: pointerOverBubbleId.value,
    }).pointerOverBubbleId
  }
  if (stagePointerState.clearPointerHover) clearHoveredBubble(undefined, 'pointer')
  if (stagePointerState.syncMotionLoop) syncBubbleMotionLoop()
}

function handleBubbleStagePointerEnter(event: PointerEvent) {
  activateHomeBubbleEnhancements()
  applyBubbleStagePointerPresence('enter', event)
}

function handleBubbleStagePointerMove(event: PointerEvent) {
  activateHomeBubbleEnhancements()
  applyBubbleStagePointerPresence('move', event)
}

function handleBubbleStagePointerLeave() {
  applyBubbleStagePointerPresence('leave')
}

function applyBubbleInteraction(
  action: BubbleInteractionAction,
  bubbleId: string,
  event?: PointerEvent
) {
  const interactionState = resolveBubbleInteractionState(action)
  if (interactionState.activateEnhancements) activateHomeBubbleEnhancements()
  if (interactionState.pointerInsideStage !== null)
    pointerInsideBubbleStage.value = interactionState.pointerInsideStage
  if (interactionState.pointerOverAction) {
    pointerOverBubbleId.value = resolveBubblePointerOverState({
      action: interactionState.pointerOverAction,
      bubbleId,
      currentPointerOverBubbleId: pointerOverBubbleId.value,
    }).pointerOverBubbleId
  }
  if (event && interactionState.updatePointerPosition) updateBubbleStagePointerPosition(event)
  if (interactionState.hoverAction === 'set')
    setHoveredBubble(bubbleId, interactionState.hoverSource)
  if (interactionState.hoverAction === 'clear')
    clearHoveredBubble(bubbleId, interactionState.hoverSource)
  if (interactionState.syncMotionLoop) syncBubbleMotionLoop()
}

function handleBubblePointerEnter(bubbleId: string, event: PointerEvent) {
  applyBubbleInteraction('pointer-enter', bubbleId, event)
}

function handleBubblePointerLeave(bubbleId: string) {
  applyBubbleInteraction('pointer-leave', bubbleId)
}

function handleBubbleFocus(bubbleId: string) {
  applyBubbleInteraction('focus', bubbleId)
}

function handleBubbleBlur(bubbleId: string) {
  applyBubbleInteraction('blur', bubbleId)
}

function resolveActiveBubbleHoverAnchor(): BubbleAnchorMetrics | null {
  return hoveredBubbleId.value !== null
    ? (bubbleAnchorMetricsMap.get(hoveredBubbleId.value) ?? null)
    : null
}

function buildBubblePointerState(): BubblePointerState {
  return resolveBubblePointerState({
    hoverAnchor: resolveActiveBubbleHoverAnchor(),
    pointerInsideStage: pointerInsideBubbleStage.value,
    interactiveTier: isBubbleInteractiveTier.value,
    pointerOverBubbleId: pointerOverBubbleId.value,
    pointerPosition: pointerStagePosition.value,
    forceCenter: bubbleMotionForceCenter,
    pointerStrength: bubbleMotionPointerStrength,
  })
}

function shouldRunBubbleMotionLoop(): boolean {
  return shouldRunBubbleMotionLoopPolicy({
    hasWindow: typeof window !== 'undefined',
    lightweightViewport: isLightweightHomeViewport(),
    revealPhase: bubbleRevealPhase.value,
    itemCount: bubbleItems.value.length,
    shouldAnimate: shouldAnimate.value,
    hasStageElement: bubbleStageRef.value !== null,
    measuredAnchorCount: bubbleAnchorMetricsMap.size,
    hasActiveBubble: hasActiveBubble.value,
    pointerInsideStage: pointerInsideBubbleStage.value,
    pointerStrength: bubbleMotionPointerStrength,
  })
}

function runBubbleMotionFrame(timestamp: number) {
  bubbleMotionFrame = null

  if (!shouldRunBubbleMotionLoop()) {
    stopBubbleMotionLoop({
      resetStyles: shouldResetBubbleFrameStylesOnMotionStop(bubbleRevealPhase.value),
    })
    return
  }

  const deltaMs = resolveBubbleFrameDeltaMs(timestamp, bubbleMotionLastTimestamp)
  bubbleMotionLastTimestamp = timestamp

  const hoverAnchor = resolveActiveBubbleHoverAnchor()
  const targetDecision = resolveBubbleMotionTargetDecision({
    hoverAnchor,
    pointerInsideStage: pointerInsideBubbleStage.value,
    interactiveTier: isBubbleInteractiveTier.value,
    pointerPosition: pointerStagePosition.value,
    attackDurationMs: BUBBLE_POINTER_ATTACK_MS,
    releaseDurationMs: BUBBLE_POINTER_RELEASE_MS,
  })
  const motionStepState = resolveBubbleMotionStepState({
    currentForceCenter: bubbleMotionForceCenter,
    currentPointerStrength: bubbleMotionPointerStrength,
    targetDecision,
    deltaMs,
    forceCenterLerpDurationMs: BUBBLE_FORCE_CENTER_LERP_MS,
    idleStrengthThreshold: 0.001,
  })
  bubbleMotionForceCenter = motionStepState.forceCenter
  bubbleMotionPointerStrength = motionStepState.pointerStrength

  const pointerState = buildBubblePointerState()

  for (const bubble of bubbleItems.value) {
    const element = bubbleElementMap.get(bubble.id)
    if (!element) continue

    const activeState = resolveBubbleRuntimeActiveState(bubble.id)
    const frameState = computeBubbleFrameState({
      bubbleId: bubble.id,
      tier: bubbleLayoutTier.value,
      nowMs: timestamp,
      profile: bubble.motionProfile,
      anchor: bubbleAnchorMetricsMap.get(bubble.id),
      stage: bubbleStageMetrics.value,
      pointer: pointerState,
      isHoverActive: activeState.isHoverActive,
      isPersistentSelected: activeState.isPersistentSelected,
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
      resetStyles: shouldResetBubbleFrameStylesOnMotionStop(bubbleRevealPhase.value),
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
let bubbleMotionForceCenter: BubbleForceCenter | null = null
const bubbleElementMap = new Map<string, HTMLButtonElement>()
const bubbleAnchorMetricsMap = new Map<string, BubbleAnchorMetrics>()
const bubbleFrameStateMap = new Map<string, BubbleFrameState>()
const bubbleStageMetrics = ref<BubbleStageMetrics | null>(null)
let bubbleCanvasFrame: number | null = null
let bubbleCanvasOrbs: HomeBubbleCanvasOrbSeedState[] = []
let bubbleCanvasLastTimestamp: number | null = null
let sceneObservedSizes = new WeakMap<HTMLElement, HomeSceneLayoutSize>()
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

const storySceneProgressState = computed(() =>
  resolveHomeStorySceneProgress({
    storyProgress: storyProgress.value,
    storyCardCount: storyCardCount.value,
  })
)
const storyProgressIndex = computed(() => storySceneProgressState.value.storyProgressIndex)
const storyMergeProgress = computed(() => storySceneProgressState.value.storyMergeProgress)
const storyFooterFade = computed(() => storySceneProgressState.value.storyFooterFade)
const activeStoryIndex = computed(() => storySceneProgressState.value.activeStoryIndex)
const effectiveStoryCardCount = computed(
  () => storySceneProgressState.value.effectiveStoryCardCount
)

const railSlides = computed(() =>
  buildHomeRailSlides({
    portal: t('home.portal.title'),
    spotlight: t('home.hero.spotlightLabel'),
    featured: t('home.featured.title'),
    trends: t('home.trends.authorsTitle'),
  })
)

const railSlideCount = computed(() => railSlides.value.length)
const activeRailIndex = computed(() =>
  resolveHomeActiveRailIndex({
    railProgress: railProgress.value,
    railSlideCount: railSlideCount.value,
  })
)
const activeRailSlide = computed(() =>
  resolveHomeActiveRailSlide({
    railSlides: railSlides.value,
    activeRailIndex: activeRailIndex.value,
  })
)

const featuredSceneStyle = computed(() => buildHomeFeaturedSceneStyle(railSlideCount.value))

const railTrackStyle = computed(() =>
  buildHomeRailTrackStyle({
    compactViewport: isCompactHomeViewport(),
    railProgress: railProgress.value,
    railSlideCount: railSlideCount.value,
  })
)

const storySceneStyle = computed(() =>
  buildHomeStorySceneStyle({
    storyCardCount: effectiveStoryCardCount.value,
    storyProgress: storyProgress.value,
    storyFooterFade: storyFooterFade.value,
  })
)

function resolveCurrentHomeSceneCapabilities() {
  return resolveHomeSceneCapabilities({
    hasWindow: typeof window !== 'undefined',
    shouldAnimate: shouldAnimate.value,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : null,
  })
}

function isCompactHomeViewport(): boolean {
  return resolveCurrentHomeSceneCapabilities().isCompactViewport
}

function isLightweightHomeViewport(): boolean {
  return resolveCurrentHomeSceneCapabilities().isLightweightViewport
}

function shouldUseHomeSectionBlendEffects(): boolean {
  return resolveCurrentHomeSceneCapabilities().useSectionBlendEffects
}

function shouldUseHomeScrollScrubScenes(): boolean {
  return resolveCurrentHomeSceneCapabilities().useScrollScrubScenes
}

function shouldUseHomeBubbleCanvasScene(): boolean {
  return resolveCurrentHomeSceneCapabilities().useBubbleCanvasScene
}

function disconnectDeferredHomeEnhancementObserver() {
  homeDeferredEnhancementObserver?.disconnect()
  homeDeferredEnhancementObserver = null
}

function unbindDeferredHomeSceneIntent() {
  if (
    !shouldUnbindDeferredHomeSceneIntent({
      hasWindow: typeof window !== 'undefined',
      intentBound: homeDeferredSceneIntentBound,
    })
  )
    return
  homeDeferredSceneIntentBound = false
  window.removeEventListener('scroll', handleDeferredHomeSceneIntent)
  window.removeEventListener('wheel', handleDeferredHomeSceneIntent)
  window.removeEventListener('touchstart', handleDeferredHomeSceneIntent)
  window.removeEventListener('keydown', handleDeferredHomeSceneIntent)
}

function bindDeferredHomeSceneIntent() {
  if (
    !shouldBindDeferredHomeSceneIntent({
      hasWindow: typeof window !== 'undefined',
      intentBound: homeDeferredSceneIntentBound,
      scenePrimed: sceneEnhancementsPrimed,
    })
  )
    return
  homeDeferredSceneIntentBound = true
  window.addEventListener('scroll', handleDeferredHomeSceneIntent, { passive: true })
  window.addEventListener('wheel', handleDeferredHomeSceneIntent, { passive: true })
  window.addEventListener('touchstart', handleDeferredHomeSceneIntent, { passive: true })
  window.addEventListener('keydown', handleDeferredHomeSceneIntent)
}

function maybeCleanupDeferredHomeEnhancementObserver() {
  if (
    shouldCleanupDeferredHomeEnhancementObserver({
      scenePrimed: sceneEnhancementsPrimed,
      bubblePrimed: bubbleEnhancementsPrimed,
    })
  )
    disconnectDeferredHomeEnhancementObserver()
}

function syncBubbleRevealLifecycle() {
  resetBubbleRevealState()

  applyBubbleRevealAction(
    resolveBubbleRevealLifecycleAction({
      primed: bubbleEnhancementsPrimed,
      itemCount: bubbleItems.value.length,
      lightweightViewport: isLightweightHomeViewport(),
      shouldAnimate: shouldAnimate.value,
    })
  )
}

function applyBubbleRevealAction(action: BubbleRevealLifecycleAction) {
  if (action === 'restart-burst') restartBubbleBurst()
  if (action === 'retreat') startBubbleRetreat()
  if (action === 'reveal') bubbleRevealPhase.value = 'revealed'
}

function activateHomeSceneEnhancements(delay = HOME_SCENE_ACTIVATION_DELAY_MS) {
  const decision = resolveHomeSceneActivationDecision({
    disposed: homeEnhancementsDisposed,
    scenePrimed: sceneEnhancementsPrimed,
    lightweightViewport: isLightweightHomeViewport(),
  })
  if (decision.action === 'skip') return

  sceneEnhancementsPrimed = true
  unbindDeferredHomeSceneIntent()
  setHomeSceneLifecycleEnabled(decision.action === 'enable-scenes', delay)
  maybeCleanupDeferredHomeEnhancementObserver()
}

function activateHomeBubbleEnhancements() {
  if (
    !shouldActivateHomeBubbleEnhancements({
      disposed: homeEnhancementsDisposed,
      bubblePrimed: bubbleEnhancementsPrimed,
    })
  )
    return
  bubbleEnhancementsPrimed = true
  syncBubbleRevealLifecycle()
  void nextTick(() => {
    if (
      !shouldContinueHomeBubbleEnhancementSetup({
        disposed: homeEnhancementsDisposed,
        bubblePrimed: bubbleEnhancementsPrimed,
      })
    )
      return
    observeBubbleStageLayout()
    scheduleBubbleMotionMeasurement()
  })
  maybeCleanupDeferredHomeEnhancementObserver()
}

function observeDeferredHomeEnhancements() {
  if (typeof window === 'undefined') return

  disconnectDeferredHomeEnhancementObserver()
  const postsElement = resolveSectionElement(postsSectionRef.value)
  const decision = resolveDeferredHomeEnhancementStartupDecision({
    lightweightViewport: isLightweightHomeViewport(),
    hasPostsElement: Boolean(postsElement),
    supportsIntersectionObserver: typeof window.IntersectionObserver === 'function',
  })

  if (decision.bindSceneIntent) {
    bindDeferredHomeSceneIntent()
  }

  if (!postsElement) return

  if (decision.activateSceneImmediately) activateHomeSceneEnhancements(0)
  if (decision.activateBubbleImmediately) activateHomeBubbleEnhancements()
  if (!decision.observePostsElement) return

  homeDeferredEnhancementObserver = createVisibilityObserver(
    (entries) => {
      for (const entry of entries) {
        const action = resolveDeferredHomeEnhancementIntersectionAction({
          isIntersecting: entry.isIntersecting,
          isPostsTarget: entry.target === postsElement,
          lightweightViewport: isLightweightHomeViewport(),
        })
        if (action.activateScene) activateHomeSceneEnhancements(0)
        if (action.activateBubble) activateHomeBubbleEnhancements()
      }
    },
    {
      threshold: [0, 0.01],
      rootMargin: '35% 0% 35% 0%',
    }
  )

  homeDeferredEnhancementObserver.observe(postsElement)
}

function handleDeferredHomeSceneIntent() {
  activateHomeSceneEnhancements(0)
}

const homePageMotionStyle = computed<Record<string, string>>(() =>
  buildHomePageMotionStyle({
    compactViewport: isCompactHomeViewport(),
    useSectionBlendEffects: shouldUseHomeSectionBlendEffects(),
    blend: viewportSceneBlend.value,
  })
)

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

function deactivateHomeRuntime() {
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
}

onDeactivated(deactivateHomeRuntime)
let homeRequestController: AbortController | null = null
let homePublicPrewarmToken: symbol | null = null

function abortHomeRequest() {
  homeRequestController?.abort()
  homeRequestController = null
}

function cancelPublicHomePrewarm() {
  homePublicPrewarmToken = null
}

function schedulePublicHomePrewarm(payload: HomeAggregateResponse) {
  if (typeof window === 'undefined') return
  cancelPublicHomePrewarm()

  const { mediaLimit, listLimit } = resolveHomePublicPrewarmLimits(window.innerWidth)
  const mediaUrls = collectHomePrewarmMedia(payload)
  const prewarmToken = Symbol('home-public-prewarm')
  homePublicPrewarmToken = prewarmToken

  void scheduleTask(
    () => {
      if (homePublicPrewarmToken !== prewarmToken) return
      homePublicPrewarmToken = null
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

function applyHomeAggregate(payload: HomeAggregateResponse, source: HomeDataSource) {
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
  total.value = resolveHomeTotalCount({
    currentTotal: total.value,
    storyDeckTotal: payload.story_deck.total,
  })
  error.value = null
}

async function refreshHomeSupportBlocks(
  signal: AbortSignal,
  targets: HomeSupportRefreshTargets
): Promise<void> {
  const tasks = resolveHomeSupportRefreshKinds(targets).map(
    async (kind: HomeSupportRefreshKind): Promise<HomeSupportRefreshResult> => {
      if (kind === 'schedule') {
        const result = await homeService.getScheduleHighlights(4, { signal, skipErrorToast: true })
        return { kind, items: result.payload.items }
      }

      const result = await homeService.getCommunityHighlights(4, { signal, skipErrorToast: true })
      return { kind, items: result.payload.items }
    }
  )

  if (tasks.length === 0) return

  const updates = resolveHomeSupportRefreshUpdates(await Promise.allSettled(tasks))

  if (signal.aborted) return

  if (updates.scheduleItems) homeScheduleHighlights.value = updates.scheduleItems
  if (updates.communityItems) homeCommunityHighlights.value = updates.communityItems
}

function abortHomeSupportRefresh() {
  homeSupportRefreshController?.abort()
  homeSupportRefreshController = null
}

function runHomeSupportRefresh() {
  const refreshState = resolveHomeSupportRefreshRunState(pendingHomeSupportRefresh)
  if (!refreshState.shouldRefresh) return

  abortHomeSupportRefresh()
  pendingHomeSupportRefresh = refreshState.nextPendingTargets

  const controller = new AbortController()
  homeSupportRefreshController = controller
  void refreshHomeSupportBlocks(controller.signal, refreshState.refreshTargets).finally(() => {
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
    if (controller.signal.aborted) return false

    applyHomeAggregate(fallbackPayload, 'fallback')
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
  return resolveHomeMeasuredSceneGeometry(readSceneGeometry(element, pinnedSelector)).travelDistance
}

function resolveSceneProgress(element: HTMLElement | null, pinnedSelector?: string): number {
  return resolveHomeMeasuredSceneGeometry(readSceneGeometry(element, pinnedSelector)).progress
}

function readSceneGeometry(
  element: HTMLElement | null,
  pinnedSelector?: string
): HomeMeasuredSceneGeometryInput {
  if (typeof window === 'undefined' || !element) return { measured: false }

  const pinnedElement = pinnedSelector ? element.querySelector<HTMLElement>(pinnedSelector) : null

  return {
    measured: true,
    sectionHeight: element.offsetHeight,
    pinnedHeight: pinnedElement?.offsetHeight ?? null,
    sectionTop: element.offsetTop,
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
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
  if (
    !shouldScheduleHomeEnhancements({
      hasWindow: typeof window !== 'undefined',
      scenesEnabled,
    })
  )
    return
  scheduleTask(
    async () => {
      if (!shouldScheduleHomeEnhancements({ hasWindow: true, scenesEnabled })) return
      bindSceneInteractions()
      bindSceneProgressTracking()

      const scheduleDecision = resolveHomeEnhancementScheduleDecision({
        useScrollScrubScenes: shouldUseHomeScrollScrubScenes(),
        useSectionBlendEffects: shouldUseHomeSectionBlendEffects(),
      })

      if (scheduleDecision.mode === 'viewport-progress') {
        runAfterNextPaint(() => {
          scheduleSceneProgressUpdate()
          if (scheduleDecision.bindViewportBlend) {
            bindViewportSceneBlendTracking()
            scheduleViewportSceneBlendUpdate()
          }
        })
        return
      }

      const ready = await ensureScrollTriggerReady()
      if (!ready || !shouldScheduleHomeEnhancements({ hasWindow: true, scenesEnabled })) return
      observeSceneLayout()
      scheduleSceneSetup()
      runAfterNextPaint(() => {
        if (scheduleDecision.bindViewportBlend) {
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
  const resetState = resolveBubbleRevealResetState()
  if (resetState.clearBurstReplayFrame) clearBubbleBurstReplayFrame()
  if (resetState.clearExitResetTimer) clearBubbleExitResetTimer()
  if (resetState.stopMotionLoop) stopBubbleMotionLoop()
  bubbleRevealPhase.value = resetState.phase
}

function startBubbleRetreat() {
  clearBubbleBurstReplayFrame()
  clearBubbleExitResetTimer()
  stopBubbleMotionLoop({ resetStyles: false })

  const retreatState = resolveBubbleRevealRetreatState(shouldAnimate.value)
  bubbleRevealPhase.value = retreatState.phase
  if (!retreatState.scheduleExitReset) return

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
    for (const property of HOME_FOOTER_BLEND_PROPERTIES) {
      document.documentElement.style.removeProperty(property)
    }
    return
  }

  setHomeFooterBlendProgress(0)
}

function setHomeFooterBlendProgress(progress: number) {
  if (typeof document === 'undefined') return
  const style = buildHomeFooterBlendStyle(progress)
  for (const [property, value] of Object.entries(style)) {
    document.documentElement.style.setProperty(property, value)
  }
}

function measureViewportBlend(
  element: HTMLElement | null,
  startRatio = 1.02,
  endRatio = 0.18
): number {
  if (typeof window === 'undefined' || !element) return 0
  return measureHomeViewportBlend({
    rectTop: element.getBoundingClientRect().top,
    viewportHeight: window.innerHeight,
    startRatio,
    endRatio,
  })
}

function updateViewportSceneBlend() {
  if (typeof window === 'undefined') return

  if (isCompactHomeViewport()) {
    const compactBlendState = resolveHomeViewportSceneBlendState({
      compactViewport: true,
      bubbleItemCount: bubbleItems.value.length,
    })
    clearBubbleBurstReplayFrame()
    clearBubbleExitResetTimer()
    if (compactBlendState.compactBubbleRevealPhase !== null) {
      bubbleRevealPhase.value = compactBlendState.compactBubbleRevealPhase
    }
    viewportSceneBlend.value = compactBlendState.sceneBlend
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

  const blendState = resolveHomeViewportSceneBlendState({
    compactViewport: false,
    bubbleItemCount: bubbleItems.value.length,
    measuredBlend: nextBlend,
  })
  const footerBlendProgress = blendState.footerBlendProgress
  const postsElement = resolveSectionElement(postsSectionRef.value)
  const featuredElement = resolveSectionElement(featuredSectionRef.value)
  const bubbleRevealWindow = resolveBubbleRevealWindow(
    postsElement?.getBoundingClientRect() ?? null,
    window.innerHeight,
    bubbleItems.value.length
  )
  const railLockActive = resolveHomeRailLockActive({
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
    postsOffsetTop: postsElement?.offsetTop,
    featuredOffsetTop: featuredElement?.offsetTop,
    featuredHeight: featuredElement?.offsetHeight,
  })

  viewportSceneBlend.value = blendState.sceneBlend

  applyBubbleRevealAction(
    resolveBubbleRevealViewportAction({
      windowState: bubbleRevealWindow,
      phase: bubbleRevealPhase.value,
      shouldAnimate: shouldAnimate.value,
      burstFramePending: bubbleBurstReplayFrame !== null,
    })
  )

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

  const restartState = resolveBubbleRevealRestartState({
    itemCount: bubbleItems.value.length,
    shouldAnimate: shouldAnimate.value,
  })

  bubbleRevealPhase.value = restartState.phase
  if (!restartState.scheduleBurstReplay) return

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

      const nextSize = resolveHomeSceneLayoutSize(entry.contentRect)
      const previousSize = sceneObservedSizes.get(entry.target)

      sceneObservedSizes.set(entry.target, nextSize)

      if (resolveHomeSceneLayoutRefresh({ previousSize, nextSize })) {
        shouldRefresh = true
      }
    }

    if (shouldRefresh) {
      scheduleSceneRefreshFromResize()
    }
  })

  for (const element of trackedElements) {
    sceneObservedSizes.set(element, resolveHomeSceneLayoutSize(element.getBoundingClientRect()))
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
      snap: buildHomeSceneSnap(railSlideCount.value),
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
      snap: buildHomeSceneSnap(effectiveStoryCardCount.value),
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
  return buildHomeStoryCardStyle({
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

function shouldRenderHomeMedia(source: string | null | undefined): boolean {
  return shouldRenderHomeMediaSource(source, failedHomeMediaUrls.value)
}

function markHomeMediaFailed(source: string | null | undefined) {
  const markState = resolveHomeMediaFailureMarkState(source, failedHomeMediaUrls.value)
  if (markState.shouldUpdate) {
    failedHomeMediaUrls.value = markState.failedSources
  }
}

function setHoveredBubble(bubbleId: string, source: BubbleHoverSource = 'pointer') {
  const hoverState = resolveBubbleHoverSetState({
    bubbleId,
    source,
    currentState: {
      hoveredBubbleId: hoveredBubbleId.value,
      hoveredBubbleSource: hoveredBubbleSource.value,
    },
  })
  hoveredBubbleId.value = hoverState.hoveredBubbleId
  hoveredBubbleSource.value = hoverState.hoveredBubbleSource
  if (hoverState.syncMotionLoop) syncBubbleMotionLoop()
}

function clearHoveredBubble(bubbleId?: string | null, source: BubbleHoverSource | 'all' = 'all') {
  const hoverState = resolveBubbleHoverClearState({
    bubbleId,
    source,
    currentState: {
      hoveredBubbleId: hoveredBubbleId.value,
      hoveredBubbleSource: hoveredBubbleSource.value,
    },
  })
  hoveredBubbleId.value = hoverState.hoveredBubbleId
  hoveredBubbleSource.value = hoverState.hoveredBubbleSource
  if (hoverState.syncMotionLoop) syncBubbleMotionLoop()
}

function resolveBubbleRuntimeActiveState(bubbleId: string) {
  return resolveBubbleActiveState({
    bubbleId,
    hoveredBubbleId: hoveredBubbleId.value,
    selectedBubbleId: selectedBubbleId.value,
  })
}

function resolveBubbleActivePresentation(bubbleId: string) {
  return resolveBubbleActivePresentationState({
    bubbleId,
    hoveredBubbleId: hoveredBubbleId.value,
    selectedBubbleId: selectedBubbleId.value,
  })
}

function isBubblePersistentSelected(bubbleId: string): boolean {
  return resolveBubbleActivePresentation(bubbleId).isPersistentSelected
}

function bubbleStateClasses(bubbleId: string) {
  return resolveBubbleActivePresentation(bubbleId).classes
}

function openPostPreview(post: PostListItem, thumbnailSrc: string | null) {
  const previewAction = resolveHomePostPreviewAction(post)
  if (previewAction.kind === 'navigate') {
    void router.push(previewAction.target)
    return
  }

  previewPostId.value = previewAction.postId
  previewPost.value = { ...post, id: previewAction.postId }
  previewThumbnailSrc.value = thumbnailSrc
  setHoveredBubble(previewAction.postId, pointerInsideBubbleStage.value ? 'pointer' : 'focus')
  isPreviewOpen.value = true
}

function openDetailFromPreview(postId: string) {
  const detailAction = resolveHomePostDetailAction({
    postId,
    previewPost: previewPost.value,
    sourcePosts: homeSourcePosts.value,
  })
  if (detailAction.kind === 'navigate') {
    isPreviewOpen.value = false
    void router.push(detailAction.target)
    return
  }

  storePostNavigationContext(detailAction.navigationContextPosts, detailAction.postId, 'home')
  cachePostThumbnailPreview(detailAction.postId, previewThumbnailSrc.value)
  isPreviewOpen.value = false
  router.push(detailAction.target)
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
  deactivateHomeRuntime()
  bubbleElementMap.clear()
  bubbleAnchorMetricsMap.clear()
})
</script>

<style scoped src="../styles/page-systems/home-page-view.css"></style>
