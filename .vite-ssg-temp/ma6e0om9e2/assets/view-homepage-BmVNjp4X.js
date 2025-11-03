import { c as logger_default, i as statsApi, o as useAuthStore, s as api } from "./api-services-BmQ9TwGt.js";
import { a as LoadingSpinner_default, l as __plugin_vue_export_helper_default, n as PLATFORMS, o as MainLayout_default, r as PLATFORM_COLORS, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { a as useWaterfallLayout, o as toast_default, r as useInfiniteScroll } from "./composables-CdbJX3Qi.js";
import { i as formatNumber, n as usePostsStore, r as PostCard_default } from "./view-explorepage-DthVi5zR.js";
import { Fragment, Transition, computed, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, mergeProps, nextTick, onActivated, onMounted, onUnmounted, openBlock, ref, renderList, resolveComponent, resolveDynamicComponent, toDisplayString, useSSRContext, withCtx } from "vue";
import { defineStore, storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderAttr, ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderList, ssrRenderStyle, ssrRenderVNode } from "vue/server-renderer";
import { AlertCircle, ArrowRight, Compass, ImageIcon, Info, Instagram, LogIn, Music2, Twitter, UserPlus, X, Youtube } from "lucide-vue-next";
var DEFAULT_SETTINGS = {
	showHeroSection: true,
	postsPerPage: 20,
	enableAnimations: true,
	autoPlayVideos: false,
	showImagePreviews: true,
	cookieConsent: null,
	analyticsEnabled: false,
	functionalCookiesEnabled: true,
	performanceCookiesEnabled: false,
	dataCollection: false,
	personalizedContent: false
};
const useSettingsStore = defineStore("settings", () => {
	const settings = ref({ ...DEFAULT_SETTINGS });
	const syncing = ref(false);
	const lastSyncedAt = ref(null);
	function initSettings() {
		const saved = localStorage.getItem("user-settings");
		if (saved) try {
			const parsed = JSON.parse(saved);
			settings.value = {
				...DEFAULT_SETTINGS,
				...parsed
			};
		} catch (e) {
			console.error("Failed to parse user settings:", e);
			settings.value = { ...DEFAULT_SETTINGS };
		}
	}
	function saveSettings() {
		localStorage.setItem("user-settings", JSON.stringify(settings.value));
	}
	async function syncToServer() {
		if (!useAuthStore().isAuthenticated) return false;
		try {
			syncing.value = true;
			await api.patch("/preferences", settings.value);
			lastSyncedAt.value = /* @__PURE__ */ new Date();
			return true;
		} catch (error) {
			console.error("Failed to sync settings to server:", error);
			return false;
		} finally {
			syncing.value = false;
		}
	}
	async function loadFromServer() {
		if (!useAuthStore().isAuthenticated) return false;
		try {
			syncing.value = true;
			const data = await api.get("/preferences", { cache: false });
			if (data) {
				settings.value = {
					...DEFAULT_SETTINGS,
					...data
				};
				saveSettings();
				lastSyncedAt.value = new Date(data.updatedAt);
				return true;
			}
			return false;
		} catch (error) {
			console.error("Failed to load settings from server:", error);
			return false;
		} finally {
			syncing.value = false;
		}
	}
	async function updateSetting(key, value) {
		settings.value[key] = value;
		saveSettings();
		if (useAuthStore().isAuthenticated) await syncToServer();
	}
	async function toggleSetting(key) {
		const currentValue = settings.value[key];
		if (typeof currentValue === "boolean") {
			settings.value[key] = !currentValue;
			saveSettings();
			if (useAuthStore().isAuthenticated) await syncToServer();
		}
	}
	function resetSettings() {
		settings.value = { ...DEFAULT_SETTINGS };
		saveSettings();
	}
	function exportSettings() {
		return JSON.stringify(settings.value, null, 2);
	}
	function importSettings(settingsJson) {
		try {
			const imported = JSON.parse(settingsJson);
			settings.value = {
				...DEFAULT_SETTINGS,
				...imported
			};
			saveSettings();
			return true;
		} catch (e) {
			console.error("Failed to import settings:", e);
			return false;
		}
	}
	return {
		settings,
		syncing,
		lastSyncedAt,
		initSettings,
		updateSetting,
		toggleSetting,
		resetSettings,
		exportSettings,
		importSettings,
		syncToServer,
		loadFromServer
	};
});
var AccessLimitBanner_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AccessLimitBanner",
	props: {
		currentCount: {
			type: Number,
			required: true
		},
		totalLimit: {
			type: Number,
			required: true
		},
		showProgress: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	setup(__props, { expose: __expose }) {
		__expose();
		const props = __props;
		const router = useRouter();
		const authStore = useAuthStore();
		const { t } = useI18n();
		const isAuthenticated = computed(() => authStore.isAuthenticated);
		const isAdmin = computed(() => authStore.user?.is_admin ?? false);
		const progress = computed(() => {
			if (props.totalLimit === 0 || props.totalLimit === Infinity) return 0;
			return Math.min(props.currentCount / props.totalLimit * 100, 100);
		});
		const isNearLimit = computed(() => {
			return progress.value >= 80;
		});
		const shouldShow = computed(() => {
			if (!isAuthenticated.value) return true;
			if (!isAdmin.value) return isNearLimit.value;
			return false;
		});
		const title = computed(() => {
			if (!isAuthenticated.value) return t("access.guestMode");
			if (isNearLimit.value) return t("access.nearLimit");
			return t("access.contentAccess");
		});
		const message = computed(() => {
			const remaining = props.totalLimit - props.currentCount;
			if (!isAuthenticated.value) return t("access.guestMessage", { limit: props.totalLimit });
			if (isNearLimit.value) return t("access.nearLimitMessage", { remaining });
			return t("access.loadedMessage", {
				current: props.currentCount,
				limit: props.totalLimit
			});
		});
		const goToLogin = () => {
			router.push("/login");
		};
		const goToRegister = () => {
			router.push("/register");
		};
		const __returned__ = {
			props,
			router,
			authStore,
			t,
			isAuthenticated,
			isAdmin,
			progress,
			isNearLimit,
			shouldShow,
			title,
			message,
			goToLogin,
			goToRegister,
			get Info() {
				return Info;
			},
			get AlertCircle() {
				return AlertCircle;
			},
			get LogIn() {
				return LogIn;
			},
			get UserPlus() {
				return UserPlus;
			},
			GlassButton: GlassButton_default
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	if ($setup.shouldShow) {
		_push(`<div${ssrRenderAttrs(mergeProps({ class: "access-limit-banner glass-card" }, _attrs))} data-v-098494d9><div class="banner-content" data-v-098494d9><div class="banner-icon" data-v-098494d9>`);
		if (!$setup.isNearLimit) _push(ssrRenderComponent($setup["Info"], { size: 24 }, null, _parent));
		else _push(ssrRenderComponent($setup["AlertCircle"], {
			size: 24,
			class: "warning"
		}, null, _parent));
		_push(`</div><div class="banner-message" data-v-098494d9><h3 data-v-098494d9>${ssrInterpolate($setup.title)}</h3><p data-v-098494d9>${ssrInterpolate($setup.message)}</p></div>`);
		if (!$setup.isAuthenticated) {
			_push(`<div class="banner-action" data-v-098494d9>`);
			_push(ssrRenderComponent($setup["GlassButton"], {
				onClick: $setup.goToLogin,
				size: "sm"
			}, {
				default: withCtx((_, _push$1, _parent$1, _scopeId) => {
					if (_push$1) {
						_push$1(ssrRenderComponent($setup["LogIn"], { size: 18 }, null, _parent$1, _scopeId));
						_push$1(` ${ssrInterpolate(_ctx.$t("nav.login"))}`);
					} else return [createVNode($setup["LogIn"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.login")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent($setup["GlassButton"], {
				onClick: $setup.goToRegister,
				variant: "primary",
				size: "sm"
			}, {
				default: withCtx((_, _push$1, _parent$1, _scopeId) => {
					if (_push$1) {
						_push$1(ssrRenderComponent($setup["UserPlus"], { size: 18 }, null, _parent$1, _scopeId));
						_push$1(` ${ssrInterpolate(_ctx.$t("nav.register"))}`);
					} else return [createVNode($setup["UserPlus"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.register")), 1)];
				}),
				_: 1
			}, _parent));
			_push(`</div>`);
		} else _push(`<!---->`);
		_push(`</div>`);
		if ($props.showProgress) _push(`<div class="progress-bar" data-v-098494d9><div class="progress-fill" style="${ssrRenderStyle({ width: `${$setup.progress}%` })}" data-v-098494d9></div></div>`);
		else _push(`<!---->`);
		_push(`</div>`);
	} else _push(`<!---->`);
}
var _sfc_setup$1 = AccessLimitBanner_vue_vue_type_script_setup_true_lang_default.setup;
AccessLimitBanner_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/AccessLimitBanner.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var AccessLimitBanner_default = /* @__PURE__ */ __plugin_vue_export_helper_default(AccessLimitBanner_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-098494d9"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/AccessLimitBanner.vue"]
]);
var HomePage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	name: "HomePage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const authStore = useAuthStore();
		const settingsStore = useSettingsStore();
		const postsStore = usePostsStore();
		const { isAuthenticated, user } = storeToRefs(authStore);
		const { posts, loading } = storeToRefs(postsStore);
		const accessLimit = computed(() => {
			if (!isAuthenticated.value) return 40;
			if (user.value?.is_admin) return Infinity;
			return 100;
		});
		const platforms = PLATFORMS;
		const platformStats = ref({});
		const isStatsLoading = ref(true);
		const currentPage = ref(1);
		const hasMore = ref(true);
		const postsGrid = ref(null);
		const loadedPostsCount = ref(0);
		const currentStatIndex = ref(0);
		const autoplayInterval = ref(null);
		const isPaused = ref(false);
		const autoplayDuration = 3e3;
		const prevStat = () => {
			if (currentStatIndex.value > 0) currentStatIndex.value--;
			else currentStatIndex.value = platforms.length - 1;
			resetAutoplay();
		};
		const nextStat = () => {
			if (currentStatIndex.value < platforms.length - 1) currentStatIndex.value++;
			else currentStatIndex.value = 0;
			resetAutoplay();
		};
		const goToSlide = (index) => {
			currentStatIndex.value = index;
			isPaused.value = false;
			resetAutoplay();
		};
		const pauseAutoplay = () => {
			isPaused.value = true;
			if (autoplayInterval.value) {
				clearInterval(autoplayInterval.value);
				autoplayInterval.value = null;
			}
		};
		const resumeAutoplay = () => {
			isPaused.value = false;
			startAutoplay();
		};
		const resetAutoplay = () => {
			if (autoplayInterval.value) clearInterval(autoplayInterval.value);
			startAutoplay();
		};
		const startAutoplay = () => {
			if (isPaused.value) return;
			autoplayInterval.value = window.setInterval(() => {
				nextStat();
			}, autoplayDuration);
		};
		const { t } = useI18n();
		const { updateLayout, smoothUpdateLayout } = useWaterfallLayout(postsGrid, {
			columnGap: 16,
			rowGap: 16,
			breakpoints: {
				1400: 4,
				1100: 3,
				769: 2,
				0: 2
			}
		});
		const { isLoading: isLoadingMore } = useInfiniteScroll({
			onLoadMore: async () => {
				if (posts.value.length >= accessLimit.value) {
					logger_default.log("[InfiniteScroll] 已达到访问限制");
					return;
				}
				await loadMore();
			},
			hasMore: () => posts.value.length < accessLimit.value && posts.value.length % 6 === 0,
			threshold: 500,
			enabled: true
		});
		onMounted(async () => {
			try {
				await postsStore.fetchPosts({
					page: currentPage.value,
					page_size: 6,
					sort_by: "scraped_at",
					sort_order: "desc"
				});
				await nextTick();
				loadedPostsCount.value = posts.value.length;
				await updateLayout();
				loadStatsInBackground();
				startAutoplay();
			} catch (error) {
				logger_default.error("Failed to load data:", error);
				toast_default.error(t("common.loadFailed"));
			}
		});
		const loadStatsInBackground = () => {
			setTimeout(() => {
				statsApi.getPlatformStats().then((data) => {
					platformStats.value = data;
					isStatsLoading.value = false;
				}).catch((err) => {
					logger_default.error("Failed to load stats:", err);
					isStatsLoading.value = false;
				});
			}, 1e3);
		};
		onUnmounted(() => {
			if (autoplayInterval.value) clearInterval(autoplayInterval.value);
		});
		onActivated(async () => {
			if (postsGrid.value && posts.value.length > 0) {
				await nextTick();
				await updateLayout();
				logger_default.info("页面激活，重新计算布局");
			}
		});
		const loadMore = async () => {
			if (!hasMore.value) return;
			if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return;
			currentPage.value++;
			try {
				const result = await postsStore.fetchPosts({
					page: currentPage.value,
					page_size: 8,
					sort_by: "scraped_at",
					sort_order: "desc",
					append: true
				});
				if (!result || result.items.length === 0) hasMore.value = false;
				await nextTick();
				if (postsGrid.value) {
					const allCards = postsGrid.value.querySelectorAll("a.post-card");
					const previousCount = loadedPostsCount.value;
					for (let i = previousCount; i < allCards.length; i++) allCards[i].classList.add("card-entering");
					loadedPostsCount.value = allCards.length;
				}
				await smoothUpdateLayout();
				setTimeout(() => {
					if (postsGrid.value) postsGrid.value.querySelectorAll("a.post-card.card-entering").forEach((card) => {
						card.classList.remove("card-entering");
					});
				}, 600);
			} catch (error) {
				logger_default.error("Failed to load more posts:", error);
				currentPage.value--;
			}
		};
		const goToExplore = () => {
			router.push("/explore");
		};
		const goToLogin = () => {
			router.push("/login");
		};
		const getPlatformColor = (platform) => {
			return PLATFORM_COLORS[platform] || "#666";
		};
		const getPlatformIcon = (platform) => {
			return {
				youtube: Youtube,
				twitter: Twitter,
				tiktok: Music2,
				instagram: Instagram
			}[platform] || ImageIcon;
		};
		const __returned__ = {
			router,
			authStore,
			settingsStore,
			postsStore,
			isAuthenticated,
			user,
			posts,
			loading,
			accessLimit,
			platforms,
			platformStats,
			isStatsLoading,
			currentPage,
			hasMore,
			postsGrid,
			loadedPostsCount,
			currentStatIndex,
			autoplayInterval,
			isPaused,
			autoplayDuration,
			prevStat,
			nextStat,
			goToSlide,
			pauseAutoplay,
			resumeAutoplay,
			resetAutoplay,
			startAutoplay,
			t,
			updateLayout,
			smoothUpdateLayout,
			isLoadingMore,
			loadStatsInBackground,
			loadMore,
			goToExplore,
			goToLogin,
			getPlatformColor,
			getPlatformIcon,
			get Compass() {
				return Compass;
			},
			get ArrowRight() {
				return ArrowRight;
			},
			get ImageIcon() {
				return ImageIcon;
			},
			get X() {
				return X;
			},
			MainLayout: MainLayout_default,
			GlassButton: GlassButton_default,
			LoadingSpinner: LoadingSpinner_default,
			PostCard: PostCard_default,
			AccessLimitBanner: AccessLimitBanner_default,
			get formatNumber() {
				return formatNumber;
			}
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	const _component_RouterLink = resolveComponent("RouterLink");
	_push(ssrRenderComponent($setup["MainLayout"], _attrs, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<div class="home-page" data-v-9b48b94e${_scopeId}>`);
				if ($setup.settingsStore.settings.showHeroSection) {
					_push$1(`<section class="hero-section" data-v-9b48b94e${_scopeId}><div class="hero-content glass-card" data-v-9b48b94e${_scopeId}><button class="hero-close-btn"${ssrRenderAttr("aria-label", _ctx.$t("common.close"))}${ssrRenderAttr("title", _ctx.$t("settings.hideHeroSection"))} data-v-9b48b94e${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["X"], { size: 20 }, null, _parent$1, _scopeId));
					_push$1(`</button><h1 class="hero-title fade-in" data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("app.name"))}</h1><p class="hero-subtitle slide-up" data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("app.description"))}</p><div class="hero-actions slide-up" data-v-9b48b94e${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["GlassButton"], {
						size: "lg",
						onClick: $setup.goToExplore
					}, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) {
								_push$2(ssrRenderComponent($setup["Compass"], { size: 20 }, null, _parent$2, _scopeId$1));
								_push$2(` ${ssrInterpolate(_ctx.$t("nav.explore"))}`);
							} else return [createVNode($setup["Compass"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.explore")), 1)];
						}),
						_: 1
					}, _parent$1, _scopeId));
					if (!$setup.isAuthenticated) _push$1(ssrRenderComponent($setup["GlassButton"], {
						size: "lg",
						variant: "secondary",
						onClick: $setup.goToLogin
					}, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) _push$2(`${ssrInterpolate(_ctx.$t("nav.login"))}`);
							else return [createTextVNode(toDisplayString(_ctx.$t("nav.login")), 1)];
						}),
						_: 1
					}, _parent$1, _scopeId));
					else _push$1(`<!---->`);
					_push$1(`</div></div></section>`);
				} else _push$1(`<!---->`);
				_push$1(`<section class="stats-section" data-v-9b48b94e${_scopeId}>`);
				if ($setup.isStatsLoading) {
					_push$1(`<div class="stats-grid stats-desktop" data-v-9b48b94e${_scopeId}><!--[-->`);
					ssrRenderList($setup.platforms, (platform) => {
						_push$1(`<div class="stat-card glass-card loading" data-v-9b48b94e${_scopeId}><div class="stat-icon" style="${ssrRenderStyle({ "background": "#e5e7eb" })}" data-v-9b48b94e${_scopeId}><div style="${ssrRenderStyle({
							"width": "32px",
							"height": "32px",
							"background": "#d1d5db",
							"border-radius": "4px"
						})}" data-v-9b48b94e${_scopeId}></div></div><div style="${ssrRenderStyle({
							"height": "20px",
							"width": "60%",
							"background": "#e5e7eb",
							"border-radius": "4px",
							"margin": "8px 0"
						})}" data-v-9b48b94e${_scopeId}></div><div style="${ssrRenderStyle({
							"height": "32px",
							"width": "40%",
							"background": "#e5e7eb",
							"border-radius": "4px",
							"margin": "4px 0"
						})}" data-v-9b48b94e${_scopeId}></div><div style="${ssrRenderStyle({
							"height": "16px",
							"width": "50%",
							"background": "#e5e7eb",
							"border-radius": "4px"
						})}" data-v-9b48b94e${_scopeId}></div></div>`);
					});
					_push$1(`<!--]--></div>`);
				} else {
					_push$1(`<div class="stats-grid stats-desktop" data-v-9b48b94e${_scopeId}><!--[-->`);
					ssrRenderList($setup.platforms, (platform) => {
						_push$1(`<div class="stat-card glass-card" data-v-9b48b94e${_scopeId}><div class="stat-icon" style="${ssrRenderStyle({ background: $setup.getPlatformColor(platform) })}" data-v-9b48b94e${_scopeId}>`);
						ssrRenderVNode(_push$1, createVNode(resolveDynamicComponent($setup.getPlatformIcon(platform)), { size: 32 }, null), _parent$1, _scopeId);
						_push$1(`</div><h3 data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t(`platform.${platform}`))}</h3><p class="stat-count" data-v-9b48b94e${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.platformStats[platform] || 0))}</p><p class="stat-label" data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("post.title"))}</p></div>`);
					});
					_push$1(`<!--]--></div>`);
				}
				_push$1(`<div class="stats-carousel stats-mobile" data-v-9b48b94e${_scopeId}>`);
				if ($setup.isStatsLoading) _push$1(`<div class="stat-card glass-card loading" data-v-9b48b94e${_scopeId}><div class="stat-icon" style="${ssrRenderStyle({ "background": "#e5e7eb" })}" data-v-9b48b94e${_scopeId}><div style="${ssrRenderStyle({
					"width": "32px",
					"height": "32px",
					"background": "#d1d5db",
					"border-radius": "4px"
				})}" data-v-9b48b94e${_scopeId}></div></div><div style="${ssrRenderStyle({
					"height": "20px",
					"width": "60%",
					"background": "#e5e7eb",
					"border-radius": "4px",
					"margin": "8px 0"
				})}" data-v-9b48b94e${_scopeId}></div><div style="${ssrRenderStyle({
					"height": "32px",
					"width": "40%",
					"background": "#e5e7eb",
					"border-radius": "4px",
					"margin": "4px 0"
				})}" data-v-9b48b94e${_scopeId}></div><div style="${ssrRenderStyle({
					"height": "16px",
					"width": "50%",
					"background": "#e5e7eb",
					"border-radius": "4px"
				})}" data-v-9b48b94e${_scopeId}></div></div>`);
				else {
					_push$1(`<div data-v-9b48b94e${_scopeId}><div class="carousel-container glass-card" data-v-9b48b94e${_scopeId}><button class="carousel-btn carousel-prev" aria-label="Previous" data-v-9b48b94e${_scopeId}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-9b48b94e${_scopeId}><polyline points="15 18 9 12 15 6" data-v-9b48b94e${_scopeId}></polyline></svg></button><div class="carousel-track-container" data-v-9b48b94e${_scopeId}><div class="carousel-track" style="${ssrRenderStyle({ transform: `translateX(-${$setup.currentStatIndex * 100}%)` })}" data-v-9b48b94e${_scopeId}><!--[-->`);
					ssrRenderList($setup.platforms, (platform) => {
						_push$1(`<div class="carousel-slide" data-v-9b48b94e${_scopeId}><div class="stat-card glass-card" data-v-9b48b94e${_scopeId}><div class="stat-icon" style="${ssrRenderStyle({ background: $setup.getPlatformColor(platform) })}" data-v-9b48b94e${_scopeId}>`);
						ssrRenderVNode(_push$1, createVNode(resolveDynamicComponent($setup.getPlatformIcon(platform)), { size: 32 }, null), _parent$1, _scopeId);
						_push$1(`</div><h3 data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t(`platform.${platform}`))}</h3><p class="stat-count" data-v-9b48b94e${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.platformStats[platform] || 0))}</p><p class="stat-label" data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("post.title"))}</p></div></div>`);
					});
					_push$1(`<!--]--></div></div><button class="carousel-btn carousel-next" aria-label="Next" data-v-9b48b94e${_scopeId}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-9b48b94e${_scopeId}><polyline points="9 18 15 12 9 6" data-v-9b48b94e${_scopeId}></polyline></svg></button></div><div class="carousel-indicators" data-v-9b48b94e${_scopeId}><!--[-->`);
					ssrRenderList($setup.platforms, (platform, index) => {
						_push$1(`<div class="${ssrRenderClass([{ active: $setup.currentStatIndex === index }, "indicator-progress"])}" data-v-9b48b94e${_scopeId}><div class="${ssrRenderClass([{ animating: $setup.currentStatIndex === index && !$setup.isPaused }, "progress-bar"])}" data-v-9b48b94e${_scopeId}></div></div>`);
					});
					_push$1(`<!--]--></div></div>`);
				}
				_push$1(`</div></section><section class="latest-section" data-v-9b48b94e${_scopeId}><div class="section-header" data-v-9b48b94e${_scopeId}><h2 data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("filter.latest"))}</h2>`);
				_push$1(ssrRenderComponent(_component_RouterLink, { to: "/explore" }, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) _push$2(ssrRenderComponent($setup["GlassButton"], { variant: "ghost" }, {
							default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
								if (_push$3) {
									_push$3(`${ssrInterpolate(_ctx.$t("common.more"))} `);
									_push$3(ssrRenderComponent($setup["ArrowRight"], { size: 18 }, null, _parent$3, _scopeId$2));
								} else return [createTextVNode(toDisplayString(_ctx.$t("common.more")) + " ", 1), createVNode($setup["ArrowRight"], { size: 18 })];
							}),
							_: 1
						}, _parent$2, _scopeId$1));
						else return [createVNode($setup["GlassButton"], { variant: "ghost" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.more")) + " ", 1), createVNode($setup["ArrowRight"], { size: 18 })]),
							_: 1
						})];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(`</div>`);
				_push$1(ssrRenderComponent($setup["AccessLimitBanner"], {
					"current-count": $setup.posts.length,
					"total-limit": $setup.accessLimit
				}, null, _parent$1, _scopeId));
				if ($setup.loading && $setup.posts.length === 0) _push$1(ssrRenderComponent($setup["LoadingSpinner"], {
					size: "lg",
					text: _ctx.$t("common.loading")
				}, null, _parent$1, _scopeId));
				else if ($setup.posts.length > 0) {
					_push$1(`<div class="posts-grid" data-v-9b48b94e${_scopeId}><!--[-->`);
					ssrRenderList($setup.posts, (post, index) => {
						_push$1(ssrRenderComponent($setup["PostCard"], {
							key: post.id,
							post,
							index
						}, null, _parent$1, _scopeId));
					});
					_push$1(`<!--]--></div>`);
				} else if (!$setup.loading) {
					_push$1(`<div class="empty-state glass-card" data-v-9b48b94e${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["ImageIcon"], { size: 64 }, null, _parent$1, _scopeId));
					_push$1(`<p data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("search.noResults"))}</p></div>`);
				} else _push$1(`<!---->`);
				if ($setup.isLoadingMore) {
					_push$1(`<div class="loading-more" data-v-9b48b94e${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["LoadingSpinner"], {
						size: "sm",
						text: _ctx.$t("common.loading")
					}, null, _parent$1, _scopeId));
					_push$1(`</div>`);
				} else _push$1(`<!---->`);
				if (!$setup.hasMore && $setup.posts.length > 0) _push$1(`<div class="no-more-hint" data-v-9b48b94e${_scopeId}><p data-v-9b48b94e${_scopeId}>${ssrInterpolate(_ctx.$t("common.noMore"))}</p></div>`);
				else _push$1(`<!---->`);
				_push$1(`</section></div>`);
			} else return [createVNode("div", { class: "home-page" }, [
				createVNode(Transition, { name: "hero-fade" }, {
					default: withCtx(() => [$setup.settingsStore.settings.showHeroSection ? (openBlock(), createBlock("section", {
						key: 0,
						class: "hero-section"
					}, [createVNode("div", { class: "hero-content glass-card" }, [
						createVNode("button", {
							class: "hero-close-btn",
							onClick: ($event) => $setup.settingsStore.toggleSetting("showHeroSection"),
							"aria-label": _ctx.$t("common.close"),
							title: _ctx.$t("settings.hideHeroSection")
						}, [createVNode($setup["X"], { size: 20 })], 8, [
							"onClick",
							"aria-label",
							"title"
						]),
						createVNode("h1", { class: "hero-title fade-in" }, toDisplayString(_ctx.$t("app.name")), 1),
						createVNode("p", { class: "hero-subtitle slide-up" }, toDisplayString(_ctx.$t("app.description")), 1),
						createVNode("div", { class: "hero-actions slide-up" }, [createVNode($setup["GlassButton"], {
							size: "lg",
							onClick: $setup.goToExplore
						}, {
							default: withCtx(() => [createVNode($setup["Compass"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.explore")), 1)]),
							_: 1
						}), !$setup.isAuthenticated ? (openBlock(), createBlock($setup["GlassButton"], {
							key: 0,
							size: "lg",
							variant: "secondary",
							onClick: $setup.goToLogin
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("nav.login")), 1)]),
							_: 1
						})) : createCommentVNode("", true)])
					])])) : createCommentVNode("", true)]),
					_: 1
				}),
				createVNode("section", { class: "stats-section" }, [$setup.isStatsLoading ? (openBlock(), createBlock("div", {
					key: 0,
					class: "stats-grid stats-desktop"
				}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.platforms, (platform) => {
					return openBlock(), createBlock("div", {
						key: platform,
						class: "stat-card glass-card loading"
					}, [
						createVNode("div", {
							class: "stat-icon",
							style: { "background": "#e5e7eb" }
						}, [createVNode("div", { style: {
							"width": "32px",
							"height": "32px",
							"background": "#d1d5db",
							"border-radius": "4px"
						} })]),
						createVNode("div", { style: {
							"height": "20px",
							"width": "60%",
							"background": "#e5e7eb",
							"border-radius": "4px",
							"margin": "8px 0"
						} }),
						createVNode("div", { style: {
							"height": "32px",
							"width": "40%",
							"background": "#e5e7eb",
							"border-radius": "4px",
							"margin": "4px 0"
						} }),
						createVNode("div", { style: {
							"height": "16px",
							"width": "50%",
							"background": "#e5e7eb",
							"border-radius": "4px"
						} })
					]);
				}), 128))])) : (openBlock(), createBlock("div", {
					key: 1,
					class: "stats-grid stats-desktop"
				}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.platforms, (platform) => {
					return openBlock(), createBlock("div", {
						key: platform,
						class: "stat-card glass-card"
					}, [
						createVNode("div", {
							class: "stat-icon",
							style: { background: $setup.getPlatformColor(platform) }
						}, [(openBlock(), createBlock(resolveDynamicComponent($setup.getPlatformIcon(platform)), { size: 32 }))], 4),
						createVNode("h3", null, toDisplayString(_ctx.$t(`platform.${platform}`)), 1),
						createVNode("p", { class: "stat-count" }, toDisplayString($setup.formatNumber($setup.platformStats[platform] || 0)), 1),
						createVNode("p", { class: "stat-label" }, toDisplayString(_ctx.$t("post.title")), 1)
					]);
				}), 128))])), createVNode("div", { class: "stats-carousel stats-mobile" }, [$setup.isStatsLoading ? (openBlock(), createBlock("div", {
					key: 0,
					class: "stat-card glass-card loading"
				}, [
					createVNode("div", {
						class: "stat-icon",
						style: { "background": "#e5e7eb" }
					}, [createVNode("div", { style: {
						"width": "32px",
						"height": "32px",
						"background": "#d1d5db",
						"border-radius": "4px"
					} })]),
					createVNode("div", { style: {
						"height": "20px",
						"width": "60%",
						"background": "#e5e7eb",
						"border-radius": "4px",
						"margin": "8px 0"
					} }),
					createVNode("div", { style: {
						"height": "32px",
						"width": "40%",
						"background": "#e5e7eb",
						"border-radius": "4px",
						"margin": "4px 0"
					} }),
					createVNode("div", { style: {
						"height": "16px",
						"width": "50%",
						"background": "#e5e7eb",
						"border-radius": "4px"
					} })
				])) : (openBlock(), createBlock("div", { key: 1 }, [createVNode("div", {
					class: "carousel-container glass-card",
					onMouseenter: $setup.pauseAutoplay,
					onMouseleave: $setup.resumeAutoplay
				}, [
					createVNode("button", {
						class: "carousel-btn carousel-prev",
						onClick: $setup.prevStat,
						"aria-label": "Previous"
					}, [(openBlock(), createBlock("svg", {
						width: "24",
						height: "24",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						"stroke-width": "2"
					}, [createVNode("polyline", { points: "15 18 9 12 15 6" })]))]),
					createVNode("div", { class: "carousel-track-container" }, [createVNode("div", {
						class: "carousel-track",
						style: { transform: `translateX(-${$setup.currentStatIndex * 100}%)` }
					}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.platforms, (platform) => {
						return openBlock(), createBlock("div", {
							key: platform,
							class: "carousel-slide"
						}, [createVNode("div", { class: "stat-card glass-card" }, [
							createVNode("div", {
								class: "stat-icon",
								style: { background: $setup.getPlatformColor(platform) }
							}, [(openBlock(), createBlock(resolveDynamicComponent($setup.getPlatformIcon(platform)), { size: 32 }))], 4),
							createVNode("h3", null, toDisplayString(_ctx.$t(`platform.${platform}`)), 1),
							createVNode("p", { class: "stat-count" }, toDisplayString($setup.formatNumber($setup.platformStats[platform] || 0)), 1),
							createVNode("p", { class: "stat-label" }, toDisplayString(_ctx.$t("post.title")), 1)
						])]);
					}), 128))], 4)]),
					createVNode("button", {
						class: "carousel-btn carousel-next",
						onClick: $setup.nextStat,
						"aria-label": "Next"
					}, [(openBlock(), createBlock("svg", {
						width: "24",
						height: "24",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						"stroke-width": "2"
					}, [createVNode("polyline", { points: "9 18 15 12 9 6" })]))])
				], 32), createVNode("div", { class: "carousel-indicators" }, [(openBlock(true), createBlock(Fragment, null, renderList($setup.platforms, (platform, index) => {
					return openBlock(), createBlock("div", {
						key: index,
						class: ["indicator-progress", { active: $setup.currentStatIndex === index }],
						onClick: ($event) => $setup.goToSlide(index)
					}, [createVNode("div", { class: ["progress-bar", { animating: $setup.currentStatIndex === index && !$setup.isPaused }] }, null, 2)], 10, ["onClick"]);
				}), 128))])]))])]),
				createVNode("section", { class: "latest-section" }, [
					createVNode("div", { class: "section-header" }, [createVNode("h2", null, toDisplayString(_ctx.$t("filter.latest")), 1), createVNode(_component_RouterLink, { to: "/explore" }, {
						default: withCtx(() => [createVNode($setup["GlassButton"], { variant: "ghost" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.more")) + " ", 1), createVNode($setup["ArrowRight"], { size: 18 })]),
							_: 1
						})]),
						_: 1
					})]),
					createVNode($setup["AccessLimitBanner"], {
						"current-count": $setup.posts.length,
						"total-limit": $setup.accessLimit
					}, null, 8, ["current-count", "total-limit"]),
					$setup.loading && $setup.posts.length === 0 ? (openBlock(), createBlock($setup["LoadingSpinner"], {
						key: 0,
						size: "lg",
						text: _ctx.$t("common.loading")
					}, null, 8, ["text"])) : $setup.posts.length > 0 ? (openBlock(), createBlock("div", {
						key: 1,
						ref: "postsGrid",
						class: "posts-grid"
					}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.posts, (post, index) => {
						return openBlock(), createBlock($setup["PostCard"], {
							key: post.id,
							post,
							index
						}, null, 8, ["post", "index"]);
					}), 128))], 512)) : !$setup.loading ? (openBlock(), createBlock("div", {
						key: 2,
						class: "empty-state glass-card"
					}, [createVNode($setup["ImageIcon"], { size: 64 }), createVNode("p", null, toDisplayString(_ctx.$t("search.noResults")), 1)])) : createCommentVNode("", true),
					$setup.isLoadingMore ? (openBlock(), createBlock("div", {
						key: 3,
						class: "loading-more"
					}, [createVNode($setup["LoadingSpinner"], {
						size: "sm",
						text: _ctx.$t("common.loading")
					}, null, 8, ["text"])])) : createCommentVNode("", true),
					!$setup.hasMore && $setup.posts.length > 0 ? (openBlock(), createBlock("div", {
						key: 4,
						class: "no-more-hint"
					}, [createVNode("p", null, toDisplayString(_ctx.$t("common.noMore")), 1)])) : createCommentVNode("", true)
				])
			])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = HomePage_vue_vue_type_script_setup_true_lang_default.setup;
HomePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/HomePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var HomePage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(HomePage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-9b48b94e"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/HomePage.vue"]
]);
export { useSettingsStore as n, HomePage_default as t };
