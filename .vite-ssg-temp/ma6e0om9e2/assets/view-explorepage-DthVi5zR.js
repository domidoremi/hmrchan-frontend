import { n as favoritesApi, o as useAuthStore, s as api } from "./api-services-BmQ9TwGt.js";
import { a as LoadingSpinner_default, i as PLATFORM_NAMES, l as __plugin_vue_export_helper_default, n as PLATFORMS, o as MainLayout_default, r as PLATFORM_COLORS, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { a as useWaterfallLayout, o as toast_default } from "./composables-CdbJX3Qi.js";
import { Fragment, computed, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, mergeProps, nextTick, onActivated, onMounted, onUnmounted, openBlock, ref, renderList, resolveComponent, toDisplayString, useSSRContext, watch, withCtx, withModifiers } from "vue";
import { defineStore, storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrIncludeBooleanAttr, ssrInterpolate, ssrLooseContain, ssrLooseEqual, ssrRenderAttr, ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderList, ssrRenderStyle } from "vue/server-renderer";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Filter, Heart, ImageIcon, MessageCircle, Quote, Repeat2, RotateCcw, SearchX, User } from "lucide-vue-next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import "dayjs/locale/zh-cn.js";
import "dayjs/locale/ja.js";
var FilterBar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "FilterBar",
	props: { filters: {
		type: Object,
		required: true
	} },
	emits: ["update"],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const { t } = useI18n();
		const platforms = PLATFORMS;
		const localFilters = ref({ ...props.filters });
		watch(() => props.filters, (newFilters) => {
			localFilters.value = { ...newFilters };
		});
		const applyFilters = () => {
			emit("update", { ...localFilters.value });
		};
		const resetFilters = () => {
			localFilters.value = {
				page: 1,
				page_size: 20,
				sort_by: "scraped_at",
				sort_order: "desc",
				platform: "",
				has_media: false
			};
			applyFilters();
		};
		const __returned__ = {
			props,
			emit,
			t,
			platforms,
			localFilters,
			applyFilters,
			resetFilters,
			get ArrowDown() {
				return ArrowDown;
			},
			get ArrowUp() {
				return ArrowUp;
			},
			get ImageIcon() {
				return ImageIcon;
			},
			get RotateCcw() {
				return RotateCcw;
			},
			get Filter() {
				return Filter;
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
function _sfc_ssrRender$4(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "filter-bar glass-card" }, _attrs))} data-v-f3d58b49><div class="filter-section" data-v-f3d58b49><label class="filter-label" data-v-f3d58b49>${ssrInterpolate(_ctx.$t("filter.platform"))}</label><select class="filter-select glass-input" data-v-f3d58b49><option value="" data-v-f3d58b49${ssrIncludeBooleanAttr(Array.isArray($setup.localFilters.platform) ? ssrLooseContain($setup.localFilters.platform, "") : ssrLooseEqual($setup.localFilters.platform, "")) ? " selected" : ""}>${ssrInterpolate(_ctx.$t("platform.all"))}</option><!--[-->`);
	ssrRenderList($setup.platforms, (platform) => {
		_push(`<option${ssrRenderAttr("value", platform)} data-v-f3d58b49${ssrIncludeBooleanAttr(Array.isArray($setup.localFilters.platform) ? ssrLooseContain($setup.localFilters.platform, platform) : ssrLooseEqual($setup.localFilters.platform, platform)) ? " selected" : ""}>${ssrInterpolate(_ctx.$t(`platform.${platform}`))}</option>`);
	});
	_push(`<!--]--></select></div><div class="filter-section" data-v-f3d58b49><label class="filter-label" data-v-f3d58b49>${ssrInterpolate(_ctx.$t("filter.sortBy"))}</label><select class="filter-select glass-input" data-v-f3d58b49><option value="scraped_at" data-v-f3d58b49${ssrIncludeBooleanAttr(Array.isArray($setup.localFilters.sort_by) ? ssrLooseContain($setup.localFilters.sort_by, "scraped_at") : ssrLooseEqual($setup.localFilters.sort_by, "scraped_at")) ? " selected" : ""}>${ssrInterpolate(_ctx.$t("filter.latest"))}</option><option value="published_at" data-v-f3d58b49${ssrIncludeBooleanAttr(Array.isArray($setup.localFilters.sort_by) ? ssrLooseContain($setup.localFilters.sort_by, "published_at") : ssrLooseEqual($setup.localFilters.sort_by, "published_at")) ? " selected" : ""}>${ssrInterpolate(_ctx.$t("filter.published"))}</option><option value="view_count" data-v-f3d58b49${ssrIncludeBooleanAttr(Array.isArray($setup.localFilters.sort_by) ? ssrLooseContain($setup.localFilters.sort_by, "view_count") : ssrLooseEqual($setup.localFilters.sort_by, "view_count")) ? " selected" : ""}>${ssrInterpolate(_ctx.$t("post.views"))}</option><option value="like_count" data-v-f3d58b49${ssrIncludeBooleanAttr(Array.isArray($setup.localFilters.sort_by) ? ssrLooseContain($setup.localFilters.sort_by, "like_count") : ssrLooseEqual($setup.localFilters.sort_by, "like_count")) ? " selected" : ""}>${ssrInterpolate(_ctx.$t("post.likes"))}</option></select></div><div class="filter-section" data-v-f3d58b49><label class="filter-label" data-v-f3d58b49>${ssrInterpolate(_ctx.$t("common.order"))}</label><div class="filter-buttons" data-v-f3d58b49><button class="${ssrRenderClass([{ active: $setup.localFilters.sort_order === "desc" }, "filter-button"])}" data-v-f3d58b49>`);
	_push(ssrRenderComponent($setup["ArrowDown"], { size: 16 }, null, _parent));
	_push(`</button><button class="${ssrRenderClass([{ active: $setup.localFilters.sort_order === "asc" }, "filter-button"])}" data-v-f3d58b49>`);
	_push(ssrRenderComponent($setup["ArrowUp"], { size: 16 }, null, _parent));
	_push(`</button></div></div><div class="filter-section" data-v-f3d58b49><label class="filter-label" data-v-f3d58b49>${ssrInterpolate(_ctx.$t("filter.hasMedia"))}</label><button class="${ssrRenderClass([{ active: $setup.localFilters.has_media }, "filter-button"])}" data-v-f3d58b49>`);
	_push(ssrRenderComponent($setup["ImageIcon"], { size: 16 }, null, _parent));
	_push(`</button></div><div class="filter-actions" data-v-f3d58b49>`);
	_push(ssrRenderComponent($setup["GlassButton"], {
		size: "sm",
		variant: "ghost",
		onClick: $setup.resetFilters
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["RotateCcw"], { size: 16 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("common.reset"))}`);
			} else return [createVNode($setup["RotateCcw"], { size: 16 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.reset")), 1)];
		}),
		_: 1
	}, _parent));
	_push(ssrRenderComponent($setup["GlassButton"], {
		size: "sm",
		onClick: $setup.applyFilters
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["Filter"], { size: 16 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("common.apply"))}`);
			} else return [createVNode($setup["Filter"], { size: 16 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.apply")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</div></div>`);
}
var _sfc_setup$4 = FilterBar_vue_vue_type_script_setup_true_lang_default.setup;
FilterBar_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/features/FilterBar.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var FilterBar_default = /* @__PURE__ */ __plugin_vue_export_helper_default(FilterBar_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$4],
	["__scopeId", "data-v-f3d58b49"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/features/FilterBar.vue"]
]);
var OptimizedImage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "OptimizedImage",
	props: {
		src: {
			type: String,
			required: true
		},
		alt: {
			type: String,
			required: false
		},
		lazy: {
			type: Boolean,
			required: false,
			default: true
		},
		async: {
			type: Boolean,
			required: false,
			default: true
		},
		webp: {
			type: Boolean,
			required: false,
			default: true
		},
		imgClass: {
			type: String,
			required: false
		}
	},
	emits: ["load", "error"],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const webpSrc = computed(() => {
			if (!props.webp || !props.src) return null;
			if (props.src.endsWith(".webp")) return null;
			return props.src.replace(/\.(jpg|jpeg|png)$/i, ".webp");
		});
		const onLoad = () => {
			emit("load");
		};
		const onError = (e) => {
			emit("error", e);
		};
		const __returned__ = {
			props,
			emit,
			webpSrc,
			onLoad,
			onError
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$3(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<picture${ssrRenderAttrs(_attrs)} data-v-8a84b26b>`);
	if ($setup.webpSrc) _push(`<source${ssrRenderAttr("srcset", $setup.webpSrc)} type="image/webp" data-v-8a84b26b>`);
	else _push(`<!---->`);
	_push(`<img${ssrRenderAttr("src", $props.src)}${ssrRenderAttr("alt", $props.alt)}${ssrRenderAttr("loading", $props.lazy ? "lazy" : "eager")}${ssrRenderAttr("decoding", $props.async ? "async" : "auto")} class="${ssrRenderClass($props.imgClass)}" data-v-8a84b26b></picture>`);
}
var _sfc_setup$3 = OptimizedImage_vue_vue_type_script_setup_true_lang_default.setup;
OptimizedImage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/OptimizedImage.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var OptimizedImage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(OptimizedImage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$3],
	["__scopeId", "data-v-8a84b26b"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/OptimizedImage.vue"]
]);
dayjs.extend(relativeTime);
function formatNumber(num) {
	if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
	if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
	return num.toString();
}
function formatRelativeTime(dateStr, locale = "en") {
	dayjs.locale(locale);
	return dayjs(dateStr).fromNow();
}
function formatDuration(seconds) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor(seconds % 3600 / 60);
	const secs = seconds % 60;
	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	return `${minutes}:${String(secs).padStart(2, "0")}`;
}
function truncateText(text, maxLength) {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + "...";
}
var PostCard_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PostCard",
	props: {
		post: {
			type: Object,
			required: true
		},
		index: {
			type: Number,
			required: false
		}
	},
	setup(__props, { expose: __expose }) {
		__expose();
		const props = __props;
		const router = useRouter();
		const { t } = useI18n();
		const isFavorited = ref(false);
		const favoriteId = ref(null);
		const loading = ref(false);
		const isFirstScreen = computed(() => {
			return props.index !== void 0 && props.index < 6;
		});
		const platformName = computed(() => PLATFORM_NAMES[props.post.platform] || props.post.platform);
		const platformColor = computed(() => PLATFORM_COLORS[props.post.platform] || "#666");
		const isRetweet = computed(() => {
			return !!props.post.original_author_id && !!props.post.original_author_name;
		});
		const isQuote = computed(() => {
			const metadata = props.post.platform_metadata;
			if (!metadata) return false;
			const hasQuoteId = metadata.quote_id && Number(metadata.quote_id) > 0;
			const hasRetweetId = metadata.retweet_id && Number(metadata.retweet_id) > 0;
			return hasQuoteId && !hasRetweetId;
		});
		const showDescription = computed(() => {
			if (!props.post.description) return false;
			if (!props.post.title) return true;
			if (props.post.description === props.post.title) return false;
			if (props.post.description.startsWith(props.post.title.replace("...", ""))) return false;
			return true;
		});
		onMounted(async () => {
			if (!useAuthStore().isAuthenticated) return;
			try {
				const result = await favoritesApi.checkFavorite(props.post.id);
				isFavorited.value = result.is_favorited;
				favoriteId.value = result.favorite_id;
			} catch (error) {}
		});
		const toggleFavorite = async () => {
			if (!useAuthStore().isAuthenticated) {
				toast_default.warning(t("favorite.loginRequired"));
				router.push("/login");
				return;
			}
			if (loading.value) return;
			loading.value = true;
			try {
				if (isFavorited.value && favoriteId.value) {
					await favoritesApi.deleteFavorite(favoriteId.value);
					isFavorited.value = false;
					favoriteId.value = null;
					toast_default.success(t("favorite.removeSuccess"));
				} else {
					const favorite = await favoritesApi.addFavorite({ post_id: props.post.id });
					isFavorited.value = true;
					favoriteId.value = favorite.id;
					toast_default.success(t("favorite.addSuccess"));
				}
			} catch (error) {
				console.error("Failed to toggle favorite:", error);
				toast_default.error(error.response?.data?.message || t("common.operationFailed"));
			} finally {
				loading.value = false;
			}
		};
		const formatDate = (dateStr) => {
			return formatRelativeTime(dateStr);
		};
		const __returned__ = {
			props,
			router,
			t,
			isFavorited,
			favoriteId,
			loading,
			isFirstScreen,
			platformName,
			platformColor,
			isRetweet,
			isQuote,
			showDescription,
			toggleFavorite,
			formatDate,
			get Heart() {
				return Heart;
			},
			get Eye() {
				return Eye;
			},
			get MessageCircle() {
				return MessageCircle;
			},
			get User() {
				return User;
			},
			get ImageIcon() {
				return ImageIcon;
			},
			get Repeat2() {
				return Repeat2;
			},
			get Quote() {
				return Quote;
			},
			OptimizedImage: OptimizedImage_default,
			get formatNumber() {
				return formatNumber;
			},
			get formatDuration() {
				return formatDuration;
			},
			get truncateText() {
				return truncateText;
			}
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$2(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(ssrRenderComponent(resolveComponent("RouterLink"), mergeProps({
		to: `/posts/${$props.post.id}`,
		custom: ""
	}, _attrs), {
		default: withCtx(({ navigate, href }, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<a${ssrRenderAttr("href", href)} class="post-card glass-card" data-post-card${ssrRenderAttr("data-post-id", $props.post.id)} data-v-4b1a2edf${_scopeId}><div class="card-thumbnail" data-v-4b1a2edf${_scopeId}>`);
				if ($props.post.thumbnail_url) _push$1(ssrRenderComponent($setup["OptimizedImage"], {
					src: $props.post.thumbnail_url,
					alt: $props.post.title || "",
					lazy: !$setup.isFirstScreen,
					"img-class": "card-image"
				}, null, _parent$1, _scopeId));
				else {
					_push$1(`<div class="thumbnail-placeholder" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["ImageIcon"], { size: 48 }, null, _parent$1, _scopeId));
					_push$1(`</div>`);
				}
				_push$1(`<div class="platform-badge" style="${ssrRenderStyle({ background: $setup.platformColor })}" data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.platformName)}</div>`);
				if ($setup.isRetweet) {
					_push$1(`<div class="retweet-badge" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Repeat2"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(` RT </div>`);
				} else _push$1(`<!---->`);
				if ($setup.isQuote) {
					_push$1(`<div class="quote-badge" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Quote"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(` Quote </div>`);
				} else _push$1(`<!---->`);
				if ($props.post.duration) _push$1(`<div class="duration-badge" data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.formatDuration($props.post.duration))}</div>`);
				else _push$1(`<!---->`);
				if ($props.post.media_count > 1) {
					_push$1(`<div class="media-count-badge" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["ImageIcon"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(` ${ssrInterpolate($props.post.media_count)}</div>`);
				} else _push$1(`<!---->`);
				_push$1(`</div><div class="card-content" data-v-4b1a2edf${_scopeId}><h3 class="card-title" data-v-4b1a2edf${_scopeId}>${ssrInterpolate($props.post.title || "Untitled")}</h3>`);
				if ($setup.isRetweet && $props.post.original_author_name) {
					_push$1(`<div class="card-author" data-v-4b1a2edf${_scopeId}><div class="author-retweet" data-v-4b1a2edf${_scopeId}><div class="retweeter" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["User"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-4b1a2edf${_scopeId}>${ssrInterpolate($props.post.author_name)}</span></div>`);
					_push$1(ssrRenderComponent($setup["Repeat2"], {
						size: 14,
						class: "rt-icon"
					}, null, _parent$1, _scopeId));
					_push$1(`<div class="original-author" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["User"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-4b1a2edf${_scopeId}>${ssrInterpolate($props.post.original_author_name)}</span></div></div></div>`);
				} else if ($props.post.author_name) {
					_push$1(`<div class="card-author" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["User"], { size: 16 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-4b1a2edf${_scopeId}>${ssrInterpolate($props.post.author_name)}</span></div>`);
				} else _push$1(`<!---->`);
				if ($setup.showDescription) _push$1(`<p class="card-description" data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.truncateText($props.post.description || "", 100))}</p>`);
				else _push$1(`<!---->`);
				_push$1(`<div class="card-stats" data-v-4b1a2edf${_scopeId}>`);
				if ($props.post.view_count) {
					_push$1(`<div class="stat-item" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Eye"], { size: 16 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.formatNumber($props.post.view_count))}</span></div>`);
				} else _push$1(`<!---->`);
				if ($props.post.like_count) {
					_push$1(`<div class="stat-item" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Heart"], { size: 16 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.formatNumber($props.post.like_count))}</span></div>`);
				} else _push$1(`<!---->`);
				if ($props.post.comment_count) {
					_push$1(`<div class="stat-item" data-v-4b1a2edf${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["MessageCircle"], { size: 16 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.formatNumber($props.post.comment_count))}</span></div>`);
				} else _push$1(`<!---->`);
				_push$1(`</div><div class="card-footer" data-v-4b1a2edf${_scopeId}><span class="publish-date" data-v-4b1a2edf${_scopeId}>${ssrInterpolate($setup.formatDate($props.post.published_at || $props.post.scraped_at))}</span><button class="favorite-button"${ssrRenderAttr("aria-label", $setup.isFavorited ? $setup.t("post.unfavorite") : $setup.t("post.addToFavorites"))} data-v-4b1a2edf${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Heart"], {
					size: 18,
					fill: $setup.isFavorited ? "currentColor" : "none"
				}, null, _parent$1, _scopeId));
				_push$1(`</button></div></div></a>`);
			} else return [createVNode("a", {
				href,
				class: "post-card glass-card",
				"data-post-card": "",
				"data-post-id": $props.post.id,
				onClick: (e) => {
					if (!e.ctrlKey && !e.metaKey) {
						e.preventDefault();
						navigate();
					}
				}
			}, [createVNode("div", { class: "card-thumbnail" }, [
				$props.post.thumbnail_url ? (openBlock(), createBlock($setup["OptimizedImage"], {
					key: 0,
					src: $props.post.thumbnail_url,
					alt: $props.post.title || "",
					lazy: !$setup.isFirstScreen,
					"img-class": "card-image"
				}, null, 8, [
					"src",
					"alt",
					"lazy"
				])) : (openBlock(), createBlock("div", {
					key: 1,
					class: "thumbnail-placeholder"
				}, [createVNode($setup["ImageIcon"], { size: 48 })])),
				createVNode("div", {
					class: "platform-badge",
					style: { background: $setup.platformColor }
				}, toDisplayString($setup.platformName), 5),
				$setup.isRetweet ? (openBlock(), createBlock("div", {
					key: 2,
					class: "retweet-badge"
				}, [createVNode($setup["Repeat2"], { size: 14 }), createTextVNode(" RT ")])) : createCommentVNode("", true),
				$setup.isQuote ? (openBlock(), createBlock("div", {
					key: 3,
					class: "quote-badge"
				}, [createVNode($setup["Quote"], { size: 14 }), createTextVNode(" Quote ")])) : createCommentVNode("", true),
				$props.post.duration ? (openBlock(), createBlock("div", {
					key: 4,
					class: "duration-badge"
				}, toDisplayString($setup.formatDuration($props.post.duration)), 1)) : createCommentVNode("", true),
				$props.post.media_count > 1 ? (openBlock(), createBlock("div", {
					key: 5,
					class: "media-count-badge"
				}, [createVNode($setup["ImageIcon"], { size: 14 }), createTextVNode(" " + toDisplayString($props.post.media_count), 1)])) : createCommentVNode("", true)
			]), createVNode("div", { class: "card-content" }, [
				createVNode("h3", { class: "card-title" }, toDisplayString($props.post.title || "Untitled"), 1),
				$setup.isRetweet && $props.post.original_author_name ? (openBlock(), createBlock("div", {
					key: 0,
					class: "card-author"
				}, [createVNode("div", { class: "author-retweet" }, [
					createVNode("div", { class: "retweeter" }, [createVNode($setup["User"], { size: 14 }), createVNode("span", null, toDisplayString($props.post.author_name), 1)]),
					createVNode($setup["Repeat2"], {
						size: 14,
						class: "rt-icon"
					}),
					createVNode("div", { class: "original-author" }, [createVNode($setup["User"], { size: 14 }), createVNode("span", null, toDisplayString($props.post.original_author_name), 1)])
				])])) : $props.post.author_name ? (openBlock(), createBlock("div", {
					key: 1,
					class: "card-author"
				}, [createVNode($setup["User"], { size: 16 }), createVNode("span", null, toDisplayString($props.post.author_name), 1)])) : createCommentVNode("", true),
				$setup.showDescription ? (openBlock(), createBlock("p", {
					key: 2,
					class: "card-description"
				}, toDisplayString($setup.truncateText($props.post.description || "", 100)), 1)) : createCommentVNode("", true),
				createVNode("div", { class: "card-stats" }, [
					$props.post.view_count ? (openBlock(), createBlock("div", {
						key: 0,
						class: "stat-item"
					}, [createVNode($setup["Eye"], { size: 16 }), createVNode("span", null, toDisplayString($setup.formatNumber($props.post.view_count)), 1)])) : createCommentVNode("", true),
					$props.post.like_count ? (openBlock(), createBlock("div", {
						key: 1,
						class: "stat-item"
					}, [createVNode($setup["Heart"], { size: 16 }), createVNode("span", null, toDisplayString($setup.formatNumber($props.post.like_count)), 1)])) : createCommentVNode("", true),
					$props.post.comment_count ? (openBlock(), createBlock("div", {
						key: 2,
						class: "stat-item"
					}, [createVNode($setup["MessageCircle"], { size: 16 }), createVNode("span", null, toDisplayString($setup.formatNumber($props.post.comment_count)), 1)])) : createCommentVNode("", true)
				]),
				createVNode("div", { class: "card-footer" }, [createVNode("span", { class: "publish-date" }, toDisplayString($setup.formatDate($props.post.published_at || $props.post.scraped_at)), 1), createVNode("button", {
					class: "favorite-button",
					onClick: withModifiers($setup.toggleFavorite, ["stop"]),
					"aria-label": $setup.isFavorited ? $setup.t("post.unfavorite") : $setup.t("post.addToFavorites")
				}, [createVNode($setup["Heart"], {
					size: 18,
					fill: $setup.isFavorited ? "currentColor" : "none"
				}, null, 8, ["fill"])], 8, ["aria-label"])])
			])], 8, [
				"href",
				"data-post-id",
				"onClick"
			])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup$2 = PostCard_vue_vue_type_script_setup_true_lang_default.setup;
PostCard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/features/PostCard.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var PostCard_default = /* @__PURE__ */ __plugin_vue_export_helper_default(PostCard_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$2],
	["__scopeId", "data-v-4b1a2edf"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/features/PostCard.vue"]
]);
var Pagination_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "Pagination",
	props: {
		currentPage: {
			type: Number,
			required: true
		},
		totalPages: {
			type: Number,
			required: true
		},
		maxVisible: {
			type: Number,
			required: false,
			default: 5
		}
	},
	emits: ["change"],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const visiblePages = computed(() => {
			const pages = [];
			const { currentPage, totalPages, maxVisible } = props;
			if (totalPages <= maxVisible) for (let i = 1; i <= totalPages; i++) pages.push(i);
			else {
				const half = Math.floor(maxVisible / 2);
				let start = Math.max(1, currentPage - half);
				const end = Math.min(totalPages, start + maxVisible - 1);
				if (end === totalPages) start = Math.max(1, end - maxVisible + 1);
				if (start > 1) {
					pages.push(1);
					if (start > 2) pages.push("...");
				}
				for (let i = start; i <= end; i++) pages.push(i);
				if (end < totalPages) {
					if (end < totalPages - 1) pages.push("...");
					pages.push(totalPages);
				}
			}
			return pages;
		});
		const goToPage = (page) => {
			if (page >= 1 && page <= props.totalPages && page !== props.currentPage) emit("change", page);
		};
		const __returned__ = {
			props,
			emit,
			visiblePages,
			goToPage,
			get ChevronLeft() {
				return ChevronLeft;
			},
			get ChevronRight() {
				return ChevronRight;
			},
			get ChevronsLeft() {
				return ChevronsLeft;
			},
			get ChevronsRight() {
				return ChevronsRight;
			}
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "pagination" }, _attrs))} data-v-2b38f6f5><button class="pagination-button"${ssrIncludeBooleanAttr($props.currentPage === 1) ? " disabled" : ""} data-v-2b38f6f5>`);
	_push(ssrRenderComponent($setup["ChevronsLeft"], { size: 18 }, null, _parent));
	_push(`</button><button class="pagination-button"${ssrIncludeBooleanAttr($props.currentPage === 1) ? " disabled" : ""} data-v-2b38f6f5>`);
	_push(ssrRenderComponent($setup["ChevronLeft"], { size: 18 }, null, _parent));
	_push(`</button><div class="pagination-pages" data-v-2b38f6f5><!--[-->`);
	ssrRenderList($setup.visiblePages, (page) => {
		_push(`<button class="${ssrRenderClass([{
			active: page === $props.currentPage,
			ellipsis: page === "..."
		}, "pagination-page"])}"${ssrIncludeBooleanAttr(page === "...") ? " disabled" : ""} data-v-2b38f6f5>${ssrInterpolate(page)}</button>`);
	});
	_push(`<!--]--></div><button class="pagination-button"${ssrIncludeBooleanAttr($props.currentPage === $props.totalPages) ? " disabled" : ""} data-v-2b38f6f5>`);
	_push(ssrRenderComponent($setup["ChevronRight"], { size: 18 }, null, _parent));
	_push(`</button><button class="pagination-button"${ssrIncludeBooleanAttr($props.currentPage === $props.totalPages) ? " disabled" : ""} data-v-2b38f6f5>`);
	_push(ssrRenderComponent($setup["ChevronsRight"], { size: 18 }, null, _parent));
	_push(`</button><span class="pagination-info" data-v-2b38f6f5>${ssrInterpolate(_ctx.$t("common.page"))} ${ssrInterpolate($props.currentPage)} ${ssrInterpolate(_ctx.$t("common.of"))} ${ssrInterpolate($props.totalPages)}</span></div>`);
}
var _sfc_setup$1 = Pagination_vue_vue_type_script_setup_true_lang_default.setup;
Pagination_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/features/Pagination.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var Pagination_default = /* @__PURE__ */ __plugin_vue_export_helper_default(Pagination_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-2b38f6f5"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/features/Pagination.vue"]
]);
const usePostsStore = defineStore("posts", () => {
	const posts = ref([]);
	const currentPost = ref(null);
	const loading = ref(false);
	const error = ref(null);
	const pagination = ref({
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 0
	});
	const filters = ref({
		page: 1,
		page_size: 20,
		sort_by: "scraped_at",
		sort_order: "desc"
	});
	async function fetchPosts(params) {
		const { append,...apiParams } = params || {};
		if (!append) loading.value = true;
		error.value = null;
		try {
			const response = await api.get("/posts", { params: {
				...filters.value,
				...apiParams
			} });
			if (append) posts.value = [...posts.value, ...response.items];
			else posts.value = response.items;
			pagination.value = {
				page: response.page,
				page_size: response.page_size,
				total: response.total,
				total_pages: response.total_pages
			};
			return response;
		} catch (err) {
			error.value = err.message;
			throw err;
		} finally {
			loading.value = false;
		}
	}
	async function fetchPost(postId) {
		loading.value = true;
		error.value = null;
		try {
			const response = await api.get(`/posts/${postId}`);
			currentPost.value = response;
			return response;
		} catch (err) {
			error.value = err.message;
			throw err;
		} finally {
			loading.value = false;
		}
	}
	async function fetchPostsByPlatform(platform, params) {
		return fetchPosts({
			...params,
			platform
		});
	}
	async function searchPosts(query, params) {
		return fetchPosts({
			...params,
			q: query
		});
	}
	function updateFilters(newFilters) {
		filters.value = {
			...filters.value,
			...newFilters
		};
	}
	function resetFilters() {
		filters.value = {
			page: 1,
			page_size: 20,
			sort_by: "scraped_at",
			sort_order: "desc",
			platform: void 0,
			q: void 0,
			has_media: void 0
		};
	}
	async function nextPage() {
		if (pagination.value.page < pagination.value.total_pages) {
			filters.value.page = pagination.value.page + 1;
			await fetchPosts();
		}
	}
	async function prevPage() {
		if (pagination.value.page > 1) {
			filters.value.page = pagination.value.page - 1;
			await fetchPosts();
		}
	}
	async function goToPage(page) {
		if (page >= 1 && page <= pagination.value.total_pages) {
			filters.value.page = page;
			await fetchPosts();
		}
	}
	function clearStore() {
		posts.value = [];
		currentPost.value = null;
		loading.value = false;
		error.value = null;
		pagination.value = {
			page: 1,
			page_size: 20,
			total: 0,
			total_pages: 0
		};
		resetFilters();
	}
	return {
		posts,
		currentPost,
		loading,
		error,
		pagination,
		filters,
		fetchPosts,
		fetchPost,
		fetchPostsByPlatform,
		searchPosts,
		updateFilters,
		resetFilters,
		nextPage,
		prevPage,
		goToPage,
		clearStore
	};
}, { persist: { storage: sessionStorage } });
var ExplorePage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	name: "ExplorePage",
	setup(__props, { expose: __expose }) {
		__expose();
		const route = useRoute();
		const router = useRouter();
		const postsStore = usePostsStore();
		const { posts, loading, filters, pagination } = storeToRefs(postsStore);
		const postsGrid = ref(null);
		const loadedPostsCount = ref(0);
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
		onMounted(async () => {
			postsStore.resetFilters();
			const query = route.query;
			if (query.q) filters.value.q = query.q;
			if (query.platform) filters.value.platform = query.platform;
			await loadPosts();
			await nextTick();
			loadedPostsCount.value = posts.value.length;
			await updateLayout();
		});
		onUnmounted(() => {});
		onActivated(async () => {
			if (postsGrid.value && posts.value.length > 0) {
				await nextTick();
				await updateLayout();
				console.log("[ExplorePage] 页面激活，重新计算布局");
			}
		});
		watch(() => route.query, () => {
			if (route.query.q) filters.value.q = route.query.q;
			loadPosts();
		});
		const loadPosts = async () => {
			const previousCount = loadedPostsCount.value;
			await postsStore.fetchPosts();
			await nextTick();
			if (postsGrid.value) {
				const allCards = postsGrid.value.querySelectorAll("a.post-card");
				for (let i = previousCount; i < allCards.length; i++) allCards[i].classList.add("card-entering");
				loadedPostsCount.value = allCards.length;
			}
			await smoothUpdateLayout();
			setTimeout(() => {
				if (postsGrid.value) postsGrid.value.querySelectorAll("a.post-card.card-entering").forEach((card) => {
					card.classList.remove("card-entering");
				});
			}, 600);
		};
		const handleFilterUpdate = async (newFilters) => {
			postsStore.updateFilters(newFilters);
			loadedPostsCount.value = 0;
			await loadPosts();
			const query = {};
			if (newFilters.q) query.q = newFilters.q;
			if (newFilters.platform) query.platform = newFilters.platform;
			router.push({ query });
		};
		const handlePageChange = async (page) => {
			postsStore.updateFilters({ page });
			loadedPostsCount.value = 0;
			await loadPosts();
			window.scrollTo({
				top: 0,
				behavior: "smooth"
			});
		};
		const resetFilters = () => {
			postsStore.resetFilters();
			loadedPostsCount.value = 0;
			router.push({ query: {} });
			loadPosts();
		};
		const __returned__ = {
			route,
			router,
			postsStore,
			posts,
			loading,
			filters,
			pagination,
			postsGrid,
			loadedPostsCount,
			updateLayout,
			smoothUpdateLayout,
			loadPosts,
			handleFilterUpdate,
			handlePageChange,
			resetFilters,
			get SearchX() {
				return SearchX;
			},
			get RotateCcw() {
				return RotateCcw;
			},
			MainLayout: MainLayout_default,
			FilterBar: FilterBar_default,
			PostCard: PostCard_default,
			Pagination: Pagination_default,
			LoadingSpinner: LoadingSpinner_default,
			GlassButton: GlassButton_default
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(ssrRenderComponent($setup["MainLayout"], _attrs, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<div class="explore-page" data-v-ab53ea9e${_scopeId}><h1 class="page-title" data-v-ab53ea9e${_scopeId}>${ssrInterpolate(_ctx.$t("nav.explore"))}</h1>`);
				_push$1(ssrRenderComponent($setup["FilterBar"], {
					filters: $setup.filters,
					onUpdate: $setup.handleFilterUpdate
				}, null, _parent$1, _scopeId));
				if ($setup.loading) _push$1(ssrRenderComponent($setup["LoadingSpinner"], {
					size: "lg",
					text: _ctx.$t("common.loading")
				}, null, _parent$1, _scopeId));
				else if ($setup.posts.length > 0) {
					_push$1(`<div data-v-ab53ea9e${_scopeId}><div class="posts-grid" data-v-ab53ea9e${_scopeId}><!--[-->`);
					ssrRenderList($setup.posts, (post, index) => {
						_push$1(ssrRenderComponent($setup["PostCard"], {
							key: post.id,
							post,
							index
						}, null, _parent$1, _scopeId));
					});
					_push$1(`<!--]--></div>`);
					_push$1(ssrRenderComponent($setup["Pagination"], {
						"current-page": $setup.pagination.page,
						"total-pages": $setup.pagination.total_pages,
						onChange: $setup.handlePageChange
					}, null, _parent$1, _scopeId));
					_push$1(`</div>`);
				} else {
					_push$1(`<div class="empty-state glass-card" data-v-ab53ea9e${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["SearchX"], { size: 64 }, null, _parent$1, _scopeId));
					_push$1(`<h3 data-v-ab53ea9e${_scopeId}>${ssrInterpolate(_ctx.$t("search.noResults"))}</h3><p data-v-ab53ea9e${_scopeId}>${ssrInterpolate(_ctx.$t("search.tryDifferent"))}</p>`);
					_push$1(ssrRenderComponent($setup["GlassButton"], { onClick: $setup.resetFilters }, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) {
								_push$2(ssrRenderComponent($setup["RotateCcw"], { size: 18 }, null, _parent$2, _scopeId$1));
								_push$2(` ${ssrInterpolate(_ctx.$t("common.reset"))}`);
							} else return [createVNode($setup["RotateCcw"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.reset")), 1)];
						}),
						_: 1
					}, _parent$1, _scopeId));
					_push$1(`</div>`);
				}
				_push$1(`</div>`);
			} else return [createVNode("div", { class: "explore-page" }, [
				createVNode("h1", { class: "page-title" }, toDisplayString(_ctx.$t("nav.explore")), 1),
				createVNode($setup["FilterBar"], {
					filters: $setup.filters,
					onUpdate: $setup.handleFilterUpdate
				}, null, 8, ["filters"]),
				$setup.loading ? (openBlock(), createBlock($setup["LoadingSpinner"], {
					key: 0,
					size: "lg",
					text: _ctx.$t("common.loading")
				}, null, 8, ["text"])) : $setup.posts.length > 0 ? (openBlock(), createBlock("div", { key: 1 }, [createVNode("div", {
					ref: "postsGrid",
					class: "posts-grid"
				}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.posts, (post, index) => {
					return openBlock(), createBlock($setup["PostCard"], {
						key: post.id,
						post,
						index
					}, null, 8, ["post", "index"]);
				}), 128))], 512), createVNode($setup["Pagination"], {
					"current-page": $setup.pagination.page,
					"total-pages": $setup.pagination.total_pages,
					onChange: $setup.handlePageChange
				}, null, 8, ["current-page", "total-pages"])])) : (openBlock(), createBlock("div", {
					key: 2,
					class: "empty-state glass-card"
				}, [
					createVNode($setup["SearchX"], { size: 64 }),
					createVNode("h3", null, toDisplayString(_ctx.$t("search.noResults")), 1),
					createVNode("p", null, toDisplayString(_ctx.$t("search.tryDifferent")), 1),
					createVNode($setup["GlassButton"], { onClick: $setup.resetFilters }, {
						default: withCtx(() => [createVNode($setup["RotateCcw"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.reset")), 1)]),
						_: 1
					})
				]))
			])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = ExplorePage_vue_vue_type_script_setup_true_lang_default.setup;
ExplorePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/ExplorePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ExplorePage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(ExplorePage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-ab53ea9e"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/ExplorePage.vue"]
]);
export { formatRelativeTime as a, formatNumber as i, usePostsStore as n, PostCard_default as r, ExplorePage_default as t };
