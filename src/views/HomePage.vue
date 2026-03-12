<template>
  <div class="home-page" :class="homePageTransitionClass" :style="homePageMotionStyle">
    <!-- Hero + 今日入口 -->
    <div class="home-fold">
      <!-- Hero Section -->
      <section
        v-if="settings.showHeroSection"
        class="hero home-screen"
        :class="{ 'hero--animated': shouldAnimate }"
      >
        <div class="container hero-layout">
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
              >
                <div
                  class="hero-editorial__state hero-editorial__state--loading"
                  aria-hidden="true"
                >
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

              <div v-if="showPreviewNotice" class="hero-preview glass-card">
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
                <div v-for="item in heroStats" :key="item.key" class="hero-stat glass-card">
                  <span class="hero-stat__label">{{ item.label }}</span>
                  <strong class="hero-stat__value">{{ item.value }}</strong>
                  <span class="hero-stat__note">{{ item.note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <!-- /.home-fold -->

    <!-- Horizontal Rail -->
    <section ref="featuredSectionRef" class="rail home-screen" :style="featuredSceneStyle">
      <div class="rail-sticky">
        <div class="rail-stage">
          <div class="rail-stage__chrome">
            <div class="rail-stage__eyebrow">
              <span class="rail-stage__index">{{
                String(activeRailIndex + 1).padStart(2, '0')
              }}</span>
              <span class="rail-stage__label">{{ activeRailSlide?.label }}</span>
            </div>
            <div class="rail-stage__dots" aria-hidden="true">
              <span
                v-for="slide in railSlides"
                :key="slide.key"
                class="rail-stage__dot"
                :class="{ 'is-active': slide.key === activeRailSlide?.key }"
              />
            </div>
          </div>

          <div class="rail-track" :style="railTrackStyle" role="list">
            <article class="rail-panel rail-panel--portal">
              <div class="rail-panel__content">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.portal.kicker') }}</p>
                    <h2>{{ $t('home.portal.title') }}</h2>
                    <p>{{ $t('home.portal.subtitle') }}</p>
                  </div>
                  <RouterLink to="/explore" class="section-link">
                    <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                    {{ $t('home.portal.action') }}
                  </RouterLink>
                </header>

                <div class="portal-grid">
                  <RouterLink to="/explore" class="portal-card portal-card--primary glass-card">
                    <div
                      v-if="portalLeadCard"
                      class="portal-card__preview portal-card__preview--lead"
                      :style="
                        portalLeadCard.thumbnail ? undefined : { background: 'var(--home-pill-bg)' }
                      "
                    >
                      <img
                        v-if="portalLeadCard.thumbnail"
                        :src="portalLeadCard.thumbnail"
                        :alt="portalLeadCard.title"
                        class="portal-card__preview-image"
                        loading="lazy"
                        decoding="async"
                      />
                      <div class="portal-card__preview-overlay">
                        <span class="portal-card__preview-kicker">{{ portalLeadCard.author }}</span>
                        <strong class="portal-card__preview-title">{{
                          portalLeadCard.title
                        }}</strong>
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
                        <p>{{ $t('home.portal.items.recommend.desc') }}</p>
                      </div>
                      <div class="portal-card__stats">
                        <span
                          v-for="stat in heroStats"
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
                        <span class="portal-card__micro-label">{{
                          portalPanels[0].noteLabel
                        }}</span>
                        <strong class="portal-card__micro-title">{{
                          portalPanels[0].noteTitle
                        }}</strong>
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
                      >
                        <div class="portal-card__header">
                          <div class="portal-card__icon" :class="`portal-card__icon--${panel.key}`">
                            <AnimatedIcon
                              :name="panel.animation"
                              :fallback-icon="panel.icon"
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

            <article class="rail-panel rail-panel--spotlight">
              <div class="rail-panel__content rail-panel__content--highlight">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.hero.spotlightLabel') }}</p>
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
                          :class="{ 'hero-collage-card--primary': index === 0 }"
                          @click="openPostPreview(card.post, card.thumbnail)"
                        >
                          <img
                            v-if="card.thumbnail"
                            class="hero-collage-image"
                            :src="card.thumbnail"
                            :alt="card.title"
                            loading="lazy"
                            decoding="async"
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

            <article class="rail-panel rail-panel--featured">
              <div class="rail-panel__content">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.featured.kicker') }}</p>
                    <h2>{{ $t('home.featured.title') }}</h2>
                    <p>{{ $t('home.featured.subtitle') }}</p>
                  </div>
                  <RouterLink to="/explore" class="section-link">
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
                      :class="[
                        index === 0 ? 'featured-rail-card--lead' : 'featured-rail-card--support',
                        index > 1 ? 'featured-rail-card--compact' : null,
                        !card.summary ? 'featured-rail-card--dense' : null,
                      ]"
                      @click="openPostPreview(card.post, card.thumbnail)"
                    >
                      <div
                        class="featured-rail-card__media"
                        :class="{ 'featured-rail-card__media--empty': !card.thumbnail }"
                      >
                        <img
                          v-if="card.thumbnail"
                          :src="card.thumbnail"
                          :alt="card.title"
                          class="featured-rail-card__image"
                          loading="lazy"
                          decoding="async"
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
                      :priority="index < 2"
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

            <article class="rail-panel rail-panel--trends">
              <div class="rail-panel__content">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.trends.tagsTitle') }}</p>
                    <h2>{{ $t('home.trends.authorsTitle') }}</h2>
                    <p>{{ $t('home.trends.scheduleHint') }}</p>
                  </div>
                </header>

                <div class="trends-grid">
                  <div class="trends-card trends-card--authors glass-card">
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
                        <img
                          v-if="
                            leadingTrendingAuthor.avatar &&
                            !isTrendAuthorAvatarFailed(leadingTrendingAuthor.key)
                          "
                          class="trends-authors-highlight__avatar"
                          :src="leadingTrendingAuthor.avatar"
                          :alt="leadingTrendingAuthor.name"
                          loading="lazy"
                          decoding="async"
                          @error="markTrendAuthorAvatarFailed(leadingTrendingAuthor.key)"
                        />
                        <div
                          v-else
                          class="trends-authors-highlight__avatar trends-authors-highlight__avatar--fallback"
                        >
                          <AnimatedIcon name="user" :fallback-icon="Users" size="sm" />
                        </div>
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
                          <img
                            v-if="author.avatar && !isTrendAuthorAvatarFailed(author.key)"
                            class="trend-author__avatar"
                            :src="author.avatar"
                            :alt="author.name"
                            loading="lazy"
                            decoding="async"
                            @error="markTrendAuthorAvatarFailed(author.key)"
                          />
                          <div v-else class="trend-author__avatar trend-author__avatar--fallback">
                            <AnimatedIcon name="user" :fallback-icon="Users" size="sm" />
                          </div>
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

                  <div class="trends-card trends-card--tags glass-card">
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

                  <div class="trends-card trends-card--editorial glass-card">
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
                        <strong class="trends-editorial__title">{{
                          heroEditorialCard.title
                        }}</strong>
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

                  <div class="trends-card trends-card--schedule glass-card">
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
                    <div
                      v-else-if="homeCommunityHighlights.length > 0"
                      class="trends-community-note"
                    >
                      <span class="trends-community-note__eyebrow">{{ $t('nav.community') }}</span>
                      <strong class="trends-community-note__title">
                        {{ homeCommunityHighlights[0].title }}
                      </strong>
                      <p class="trends-community-note__text">
                        {{ homeCommunityHighlights[0].excerpt }}
                      </p>
                      <span class="trends-community-note__meta">
                        {{ formatCommunityHighlightMeta(homeCommunityHighlights[0]) }}
                      </span>
                    </div>
                    <div v-else class="schedule-cta">
                      <div class="schedule-cta__intro">
                        <span class="schedule-cta__eyebrow">{{ scheduleFallbackCard.label }}</span>
                        <strong class="schedule-cta__title">{{
                          scheduleFallbackCard.title
                        }}</strong>
                        <p>{{ scheduleFallbackCard.text }}</p>
                        <span class="schedule-cta__meta">{{ scheduleFallbackCard.meta }}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        class="schedule-btn"
                        @click="goToSchedule"
                      >
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
          </div>
        </div>
      </div>
    </section>

    <!-- Latest Posts -->
    <section
      ref="postsSectionRef"
      class="posts posts--bubble home-screen"
      :class="{ 'posts--revealed': hasTriggeredBubbleBurst }"
    >
      <div class="container">
        <header class="posts-header">
          <div class="posts-header__title">
            <h2>{{ $t('home.latest') }}</h2>
            <p class="posts-subtitle">{{ $t('home.latestSubtitle') }}</p>
          </div>
          <div class="posts-header__actions">
            <RouterLink to="/explore" class="section-link">
              <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
              {{ $t('home.latestAction') }}
            </RouterLink>
            <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
          </div>
        </header>

        <div class="posts-toolbar">
          <div class="posts-toolbar__panel posts-toolbar__panel--tags">
            <span class="tags-label">{{ $t('home.tags.label') }}</span>
            <div v-if="trendingTags.length > 0" class="tags-list">
              <RouterLink
                v-for="tag in trendingTags"
                :key="`latest-tag-${tag}`"
                :to="{ name: 'search', query: { q: tag } }"
                class="glass-tag"
              >
                #{{ tag }}
              </RouterLink>
            </div>
            <div
              class="posts-toolbar__stats"
              :class="{ 'posts-toolbar__stats--with-tags': trendingTags.length > 0 }"
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
            <div class="bubble-stage__origin" aria-hidden="true">
              <span class="bubble-stage__pulse" />
            </div>
            <div v-if="isLoading && bubbleItems.length === 0" class="bubble-empty glass-card">
              <span class="spinner spinner-sm" />
              <span>{{ $t('common.loading') }}</span>
            </div>
            <template v-else-if="bubbleItems.length > 0">
              <button
                v-for="(bubble, index) in bubbleItems"
                :key="`bubble-${bubble.post.id}-${index}`"
                type="button"
                class="latest-bubble glass-card"
                :style="bubble.style"
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
            <div v-else class="bubble-empty glass-card">
              <span>{{ $t('common.noResults') }}</span>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section
      ref="storyDeckRef"
      class="media-slices home-screen"
      :class="{ 'media-slices--merge': storyMergeProgress > 0.01 }"
      :style="storySceneStyle"
    >
      <div class="container story-stage">
        <header class="section-header section-header--stage">
          <div class="section-title">
            <p class="section-kicker">{{ $t('home.featured.kicker') }}</p>
            <h2>{{ $t('home.featured.title') }}</h2>
            <p>{{ $t('home.featured.subtitle') }}</p>
          </div>
          <div class="story-progress">
            <span>{{ String(activeStoryIndex + 1).padStart(2, '0') }}</span>
            <span>/</span>
            <span>{{ String(Math.max(storyCardCount, 1)).padStart(2, '0') }}</span>
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
              <div class="media-slice__sticky glass-card">
                <div class="media-slice__visual">
                  <PostCard
                    :post="card.post"
                    :priority="index === 0"
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
                    <RouterLink :to="card.detailLink" class="section-link media-slice__link">
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

        <div v-if="storyMergeCard" class="story-merge-panel" :style="storyMergePanelStyle">
          <div class="story-merge-panel__copy">
            <span class="story-merge-panel__kicker">{{ $t('home.storyMerge.kicker') }}</span>
            <h3>{{ $t('home.storyMerge.title') }}</h3>
            <p>{{ $t('home.storyMerge.subtitle') }}</p>
          </div>

          <div class="story-merge-panel__spotlight">
            <span class="story-merge-panel__eyebrow">{{ storyMergeCard.eyebrow }}</span>
            <strong>{{ storyMergeCard.title }}</strong>
            <span class="story-merge-panel__spotlight-meta">
              <span>{{ storyMergeCard.author }}</span>
              <span v-if="storyMergeCard.time">{{ storyMergeCard.time }}</span>
            </span>
          </div>

          <div class="story-merge-panel__links">
            <RouterLink
              v-for="link in storyMergeLinks"
              :key="`story-merge-${link.key}`"
              :to="link.to"
              class="story-merge-panel__link"
            >
              <AnimatedIcon :name="link.animation" :fallback-icon="link.icon" size="sm" />
              <span>{{ link.label }}</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section ref="footerBridgeRef" class="home-footer-bridge home-screen">
      <div class="container home-footer-bridge__stage">
        <div class="home-footer-bridge__intro">
          <span class="home-footer-bridge__kicker">{{ $t('home.storyMerge.kicker') }}</span>
          <h2>{{ $t('home.storyMerge.title') }}</h2>
          <p>{{ $t('home.storyMerge.subtitle') }}</p>
        </div>

        <div class="home-footer-bridge__grid">
          <article v-if="storyMergeCard" class="home-footer-bridge__feature glass-card">
            <div class="home-footer-bridge__feature-shell">
              <button
                v-if="storyMergeCard.thumbnail"
                type="button"
                class="home-footer-bridge__feature-media"
                @click="openPostPreview(storyMergeCard.post, storyMergeCard.thumbnail)"
              >
                <img
                  :src="storyMergeCard.thumbnail"
                  :alt="storyMergeCard.title"
                  class="home-footer-bridge__feature-media-image"
                  loading="lazy"
                  decoding="async"
                />
                <span class="home-footer-bridge__feature-media-overlay">
                  <span class="home-footer-bridge__eyebrow">{{ storyMergeCard.eyebrow }}</span>
                  <strong>{{ storyMergeCard.title }}</strong>
                </span>
              </button>

              <div class="home-footer-bridge__feature-copy">
                <span class="home-footer-bridge__eyebrow">{{ storyMergeCard.eyebrow }}</span>
                <strong>{{ storyMergeCard.title }}</strong>
                <p>{{ storyMergeCard.excerpt }}</p>
                <div class="home-footer-bridge__meta">
                  <span>{{ storyMergeCard.author }}</span>
                  <span v-if="storyMergeCard.time">{{ storyMergeCard.time }}</span>
                </div>
                <button
                  type="button"
                  class="home-footer-bridge__feature-action"
                  @click="openPostPreview(storyMergeCard.post, storyMergeCard.thumbnail)"
                >
                  <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
                  {{ $t('home.featured.action') }}
                </button>
              </div>
            </div>
          </article>

          <div class="home-footer-bridge__links glass-card">
            <span class="home-footer-bridge__links-label">{{ $t('home.portal.kicker') }}</span>
            <RouterLink
              v-for="link in storyMergeLinks"
              :key="`bridge-${link.key}`"
              :to="link.to"
              class="home-footer-bridge__link"
            >
              <span class="home-footer-bridge__link-icon">
                <AnimatedIcon :name="link.animation" :fallback-icon="link.icon" size="sm" />
              </span>
              <span class="home-footer-bridge__link-copy">
                <strong>{{ link.label }}</strong>
                <small>{{ link.description }}</small>
              </span>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <PostPreviewModal
      v-model:isOpen="isPreviewOpen"
      :post-id="previewPostId"
      :initial-post="previewPost"
      :initial-thumbnail-src="previewThumbnailSrc"
      @open-detail="openDetailFromPreview"
    />

    <ScrollDownFab />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import {
  ref,
  computed,
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
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowUpRight,
  Calendar,
  Compass,
  Image,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import {
  homeService,
  normalizeAvatarUrl,
  type HomeAggregateResponse,
  type HomeAuthorBrief,
  type HomeCommunityHighlight,
  type HomeFeaturedItem,
  type HomeLatestTextPostItem,
  type HomeScheduleHighlight,
  type HomeStoryDeckItem,
  type HomeTagBrief,
  type PostListItem,
} from '@/api'
import { prefersReducedMotion } from '@/utils/performance'
import { isFilteredAuthor } from '@/config/filters'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'
import { HOME_FALLBACK_POSTS, isHomeFallbackPost } from '@/mocks/homepageFallback'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import PostPreviewModal from '@/components/business/PostPreviewModal.vue'
import ScrollDownFab from '@/components/ui/ScrollDownFab.vue'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { t } = useI18n()

const shouldAnimate = computed(() => settings.value.enableAnimations && !prefersReducedMotion())

// Posts state
const posts = ref<PostListItem[]>([])
const allPosts = ref<PostListItem[]>([])

// Home click → preview modal
const isPreviewOpen = ref(false)
const previewPostId = ref<string | null>(null)
const previewThumbnailSrc = ref<string | null>(null)
const previewPost = ref<PostListItem | null>(null)

// Loading & error state
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const homeAggregate = ref<HomeAggregateResponse | null>(null)
const homeScheduleHighlights = ref<HomeScheduleHighlight[]>([])
const homeCommunityHighlights = ref<HomeCommunityHighlight[]>([])
const homeDataSource = ref<'idle' | 'aggregate' | 'support' | 'fallback'>('idle')
const failedTrendAuthorAvatarKeys = ref<Set<string>>(new Set())

// DOM refs
const postsSectionRef = useTemplateRef<HTMLElement>('postsSectionRef')
const featuredSectionRef = useTemplateRef<HTMLElement>('featuredSectionRef')
const storyDeckRef = useTemplateRef<HTMLElement>('storyDeckRef')
const footerBridgeRef = useTemplateRef<HTMLElement>('footerBridgeRef')

const railProgress = ref(0)
const storyProgress = ref(0)
const hasTriggeredBubbleBurst = ref(false)
const homeSourcePosts = computed(() =>
  homeDataSource.value === 'fallback' ? HOME_FALLBACK_POSTS : allPosts.value
)
const isUsingFallbackPosts = computed(() => homeDataSource.value === 'fallback')
const showPreviewNotice = computed(() => Boolean(error.value) && isUsingFallbackPosts.value)
const heroEditorialVisible = ref(false)
const viewportSceneBlend = ref({
  heroRail: 0,
  railPosts: 0,
  postsStory: 0,
  storyBridge: 0,
  bridgeFooter: 0,
})
const activeScreenTransition = ref<HomeScreenTransitionName | null>(null)

let bubbleBurstTrigger: ScrollTrigger | null = null
let sceneSetupFrame: number | null = null
let sceneSetupQueued = false
let scenesEnabled = false
let sceneInteractionBound = false
let sceneScrollLockTimer: number | null = null
let sceneScrollLocked = false
let sceneResizeObserver: ResizeObserver | null = null
let sceneObservedSizes = new WeakMap<HTMLElement, { width: number; height: number }>()
let bubbleBurstReplayFrame: number | null = null
let viewportSceneFrame: number | null = null
let screenTransitionTimer: number | null = null
let sceneScrollTweenFrame: number | null = null
let sceneScrollBehaviorSnapshot: { root: string; body: string } | null = null
let viewportSceneTrackingBound = false
let heroEditorialRevealTimer: number | null = null

type SceneStepKey = 'featured' | 'story'
type HomeScreenKey = 'hero' | 'featured' | 'posts' | 'story' | 'bridge' | 'footer'
type HomeScreenTransitionName = `${HomeScreenKey}-${HomeScreenKey}`

const SCENE_INPUT_TOLERANCE = 18
const SCENE_SCROLL_LOCK_MS = 0.42 * 1000

const heroHighlightPosts = computed(() => {
  const source = homeSourcePosts.value
  const withThumb = source.filter((post) => !!post.thumbnail_url)
  return (withThumb.length > 0 ? withThumb : source).slice(0, 5)
})

const heroHighlightCards = computed(() =>
  heroHighlightPosts.value.map((post) => ({
    post,
    thumbnail: normalizeToThumbnailUrl(post.thumbnail_url, 'medium'),
    title: formatHeroTitle(post),
    author: formatHeroAuthor(post),
  }))
)

const fallbackTrendingTags = computed(() => {
  const tagCounts = new Map<string, number>()
  for (const post of homeSourcePosts.value) {
    const tags = post.tags ?? []
    for (const rawTag of tags) {
      const tag = normalizeTag(rawTag)
      if (!tag) continue
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)
})

const trendingTags = computed(() => {
  const liveTags = [
    ...(homeAggregate.value?.hero.trending_tags ?? []),
    ...(homeAggregate.value?.trends.tags ?? []),
  ]
    .map((tag) => normalizeHomeTag(tag))
    .filter(Boolean)

  if (liveTags.length > 0) {
    return Array.from(new Set(liveTags)).slice(0, 8)
  }

  return fallbackTrendingTags.value
})

const heroTags = computed(() => trendingTags.value.slice(0, 6))

const uniqueAuthorCount = computed(() => {
  const keys = new Set<string>()
  for (const post of homeSourcePosts.value) {
    const key =
      post.author_id || post.author_username || post.author_name || post.original_author_id || ''
    if (key) keys.add(key)
  }
  return keys.size
})

const fallbackTrendingAuthors = computed(() => {
  const authorMap = new Map<
    string,
    { key: string; name: string; avatar: string | null; count: number; link: string }
  >()
  for (const post of homeSourcePosts.value) {
    const key =
      post.author_id || post.author_username || post.author_name || post.original_author_id || ''
    if (!key) continue
    const name = formatAuthorName(post)
    const avatar = normalizeAvatarUrl(post.author_avatar_url) || post.author_avatar_url || null
    const entry = authorMap.get(key)
    if (entry) {
      entry.count += 1
      if (!entry.name && name) entry.name = name
      if (!entry.avatar && avatar) entry.avatar = avatar
    } else {
      authorMap.set(key, {
        key,
        name: name || t('home.hero.fallbackAuthor'),
        avatar,
        count: 1,
        link: post.author_id ? `/author/${post.author_id}` : '/authors',
      })
    }
  }
  return Array.from(authorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
})

const trendingAuthors = computed(() => {
  const liveAuthors = homeAggregate.value?.trends.authors ?? []
  if (liveAuthors.length > 0) {
    return liveAuthors.slice(0, 4).map((author) => ({
      key: author.id || author.deep_link || author.display_name,
      name: author.display_name || t('home.hero.fallbackAuthor'),
      avatar: normalizeAvatarUrl(author.avatar_url) || author.avatar_url || null,
      count: author.post_count ?? 0,
      link: author.deep_link || '/authors',
    }))
  }

  return fallbackTrendingAuthors.value
})
const leadingTrendingAuthor = computed(() => trendingAuthors.value[0] ?? null)

const textPosts = computed(() => homeSourcePosts.value.filter((post) => isTextPost(post)))
const mediaPosts = computed(() => homeSourcePosts.value.filter((post) => isMediaPost(post)))
const fallbackFeaturedRailPosts = computed(() => {
  const ordered = [...mediaPosts.value, ...homeSourcePosts.value]
  const seen = new Set<string>()
  return ordered
    .filter((post) => {
      if (seen.has(post.id)) return false
      seen.add(post.id)
      return true
    })
    .slice(0, 4)
})

type FeaturedRailCard = {
  id: string
  post: PostListItem
  thumbnail: string | null
  kicker: string
  eyebrow: string
  title: string
  summary: string
  author: string
  time: string
  stats: Array<{
    key: string
    label: string
    value: string
  }>
}

const liveFeaturedRailItems = computed(() =>
  (homeAggregate.value?.featured.items ?? []).slice(0, 4)
)

const featuredRailCards = computed<FeaturedRailCard[]>(() =>
  liveFeaturedRailItems.value.map((item) => {
    const post = mapFeaturedItemToPost(item)
    const relatedPost = item.related_posts?.[0]
    const author =
      formatHomeAuthorName(getPrimaryFeaturedAuthor(item)) || t('home.hero.fallbackAuthor')
    const title = normalizeText(item.title) || formatHeroTitle(post)
    const rawSummary =
      normalizeText(item.summary || item.subtitle) ||
      normalizeText(relatedPost?.excerpt) ||
      normalizeText(post.description)
    const summary = rawSummary && rawSummary !== title ? rawSummary : ''
    const time = relatedPost?.published_at ? formatRelativeTime(relatedPost.published_at, t) : ''
    const primaryTag = normalizeHomeTag(relatedPost?.tags?.[0])
    const kicker =
      normalizeText(item.kicker).toUpperCase() ||
      normalizeText(relatedPost?.platform).toUpperCase() ||
      t('home.featured.kicker')

    const stats = [
      ...(relatedPost?.metrics?.view_count
        ? [
            {
              key: 'views',
              label: t('post.views'),
              value: formatMetricValue(relatedPost.metrics.view_count),
            },
          ]
        : []),
      ...(relatedPost?.metrics?.like_count
        ? [
            {
              key: 'likes',
              label: t('post.likes'),
              value: formatMetricValue(relatedPost.metrics.like_count),
            },
          ]
        : []),
    ].slice(0, 2)

    return {
      id: post.id,
      post,
      thumbnail: mapHomeImageUrl(item.cover),
      kicker,
      eyebrow: primaryTag ? `#${primaryTag}` : author,
      title,
      summary,
      author,
      time,
      stats,
    }
  })
)

const featuredRailPosts = computed(() => {
  return fallbackFeaturedRailPosts.value
})

const latestTextPost = computed(() => textPosts.value[0] ?? null)
const spotlightMediaCards = computed(() => {
  const liveItems = homeAggregate.value?.featured.items ?? []
  if (liveItems.length > 0) {
    return liveItems.slice(0, 4).map((item) => {
      const post = mapFeaturedItemToPost(item)
      return {
        post,
        thumbnail: mapHomeImageUrl(item.cover),
        title: normalizeText(item.title) || formatHeroTitle(post),
        author: formatHomeAuthorName(getPrimaryFeaturedAuthor(item)) || formatHeroAuthor(post),
      }
    })
  }

  return heroHighlightCards.value.slice(0, 4)
})

const portalLeadCard = computed(() => spotlightMediaCards.value[0] ?? null)

const heroEditorialCard = computed(() => {
  const editorial = homeAggregate.value?.hero.editorial_card
  if (editorial) {
    const title = normalizeText(editorial.title)
    const text = normalizeText(editorial.text)
    const author = formatHomeAuthorName(editorial.author) || t('home.hero.fallbackAuthor')
    const time =
      normalizeText(editorial.time_hint) ||
      (editorial.published_at ? formatRelativeTime(editorial.published_at, t) : '')

    if (title || text || author) {
      return {
        title: title || author,
        text: text || t('home.hero.fallbackTitle'),
        author,
        time,
      }
    }
  }

  const post = latestTextPost.value
  if (!post) return null

  const rawText = normalizeText(post.content ?? post.description ?? post.title)
  const rawTitle = normalizeText(post.title)
  const author = formatAuthorName(post) || t('home.hero.fallbackAuthor')
  const time = post.published_at ? formatRelativeTime(post.published_at, t) : ''

  return {
    title:
      rawTitle && rawTitle !== rawText
        ? rawTitle.length > 40
          ? `${rawTitle.slice(0, 40)}…`
          : rawTitle
        : author,
    text:
      rawText.length > 120 ? `${rawText.slice(0, 120)}…` : rawText || t('home.hero.fallbackTitle'),
    author,
    time,
  }
})
const heroEditorialSupportText = computed(() => {
  const card = heroEditorialCard.value
  if (!card) return ''
  const title = normalizeText(card.title)
  const text = normalizeText(card.text)
  return text && text !== title ? text : ''
})

const heroEditorialRevealKey = computed(() => {
  const card = heroEditorialCard.value
  if (!card) return ''
  return [card.title, card.text, card.author, card.time]
    .map((value) => normalizeText(value))
    .join('|')
})

function getSpotlightTextScore(item: HomeLatestTextPostItem) {
  return normalizeText(item.excerpt).length + (item.tags?.length ?? 0) * 16
}

const spotlightTextCards = computed(() => {
  const liveItems = homeAggregate.value?.latest_text_posts ?? []
  if (liveItems.length > 0) {
    const editorialPostId = homeAggregate.value?.hero.editorial_card?.post_id ?? null
    const filteredItems = editorialPostId
      ? liveItems.filter((item) => item.post_id !== editorialPostId)
      : liveItems
    const spotlightItems = (filteredItems.length >= 3 ? filteredItems : liveItems)
      .slice(0, 6)
      .sort((a, b) => {
        const scoreDelta = getSpotlightTextScore(b) - getSpotlightTextScore(a)
        if (scoreDelta !== 0) return scoreDelta

        const publishedA = Date.parse(a.published_at ?? '')
        const publishedB = Date.parse(b.published_at ?? '')
        if (Number.isFinite(publishedA) && Number.isFinite(publishedB)) {
          return publishedB - publishedA
        }
        return 0
      })
      .slice(0, 3)

    return spotlightItems.map((item) => {
      const post = mapLatestTextItemToPost(item)
      const title = formatHeroTitle(post)
      const text = formatBubbleText(post)
      return {
        post,
        title,
        text,
        supportText: normalizeText(text) !== normalizeText(title) ? text : '',
        author: formatHomeAuthorName(item.author) || t('home.hero.fallbackAuthor'),
        time:
          normalizeText(item.time_hint) ||
          (item.published_at ? formatRelativeTime(item.published_at, t) : ''),
      }
    })
  }

  return textPosts.value.slice(0, 3).map((post) => {
    const title = formatHeroTitle(post)
    const text = formatBubbleText(post)
    return {
      post,
      title,
      text,
      supportText: normalizeText(text) !== normalizeText(title) ? text : '',
      author: formatAuthorName(post) || t('home.hero.fallbackAuthor'),
      time: post.published_at ? formatRelativeTime(post.published_at, t) : '',
    }
  })
})

const portalPanels = computed(() => {
  const portalItemMap = new Map(
    (homeAggregate.value?.portal.items ?? []).map((item) => [item.key, item] as const)
  )
  const notes = spotlightTextCards.value
  const firstAuthor = trendingAuthors.value[0]
  const firstSchedule = homeScheduleHighlights.value[0]
  const firstCommunity = homeCommunityHighlights.value[0]

  return [
    {
      key: 'authors',
      title: t('home.portal.items.authors.title'),
      desc: t('home.portal.items.authors.desc'),
      to: portalItemMap.get('authors')?.deep_link || '/authors',
      icon: Users,
      animation: 'user',
      noteLabel: t('home.trends.authorsTitle'),
      noteTitle: firstAuthor?.name ?? notes[0]?.title ?? t('home.hero.editorialFallbackTitle'),
      noteText: firstAuthor
        ? t('home.trends.authorCount', { n: firstAuthor.count })
        : notes[0]?.text || t('home.portal.items.authors.desc'),
      noteMeta: firstAuthor?.link
        ? t('home.trends.authorsAction')
        : notes[0]?.time || t('home.trends.authorsAction'),
    },
    {
      key: 'schedule',
      title: t('home.portal.items.schedule.title'),
      desc: t('home.portal.items.schedule.desc'),
      to: portalItemMap.get('schedule')?.deep_link || '/schedule',
      icon: Calendar,
      animation: 'calendar',
      noteLabel:
        firstSchedule?.badge ||
        (firstSchedule ? getScheduleCategoryLabel(firstSchedule.category) : notes[1]?.author) ||
        t('home.hero.fallbackAuthor'),
      noteTitle: firstSchedule?.title ?? notes[1]?.title ?? t('home.hero.editorialFallbackTitle'),
      noteText:
        formatScheduleHighlightText(firstSchedule) ||
        notes[1]?.text ||
        t('home.portal.items.schedule.desc'),
      noteMeta:
        formatScheduleHighlightMeta(firstSchedule) ||
        notes[1]?.time ||
        t('home.trends.scheduleAction'),
    },
    {
      key: 'community',
      title: t('home.portal.items.community.title'),
      desc: t('home.portal.items.community.desc'),
      to: portalItemMap.get('community')?.deep_link || '/community',
      icon: MessageSquare,
      animation: 'sparkle',
      noteLabel: firstCommunity
        ? t('community.recentDiscussions')
        : notes[2]?.author || t('home.hero.fallbackAuthor'),
      noteTitle: firstCommunity?.title ?? notes[2]?.title ?? t('home.hero.editorialFallbackTitle'),
      noteText:
        normalizeText(firstCommunity?.excerpt) ||
        notes[2]?.text ||
        t('home.portal.items.community.desc'),
      noteMeta:
        formatCommunityHighlightMeta(firstCommunity) || notes[2]?.time || t('nav.community'),
    },
  ]
})

const bubbleBursts = [
  {
    x: 'clamp(-24rem, -26vw, -15rem)',
    y: 'clamp(-15rem, -16vh, -9rem)',
    introX: 'clamp(-8rem, -9vw, -5rem)',
    introY: 'clamp(-5rem, -5.5vh, -3.25rem)',
    delay: '0s',
    scale: '0.94',
    tailAngle: '-148deg',
  },
  {
    x: 'clamp(24rem, 26vw, 15rem)',
    y: 'clamp(-14rem, -15vh, -8.5rem)',
    introX: 'clamp(8rem, 9vw, 5rem)',
    introY: 'clamp(-4.75rem, -5.2vh, -3rem)',
    delay: '0.08s',
    scale: '0.9',
    tailAngle: '18deg',
  },
  {
    x: 'clamp(-29rem, -31vw, -18rem)',
    y: 'clamp(3rem, 5vh, 5.5rem)',
    introX: 'clamp(-9rem, -10vw, -5.75rem)',
    introY: 'clamp(1.4rem, 1.9vh, 1.9rem)',
    delay: '0.16s',
    scale: '0.88',
    tailAngle: '148deg',
  },
  {
    x: 'clamp(28rem, 29vw, 17rem)',
    y: 'clamp(5rem, 7vh, 6.5rem)',
    introX: 'clamp(8.6rem, 9vw, 5.25rem)',
    introY: 'clamp(1.6rem, 2vh, 2rem)',
    delay: '0.24s',
    scale: '0.86',
    tailAngle: '42deg',
  },
  {
    x: '0rem',
    y: 'clamp(18rem, 20vh, 12.5rem)',
    introX: '0rem',
    introY: 'clamp(6rem, 6.4vh, 4.4rem)',
    delay: '0.32s',
    scale: '0.9',
    tailAngle: '92deg',
  },
  {
    x: 'clamp(-1rem, -2vw, -0.5rem)',
    y: 'clamp(-19rem, -21vh, -12rem)',
    introX: 'clamp(-0.5rem, -1vw, -0.25rem)',
    introY: 'clamp(-6.4rem, -7vh, -4.2rem)',
    delay: '0.4s',
    scale: '0.96',
    tailAngle: '-88deg',
  },
  {
    x: 'clamp(16rem, 18vw, 10rem)',
    y: 'clamp(15rem, 16vh, 10rem)',
    introX: 'clamp(5rem, 6vw, 3rem)',
    introY: 'clamp(4.6rem, 5vh, 3rem)',
    delay: '0.48s',
    scale: '0.84',
    tailAngle: '56deg',
  },
  {
    x: 'clamp(-17rem, -19vw, -10.5rem)',
    y: 'clamp(12rem, 14vh, 8.5rem)',
    introX: 'clamp(-5.4rem, -6.6vw, -3.2rem)',
    introY: 'clamp(3.8rem, 4.6vh, 2.6rem)',
    delay: '0.56s',
    scale: '0.84',
    tailAngle: '132deg',
  },
]

const bubbleItems = computed(() => {
  const liveItems = homeAggregate.value?.latest_text_posts ?? []
  if (liveItems.length > 0) {
    return liveItems.slice(0, bubbleBursts.length).map((item, index) => {
      const orbit = bubbleBursts[index]
      const post = mapLatestTextItemToPost(item)

      return {
        post,
        thumbnail: null,
        text: formatBubbleText(post),
        author: formatHomeAuthorName(item.author) || t('home.hero.fallbackAuthor'),
        time:
          normalizeText(item.time_hint) ||
          (item.published_at ? formatRelativeTime(item.published_at, t) : ''),
        style: {
          '--bubble-x': orbit.x,
          '--bubble-y': orbit.y,
          '--bubble-x-intro': orbit.introX,
          '--bubble-y-intro': orbit.introY,
          '--bubble-delay': orbit.delay,
          '--bubble-scale': orbit.scale,
          '--bubble-tail-angle': orbit.tailAngle,
        } as Record<string, string>,
      }
    })
  }

  const items = textPosts.value.slice(0, bubbleBursts.length)
  return items.map((post, index) => {
    const orbit = bubbleBursts[index]
    return {
      post,
      thumbnail: post.thumbnail_url ? normalizeToThumbnailUrl(post.thumbnail_url, 'medium') : null,
      text: formatBubbleText(post),
      author: formatAuthorName(post) || t('home.hero.fallbackAuthor'),
      time: post.published_at ? formatRelativeTime(post.published_at, t) : '',
      style: {
        '--bubble-x': orbit.x,
        '--bubble-y': orbit.y,
        '--bubble-x-intro': orbit.introX,
        '--bubble-y-intro': orbit.introY,
        '--bubble-delay': orbit.delay,
        '--bubble-scale': orbit.scale,
        '--bubble-tail-angle': orbit.tailAngle,
      } as Record<string, string>,
    }
  })
})

const storyCards = computed(() => {
  const liveItems = homeAggregate.value?.story_deck.items ?? []
  if (liveItems.length > 0) {
    return liveItems.slice(0, 5).map((item) => {
      const post = mapStoryDeckItemToPost(item)
      const author = formatHomeAuthorName(item.author) || t('home.hero.fallbackAuthor')
      return {
        post,
        thumbnail: mapHomeImageUrl(item.image),
        eyebrow: normalizeText(item.eyebrow) || author,
        title: normalizeText(item.title) || formatStoryTitle(post),
        excerpt: normalizeText(item.summary) || formatStoryExcerpt(post),
        author,
        time: resolveStoryDeckTime(item),
        detailLink: resolvePostLink(item.deep_link, item.post_id),
      }
    })
  }

  const source = mediaPosts.value.length > 0 ? mediaPosts.value : homeSourcePosts.value
  return source.slice(0, 5).map((post) => {
    const firstTag = normalizeTag(post.tags?.[0] ?? '')
    const author = formatAuthorName(post) || t('home.hero.fallbackAuthor')
    return {
      post,
      thumbnail: post.thumbnail_url ? normalizeToThumbnailUrl(post.thumbnail_url, 'large') : null,
      eyebrow: firstTag ? `#${firstTag}` : author,
      title: formatStoryTitle(post),
      excerpt: formatStoryExcerpt(post),
      author,
      time: post.published_at ? formatRelativeTime(post.published_at, t) : '',
      detailLink: `/post/${post.id}`,
    }
  })
})

const storyCardCount = computed(() => storyCards.value.length)
const storyMergeCard = computed(() => storyCards.value[storyCards.value.length - 1] ?? null)
const storyTravel = computed(() => Math.max(storyCardCount.value - 1, 0))
const storyProgressIndex = computed(() => storyProgress.value * storyTravel.value)
const storyMergeProgress = computed(() => clamp((storyProgress.value - 0.94) / 0.06))
const activeStoryIndex = computed(() =>
  storyCardCount.value > 1 ? Math.round(storyProgressIndex.value) : 0
)

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
    railProgress.value *
    Math.max(railSlideCount.value - 1, 0) *
    (100 / Math.max(railSlideCount.value, 1))
  }%, 0, 0)`,
}))

const storySceneStyle = computed(() => ({
  '--story-card-count': String(Math.max(storyCardCount.value, 1)),
  '--story-progress': String(storyProgress.value),
  '--story-footer-fade': String(clamp((storyProgress.value - 0.95) / 0.05)),
}))

const storyMergePanelStyle = computed<Record<string, string>>(() => ({
  '--story-merge-opacity': String(storyMergeProgress.value),
  '--story-merge-y': `${((1 - storyMergeProgress.value) * 2.2).toFixed(4)}rem`,
}))

const homePageTransitionClass = computed(() =>
  activeScreenTransition.value ? `home-page--transition-${activeScreenTransition.value}` : null
)

const homePageMotionStyle = computed<Record<string, string>>(() => {
  const heroExit = viewportSceneBlend.value.heroRail
  const railEnter = viewportSceneBlend.value.heroRail
  const railExit = viewportSceneBlend.value.railPosts
  const postsEnter = viewportSceneBlend.value.railPosts
  const postsExit = viewportSceneBlend.value.postsStory
  const storyEnter = viewportSceneBlend.value.postsStory
  const storyOutro = viewportSceneBlend.value.storyBridge
  const bridgeEnter = viewportSceneBlend.value.storyBridge
  const bridgeOutro = viewportSceneBlend.value.bridgeFooter

  return {
    '--home-hero-opacity': String(clamp(1 - heroExit * 0.18, 0.78, 1)),
    '--home-hero-scale': String(clamp(1 - heroExit * 0.04, 0.94, 1)),
    '--home-hero-y': `${(-4 * heroExit).toFixed(4)}rem`,
    '--home-hero-blur': `${(heroExit * 0.36).toFixed(4)}rem`,
    '--home-rail-opacity': String(clamp(railEnter * 1.08 - railExit * 0.28, 0, 1)),
    '--home-rail-scale': String(clamp(0.92 + railEnter * 0.08 - railExit * 0.04, 0.88, 1)),
    '--home-rail-y': `${((1 - railEnter) * 5.2 - railExit * 2.4).toFixed(4)}rem`,
    '--home-rail-blur': `${((1 - railEnter) * 0.8 + railExit * 0.26).toFixed(4)}rem`,
    '--home-posts-opacity': String(clamp(postsEnter * 1.08 - postsExit * 0.28, 0, 1)),
    '--home-posts-scale': String(clamp(0.92 + postsEnter * 0.08 - postsExit * 0.06, 0.88, 1)),
    '--home-posts-y': `${((1 - postsEnter) * 5 - postsExit * 2.2).toFixed(4)}rem`,
    '--home-posts-blur': `${((1 - postsEnter) * 0.72 + postsExit * 0.28).toFixed(4)}rem`,
    '--home-story-opacity': String(clamp(storyEnter * 1.08 - storyOutro * 0.58, 0, 1)),
    '--home-story-scale': String(clamp(0.92 + storyEnter * 0.08 - storyOutro * 0.08, 0.86, 1)),
    '--home-story-y': `${((1 - storyEnter) * 5.2 - storyOutro * 3.4).toFixed(4)}rem`,
    '--home-story-blur': `${((1 - storyEnter) * 0.76 + storyOutro * 0.3).toFixed(4)}rem`,
    '--home-bridge-opacity': String(clamp(bridgeEnter * 1.08 - bridgeOutro * 0.42, 0, 1)),
    '--home-bridge-scale': String(clamp(0.97 + bridgeEnter * 0.03 - bridgeOutro * 0.04, 0.9, 1)),
    '--home-bridge-y': `${((1 - bridgeEnter) * 2.4 + bridgeOutro * 5.2).toFixed(4)}rem`,
    '--home-bridge-blur': `${((1 - bridgeEnter) * 0.34 + bridgeOutro * 0.18).toFixed(4)}rem`,
  }
})

const heroEditorialTitle = computed(() => {
  const spotlight = homeAggregate.value?.hero.spotlight
  return (
    normalizeText(spotlight?.title) ||
    heroHighlightCards.value[0]?.title ||
    t('home.hero.editorialFallbackTitle')
  )
})

const heroEditorialText = computed(() => {
  const spotlight = homeAggregate.value?.hero.spotlight
  const spotlightSummary = normalizeText(spotlight?.summary)
  if (spotlightSummary) {
    return spotlightSummary
  }

  const author = heroHighlightCards.value[0]?.author || t('home.hero.fallbackAuthor')
  const tag = heroTags.value[0]
  return tag
    ? t('home.hero.editorialTextWithTag', { author, tag: `#${tag}` })
    : t('home.hero.editorialText', { author })
})

const heroSpotlightTag = computed(() => {
  const spotlight = homeAggregate.value?.hero.spotlight
  return normalizeHomeTag(spotlight?.primary_tag) || heroTags.value[0] || ''
})

const heroSpotlightMeta = computed(() => {
  const spotlight = homeAggregate.value?.hero.spotlight
  return (
    formatHomeAuthorName(spotlight?.author) ||
    heroHighlightCards.value[0]?.author ||
    t('home.hero.fallbackAuthor')
  )
})

const heroStats = computed(() => {
  const liveStats = homeAggregate.value?.hero.stats ?? []
  if (liveStats.length > 0) {
    return liveStats.slice(0, 3).map((stat) => ({
      key: stat.key,
      label: getHeroStatLabel(stat.key, stat.label),
      value: stat.display_value || formatMetricValue(stat.value),
      note: getHeroStatHint(stat.key, stat.hint),
    }))
  }

  return [
    {
      key: 'updates',
      label: t('home.hero.stats.updates'),
      value: formatMetricValue(total.value || homeSourcePosts.value.length),
      note: t('home.hero.stats.updatesHint'),
    },
    {
      key: 'authors',
      label: t('home.hero.stats.authors'),
      value: formatMetricValue(uniqueAuthorCount.value),
      note: t('home.hero.stats.authorsHint'),
    },
    {
      key: 'tags',
      label: t('home.hero.stats.tags'),
      value: formatMetricValue(trendingTags.value.length),
      note: t('home.hero.stats.tagsHint'),
    },
  ]
})

const storyMergeLinks = computed(() => [
  {
    key: 'explore',
    label: t('nav.explore'),
    description: t('home.portal.items.recommend.desc'),
    to: { name: 'explore' as const },
    icon: Compass,
    animation: 'explore',
  },
  {
    key: 'authors',
    label: t('nav.authors'),
    description: t('home.portal.items.authors.desc'),
    to: { name: 'authors' as const },
    icon: Users,
    animation: 'user',
  },
  {
    key: 'schedule',
    label: t('nav.schedule'),
    description: t('home.trends.scheduleHint'),
    to: { name: 'schedule' as const },
    icon: Calendar,
    animation: 'calendar',
  },
  {
    key: 'community',
    label: t('nav.community'),
    description: t('home.portal.items.community.desc'),
    to: { name: 'community' as const },
    icon: MessageSquare,
    animation: 'sparkle',
  },
])

const scheduleFallbackCard = computed(() => {
  const schedulePanel = portalPanels.value.find((panel) => panel.key === 'schedule')
  return {
    label:
      schedulePanel?.noteLabel || heroEditorialCard.value?.author || t('home.hero.editorialLabel'),
    title:
      schedulePanel?.noteTitle || heroEditorialCard.value?.title || t('home.trends.scheduleTitle'),
    text:
      schedulePanel?.noteText || heroEditorialSupportText.value || t('home.trends.scheduleHint'),
    meta:
      schedulePanel?.noteMeta || heroEditorialCard.value?.time || t('home.trends.scheduleAction'),
  }
})

const primaryScheduleHighlights = computed(() => homeScheduleHighlights.value.slice(0, 2))

const trendsScheduleCompanion = computed(() => {
  if (primaryScheduleHighlights.value.length !== 1) return null

  const community = homeCommunityHighlights.value[0]
  if (community) {
    return {
      kind: 'community',
      label: t('nav.community'),
      title: community.title,
      text: community.excerpt,
      meta: formatCommunityHighlightMeta(community),
      to: community.deep_link || '/community',
    }
  }

  return {
    kind: 'fallback',
    label: scheduleFallbackCard.value.label,
    title: scheduleFallbackCard.value.title,
    text: scheduleFallbackCard.value.text,
    meta: scheduleFallbackCard.value.meta,
    to: '/schedule',
  }
})

const quickFilters = computed(() => [
  { key: 'newest', label: t('explore.newest'), to: { name: 'explore' } },
  {
    key: 'popular',
    label: t('explore.popular'),
    to: { name: 'explore', query: { sort: 'popular' } },
  },
  {
    key: 'trending',
    label: t('explore.trending'),
    to: { name: 'explore', query: { sort: 'trending' } },
  },
])

watchSyncEffect(() => {
  // 确保全量加载和分页加载状态不会并存，减少 UI 状态抖动。
  if (isLoading.value && isLoadingMore.value) {
    isLoadingMore.value = false
  }
})

watch(
  [heroEditorialRevealKey, shouldAnimate],
  ([key, animate]) => {
    clearHeroEditorialRevealTimer()

    if (!key) {
      heroEditorialVisible.value = false
      return
    }

    if (!animate || typeof window === 'undefined') {
      heroEditorialVisible.value = true
      return
    }

    heroEditorialVisible.value = false
    heroEditorialRevealTimer = window.setTimeout(() => {
      heroEditorialVisible.value = true
      heroEditorialRevealTimer = null
    }, 140)
  },
  { immediate: true }
)

onActivated(() => {
  scenesEnabled = true
  setRailNavbarLock(true)
  setHomeFooterBlend(true)
  bindSceneInteractions()
  bindViewportSceneBlendTracking()
  observeSceneLayout()
  scheduleSceneSetup()
  runAfterNextPaint(() => {
    scheduleViewportSceneBlendUpdate()
    window.dispatchEvent(new Event('scroll'))
  })
  if (
    (homeDataSource.value === 'idle' || homeDataSource.value === 'fallback') &&
    !isLoading.value
  ) {
    void fetchHomeData()
  }
})

onDeactivated(() => {
  scenesEnabled = false
  setHomeFooterBlend(false)
  unbindSceneInteractions()
  unbindViewportSceneBlendTracking()
  disconnectSceneLayoutObserver()
  abortHomeRequest()
  cleanupSceneTriggers()
  setRailNavbarLock(false)
  clearHeroEditorialRevealTimer()
  clearScreenTransitionTimer()
  activeScreenTransition.value = null
  hasTriggeredBubbleBurst.value = false
})
let homeRequestController: AbortController | null = null

function abortHomeRequest() {
  homeRequestController?.abort()
  homeRequestController = null
}

function applyHomeAggregate(payload: HomeAggregateResponse, source: 'aggregate' | 'support') {
  homeAggregate.value = payload
  homeDataSource.value = source

  const normalizedPosts = buildHomePostsFromAggregate(payload).filter(
    (post) => !isFilteredAuthor(post.author_name)
  )

  posts.value = normalizedPosts
  allPosts.value = normalizedPosts
  total.value = normalizedPosts.length
}

async function refreshHomeSupportBlocks(signal: AbortSignal) {
  const [scheduleResult, communityResult] = await Promise.allSettled([
    homeService.getScheduleHighlights(4, { signal, skipErrorToast: true }),
    homeService.getCommunityHighlights(4, { signal, skipErrorToast: true }),
  ])

  if (signal.aborted) return

  if (scheduleResult.status === 'fulfilled') {
    homeScheduleHighlights.value = scheduleResult.value.payload.items
  }

  if (communityResult.status === 'fulfilled') {
    homeCommunityHighlights.value = communityResult.value.payload.items
  }
}

async function fetchHomeData(): Promise<boolean> {
  abortHomeRequest()
  isLoading.value = true
  isLoadingMore.value = false
  error.value = null
  failedTrendAuthorAvatarKeys.value = new Set()
  homeScheduleHighlights.value = []
  homeCommunityHighlights.value = []

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

    void refreshHomeSupportBlocks(controller.signal)
    return true
  } catch (err) {
    if (controller.signal.aborted) return false

    homeAggregate.value = null
    homeDataSource.value = 'fallback'
    posts.value = HOME_FALLBACK_POSTS
    allPosts.value = HOME_FALLBACK_POSTS
    total.value = HOME_FALLBACK_POSTS.length
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

function normalizeTag(tag: string): string {
  return String(tag ?? '')
    .replace(/^#/, '')
    .trim()
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeHomeTag(tag: HomeTagBrief | string | null | undefined): string {
  if (typeof tag === 'string') return normalizeTag(tag)
  return normalizeTag(tag?.name ?? tag?.display_text ?? '')
}

function formatHomeAuthorName(author: HomeAuthorBrief | null | undefined): string {
  if (!author) return ''
  const displayName = normalizeText(author.display_name)
  if (displayName) return displayName
  const username = normalizeText(author.username)
  if (!username) return ''
  return username.startsWith('@') ? username : `@${username}`
}

function mapHomeImageUrl(
  image: { url?: string | null; thumbnail_url?: string | null } | null | undefined,
  size: 'small' | 'medium' | 'large' = 'large'
): string | null {
  const source = normalizeText(image?.url) || normalizeText(image?.thumbnail_url)
  if (!source) return null
  return normalizeToThumbnailUrl(source, size) || source
}

function resolvePostIdFromLink(link: string | null | undefined): string | null {
  const value = normalizeText(link)
  if (!value) return null
  const match = value.match(/\/post\/([^/?#]+)/)
  return match?.[1] ?? null
}

function resolvePostLink(
  link: string | null | undefined,
  fallbackId: string | null | undefined
): string {
  const value = normalizeText(link)
  if (value) return value
  const fallback = normalizeText(fallbackId)
  return fallback ? `/post/${fallback}` : '/explore'
}

function normalizePlatform(value: string | null | undefined, fallback = 'story'): string {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return fallback

  const mapped: Record<string, string> = {
    x: 'twitter',
    twitter: 'twitter',
    youtube: 'youtube',
    instagram: 'instagram',
    tiktok: 'tiktok',
    bilibili: 'bilibili',
    text: 'text',
    story: 'story',
  }

  return mapped[normalized] ?? normalized
}

function getPrimaryFeaturedAuthor(
  item: HomeFeaturedItem | null | undefined
): HomeAuthorBrief | null {
  if (!item) return null
  return item.related_authors?.[0] ?? item.related_posts?.[0]?.author ?? null
}

function mapLatestTextItemToPost(item: HomeLatestTextPostItem): PostListItem {
  const excerpt = normalizeText(item.excerpt)
  const authorName = formatHomeAuthorName(item.author)
  return {
    id: item.post_id,
    platform: 'text',
    title: excerpt.slice(0, 36) || authorName || t('home.hero.fallbackTitle'),
    content: excerpt,
    description: excerpt,
    published_at: item.published_at ?? undefined,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: 0,
    author_name: authorName || undefined,
    author_id: item.author?.id ?? undefined,
    author_username: item.author?.username ?? undefined,
    author_avatar_url: item.author?.avatar_url ?? undefined,
    post_url: resolvePostLink(item.deep_link, item.post_id),
    tags: (item.tags ?? []).map((tag) => normalizeHomeTag(tag)).filter(Boolean),
  }
}

function mapFeaturedItemToPost(item: HomeFeaturedItem): PostListItem {
  const author = getPrimaryFeaturedAuthor(item)
  const postId =
    resolvePostIdFromLink(item.primary_cta?.target) ||
    item.related_posts?.[0]?.post_id ||
    item.related_posts?.[0]?.id ||
    item.id

  return {
    id: postId,
    platform: normalizePlatform(item.kicker, 'story'),
    title: normalizeText(item.title) || t('home.hero.fallbackTitle'),
    content: normalizeText(item.summary || item.subtitle) || undefined,
    description: normalizeText(item.summary || item.subtitle) || undefined,
    thumbnail_url: mapHomeImageUrl(item.cover, 'large'),
    published_at: item.related_posts?.[0]?.published_at ?? undefined,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: item.cover ? 1 : 0,
    media_type: item.cover ? 'image' : undefined,
    author_name: formatHomeAuthorName(author) || undefined,
    author_id: author?.id ?? undefined,
    author_username: author?.username ?? undefined,
    author_avatar_url: author?.avatar_url ?? undefined,
    post_url: resolvePostLink(item.primary_cta?.target, postId),
  }
}

function mapStoryDeckItemToPost(item: HomeStoryDeckItem): PostListItem {
  const authorName = formatHomeAuthorName(item.author)
  const rawEyebrow = normalizeText(item.eyebrow)
  const firstTag = rawEyebrow.startsWith('#') ? normalizeTag(rawEyebrow) : ''
  return {
    id: item.post_id,
    platform: 'story',
    title: normalizeText(item.title) || t('home.hero.fallbackTitle'),
    content: normalizeText(item.summary) || undefined,
    description: normalizeText(item.summary) || undefined,
    thumbnail_url: mapHomeImageUrl(item.image, 'large'),
    published_at: item.published_at ?? undefined,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: item.image ? 1 : 0,
    media_type: item.image ? 'image' : undefined,
    author_name: authorName || undefined,
    author_id: item.author?.id ?? undefined,
    author_username: item.author?.username ?? undefined,
    author_avatar_url: item.author?.avatar_url ?? undefined,
    post_url: resolvePostLink(item.deep_link, item.post_id),
    tags: firstTag ? [firstTag] : undefined,
  }
}

function buildHomePostsFromAggregate(payload: HomeAggregateResponse): PostListItem[] {
  const deduped = new Map<string, PostListItem>()

  for (const item of payload.latest_text_posts ?? []) {
    const post = mapLatestTextItemToPost(item)
    deduped.set(post.id, post)
  }

  for (const item of payload.featured.items ?? []) {
    const post = mapFeaturedItemToPost(item)
    deduped.set(post.id, post)
  }

  for (const item of payload.story_deck.items ?? []) {
    const post = mapStoryDeckItemToPost(item)
    deduped.set(post.id, post)
  }

  const spotlight = payload.hero.spotlight
  if (spotlight?.post_id) {
    const spotlightPost: PostListItem = {
      id: spotlight.post_id,
      platform: 'story',
      title: normalizeText(spotlight.title) || t('home.hero.fallbackTitle'),
      content: normalizeText(spotlight.summary) || undefined,
      description: normalizeText(spotlight.summary) || undefined,
      thumbnail_url: mapHomeImageUrl(spotlight.image, 'large'),
      published_at: undefined,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      media_count: spotlight.image ? 1 : 0,
      media_type: spotlight.image ? 'image' : undefined,
      author_name: formatHomeAuthorName(spotlight.author) || undefined,
      author_id: spotlight.author?.id ?? undefined,
      author_username: spotlight.author?.username ?? undefined,
      author_avatar_url: spotlight.author?.avatar_url ?? undefined,
      post_url: resolvePostLink(spotlight.deep_link, spotlight.post_id),
      tags: spotlight.primary_tag ? [normalizeHomeTag(spotlight.primary_tag)] : undefined,
    }
    deduped.set(spotlightPost.id, spotlightPost)
  }

  return Array.from(deduped.values())
}

function resolveStoryDeckTime(item: HomeStoryDeckItem): string {
  if (item.published_at) return formatRelativeTime(item.published_at, t)
  const meta = normalizeText(item.meta)
  if (!meta) return ''
  const parts = meta
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] || '' : ''
}

function getScheduleCategoryLabel(category: string): string {
  const normalized = normalizeText(category)
  if (!normalized) return ''
  if (
    normalized === 'live' ||
    normalized === 'media' ||
    normalized === 'birth' ||
    normalized === 'other'
  ) {
    return t(`schedule.categories.${normalized}`)
  }
  return normalized
}

function formatScheduleHighlightText(item: HomeScheduleHighlight | null | undefined): string {
  if (!item) return ''
  return getScheduleCategoryLabel(item.category)
}

function formatScheduleHighlightMeta(item: HomeScheduleHighlight | null | undefined): string {
  if (!item) return ''
  const date = new Date(item.start_date)
  if (Number.isNaN(date.getTime())) return ''
  return item.is_all_day
    ? date.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
    : date.toLocaleString(locale.value, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatCommunityHighlightMeta(item: HomeCommunityHighlight | null | undefined): string {
  if (!item) return ''
  return `${item.comment_count} · ${formatRelativeTime(item.updated_at, t)}`
}

function getHeroStatLabel(key: string, fallback: string): string {
  switch (key) {
    case 'updates':
      return t('home.hero.stats.updates')
    case 'authors':
      return t('home.hero.stats.authors')
    case 'tags':
      return t('home.hero.stats.tags')
    default:
      return fallback
  }
}

function getHeroStatHint(key: string, fallback: string): string {
  switch (key) {
    case 'updates':
      return t('home.hero.stats.updatesHint')
    case 'authors':
      return t('home.hero.stats.authorsHint')
    case 'tags':
      return t('home.hero.stats.tagsHint')
    default:
      return fallback
  }
}

function hasMedia(post: PostListItem): boolean {
  if (post.thumbnail_url) return true
  if ((post.media_count ?? 0) > 0) return true
  if (post.media_type === 'video' || post.media_type === 'image') return true
  return false
}

function isTextPost(post: PostListItem): boolean {
  if (hasMedia(post)) return false
  const candidate = normalizeText(post.content ?? post.description ?? post.title)
  return Boolean(candidate)
}

function isMediaPost(post: PostListItem): boolean {
  return hasMedia(post)
}

function formatBubbleText(post: PostListItem): string {
  const candidate = normalizeText(post.content ?? post.description ?? post.title)
  if (!candidate) return t('home.hero.fallbackTitle')
  return candidate.length > 90 ? `${candidate.slice(0, 90)}…` : candidate
}

function formatStoryTitle(post: PostListItem): string {
  const candidate = normalizeText(post.title) || normalizeText(post.description)
  const fallback = t('home.hero.fallbackTitle')
  const text = candidate || fallback
  return text.length > 52 ? `${text.slice(0, 52)}…` : text
}

function formatStoryExcerpt(post: PostListItem): string {
  const candidate = normalizeText(post.description ?? post.content ?? post.title)
  if (!candidate) return t('home.hero.editorialFallbackTitle')
  return candidate.length > 160 ? `${candidate.slice(0, 160)}…` : candidate
}

function formatAuthorName(post: PostListItem): string {
  const name = normalizeText(post.author_name)
  if (name) return name
  const username = normalizeText(post.author_username)
  if (!username) return ''
  return username.startsWith('@') ? username : `@${username}`
}

function formatHeroTitle(post: PostListItem): string {
  const candidate = normalizeText(post.title) || normalizeText(post.description)
  const fallback = t('home.hero.fallbackTitle')
  const text = candidate || fallback
  return text.length > 28 ? `${text.slice(0, 28)}…` : text
}

function formatHeroAuthor(post: PostListItem): string {
  return formatAuthorName(post) || t('home.hero.fallbackAuthor')
}

function formatMetricValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(Math.max(0, value))
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function resolveSceneProgress(element: HTMLElement | null): number {
  if (typeof window === 'undefined' || !element) return 0
  const travel = Math.max(element.offsetHeight - window.innerHeight, 1)
  const distance = window.scrollY - element.offsetTop
  return clamp(distance / travel)
}

function syncSceneProgressFromViewport() {
  if (typeof window === 'undefined') return

  railProgress.value =
    railSlideCount.value > 1
      ? resolveSceneProgress(featuredSectionRef.value)
      : clamp(railProgress.value)
  storyProgress.value =
    storyCardCount.value > 1 ? resolveSceneProgress(storyDeckRef.value) : clamp(storyProgress.value)
}

function cleanupScrollTrigger(trigger: ScrollTrigger | null) {
  trigger?.animation?.kill()
  trigger?.kill()
}

function clearSceneScrollTween() {
  sceneScrollLocked = false
  if (typeof window === 'undefined') return
  if (sceneScrollTweenFrame !== null) {
    window.cancelAnimationFrame(sceneScrollTweenFrame)
    sceneScrollTweenFrame = null
  }
  if (sceneScrollLockTimer !== null) {
    window.clearTimeout(sceneScrollLockTimer)
    sceneScrollLockTimer = null
  }
  restoreWindowScrollBehavior(sceneScrollBehaviorSnapshot)
  sceneScrollBehaviorSnapshot = null
}

function clearBubbleBurstReplayFrame() {
  if (typeof window === 'undefined' || bubbleBurstReplayFrame === null) return
  window.cancelAnimationFrame(bubbleBurstReplayFrame)
  bubbleBurstReplayFrame = null
}

function clearViewportSceneFrame() {
  if (typeof window === 'undefined' || viewportSceneFrame === null) return
  window.cancelAnimationFrame(viewportSceneFrame)
  viewportSceneFrame = null
}

function clearScreenTransitionTimer() {
  if (typeof window === 'undefined' || screenTransitionTimer === null) return
  window.clearTimeout(screenTransitionTimer)
  screenTransitionTimer = null
}

function clearHeroEditorialRevealTimer() {
  if (typeof window === 'undefined' || heroEditorialRevealTimer === null) return
  window.clearTimeout(heroEditorialRevealTimer)
  heroEditorialRevealTimer = null
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
  if (enabled) {
    setHomeFooterBlendProgress(viewportSceneBlend.value.bridgeFooter)
    return
  }
  delete document.documentElement.dataset.homeStoryFooter
  document.documentElement.style.removeProperty('--home-footer-progress')
  document.documentElement.style.removeProperty('--home-footer-opacity')
  document.documentElement.style.removeProperty('--home-footer-y')
  document.documentElement.style.removeProperty('--home-footer-blur')
  document.documentElement.style.removeProperty('--home-footer-shell-y')
  document.documentElement.style.removeProperty('--home-story-footer-progress')
  document.documentElement.style.removeProperty('--home-story-footer-opacity')
  document.documentElement.style.removeProperty('--home-story-footer-y')
  document.documentElement.style.removeProperty('--home-story-footer-blur')
}

function setHomeFooterBlendProgress(progress: number) {
  if (typeof document === 'undefined') return
  const safeProgress = clamp(progress)
  if (safeProgress <= 0.04) {
    delete document.documentElement.dataset.homeStoryFooter
    document.documentElement.style.removeProperty('--home-footer-progress')
    document.documentElement.style.removeProperty('--home-footer-opacity')
    document.documentElement.style.removeProperty('--home-footer-y')
    document.documentElement.style.removeProperty('--home-footer-blur')
    document.documentElement.style.removeProperty('--home-footer-shell-y')
    document.documentElement.style.removeProperty('--home-story-footer-progress')
    document.documentElement.style.removeProperty('--home-story-footer-opacity')
    document.documentElement.style.removeProperty('--home-story-footer-y')
    document.documentElement.style.removeProperty('--home-story-footer-blur')
    return
  }
  const footerOpacity = 0.8 + safeProgress * 0.2
  const footerY = Math.max(-3, 1.5 - safeProgress * 8.5)
  const footerBlur = Math.max(0, (1 - safeProgress) * 0.14)
  const footerShellY = Math.max(-7.5, 1.5 - safeProgress * 16.5)

  document.documentElement.dataset.homeStoryFooter = 'true'
  document.documentElement.style.setProperty('--home-footer-progress', safeProgress.toFixed(4))
  document.documentElement.style.setProperty('--home-footer-opacity', footerOpacity.toFixed(4))
  document.documentElement.style.setProperty('--home-footer-y', `${footerY.toFixed(4)}rem`)
  document.documentElement.style.setProperty('--home-footer-blur', `${footerBlur.toFixed(4)}rem`)
  document.documentElement.style.setProperty(
    '--home-footer-shell-y',
    `${footerShellY.toFixed(4)}rem`
  )
  document.documentElement.style.setProperty(
    '--home-story-footer-progress',
    safeProgress.toFixed(4)
  )
  document.documentElement.style.setProperty(
    '--home-story-footer-opacity',
    footerOpacity.toFixed(4)
  )
  document.documentElement.style.setProperty('--home-story-footer-y', `${footerY.toFixed(4)}rem`)
  document.documentElement.style.setProperty(
    '--home-story-footer-blur',
    `${footerBlur.toFixed(4)}rem`
  )
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

  syncSceneProgressFromViewport()

  const nextBlend = {
    heroRail: measureViewportBlend(featuredSectionRef.value, 1.04, 0.16),
    railPosts: measureViewportBlend(postsSectionRef.value, 1.04, 0.18),
    postsStory: measureViewportBlend(storyDeckRef.value, 1.04, 0.18),
    storyBridge: measureViewportBlend(footerBridgeRef.value, 1.04, 0.18),
    bridgeFooter: measureViewportBlend(
      document.querySelector<HTMLElement>('footer.footer'),
      1.08,
      0.32
    ),
  }

  const footerBlendProgress =
    nextBlend.storyBridge > 0.1 || nextBlend.bridgeFooter > 0.16 ? nextBlend.bridgeFooter : 0
  const railLockActive =
    window.scrollY <
    Math.max(
      (footerBridgeRef.value?.offsetTop ?? Number.MAX_SAFE_INTEGER) - window.innerHeight * 0.18,
      0
    )

  viewportSceneBlend.value = {
    ...nextBlend,
    bridgeFooter: footerBlendProgress,
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

function triggerScreenTransition(from: HomeScreenKey, to: HomeScreenKey) {
  if (typeof window === 'undefined' || !shouldAnimate.value) {
    activeScreenTransition.value = null
    return
  }

  clearScreenTransitionTimer()
  activeScreenTransition.value = `${from}-${to}`
  screenTransitionTimer = window.setTimeout(() => {
    screenTransitionTimer = null
    activeScreenTransition.value = null
  }, SCENE_SCROLL_LOCK_MS + 180)
}

function jumpToWindowY(top: number) {
  if (typeof window === 'undefined') return

  const snapshot = lockWindowScrollBehavior()
  setWindowScrollPosition(top)

  window.requestAnimationFrame(() => {
    restoreWindowScrollBehavior(snapshot)
    scheduleViewportSceneBlendUpdate()
  })
}

function lockWindowScrollBehavior() {
  if (typeof document === 'undefined') return null
  const root = document.documentElement
  const body = document.body
  const snapshot = {
    root: root.style.scrollBehavior,
    body: body.style.scrollBehavior,
  }
  root.style.scrollBehavior = 'auto'
  body.style.scrollBehavior = 'auto'
  return snapshot
}

function restoreWindowScrollBehavior(snapshot: { root: string; body: string } | null) {
  if (!snapshot || typeof document === 'undefined') return
  document.documentElement.style.scrollBehavior = snapshot.root
  document.body.style.scrollBehavior = snapshot.body
}

function setWindowScrollPosition(top: number) {
  if (typeof window === 'undefined') return
  const nextTop = Math.max(top, 0)
  window.scrollTo(0, nextTop)
  document.documentElement.scrollTop = nextTop
  document.body.scrollTop = nextTop
}

function easeSceneScroll(progress: number): number {
  if (progress < 0.5) {
    return 4 * progress * progress * progress
  }
  return 1 - Math.pow(-2 * progress + 2, 3) / 2
}

function restartBubbleBurst() {
  if (typeof window === 'undefined') return

  clearBubbleBurstReplayFrame()
  hasTriggeredBubbleBurst.value = false

  if (bubbleItems.value.length === 0) return
  if (!shouldAnimate.value) {
    hasTriggeredBubbleBurst.value = true
    return
  }

  bubbleBurstReplayFrame = window.requestAnimationFrame(() => {
    bubbleBurstReplayFrame = window.requestAnimationFrame(() => {
      hasTriggeredBubbleBurst.value = true
      bubbleBurstReplayFrame = null
    })
  })
}

function animateWindowYTo(
  targetY: number,
  options: {
    duration?: number
    onComplete?: () => void
  } = {}
): boolean {
  if (typeof window === 'undefined') return false

  const safeTargetY = Math.max(targetY, 0)
  const startY = window.scrollY
  const travel = safeTargetY - startY

  if (Math.abs(travel) < 2) {
    jumpToWindowY(safeTargetY)
    options.onComplete?.()
    return true
  }

  if (!shouldAnimate.value) {
    jumpToWindowY(safeTargetY)
    options.onComplete?.()
    return true
  }

  clearSceneScrollTween()
  sceneScrollLocked = true
  sceneScrollBehaviorSnapshot = lockWindowScrollBehavior()

  const duration = Math.max(options.duration ?? SCENE_SCROLL_LOCK_MS, 180)
  const finish = () => {
    if (sceneScrollTweenFrame !== null) {
      window.cancelAnimationFrame(sceneScrollTweenFrame)
      sceneScrollTweenFrame = null
    }
    if (sceneScrollLockTimer !== null) {
      window.clearTimeout(sceneScrollLockTimer)
      sceneScrollLockTimer = null
    }
    restoreWindowScrollBehavior(sceneScrollBehaviorSnapshot)
    sceneScrollBehaviorSnapshot = null
    setWindowScrollPosition(safeTargetY)
    scheduleViewportSceneBlendUpdate()
    sceneScrollLocked = false
    options.onComplete?.()
  }

  let startTime = 0
  const step = (timestamp: number) => {
    if (!scenesEnabled) {
      finish()
      return
    }
    if (!startTime) startTime = timestamp
    const progress = clamp((timestamp - startTime) / duration)
    const eased = easeSceneScroll(progress)
    setWindowScrollPosition(startY + travel * eased)
    scheduleViewportSceneBlendUpdate()

    if (progress >= 1) {
      finish()
      return
    }

    sceneScrollTweenFrame = window.requestAnimationFrame(step)
  }

  sceneScrollLockTimer = window.setTimeout(finish, duration + 160)
  sceneScrollTweenFrame = window.requestAnimationFrame(step)

  return true
}

function jumpToScenePosition(targetY: number, onComplete?: () => void): boolean {
  return animateWindowYTo(targetY, { onComplete })
}

function isSceneActiveRange(element: HTMLElement | null): boolean {
  if (typeof window === 'undefined' || !element) return false
  const start = element.offsetTop
  const end = start + Math.max(element.offsetHeight - window.innerHeight, 0)
  const current = window.scrollY
  return current >= start - 1 && current <= end + 1
}

function getActiveSceneKey(): SceneStepKey | null {
  if (railSlideCount.value > 1 && isSceneActiveRange(featuredSectionRef.value)) return 'featured'
  if (storyCardCount.value > 1 && isSceneActiveRange(storyDeckRef.value)) return 'story'
  return null
}

function isSectionFocused(
  element: HTMLElement | null,
  topThreshold = 0.22,
  bottomThreshold = 0.82
): boolean {
  if (typeof window === 'undefined' || !element) return false
  const rect = element.getBoundingClientRect()
  return (
    rect.top <= window.innerHeight * topThreshold &&
    rect.bottom >= window.innerHeight * bottomThreshold
  )
}

function isViewportSectionVisible(
  element: HTMLElement | null,
  topThreshold = 0.82,
  bottomThreshold = 0.18
): boolean {
  if (typeof window === 'undefined' || !element) return false
  const rect = element.getBoundingClientRect()
  return (
    rect.top < window.innerHeight * topThreshold &&
    rect.bottom > window.innerHeight * bottomThreshold
  )
}

function runAfterNextPaint(callback: () => void) {
  if (typeof window === 'undefined') return
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback)
  })
}

function getFooterEntryY(revealRatio = 0.32): number | null {
  if (typeof window === 'undefined') return null
  const footer = document.querySelector<HTMLElement>('footer.footer')
  if (!footer) return null
  const absoluteTop = window.scrollY + footer.getBoundingClientRect().top
  return Math.max(absoluteTop - window.innerHeight * revealRatio, 0)
}

function getSceneState(scene: SceneStepKey) {
  if (scene === 'featured') {
    return {
      element: featuredSectionRef.value,
      count: railSlideCount.value,
      index: activeRailIndex.value,
    }
  }

  return {
    element: storyDeckRef.value,
    count: storyCardCount.value,
    index: activeStoryIndex.value,
  }
}

function setSceneProgress(scene: SceneStepKey, index: number, count: number) {
  const progress = count > 1 ? index / (count - 1) : 0
  if (scene === 'featured') {
    railProgress.value = progress
    return
  }
  storyProgress.value = progress
}

function releaseScene(scene: SceneStepKey, direction: -1 | 1): boolean {
  if (typeof window === 'undefined') return false

  const { element, count, index } = getSceneState(scene)
  if (!element || count <= 1) return false

  const edgeIndex = direction > 0 ? count - 1 : 0
  if (index !== edgeIndex) return false

  if (scene === 'featured') {
    const targetY = direction > 0 ? postsSectionRef.value?.offsetTop : 0

    if (typeof targetY !== 'number') return false
    triggerScreenTransition('featured', direction > 0 ? 'posts' : 'hero')
    return jumpToScenePosition(targetY, () => {
      setSceneProgress(scene, edgeIndex, count)
      if (direction > 0) {
        runAfterNextPaint(restartBubbleBurst)
      }
    })
  }

  const sceneTravel = Math.max(element.offsetHeight - window.innerHeight, 0)

  if (direction > 0) {
    const targetY =
      footerBridgeRef.value?.offsetTop ?? getFooterEntryY(0.24) ?? element.offsetTop + sceneTravel
    triggerScreenTransition('story', 'bridge')
    return jumpToScenePosition(targetY, () => {
      setSceneProgress(scene, edgeIndex, count)
      scheduleViewportSceneBlendUpdate()
    })
  }

  const targetY = Math.max(
    postsSectionRef.value?.offsetTop ?? element.offsetTop - window.innerHeight,
    0
  )

  triggerScreenTransition('story', 'posts')
  return jumpToScenePosition(targetY, () => {
    setSceneProgress(scene, edgeIndex, count)
    runAfterNextPaint(restartBubbleBurst)
  })
}

function handleStandaloneSceneJump(direction: -1 | 1): boolean {
  if (typeof window === 'undefined') return false

  const featuredTop = featuredSectionRef.value?.offsetTop
  if (direction > 0 && typeof featuredTop === 'number' && window.scrollY < featuredTop) {
    const distance = featuredTop - window.scrollY
    if (distance <= window.innerHeight * 1.02) {
      triggerScreenTransition('hero', 'featured')
      return jumpToScenePosition(featuredTop, () => {
        railProgress.value = 0
      })
    }
  }

  const bridgeActive =
    isViewportSectionVisible(footerBridgeRef.value, 0.84, 0.12) ||
    isSectionFocused(footerBridgeRef.value, 0.18, 0.7)

  if (bridgeActive) {
    if (direction > 0) {
      const targetY =
        getFooterEntryY(0.4) ??
        footerBridgeRef.value?.offsetTop ??
        window.scrollY + window.innerHeight * 0.82
      triggerScreenTransition('bridge', 'footer')
      return jumpToScenePosition(targetY, scheduleViewportSceneBlendUpdate)
    }

    const storyElement = storyDeckRef.value
    if (!storyElement) return false

    const storyEnd =
      storyElement.offsetTop + Math.max(storyElement.offsetHeight - window.innerHeight, 0)
    triggerScreenTransition('bridge', 'story')
    return jumpToScenePosition(storyEnd, () => {
      storyProgress.value = storyCardCount.value > 1 ? 1 : 0
      scheduleViewportSceneBlendUpdate()
    })
  }

  const postsActive =
    isSectionFocused(postsSectionRef.value) ||
    isViewportSectionVisible(postsSectionRef.value, 0.94, 0.12)

  if (!postsActive) return false

  if (direction > 0) {
    const storyTop = storyDeckRef.value?.offsetTop
    if (typeof storyTop !== 'number') return false
    triggerScreenTransition('posts', 'story')
    return jumpToScenePosition(storyTop, () => {
      storyProgress.value = 0
    })
  }

  if (typeof featuredTop !== 'number') return false
  const targetY = featuredTop + Math.max(railSlideCount.value - 1, 0) * window.innerHeight
  triggerScreenTransition('posts', 'featured')
  return jumpToScenePosition(targetY, () => {
    railProgress.value = railSlideCount.value > 1 ? 1 : 0
  })
}

function animateSceneStep(scene: SceneStepKey, direction: -1 | 1): boolean {
  if (typeof window === 'undefined') return false

  const { element, count, index } = getSceneState(scene)
  if (!element || count <= 1) return false

  const nextIndex = Math.min(Math.max(index + direction, 0), count - 1)
  if (nextIndex === index) return false

  const targetY = element.offsetTop + nextIndex * window.innerHeight
  return animateWindowYTo(targetY, {
    onComplete: () => {
      setSceneProgress(scene, nextIndex, count)
    },
  })
}

function handleSceneWheel(event: WheelEvent) {
  if (!scenesEnabled || typeof window === 'undefined') return
  if (Math.abs(event.deltaY) < SCENE_INPUT_TOLERANCE) return

  const direction = event.deltaY > 0 ? 1 : -1

  const scene = getActiveSceneKey()
  if (!scene) {
    if (sceneScrollLocked) {
      event.preventDefault()
      return
    }
    if (handleStandaloneSceneJump(direction)) {
      event.preventDefault()
    }
    return
  }

  if (sceneScrollLocked) {
    event.preventDefault()
    return
  }

  const { count, index } = getSceneState(scene)
  const edgeIndex = direction > 0 ? count - 1 : 0
  if (index === edgeIndex) {
    if (releaseScene(scene, direction)) {
      event.preventDefault()
    }
    return
  }

  if (animateSceneStep(scene, direction)) {
    event.preventDefault()
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return /^(input|textarea|select|button)$/i.test(target.tagName)
}

function handleSceneKeydown(event: KeyboardEvent) {
  if (!scenesEnabled) return
  if (event.defaultPrevented || isEditableTarget(event.target)) return

  let direction: -1 | 1 | null = null
  if (
    event.key === 'ArrowDown' ||
    event.key === 'PageDown' ||
    (!event.shiftKey && event.key === ' ')
  ) {
    direction = 1
  } else if (
    event.key === 'ArrowUp' ||
    event.key === 'PageUp' ||
    (event.shiftKey && event.key === ' ')
  ) {
    direction = -1
  }

  if (!direction) return

  const scene = getActiveSceneKey()
  if (!scene) {
    if (sceneScrollLocked) {
      event.preventDefault()
      return
    }
    if (handleStandaloneSceneJump(direction)) {
      event.preventDefault()
    }
    return
  }

  if (sceneScrollLocked) {
    event.preventDefault()
    return
  }

  const { count, index } = getSceneState(scene)
  const edgeIndex = direction > 0 ? count - 1 : 0
  if (index === edgeIndex) {
    if (releaseScene(scene, direction)) {
      event.preventDefault()
    }
    return
  }

  if (animateSceneStep(scene, direction)) {
    event.preventDefault()
  }
}

function bindSceneInteractions() {
  if (sceneInteractionBound || typeof window === 'undefined') return
  sceneInteractionBound = true
  window.addEventListener('wheel', handleSceneWheel, { passive: false })
  window.addEventListener('keydown', handleSceneKeydown)
}

function unbindSceneInteractions() {
  if (!sceneInteractionBound || typeof window === 'undefined') return
  sceneInteractionBound = false
  clearSceneScrollTween()
  window.removeEventListener('wheel', handleSceneWheel)
  window.removeEventListener('keydown', handleSceneKeydown)
}

function cancelScheduledSceneSetup() {
  sceneSetupQueued = false
  if (typeof window === 'undefined' || sceneSetupFrame === null) return
  window.cancelAnimationFrame(sceneSetupFrame)
  sceneSetupFrame = null
}

function cleanupSceneTriggers() {
  cancelScheduledSceneSetup()
  clearSceneScrollTween()
  clearBubbleBurstReplayFrame()
  cleanupScrollTrigger(bubbleBurstTrigger)
  bubbleBurstTrigger = null
}

function disconnectSceneLayoutObserver() {
  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null
  sceneObservedSizes = new WeakMap()
}

function observeSceneLayout() {
  if (typeof window === 'undefined' || !('ResizeObserver' in window)) return

  disconnectSceneLayoutObserver()

  const trackedElements = [
    featuredSectionRef.value,
    postsSectionRef.value,
    storyDeckRef.value,
    footerBridgeRef.value,
  ].filter((element): element is HTMLElement => Boolean(element))

  if (trackedElements.length === 0) return

  sceneResizeObserver = new ResizeObserver((entries) => {
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
        (previousSize.width !== nextSize.width || previousSize.height !== nextSize.height)
      ) {
        shouldRefresh = true
      }
    }

    if (shouldRefresh) {
      scheduleSceneSetup()
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

function setupSceneTriggers() {
  cleanupSceneTriggers()
  syncSceneProgressFromViewport()

  if (typeof window === 'undefined' || !scenesEnabled) return

  const postsElement = postsSectionRef.value
  if (postsElement) {
    bubbleBurstTrigger = ScrollTrigger.create({
      trigger: postsElement,
      start: 'top 82%',
      end: 'bottom top',
      invalidateOnRefresh: true,
      onEnter: () => {
        restartBubbleBurst()
      },
      onEnterBack: () => {
        restartBubbleBurst()
      },
      onLeave: () => {
        hasTriggeredBubbleBurst.value = false
      },
      onLeaveBack: () => {
        hasTriggeredBubbleBurst.value = false
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
  const offset = index - storyProgressIndex.value
  const distance = Math.abs(offset)
  const isLastCard = index === storyCardCount.value - 1
  const deckOutro = clamp((storyProgress.value - 0.82) / 0.18)
  const outro = isLastCard ? clamp((storyProgress.value - 0.94) / 0.06) : deckOutro
  const lastCardReveal = isLastCard ? clamp((storyProgress.value - 0.92) / 0.08) : 1
  const mergeDeparture = isLastCard ? storyMergeProgress.value : 0
  const clampedOffset = Math.max(-1.3, Math.min(1.3, offset))
  const hidden = distance > (isLastCard ? 1.08 : 1.2)
  const baseTranslateY = clampedOffset * (isLastCard ? 3.8 : 5.8)
  const translateX = `${(-clampedOffset * (isLastCard ? 0.72 : 1.1)).toFixed(2)}rem`
  const translateY = `${(
    baseTranslateY +
    distance * deckOutro * (isLastCard ? 1 : 2.4) +
    (isLastCard ? outro * 0.18 - mergeDeparture * 2.6 : 0)
  ).toFixed(2)}rem`
  const translateZ = `${(
    -distance * (isLastCard ? 5.2 : 12.5) -
    distance * deckOutro * (isLastCard ? 5.5 : 10.5) -
    (isLastCard ? (1 - lastCardReveal) * 4.2 + outro * 0.3 + mergeDeparture * 5.4 : 0)
  ).toFixed(2)}rem`
  const rotateX = `${(
    (offset > 0 ? -3.8 : 4.8) * Math.min(distance, 1) +
    deckOutro * distance * 1.2 +
    (isLastCard ? outro * 0.12 + mergeDeparture * 0.8 : 0)
  ).toFixed(2)}deg`
  const rotateY = `${(-clampedOffset * (isLastCard ? 1.8 : 5.2)).toFixed(2)}deg`
  const scale = isLastCard
    ? Math.max(
        0.9,
        0.92 + lastCardReveal * 0.08 - distance * 0.02 - outro * 0.004 - mergeDeparture * 0.025
      )
    : Math.max(0.86, 1 - distance * 0.06 - deckOutro * distance * 0.08)
  const opacity = isLastCard
    ? hidden
      ? 0
      : Math.max(0.44, (1 - distance * 0.24) * (1 - mergeDeparture * 0.34) - outro * 0.02)
    : hidden
      ? 0
      : Math.max(0.04, 1 - distance * 0.54 - deckOutro * distance * 0.4)
  const blur = hidden
    ? '0.55rem'
    : `${Math.max(0, distance - 0.4) * (isLastCard ? 0.03 : 0.2) + deckOutro * distance * 0.1 + (isLastCard ? (1 - lastCardReveal) * 0.03 + mergeDeparture * 0.02 : 0)}rem`
  const zIndex = String(
    Math.max(
      1,
      storyCardCount.value -
        Math.round(distance * 5) -
        (hidden ? 6 : 0) -
        Math.round(deckOutro * distance * 3) -
        (isLastCard ? Math.round(1 - lastCardReveal + mergeDeparture * 2) : 0)
    )
  )

  return {
    '--story-translate-x': translateX,
    '--story-translate-y': translateY,
    '--story-translate-z': translateZ,
    '--story-rotate-x': rotateX,
    '--story-rotate-y': rotateY,
    '--story-scale': String(scale),
    '--story-opacity': String(opacity),
    '--story-blur': blur,
    'z-index': zIndex,
  }
}

function goToExplore() {
  router.push('/explore')
}

function goToSchedule() {
  router.push('/schedule')
}

function scrollToFeatured() {
  featuredSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function isTrendAuthorAvatarFailed(key: string): boolean {
  return failedTrendAuthorAvatarKeys.value.has(key)
}

function markTrendAuthorAvatarFailed(key: string) {
  if (!key || failedTrendAuthorAvatarKeys.value.has(key)) return
  const next = new Set(failedTrendAuthorAvatarKeys.value)
  next.add(key)
  failedTrendAuthorAvatarKeys.value = next
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
  if (previewThumbnailSrc.value) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, previewThumbnailSrc.value)
  }
  isPreviewOpen.value = false
  router.push(`/post/${postId}`)
}

watch([railSlideCount, storyCardCount, () => bubbleItems.value.length, shouldAnimate], () => {
  scheduleSceneSetup()
})

onMounted(() => {
  scenesEnabled = true
  setRailNavbarLock(true)
  setHomeFooterBlend(true)
  bindSceneInteractions()
  bindViewportSceneBlendTracking()
  observeSceneLayout()
  scheduleSceneSetup()
  runAfterNextPaint(() => {
    scheduleViewportSceneBlendUpdate()
    window.dispatchEvent(new Event('scroll'))
  })
  void fetchHomeData()
})

onBeforeUnmount(() => {
  scenesEnabled = false
  setHomeFooterBlend(false)
  unbindSceneInteractions()
  unbindViewportSceneBlendTracking()
  disconnectSceneLayoutObserver()
  abortHomeRequest()
  cleanupSceneTriggers()
  setRailNavbarLock(false)
  clearHeroEditorialRevealTimer()
  clearScreenTransitionTimer()
  activeScreenTransition.value = null
})
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100svh;
  min-height: 100dvh;
  --home-stage-safe-top: clamp(1.25rem, 2.8vw, 2.25rem);
  --home-stage-chrome-height: clamp(2.25rem, 3.2vw, 2.85rem);
  --home-blush-rgb: 246, 218, 229;
  --home-mist-rgb: 199, 220, 244;
  --home-lilac-rgb: 219, 211, 245;
  --home-ink: #1f2b44;
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
  --home-screen-transition-ms: 760ms;
}

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
  opacity: 0.6;
}

.home-screen {
  min-height: 100svh;
  min-height: 100dvh;
  box-sizing: border-box;
}

.hero,
.rail-stage,
.posts--bubble > .container,
.story-stage,
.home-footer-bridge__stage {
  transform-origin: center center;
  backface-visibility: hidden;
  will-change: transform, opacity, filter;
  transition:
    transform 520ms cubic-bezier(0.2, 0.9, 0.25, 1),
    opacity 440ms cubic-bezier(0.2, 0.84, 0.24, 1),
    filter 440ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.hero {
  opacity: var(--home-hero-opacity, 1);
  transform: translate3d(0, var(--home-hero-y, 0rem), 0) scale(var(--home-hero-scale, 1));
  filter: blur(var(--home-hero-blur, 0rem));
}

.rail-stage {
  opacity: var(--home-rail-opacity, 1);
  transform: translate3d(0, var(--home-rail-y, 0rem), 0) scale(var(--home-rail-scale, 1));
  filter: blur(var(--home-rail-blur, 0rem));
}

.posts--bubble > .container {
  opacity: var(--home-posts-opacity, 1);
  transform: translate3d(0, var(--home-posts-y, 0rem), 0) scale(var(--home-posts-scale, 1));
  filter: blur(var(--home-posts-blur, 0rem));
}

.story-stage {
  opacity: var(--home-story-opacity, 1);
  transform: translate3d(0, var(--home-story-y, 0rem), 0) scale(var(--home-story-scale, 1));
  filter: blur(var(--home-story-blur, 0rem));
}

.home-footer-bridge__stage {
  opacity: var(--home-bridge-opacity, 1);
  transform: translate3d(0, var(--home-bridge-y, 0rem), 0) scale(var(--home-bridge-scale, 1));
  filter: blur(var(--home-bridge-blur, 0rem));
}

.home-page--transition-featured-hero .hero,
.home-page--transition-hero-featured .rail-stage,
.home-page--transition-posts-featured .rail-stage,
.home-page--transition-featured-posts .posts--bubble > .container,
.home-page--transition-story-posts .posts--bubble > .container,
.home-page--transition-posts-story .story-stage,
.home-page--transition-bridge-story .story-stage,
.home-page--transition-story-bridge .home-footer-bridge__stage,
.home-page--transition-footer-bridge .home-footer-bridge__stage,
.home-page--transition-bridge-footer .home-footer-bridge__stage {
  opacity: 1;
  transform: translate3d(0, 0rem, 0) scale(1);
  filter: blur(0rem);
}

.home-page--transition-story-footer .story-stage,
.home-page--transition-story-bridge .story-stage {
  opacity: 0.88;
  transform: translate3d(0, -1.5rem, 0) scale(0.985);
  filter: blur(0.2rem);
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

.home-page--transition-story-footer .story-stage,
.home-page--transition-story-bridge .story-stage {
  animation: homeScreenExitSettle var(--home-screen-transition-ms) cubic-bezier(0.18, 0.82, 0.24, 1)
    both;
}

.home-page--transition-story-bridge .home-footer-bridge__stage,
.home-page--transition-footer-bridge .home-footer-bridge__stage {
  animation: homeScreenEnterBloom var(--home-screen-transition-ms) cubic-bezier(0.18, 0.9, 0.24, 1)
    both;
}

.home-page--transition-bridge-story .home-footer-bridge__stage {
  animation: homeScreenExitCompress var(--home-screen-transition-ms)
    cubic-bezier(0.2, 0.84, 0.24, 1) both;
}

.home-page--transition-bridge-story .story-stage {
  animation: homeScreenEnterRise var(--home-screen-transition-ms) cubic-bezier(0.2, 0.9, 0.25, 1)
    both;
}

.home-page--transition-bridge-footer .home-footer-bridge__stage {
  animation: homeScreenExitNorth var(--home-screen-transition-ms) cubic-bezier(0.2, 0.84, 0.24, 1)
    both;
}

.home-fold {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  position: relative;
  z-index: 1;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-5);
}

.section-title {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.section-kicker {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.section-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.section-header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 46ch;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-full);
  background: var(--home-pill-bg);
  border: 1px solid var(--home-pill-border);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.section-link:hover {
  color: var(--color-text-primary);
  border-color: var(--home-soft-border);
  background: var(--home-tag-hover);
}

/* ========== Hero ========== */
.hero {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  padding-block: clamp(2rem, 6vh, 4rem);
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
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: center;
}

.hero-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--spacing-4);
  align-items: start;
  max-width: min(52rem, 100%);
}

.hero-copy__left,
.hero-copy__right {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
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
}

.hero-editorial {
  position: relative;
  max-width: 32rem;
  min-block-size: 12.5rem;
  padding: var(--spacing-4);
  opacity: 0.72;
  transform: translate3d(0, 0.75rem, 0);
  border-color: var(--home-soft-border);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.66)),
    var(--home-pill-bg);
  box-shadow: var(--home-card-shadow);
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.hero-editorial--loaded {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-editorial__state {
  display: grid;
  align-content: center;
  gap: var(--spacing-2);
  transition:
    opacity 320ms cubic-bezier(0.2, 0.84, 0.24, 1),
    transform 420ms cubic-bezier(0.2, 0.9, 0.25, 1);
}

.hero-editorial__state--loading {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-editorial__state--content {
  position: absolute;
  inset: var(--spacing-4);
  opacity: 0;
  transform: translate3d(0, 0.75rem, 0);
}

.hero-editorial--loaded .hero-editorial__state--loading {
  opacity: 0;
  transform: translate3d(0, -0.5rem, 0);
  pointer-events: none;
}

.hero-editorial--loaded .hero-editorial__state--content {
  opacity: 1;
  transform: translate3d(0, 0, 0);
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
  line-height: 1.4;
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
  border-color: rgba(255, 255, 255, 0.56);
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.66)),
    var(--home-pill-bg);
  box-shadow: 0 1.4rem 3rem -2rem rgba(60, 78, 110, 0.42);
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
  transform: translateY(-0.125rem);
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
  min-height: clamp(20rem, 46vh, 30rem);
}

.hero-collage-card {
  position: relative;
  padding: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  overflow: hidden;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
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
  border-radius: var(--radius-xl);
}

.hero-collage-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-base);
}

.hero-collage-card:hover .hero-collage-image {
  transform: scale(1.04);
}

.hero-collage-placeholder {
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--glass-bg-light);
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
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  min-height: 100%;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
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
  padding: 0.625rem 0.75rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.74);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
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
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
  background: var(--glass-bg-light);
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
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.portal-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex: 1;
}

.portal-card__body h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
}

.portal-card__body p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.portal-card__arrow {
  align-self: flex-end;
  color: var(--color-text-tertiary);
  opacity: 0;
  transform: translate(-0.25rem, 0.25rem);
  transition: all var(--transition-fast);
}

.portal-card:hover .portal-card__arrow {
  opacity: 1;
  transform: translate(0, 0);
}

.portal-card__preview {
  position: relative;
  flex: 1;
  min-block-size: clamp(12rem, 20vw, 16rem);
  overflow: clip;
  border-radius: calc(var(--radius-xl) - 0.25rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.42);
}

.portal-card__preview--empty {
  min-block-size: clamp(12rem, 20vw, 16rem);
}

.portal-card__preview--lead {
  min-block-size: clamp(18rem, 38vw, 24rem);
}

.portal-card__preview-image {
  inline-size: 100%;
  block-size: 100%;
  display: block;
  object-fit: cover;
}

.portal-card__preview-overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: grid;
  gap: 0.375rem;
  padding: clamp(0.875rem, 1.6vw, 1.125rem);
  background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.72) 100%);
  color: var(--color-text-inverse);
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
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
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
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
}

.trends-link {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-decoration: none;
}

.trends-link:hover {
  color: var(--color-text-primary);
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

.trend-author__avatar {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 1px solid var(--glass-border);
}

.trend-author__avatar--fallback {
  display: grid;
  place-items: center;
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
  padding: 0.75rem 0.875rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.68);
  border: 0.0625rem solid rgba(255, 255, 255, 0.46);
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
  padding: 1rem 1.125rem;
  border-radius: 1.15rem;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.68)),
    var(--home-pill-bg);
  border: 0.0625rem solid rgba(255, 255, 255, 0.46);
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.54),
    0 1.2rem 2.4rem -2rem rgba(35, 53, 85, 0.24);
}

.schedule-cta__eyebrow,
.schedule-cta__meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.schedule-cta__title {
  font-size: clamp(1rem, 1.24vw, 1.08rem);
  line-height: 1.35;
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
  padding: 0.75rem 0.875rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.72);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
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
  padding: var(--spacing-8) 0 var(--spacing-12);
  z-index: 1;
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
  background: rgba(255, 255, 255, 0.66);
  transition: all var(--transition-fast);
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
  min-block-size: calc(100dvh - clamp(2.25rem, 4.4vw, 3.5rem));
}

.latest-bubble__meta {
  display: flex;
  align-items: center;
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
  min-block-size: 100dvh;
  padding-block: max(var(--home-stage-safe-top), clamp(0.75rem, 1.8vw, 1.25rem))
    clamp(1.25rem, 3vw, 2.25rem);
}

.hero-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: calc(100dvh - var(--home-stage-safe-top) - clamp(1.25rem, 3vw, 2.25rem));
}

.hero-copy {
  max-inline-size: min(100%, 96rem);
  min-block-size: clamp(30rem, 56dvh, 38rem);
  margin-inline: auto;
  align-items: start;
  gap: clamp(1rem, 2.4vw, 1.75rem);
}

.hero-copy__left {
  max-inline-size: 38rem;
}

.hero-copy__right {
  inline-size: min(100%, 32rem);
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
  min-block-size: calc(var(--rail-slide-count, 1) * 100dvh);
  padding: 0;
}

.rail-sticky {
  position: sticky;
  inset-block-start: 0;
  block-size: 100dvh;
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
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.54);
  border: 0.0625rem solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(1rem);
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
  transition: transform 360ms cubic-bezier(0.2, 0.9, 0.25, 1);
}

.rail-track::-webkit-scrollbar {
  display: none;
}

.rail-panel {
  flex: 0 0 calc(100% / var(--rail-slide-count, 1));
  block-size: 100%;
  display: grid;
  padding: calc(
      var(--home-stage-safe-top) + var(--home-stage-chrome-height) - clamp(0.15rem, 0.45vw, 0.3rem)
    )
    clamp(1rem, 3vw, 2.5rem) clamp(1rem, 2.4vw, 1.6rem);
  overflow: clip;
}

.rail-panel__content {
  inline-size: min(100%, 90rem);
  block-size: 100%;
  margin-inline: auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  min-block-size: 0;
  gap: clamp(0.55rem, 1.2vw, 0.85rem);
  overflow: clip;
}

.section-header--stage {
  margin-block-end: clamp(0.35rem, 0.8vw, 0.6rem);
}

.rail-panel__meta {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.rail-panel__content--highlight .section-header {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(14rem, 0.84fr);
  align-items: start;
  gap: clamp(0.875rem, 1.8vw, 1.2rem);
}

.rail-panel__content--highlight .section-title {
  gap: clamp(0.375rem, 0.9vw, 0.6rem);
  max-inline-size: min(100%, 52rem);
}

.rail-panel__content--highlight .section-title h2 {
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(1.65rem, 2.2vw, 2.3rem);
  line-height: 1.08;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rail-panel__content--highlight .section-title p {
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
  border: 0.0625rem solid rgba(255, 255, 255, 0.5);
  border-radius: clamp(1rem, 1.8vw, 1.25rem);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.7)),
    var(--home-pill-bg);
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.6),
    0 1.4rem 3rem -2rem rgba(35, 53, 85, 0.34);
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
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
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
  block-size: auto;
  align-self: center;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  grid-template-rows: minmax(0, 1fr);
  max-block-size: min(68dvh, 38rem);
}

.rail-panel--portal .portal-grid > .portal-card--primary {
  min-block-size: 0;
  block-size: 100%;
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  align-content: stretch;
  padding: clamp(0.875rem, 1.6vw, 1rem);
}

.portal-sidebar {
  display: grid;
  grid-template-rows: minmax(0, 0.92fr) minmax(0, 1fr);
  gap: clamp(0.75rem, 1.4vw, 1rem);
  min-block-size: 0;
}

.portal-sidebar__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.4vw, 1rem);
  min-block-size: 0;
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
  grid-template-rows: auto auto auto;
  align-content: start;
  gap: clamp(0.75rem, 1.4vw, 1rem);
  min-block-size: 0;
  block-size: 100%;
  background:
    linear-gradient(170deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.72)),
    var(--home-pill-bg);
}

.portal-card--secondary-lead {
  min-block-size: clamp(11rem, 18dvh, 13rem);
}

.portal-card--secondary-compact {
  min-block-size: clamp(9rem, 15dvh, 10.5rem);
}

.rail-panel--portal .portal-card--secondary .portal-card__body {
  flex: 0;
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
  align-self: end;
  padding: 0.875rem 1rem;
  border-radius: clamp(1rem, 1.8vw, 1.25rem);
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.72)),
    var(--home-pill-bg);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.58),
    0 1.1rem 2.4rem -2rem rgba(35, 53, 85, 0.24);
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
  -webkit-line-clamp: 3;
}

.rail-panel--portal .portal-card--primary .portal-card__preview {
  min-block-size: 100%;
  box-shadow: inset 0 -5rem 6rem -4rem rgba(15, 23, 42, 0.48);
}

.rail-panel--portal .portal-card--primary .portal-card__copy {
  position: absolute;
  inset-inline: clamp(1rem, 1.8vw, 1.25rem);
  inset-block-end: clamp(1rem, 2.2vw, 1.5rem);
  max-inline-size: min(22rem, 72%);
  padding: clamp(0.875rem, 1.6vw, 1rem);
  border-radius: clamp(1rem, 1.8vw, 1.25rem);
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.78)),
    var(--home-pill-bg);
  border: 0.0625rem solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 1.8rem 4rem -2.2rem rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(1rem);
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
  grid-template-rows: minmax(11rem, 0.96fr) repeat(2, minmax(8.5rem, 0.62fr));
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
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.68)),
    var(--home-pill-bg);
  box-shadow: var(--home-card-shadow);
}

.hero-spotlight-card--lead {
  min-block-size: clamp(11rem, 15dvh, 12.5rem);
}

.hero-spotlight-card--dense {
  align-content: start;
  grid-template-rows: auto auto auto;
}

.hero-spotlight-card--lead.hero-spotlight-card--dense {
  min-block-size: clamp(8.75rem, 11.5dvh, 10rem);
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
  font-size: clamp(1rem, 1.6vw, 1.3rem);
  line-height: 1.32;
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
  block-size: auto;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: minmax(11.25rem, auto) minmax(9rem, auto);
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
  block-size: auto;
  align-self: start;
  padding: clamp(0.625rem, 1.4vw, 0.875rem);
  gap: clamp(0.75rem, 1.4vw, 1rem);
  text-align: start;
  font: inherit;
  color: inherit;
  cursor: pointer;
  overflow: clip;
  border: 0.0625rem solid rgba(255, 255, 255, 0.58);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.84)),
    var(--home-pill-bg);
  box-shadow: var(--home-card-shadow);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}

.featured-rail-card:hover {
  transform: translate3d(0, -0.2rem, 0);
  border-color: rgba(255, 255, 255, 0.74);
  box-shadow: 0 1.8rem 4rem -2.2rem rgba(35, 53, 85, 0.34);
}

.featured-rail-card--lead {
  grid-template-columns: minmax(0, 1.08fr) minmax(13rem, 0.92fr);
  min-block-size: clamp(15.75rem, 21vw, 18rem);
}

.featured-rail-card--support {
  grid-template-columns: minmax(9.5rem, 0.9fr) minmax(0, 1.1fr);
  min-block-size: clamp(10.25rem, 13.2vw, 12rem);
}

.featured-rail-card--compact {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 0.84fr) auto;
}

.featured-rail-card__media {
  position: relative;
  min-block-size: 0;
  block-size: auto;
  border-radius: clamp(1.05rem, 2vw, 1.4rem);
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
  aspect-ratio: 1.48 / 1;
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
  gap: 0.625rem;
  min-block-size: 0;
  padding: clamp(0.25rem, 0.8vw, 0.5rem) clamp(0.125rem, 0.4vw, 0.25rem)
    clamp(0.375rem, 0.8vw, 0.5rem);
}

.featured-rail-card--lead .featured-rail-card__body {
  padding-inline-end: clamp(0.25rem, 0.8vw, 0.55rem);
  gap: 0.75rem;
}

.featured-rail-card--dense .featured-rail-card__body {
  gap: 0.45rem;
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
  font-size: clamp(1rem, 1.45vw, 1.3rem);
  line-height: 1.18;
  color: var(--home-ink);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.featured-rail-card--lead .featured-rail-card__title {
  font-size: clamp(1.4rem, 2.2vw, 2rem);
  -webkit-line-clamp: 4;
}

.featured-rail-card--compact .featured-rail-card__title {
  -webkit-line-clamp: 2;
}

.featured-rail-card__summary {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  max-inline-size: 31ch;
  color: var(--color-text-secondary);
  line-height: 1.62;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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
  gap: 0.35rem 0.65rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.featured-rail-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  align-self: flex-start;
}

.featured-rail-card__stat {
  display: grid;
  gap: 0.2rem;
  padding: 0.625rem 0.75rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.74);
  border: 0.0625rem solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 1rem 2.2rem -1.8rem rgba(35, 53, 85, 0.28);
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
  gap: 0.45rem;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--home-ink);
}

.featured-rail-card__meta + .featured-rail-card__action {
  margin-top: auto;
}

.featured-rail-card__stats + .featured-rail-card__action {
  margin-top: 0.125rem;
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

.trends-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.rail-panel--trends .trends-grid {
  align-self: start;
  inline-size: 100%;
  block-size: min(66dvh, 41rem);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1.06fr) minmax(0, 0.94fr);
  align-items: start;
  align-content: start;
  gap: clamp(0.75rem, 1.6vw, 1rem);
  max-block-size: none;
}

.rail-panel--trends .trends-card {
  block-size: 100%;
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
  grid-column: 1;
  grid-row: 1;
  min-block-size: clamp(11rem, 15dvh, 13rem);
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
}

.trends-card--authors .trends-list {
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: minmax(3.35rem, auto);
}

.trends-authors-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.625rem;
  min-block-size: 0;
  align-items: start;
}

.trends-card--tags {
  grid-column: 2;
  grid-row: 1;
  min-block-size: clamp(7rem, 10dvh, 8.25rem);
  grid-template-rows: auto minmax(0, 1fr) auto;
  align-content: stretch;
}

.trends-card--editorial {
  grid-column: 1;
  grid-row: 2;
  min-block-size: clamp(6.5rem, 8dvh, 7.5rem);
  grid-template-rows: auto minmax(0, 1fr);
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.76)),
    var(--home-pill-bg);
}

.trends-card--schedule {
  grid-column: 2;
  grid-row: 2;
  min-block-size: clamp(7rem, 8.6dvh, 8rem);
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.76)),
    var(--home-pill-bg);
}

.trends-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  border-radius: clamp(1rem, 1.8vw, 1.25rem);
  color: var(--color-text-primary);
  text-decoration: none;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.7)),
    var(--home-pill-bg);
  border: 0.0625rem solid rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.52),
    0 1.25rem 2.6rem -2rem rgba(35, 53, 85, 0.28);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.trends-authors-highlight:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.58),
    0 1.6rem 3rem -2rem rgba(35, 53, 85, 0.34);
}

.trends-authors-highlight__avatar {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: 1rem;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.76);
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
}

.trends-authors-highlight__avatar--fallback {
  display: grid;
  place-items: center;
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
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.76);
  border: 0.0625rem solid rgba(255, 255, 255, 0.56);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.trends-card__hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trends-editorial {
  display: grid;
  gap: 0.35rem;
  min-block-size: 0;
  align-content: start;
  padding: 0.75rem 0.875rem;
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.72);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
  box-shadow: 0 1.2rem 2.4rem -2rem rgba(35, 53, 85, 0.32);
}

.trends-editorial--compact {
  gap: 0.65rem;
}

.trends-editorial__title {
  font-size: clamp(1rem, 1.32vw, 1.12rem);
  line-height: 1.34;
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
  border-radius: 1.1rem;
  text-decoration: none;
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.74);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
  box-shadow: 0 1.2rem 2.6rem -2rem rgba(35, 53, 85, 0.22);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.schedule-highlight:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: rgba(255, 255, 255, 0.66);
  background: rgba(255, 255, 255, 0.88);
}

.schedule-highlight--companion {
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.72)),
    var(--home-pill-bg);
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.54),
    0 1.4rem 3rem -2.1rem rgba(35, 53, 85, 0.28);
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
  border-radius: 1.15rem;
  background: rgba(255, 255, 255, 0.72);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
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
  min-block-size: 100dvh;
  padding-block: calc(var(--home-stage-safe-top) + clamp(0.625rem, 1.2vw, 1rem))
    clamp(1.125rem, 2.4vw, 1.75rem);
}

.posts-header {
  margin-block-end: 0;
}

.posts-toolbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(16rem, 0.72fr);
  gap: clamp(0.75rem, 1.4vw, 1rem);
  margin-bottom: 0;
  padding: clamp(0.75rem, 1.3vw, 0.95rem);
  border-radius: clamp(1.25rem, 2vw, 1.75rem);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.62)),
    var(--home-pill-bg);
  border: 1px solid rgba(255, 255, 255, 0.48);
  box-shadow: var(--home-card-shadow);
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
  padding: 0.75rem 0.875rem;
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.4);
  border: 0.0625rem solid rgba(255, 255, 255, 0.34);
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
}

.posts-toolbar__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.625rem;
}

.posts-toolbar__stats--with-tags {
  margin-block-start: 0.125rem;
  padding-block-start: 0.625rem;
  border-block-start: 0.0625rem solid rgba(255, 255, 255, 0.34);
}

.posts-toolbar__stat {
  display: inline-grid;
  gap: 0.2rem;
  padding: 0.625rem 0.75rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.7);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
  box-shadow: 0 1rem 2.2rem -1.8rem rgba(35, 53, 85, 0.48);
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
  min-block-size: clamp(24rem, 58dvh, 38rem);
  border-radius: var(--radius-2xl);
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.34) 0%, transparent 22rem),
    radial-gradient(circle at center, rgba(var(--home-mist-rgb), 0.2) 0%, transparent 30rem),
    linear-gradient(160deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04));
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
  inline-size: clamp(8rem, 18vw, 14rem);
  block-size: clamp(8rem, 18vw, 14rem);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.48), transparent 72%);
  transform: translate3d(-50%, -50%, 0);
  opacity: 0.9;
}

.bubble-stage::after {
  inline-size: clamp(20rem, 48vw, 34rem);
  block-size: clamp(20rem, 48vw, 34rem);
  background: conic-gradient(
    from 0deg,
    rgba(var(--home-mist-rgb), 0.08),
    rgba(var(--home-blush-rgb), 0.16),
    rgba(var(--home-lilac-rgb), 0.1),
    rgba(var(--home-mist-rgb), 0.08)
  );
  transform: translate3d(-50%, -50%, 0) rotate(12deg);
  filter: blur(2rem);
  opacity: 0.64;
}

.bubble-stage__origin {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: clamp(4rem, 8vw, 6rem);
  block-size: clamp(4rem, 8vw, 6rem);
  transform: translate3d(-50%, -50%, 0);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(255, 255, 255, 0.16) 62%,
    transparent 100%
  );
  filter: blur(0.1rem);
}

.bubble-stage__pulse {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  border-radius: inherit;
  animation: bubbleOriginBreath 3.6s ease-in-out infinite;
}

.latest-bubble {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
  max-width: none;
  opacity: 0;
  filter: blur(0.3rem);
  pointer-events: none;
  transform: translate3d(
      calc(-50% + var(--bubble-x-intro, 0%)),
      calc(-50% + var(--bubble-y-intro, 0%)),
      0
    )
    scale(0.28);
  transition:
    opacity 420ms cubic-bezier(0.18, 0.88, 0.22, 1) var(--bubble-delay, 0s),
    transform 980ms cubic-bezier(0.16, 0.88, 0.22, 1) var(--bubble-delay, 0s),
    filter 780ms cubic-bezier(0.18, 0.88, 0.22, 1) var(--bubble-delay, 0s);
  animation: none;
  will-change: transform, opacity, filter;
}

.latest-bubble::after {
  content: '';
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: clamp(0.95rem, 1.8vw, 1.2rem);
  block-size: clamp(0.95rem, 1.8vw, 1.2rem);
  border-radius: 0 0 0.25rem 0;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 0.65rem 1.8rem rgba(15, 23, 42, 0.12);
  transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-tail-angle, 45deg)) translateX(1rem)
    rotate(45deg);
}

.latest-bubble__inner {
  display: grid;
  gap: 0.625rem;
  max-inline-size: min(22ch, 17rem);
  padding: 0.875rem 1rem;
  border-radius: clamp(1rem, 2vw, 1.4rem);
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 1.5rem 3rem -1.8rem rgba(40, 58, 89, 0.42);
  text-shadow: 0 0.5rem 1.5rem rgba(15, 23, 42, 0.12);
  transform: translate3d(0, 0.75rem, 0);
  transition: transform 820ms cubic-bezier(0.16, 0.88, 0.22, 1) var(--bubble-delay, 0s);
}

.latest-bubble__text {
  font-size: clamp(1rem, 1.55vw, 1.35rem);
  font-weight: var(--font-semibold);
  line-height: 1.5;
  text-wrap: pretty;
}

.posts--revealed .latest-bubble {
  opacity: 1;
  filter: blur(0rem);
  pointer-events: auto;
  transform: translate3d(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)), 0)
    scale(var(--bubble-scale, 1));
}

.posts--revealed .latest-bubble__inner {
  transform: translate3d(0, 0, 0);
  animation: bubbleTextDrift 6s ease-in-out infinite;
  animation-delay: calc(1s + var(--bubble-delay, 0s));
}

.media-slices {
  position: relative;
  min-block-size: calc(var(--story-card-count, 1) * 100dvh);
  padding: 0;
}

.story-stage {
  position: sticky;
  inset-block-start: 0;
  block-size: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(0.75rem, 1.4vw, 1rem);
  padding-block: calc(var(--home-stage-safe-top) + clamp(1rem, 1.8vw, 1.35rem))
    clamp(1.125rem, 2.2vw, 1.75rem);
  overflow: clip;
}

.story-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 18%, rgba(199, 220, 244, 0.16) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(246, 218, 229, 0.14) 0%, transparent 38%),
    linear-gradient(180deg, rgba(248, 247, 244, 0.72) 0%, rgba(248, 247, 244, 0.84) 100%);
  opacity: calc(1 - (var(--story-footer-fade, 0) * 0.12));
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
  block-size: min(42dvh, 24rem);
  background:
    radial-gradient(circle at 18% 18%, rgba(199, 220, 244, 0.12) 0%, transparent 42%),
    radial-gradient(circle at 84% 22%, rgba(246, 218, 229, 0.12) 0%, transparent 38%),
    linear-gradient(180deg, rgba(246, 244, 241, 0) 0%, rgba(248, 247, 244, 0.66) 100%);
  opacity: calc(var(--story-footer-fade, 0) * 0.18);
  pointer-events: none;
}

.media-slice-list {
  position: relative;
  block-size: 100%;
  min-block-size: 0;
  gap: 0;
  perspective: 112rem;
  transform-style: preserve-3d;
}

.story-merge-panel {
  position: absolute;
  inset-inline: clamp(1rem, 2vw, 1.75rem);
  inset-block-end: clamp(1.125rem, 2.4vw, 1.75rem);
  z-index: 4;
  display: grid;
  inline-size: min(100%, 74rem);
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
  background: rgba(255, 255, 255, 0.76);
  border: 0.0625rem solid rgba(255, 255, 255, 0.48);
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
  background: rgba(255, 255, 255, 0.72);
  border: 0.0625rem solid rgba(255, 255, 255, 0.5);
  color: var(--color-text-primary);
  text-decoration: none;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.story-merge-panel__link:hover {
  transform: translate3d(0, -0.125rem, 0);
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(255, 255, 255, 0.72);
}

.media-slice {
  position: absolute;
  inset: 0;
  block-size: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: clip;
  transform-origin: 50% 62%;
  transform-style: preserve-3d;
  opacity: var(--story-opacity, 1);
  transform: translate3d(
      var(--story-translate-x, 0rem),
      var(--story-translate-y, 0rem),
      var(--story-translate-z, 0rem)
    )
    rotateX(var(--story-rotate-x, 0deg)) rotateY(var(--story-rotate-y, 0deg))
    scale(var(--story-scale, 1));
  filter: blur(var(--story-blur, 0rem));
  transition:
    transform 260ms linear,
    opacity 260ms linear,
    filter 260ms linear;
  pointer-events: none;
}

.media-slice.is-active {
  pointer-events: auto;
}

.media-slice__sticky {
  position: relative;
  top: auto;
  inline-size: min(100%, 84rem);
  min-height: min(70dvh, 44rem);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.8fr);
  gap: clamp(1rem, 2vw, 1.5rem);
  padding: clamp(1.25rem, 2vw, 1.5rem);
  overflow: clip;
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  border-radius: clamp(1.5rem, 2.6vw, 2rem);
  background:
    radial-gradient(circle at top right, rgba(199, 220, 244, 0.12), transparent 40%),
    linear-gradient(152deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.84)),
    var(--home-pill-bg);
  box-shadow:
    0 3.25rem 6.4rem -2rem rgba(35, 53, 85, 0.58),
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(1.25rem);
}

.media-slice.is-active .media-slice__sticky {
  box-shadow:
    0 3.75rem 6.8rem -2rem rgba(35, 53, 85, 0.64),
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.68);
}

.media-slice__visual,
.media-slice__copy {
  min-height: 0;
}

.media-slice__copy {
  display: grid;
  align-content: center;
  gap: 1rem;
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
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  line-height: 1.1;
}

.media-slice__copy > p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.media-slice__meta {
  justify-content: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.media-slice__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.media-slice__link {
  color: var(--color-text-primary);
}

.media-empty {
  position: relative;
  display: grid;
  place-items: center;
  min-height: min(62dvh, 30rem);
}

.media-sentinel {
  min-height: 1.5rem;
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
}

.home-footer-bridge {
  position: relative;
  min-block-size: 100dvh;
  background:
    radial-gradient(circle at 14% 16%, rgba(199, 220, 244, 0.18) 0%, transparent 42%),
    radial-gradient(circle at 82% 20%, rgba(246, 218, 229, 0.18) 0%, transparent 36%),
    linear-gradient(
      180deg,
      rgba(245, 245, 244, 0.16) 0%,
      rgba(248, 247, 244, 0.9) 72%,
      #f8f7f4 100%
    );
  overflow: clip;
}

.home-footer-bridge::before,
.home-footer-bridge::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  pointer-events: none;
}

.home-footer-bridge::before {
  inset-block-start: 0;
  block-size: min(34dvh, 18rem);
  background:
    radial-gradient(circle at 22% 16%, rgba(199, 220, 244, 0.22) 0%, transparent 54%),
    radial-gradient(circle at 82% 10%, rgba(246, 218, 229, 0.2) 0%, transparent 48%);
  opacity: 0.9;
}

.home-footer-bridge::after {
  inset-block-end: 0;
  block-size: min(42dvh, 24rem);
  background:
    linear-gradient(180deg, rgba(248, 247, 244, 0) 0%, rgba(248, 247, 244, 0.92) 56%),
    radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.72) 0%, transparent 64%);
}

.home-footer-bridge__stage {
  position: relative;
  min-block-size: clamp(30rem, 74dvh, 40rem);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: space-between;
  gap: clamp(0.8rem, 1.6vw, 1.15rem);
  padding-block: calc(var(--home-stage-safe-top) + clamp(0.35rem, 1vw, 0.65rem))
    clamp(0.2rem, 0.75vw, 0.45rem);
  z-index: 1;
}

.home-footer-bridge__intro {
  display: grid;
  gap: 0.75rem;
  max-inline-size: 42rem;
}

.home-footer-bridge__kicker,
.home-footer-bridge__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.home-footer-bridge__intro h2,
.home-footer-bridge__feature-copy > strong {
  margin: 0;
  font-size: clamp(1.6rem, 3.2vw, 2.5rem);
  line-height: 1.04;
  color: var(--home-ink);
}

.home-footer-bridge__intro p,
.home-footer-bridge__feature-copy p {
  margin: 0;
  max-inline-size: 60ch;
  font-size: clamp(0.98rem, 1.35vw, 1.08rem);
  line-height: 1.72;
  color: var(--color-text-secondary);
}

.home-footer-bridge__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.24fr) minmax(16rem, 0.76fr);
  gap: clamp(1rem, 2.2vw, 1.6rem);
  align-items: start;
  align-self: end;
}

.home-footer-bridge__feature,
.home-footer-bridge__links {
  position: relative;
  display: grid;
  gap: clamp(0.75rem, 1.6vw, 1rem);
  padding: clamp(1.15rem, 2.1vw, 1.5rem);
  border: 0.0625rem solid rgba(255, 255, 255, 0.58);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.97), rgba(255, 255, 255, 0.84)),
    var(--home-pill-bg);
  box-shadow:
    0 2.75rem 5rem -2.6rem rgba(35, 53, 85, 0.34),
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(1.25rem);
}

.home-footer-bridge__feature::after,
.home-footer-bridge__links::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at top right, rgba(199, 220, 244, 0.16) 0%, transparent 38%),
    radial-gradient(circle at bottom left, rgba(246, 218, 229, 0.14) 0%, transparent 34%);
  pointer-events: none;
}

.home-footer-bridge__feature > *,
.home-footer-bridge__links > * {
  position: relative;
  z-index: 1;
}

.home-footer-bridge__feature {
  align-content: stretch;
}

.home-footer-bridge__feature-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(1rem, 2vw, 1.4rem);
  align-items: stretch;
}

.home-footer-bridge__feature-copy {
  display: grid;
  align-content: center;
  gap: 0.75rem;
}

.home-footer-bridge__feature-media {
  position: relative;
  min-block-size: clamp(14rem, 24vw, 18rem);
  padding: 0;
  appearance: none;
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  border-radius: clamp(1.2rem, 2vw, 1.6rem);
  overflow: clip;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 1.8rem 4rem -2rem rgba(35, 53, 85, 0.36);
}

.home-footer-bridge__feature-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.68) 100%),
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.26) 0%, transparent 42%);
  pointer-events: none;
}

.home-footer-bridge__feature-media-image {
  inline-size: 100%;
  block-size: 100%;
  display: block;
  object-fit: cover;
}

.home-footer-bridge__feature-media-overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 1;
  display: grid;
  gap: 0.35rem;
  padding: clamp(0.875rem, 1.8vw, 1.125rem);
  color: var(--color-text-inverse);
}

.home-footer-bridge__feature-media-overlay .home-footer-bridge__eyebrow {
  color: rgba(255, 255, 255, 0.76);
}

.home-footer-bridge__feature-media-overlay strong {
  margin: 0;
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  line-height: 1.3;
  color: var(--color-text-inverse);
}

.home-footer-bridge__feature-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.75rem 1rem;
  appearance: none;
  border: 0.0625rem solid rgba(255, 255, 255, 0.58);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
  box-shadow: 0 1.2rem 2.6rem -2rem rgba(35, 53, 85, 0.36);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.home-footer-bridge__feature-action:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: rgba(255, 255, 255, 0.76);
  background: rgba(255, 255, 255, 0.92);
}

.home-footer-bridge__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.home-footer-bridge__links {
  align-self: start;
  align-content: start;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto;
  grid-auto-rows: minmax(0, auto);
  min-block-size: 0;
}

.home-footer-bridge__links-label {
  grid-column: 1 / -1;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.home-footer-bridge__link {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: center;
  align-items: start;
  gap: 0.75rem;
  min-block-size: 0;
  padding: 0.9rem 1rem;
  border-radius: clamp(1rem, 1.8vw, 1.25rem);
  background: rgba(255, 255, 255, 0.72);
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  color: var(--color-text-primary);
  text-decoration: none;
  box-shadow: 0 1.5rem 3rem -2.4rem rgba(35, 53, 85, 0.36);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.home-footer-bridge__link-icon {
  display: inline-grid;
  place-items: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.84);
  border: 0.0625rem solid rgba(255, 255, 255, 0.5);
}

.home-footer-bridge__link-copy {
  display: grid;
  gap: 0.3rem;
}

.home-footer-bridge__link-copy strong {
  font-size: var(--text-base);
  line-height: 1.2;
  color: var(--home-ink);
}

.home-footer-bridge__link-copy small {
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.home-footer-bridge__link:hover {
  transform: translate3d(0, -0.2rem, 0);
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(255, 255, 255, 0.72);
  box-shadow: 0 2rem 3.2rem -2.2rem rgba(35, 53, 85, 0.42);
}

@keyframes heroLineStageIn {
  from {
    opacity: 0;
    filter: blur(0.75rem);
    transform: translate3d(var(--hero-entry-x), var(--hero-entry-y), 0);
  }

  to {
    opacity: 1;
    filter: blur(0rem);
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
    filter: blur(0rem);
    transform: translate3d(0, 0rem, 0) scale(1);
  }

  to {
    opacity: 0.22;
    filter: blur(0.45rem);
    transform: translate3d(0, -5rem, 0) scale(0.92);
  }
}

@keyframes homeScreenEnterRise {
  from {
    opacity: 0.3;
    filter: blur(0.65rem);
    transform: translate3d(0, 5rem, 0) scale(0.94);
  }

  to {
    opacity: 1;
    filter: blur(0rem);
    transform: translate3d(0, 0rem, 0) scale(1);
  }
}

@keyframes homeScreenEnterBloom {
  from {
    opacity: 0.24;
    filter: blur(0.75rem);
    transform: translate3d(0, 2.75rem, 0) scale(0.9);
  }

  to {
    opacity: 1;
    filter: blur(0rem);
    transform: translate3d(0, 0rem, 0) scale(1);
  }
}

@keyframes homeScreenExitCompress {
  from {
    opacity: 1;
    filter: blur(0rem);
    transform: translate3d(0, 0rem, 0) scale(1);
  }

  to {
    opacity: 0.18;
    filter: blur(0.55rem);
    transform: translate3d(0, -2rem, 0) scale(0.88);
  }
}

@keyframes homeScreenExitSettle {
  from {
    opacity: 1;
    filter: blur(0rem);
    transform: translate3d(0, 0rem, 0) scale(1);
  }

  to {
    opacity: 0.78;
    filter: blur(0.18rem);
    transform: translate3d(0, -1rem, 0) scale(0.985);
  }
}

@keyframes bubbleBurstFromCenter {
  0% {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.16);
  }

  58% {
    opacity: 1;
    transform: translate3d(
        calc(-50% + (var(--bubble-x) * 0.76)),
        calc(-50% + (var(--bubble-y) * 0.76)),
        0
      )
      scale(calc(var(--bubble-scale, 1) * 1.06));
  }

  100% {
    opacity: 1;
    transform: translate3d(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)), 0)
      scale(var(--bubble-scale, 1));
  }
}

@keyframes bubbleTextDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -0.85rem, 0);
  }
}

@keyframes bubbleOriginBreath {
  0%,
  100% {
    transform: scale(0.86);
    opacity: 0.6;
  }

  50% {
    transform: scale(1.08);
    opacity: 1;
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

@media (max-width: 1024px) {
  .hero-copy {
    grid-template-columns: 1fr;
    min-block-size: auto;
  }

  .hero-copy__divider {
    display: none;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .story-merge-panel,
  .home-footer-bridge__grid {
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

  .home-footer-bridge__feature-shell {
    grid-template-columns: minmax(0, 1fr);
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
    min-height: clamp(7rem, 22vh, 10rem);
  }

  .hero-collage-card--primary {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .rail-stage__chrome,
  .section-header,
  .posts-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .rail-stage__dot {
    inline-size: 1.75rem;
  }

  .rail-panel {
    padding: calc(var(--home-stage-safe-top) + var(--home-stage-chrome-height) + 0.5rem) 0.875rem
      calc(5.75rem + env(safe-area-inset-bottom, 0rem));
  }

  .rail-panel__content {
    gap: 0.75rem;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .rail-panel__content--highlight .section-header {
    grid-template-columns: minmax(0, 1fr);
  }

  .bubble-stage {
    min-block-size: clamp(22rem, 44dvh, 30rem);
  }

  .story-merge-panel {
    inset-inline: 0;
  }

  .home-footer-bridge__stage {
    padding-block: calc(var(--home-stage-safe-top) + 0.75rem)
      calc(6.25rem + env(safe-area-inset-bottom, 0rem));
  }

  .home-footer-bridge__links {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
    min-block-size: 0;
  }

  .hero-spotlight-stack {
    grid-template-columns: 1fr;
  }

  .latest-bubble__inner {
    max-inline-size: min(18ch, 12rem);
  }

  .portal-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .posts-toolbar__panel {
    padding: 0.75rem 0.875rem;
  }

  .hero-editorial,
  .hero-preview {
    min-block-size: 10.5rem;
  }

  .posts--bubble {
    padding-block-end: calc(6rem + env(safe-area-inset-bottom, 0rem));
  }

  .story-stage {
    padding-block-end: calc(6.25rem + env(safe-area-inset-bottom, 0rem));
  }

  .rail-panel--portal .portal-grid > .portal-card--primary {
    min-block-size: clamp(12rem, 29vh, 14rem);
    grid-template-rows: minmax(0, 1fr);
    align-content: stretch;
    gap: 0;
  }

  .rail-panel--portal .portal-card--primary .portal-card__preview {
    min-block-size: 100%;
  }

  .rail-panel--portal .portal-card--primary .portal-card__copy {
    position: absolute;
    inset-inline: 0.875rem;
    inset-block-end: 0.875rem;
    max-inline-size: min(100%, 11.5rem);
    padding: 0.6875rem 0.75rem;
    border-radius: 1rem;
    background:
      linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.8)),
      var(--home-pill-bg);
    border: 0.0625rem solid rgba(255, 255, 255, 0.56);
    box-shadow: 0 1rem 2.5rem -1.8rem rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(0.9rem);
  }

  .rail-panel--portal .portal-card--primary .portal-card__body p {
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
  }

  .portal-sidebar__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-panel--portal .portal-grid > .portal-card--primary {
    min-block-size: clamp(12rem, 34vh, 14rem);
  }

  .rail-panel--portal .portal-card--secondary {
    gap: 0.625rem;
    min-block-size: 0;
  }

  .rail-panel--portal .portal-card__micro {
    padding: 0.6875rem 0.75rem;
  }

  .rail-highlight {
    gap: 0.75rem;
  }

  .rail-highlight .hero-collage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr) minmax(0, 0.66fr);
    min-height: clamp(9.5rem, 22vh, 11rem);
    gap: 0.5rem;
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

  .hero-spotlight-stack {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .hero-spotlight-card {
    padding: 0.875rem;
    gap: 0.5rem;
  }

  .hero-spotlight-card--lead {
    min-block-size: clamp(6rem, 14vh, 7.5rem);
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

  .rail-panel--featured .rail-featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto auto auto;
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
  }

  .featured-rail-card__body {
    gap: 0.5rem;
  }

  .featured-rail-card__title {
    font-size: var(--text-base);
    -webkit-line-clamp: 2;
  }

  .featured-rail-card--lead .featured-rail-card__title {
    font-size: clamp(1.08rem, 4.6vw, 1.32rem);
  }

  .featured-rail-card__summary,
  .featured-rail-card--lead .featured-rail-card__summary {
    -webkit-line-clamp: 2;
  }

  .featured-rail-card__stats {
    display: none;
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(2) {
    grid-column: 1;
    grid-row: 2;
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(3) {
    grid-column: 2;
    grid-row: 2;
  }

  .rail-panel--featured .rail-featured-grid > :nth-child(4) {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .rail-panel--trends .trends-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr) minmax(0, 0.88fr) minmax(0, 0.92fr);
  }

  .rail-panel--trends .trends-card--authors {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .rail-panel--trends .trends-card--tags {
    grid-column: 1;
    grid-row: 2;
  }

  .rail-panel--trends .trends-card--editorial {
    grid-column: 2;
    grid-row: 2;
  }

  .rail-panel--trends .trends-card--schedule {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .trends-card {
    gap: 0.75rem;
    padding: 1rem;
  }

  .trends-list > :nth-child(n + 3) {
    display: none;
  }

  .trend-tags__stats,
  .schedule-cta__stats {
    display: none;
  }

  .rail-panel--trends .trends-card--schedule {
    padding-inline-end: clamp(1.25rem, 16vw, 3.5rem);
    padding-block-end: clamp(1.25rem, 14vw, 2rem);
  }

  .trends-editorial__text,
  .trends-community-note__text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
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
    min-block-size: clamp(20rem, 42dvh, 26rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .rail-stage,
  .posts--bubble > .container,
  .story-stage,
  .story-merge-panel,
  .home-footer-bridge__stage {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }

  .hero--animated .hero-copy__line,
  .hero--animated .hero-copy__right > *,
  .posts--revealed .latest-bubble,
  .posts--revealed .latest-bubble__inner,
  .bubble-stage__pulse {
    animation: none;
  }

  .rail-track {
    transition: none;
  }

  .hero-collage-image,
  .portal-card,
  .filter-pill,
  .section-link {
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
