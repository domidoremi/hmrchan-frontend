import { c as logger_default, n as favoritesApi, o as useAuthStore, s as api } from "./api-services-BmQ9TwGt.js";
import { a as LoadingSpinner_default, i as PLATFORM_NAMES, l as __plugin_vue_export_helper_default, o as MainLayout_default, r as PLATFORM_COLORS, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { n as useMediaPreload, o as toast_default } from "./composables-CdbJX3Qi.js";
import { n as usePostsStore } from "./view-explorepage-DthVi5zR.js";
import { Fragment, Transition, computed, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, mergeProps, nextTick, onMounted, onUnmounted, openBlock, ref, renderList, resolveComponent, toDisplayString, useSSRContext, vShow, watch, withCtx, withDirectives, withModifiers } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrIncludeBooleanAttr, ssrInterpolate, ssrRenderAttr, ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderList, ssrRenderStyle } from "vue/server-renderer";
import { AlertCircle, ArrowLeft, Calendar, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, Heart, Maximize, Maximize2, MessageCircle, Repeat2, User, X, ZoomIn, ZoomOut } from "lucide-vue-next";
import dayjs from "dayjs";
import Plyr from "plyr";
var STORAGE_KEY = "viewed_posts";
var MAX_STORED_POSTS = 1e3;
function getViewedPosts() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return /* @__PURE__ */ new Map();
		const data = JSON.parse(stored);
		return new Map(data.map((item) => [item.id, item.timestamp]));
	} catch (error) {
		console.error("Failed to load viewed posts:", error);
		return /* @__PURE__ */ new Map();
	}
}
function saveViewedPosts(viewedPosts) {
	try {
		if (viewedPosts.size > MAX_STORED_POSTS) {
			const sorted = Array.from(viewedPosts.entries()).sort((a, b) => b[1] - a[1]).slice(0, MAX_STORED_POSTS);
			viewedPosts = new Map(sorted);
		}
		const data = Array.from(viewedPosts.entries()).map(([id, timestamp]) => ({
			id,
			timestamp
		}));
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch (error) {
		console.error("Failed to save viewed posts:", error);
	}
}
function hasViewedPost(postId) {
	return getViewedPosts().has(postId);
}
function markPostAsViewed(postId) {
	const viewedPosts = getViewedPosts();
	viewedPosts.set(postId, Date.now());
	saveViewedPosts(viewedPosts);
}
var MediaViewerPlyr_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MediaViewerPlyr",
	props: {
		show: {
			type: Boolean,
			required: true
		},
		mediaItems: {
			type: Array,
			required: true
		},
		initialIndex: {
			type: Number,
			required: false,
			default: 0
		}
	},
	emits: ["close"],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const { t } = useI18n();
		const currentIndex = ref(props.initialIndex);
		const loading = ref(true);
		const zoom = ref(1);
		const videoElement = ref(null);
		let player = null;
		const controlsVisible = ref(true);
		let hideControlsTimer = null;
		const currentMedia = computed(() => props.mediaItems[currentIndex.value] || {
			url: "",
			type: "image",
			subtitle: void 0
		});
		const imageStyle = computed(() => ({
			transform: `scale(${zoom.value})`,
			transition: "transform 0.3s ease"
		}));
		watch(() => props.show, (newVal) => {
			if (newVal) {
				currentIndex.value = props.initialIndex;
				zoom.value = 1;
				loading.value = currentMedia.value.type === "video" ? false : true;
				document.body.style.overflow = "hidden";
				controlsVisible.value = true;
				resetHideControlsTimer();
				if (currentMedia.value.type === "video") nextTick(() => {
					initPlyr();
				});
			} else {
				document.body.style.overflow = "";
				destroyPlyr();
				if (hideControlsTimer) clearTimeout(hideControlsTimer);
			}
		});
		watch(currentIndex, () => {
			loading.value = true;
			zoom.value = 1;
			controlsVisible.value = true;
			resetHideControlsTimer();
			destroyPlyr();
			if (currentMedia.value.type === "video") nextTick(() => {
				initPlyr();
			});
		});
		const initPlyr = () => {
			if (videoElement.value && !player) {
				const subtitleInfo = currentMedia.value.subtitles ? currentMedia.value.subtitles.map((s) => `${s.label} (${s.language})`).join(", ") : currentMedia.value.subtitle ? "单语言模式" : "无字幕";
				console.log("[Plyr] 初始化视频:", {
					url: currentMedia.value.url,
					hasSubtitle: !!(currentMedia.value.subtitle || currentMedia.value.subtitles),
					subtitleUrl: currentMedia.value.subtitle,
					availableSubtitles: subtitleInfo,
					subtitleCount: currentMedia.value.subtitles?.length || (currentMedia.value.subtitle ? 1 : 0)
				});
				player = new Plyr(videoElement.value, {
					controls: [
						"play-large",
						"play",
						"progress",
						"current-time",
						"mute",
						"volume",
						"captions",
						"settings",
						"pip",
						"airplay",
						"fullscreen"
					],
					settings: [
						"captions",
						"quality",
						"speed"
					],
					speed: {
						selected: 1,
						options: [
							.25,
							.5,
							.75,
							1,
							1.25,
							1.5,
							1.75,
							2
						]
					},
					captions: {
						active: true,
						language: "auto",
						update: true
					},
					ratio: "16:9",
					fullscreen: {
						enabled: true,
						fallback: true,
						iosNative: true
					},
					debug: false,
					i18n: {
						restart: "重新播放",
						rewind: "快退 {seektime}s",
						play: "播放",
						pause: "暂停",
						fastForward: "快进 {seektime}s",
						seek: "跳转",
						seekLabel: "{currentTime} / {duration}",
						played: "已播放",
						buffered: "已缓冲",
						currentTime: "当前时间",
						duration: "总时长",
						volume: "音量",
						mute: "静音",
						unmute: "取消静音",
						enableCaptions: "开启字幕",
						disableCaptions: "关闭字幕",
						download: "下载",
						enterFullscreen: "全屏",
						exitFullscreen: "退出全屏",
						frameTitle: "视频播放器: {title}",
						captions: "字幕",
						settings: "设置",
						pip: "画中画",
						menuBack: "返回上级菜单",
						speed: "倍速",
						normal: "正常",
						quality: "质量",
						loop: "循环",
						start: "开始",
						end: "结束",
						all: "全部",
						reset: "重置",
						disabled: "禁用",
						enabled: "启用"
					}
				});
				player.on("ready", () => {
					console.log("[Plyr] 播放器就绪");
					loading.value = false;
					if (player) {
						const tracks = (player.elements?.container?.querySelector("video"))?.textTracks;
						if (tracks && tracks.length > 0) {
							console.log(`[Plyr] 字幕轨道数量: ${tracks.length}`);
							for (let i = 0; i < tracks.length; i++) {
								const track = tracks[i];
								if (track) console.log(`[Plyr] 字幕 ${i}:`, {
									kind: track.kind,
									label: track.label,
									language: track.language,
									mode: track.mode
								});
							}
						} else console.log("[Plyr] 无字幕轨道");
					}
				});
				player.on("captionsenabled", () => {
					console.log("[Plyr] 字幕已开启");
				});
				player.on("captionsdisabled", () => {
					console.log("[Plyr] 字幕已关闭");
				});
			}
		};
		const destroyPlyr = () => {
			if (player) {
				player.destroy();
				player = null;
			}
		};
		const onMouseMove = () => {
			controlsVisible.value = true;
			resetHideControlsTimer();
		};
		const resetHideControlsTimer = () => {
			if (hideControlsTimer) clearTimeout(hideControlsTimer);
			hideControlsTimer = setTimeout(() => {
				controlsVisible.value = false;
			}, 3e3);
		};
		const close = () => {
			emit("close");
		};
		const prev = () => {
			if (currentIndex.value > 0) currentIndex.value--;
		};
		const next = () => {
			if (currentIndex.value < props.mediaItems.length - 1) currentIndex.value++;
		};
		const zoomIn = () => {
			zoom.value = Math.min(zoom.value + .25, 3);
		};
		const zoomOut = () => {
			zoom.value = Math.max(zoom.value - .25, .5);
		};
		const resetZoom = () => {
			zoom.value = 1;
		};
		const toggleFullscreen = () => {
			if (!document.fullscreenElement) document.documentElement.requestFullscreen();
			else document.exitFullscreen();
		};
		const downloadMedia = () => {
			const link = document.createElement("a");
			link.href = currentMedia.value.url;
			link.download = `media-${currentIndex.value + 1}`;
			link.click();
		};
		const onMediaLoad = () => {
			loading.value = false;
		};
		const handleKeydown = (e) => {
			if (!props.show) return;
			switch (e.key) {
				case "Escape":
					close();
					break;
				case "ArrowLeft":
					prev();
					break;
				case "ArrowRight":
					next();
					break;
				case "+":
				case "=":
					if (currentMedia.value.type === "image") zoomIn();
					break;
				case "-":
					if (currentMedia.value.type === "image") zoomOut();
					break;
				case "f":
				case "F":
					toggleFullscreen();
					break;
			}
		};
		if (typeof window !== "undefined") window.addEventListener("keydown", handleKeydown);
		onUnmounted(() => {
			if (typeof window !== "undefined") window.removeEventListener("keydown", handleKeydown);
			document.body.style.overflow = "";
			destroyPlyr();
		});
		const __returned__ = {
			props,
			emit,
			t,
			currentIndex,
			loading,
			zoom,
			videoElement,
			get player() {
				return player;
			},
			set player(v) {
				player = v;
			},
			controlsVisible,
			get hideControlsTimer() {
				return hideControlsTimer;
			},
			set hideControlsTimer(v) {
				hideControlsTimer = v;
			},
			currentMedia,
			imageStyle,
			initPlyr,
			destroyPlyr,
			onMouseMove,
			resetHideControlsTimer,
			close,
			prev,
			next,
			zoomIn,
			zoomOut,
			resetZoom,
			toggleFullscreen,
			downloadMedia,
			onMediaLoad,
			handleKeydown,
			get X() {
				return X;
			},
			get ChevronLeft() {
				return ChevronLeft;
			},
			get ChevronRight() {
				return ChevronRight;
			},
			get ZoomIn() {
				return ZoomIn;
			},
			get ZoomOut() {
				return ZoomOut;
			},
			get Maximize2() {
				return Maximize2;
			},
			get Maximize() {
				return Maximize;
			},
			get Download() {
				return Download;
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
	if ($props.show) {
		_push(`<div${ssrRenderAttrs(mergeProps({ class: "media-viewer-overlay" }, _attrs))} data-v-086d4ba0><div class="media-viewer" data-v-086d4ba0><div class="${ssrRenderClass([{ "controls-hidden": !$setup.controlsVisible }, "viewer-toolbar"])}" data-v-086d4ba0><button class="viewer-btn toolbar-btn"${ssrRenderAttr("title", _ctx.$t("common.fullscreen"))} data-v-086d4ba0>`);
		_push(ssrRenderComponent($setup["Maximize"], { size: 20 }, null, _parent));
		_push(`</button><button class="viewer-btn toolbar-btn"${ssrRenderAttr("title", _ctx.$t("common.download"))} data-v-086d4ba0>`);
		_push(ssrRenderComponent($setup["Download"], { size: 20 }, null, _parent));
		_push(`</button><button class="viewer-btn toolbar-btn close-btn"${ssrRenderAttr("aria-label", _ctx.$t("aria.closeViewer"))} data-v-086d4ba0>`);
		_push(ssrRenderComponent($setup["X"], { size: 24 }, null, _parent));
		_push(`</button></div>`);
		if ($props.mediaItems.length > 1) {
			_push(`<button class="${ssrRenderClass([{ "controls-hidden": !$setup.controlsVisible }, "viewer-btn prev-btn"])}"${ssrIncludeBooleanAttr($setup.currentIndex === 0) ? " disabled" : ""}${ssrRenderAttr("aria-label", _ctx.$t("aria.previousImage"))} data-v-086d4ba0>`);
			_push(ssrRenderComponent($setup["ChevronLeft"], { size: 32 }, null, _parent));
			_push(`</button>`);
		} else _push(`<!---->`);
		_push(`<div class="media-container" data-v-086d4ba0>`);
		if ($setup.currentMedia.type === "image") _push(`<img${ssrRenderAttr("src", $setup.currentMedia.url)}${ssrRenderAttr("alt", `${_ctx.$t("post.image")} ${$setup.currentIndex + 1}`)} style="${ssrRenderStyle($setup.imageStyle)}" class="media-content-img" data-v-086d4ba0>`);
		else if ($setup.currentMedia.type === "video") {
			_push(`<div class="video-wrapper" data-v-086d4ba0><video class="plyr-video" playsinline controls data-v-086d4ba0><source${ssrRenderAttr("src", $setup.currentMedia.url)} type="video/mp4" data-v-086d4ba0>`);
			if ($setup.currentMedia.subtitles && $setup.currentMedia.subtitles.length > 0) {
				_push(`<!--[-->`);
				ssrRenderList($setup.currentMedia.subtitles, (sub, index) => {
					_push(`<track kind="captions"${ssrRenderAttr("label", sub.label)}${ssrRenderAttr("srclang", sub.language)}${ssrRenderAttr("src", `/api/media/${$setup.currentMedia.mediaId}/subtitle?language=${sub.language}`)}${ssrIncludeBooleanAttr(index === 0) ? " default" : ""} data-v-086d4ba0>`);
				});
				_push(`<!--]-->`);
			} else if ($setup.currentMedia.subtitle) _push(`<track kind="captions" label="中文" srclang="zh"${ssrRenderAttr("src", $setup.currentMedia.subtitle)} default data-v-086d4ba0>`);
			else _push(`<!---->`);
			_push(`</video></div>`);
		} else _push(`<!---->`);
		if ($setup.loading) _push(`<div class="loading-spinner" role="status"${ssrRenderAttr("aria-label", _ctx.$t("aria.loading"))} data-v-086d4ba0><div class="spinner" data-v-086d4ba0></div><p data-v-086d4ba0>${ssrInterpolate(_ctx.$t("post.loadingMedia"))}</p></div>`);
		else _push(`<!---->`);
		_push(`</div>`);
		if ($props.mediaItems.length > 1) {
			_push(`<button class="${ssrRenderClass([{ "controls-hidden": !$setup.controlsVisible }, "viewer-btn next-btn"])}"${ssrIncludeBooleanAttr($setup.currentIndex === $props.mediaItems.length - 1) ? " disabled" : ""}${ssrRenderAttr("aria-label", _ctx.$t("aria.nextImage"))} data-v-086d4ba0>`);
			_push(ssrRenderComponent($setup["ChevronRight"], { size: 32 }, null, _parent));
			_push(`</button>`);
		} else _push(`<!---->`);
		_push(`<div class="${ssrRenderClass([{ "controls-hidden": !$setup.controlsVisible }, "media-info"])}" data-v-086d4ba0><span data-v-086d4ba0>${ssrInterpolate($setup.currentIndex + 1)} / ${ssrInterpolate($props.mediaItems.length)} <span class="media-type-badge" data-v-086d4ba0>${ssrInterpolate($setup.currentMedia.type === "video" ? _ctx.$t("post.video") : _ctx.$t("post.image"))}</span></span>`);
		if ($setup.currentMedia.type === "image") {
			_push(`<div class="zoom-controls" data-v-086d4ba0><button class="zoom-btn"${ssrRenderAttr("title", _ctx.$t("common.zoomOut"))} data-v-086d4ba0>`);
			_push(ssrRenderComponent($setup["ZoomOut"], { size: 20 }, null, _parent));
			_push(`</button><span data-v-086d4ba0>${ssrInterpolate(Math.round($setup.zoom * 100))}%</span><button class="zoom-btn"${ssrRenderAttr("title", _ctx.$t("common.zoomIn"))} data-v-086d4ba0>`);
			_push(ssrRenderComponent($setup["ZoomIn"], { size: 20 }, null, _parent));
			_push(`</button><button class="zoom-btn"${ssrRenderAttr("title", _ctx.$t("common.reset"))} data-v-086d4ba0>`);
			_push(ssrRenderComponent($setup["Maximize2"], { size: 20 }, null, _parent));
			_push(`</button></div>`);
		} else _push(`<!---->`);
		_push(`</div></div></div>`);
	} else _push(`<!---->`);
}
var _sfc_setup$1 = MediaViewerPlyr_vue_vue_type_script_setup_true_lang_default.setup;
MediaViewerPlyr_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/MediaViewerPlyr.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var MediaViewerPlyr_default = /* @__PURE__ */ __plugin_vue_export_helper_default(MediaViewerPlyr_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-086d4ba0"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/MediaViewerPlyr.vue"]
]);
var PostDetailPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PostDetailPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const route = useRoute();
		const router = useRouter();
		const { t } = useI18n();
		const postsStore = usePostsStore();
		const authStore = useAuthStore();
		const post = ref(null);
		const loading = ref(true);
		const isFavorited = ref(false);
		const favoriteId = ref(null);
		const favoriteLoading = ref(false);
		const showMediaViewer = ref(false);
		const viewerMediaItems = ref([]);
		const viewerInitialIndex = ref(0);
		const currentThumbnailIndex = ref(0);
		const platformName = computed(() => PLATFORM_NAMES[post.value?.platform] || post.value?.platform);
		const platformColor = computed(() => PLATFORM_COLORS[post.value?.platform] || "#666");
		const isRetweet = computed(() => {
			return !!post.value?.original_author_id && !!post.value?.original_author_name;
		});
		const showDescription = computed(() => {
			if (!post.value?.description) return false;
			const title = (post.value.title || "").trim().toLowerCase();
			const description = post.value.description.trim().toLowerCase();
			if (!description || description === title) return false;
			if (Math.abs(description.length - title.length) < 10 && description.includes(title)) return false;
			return true;
		});
		const allMediaItems = computed(() => {
			if (!post.value) return [];
			const items = [];
			const hasThumbnail = !!post.value.thumbnail_url;
			if (hasThumbnail) items.push({
				url: post.value.thumbnail_url,
				type: "image"
			});
			if (post.value.media_files && post.value.media_files.length > 0) post.value.media_files.forEach((media, index) => {
				if (media.file_type === "image" || media.file_type === "video") {
					const mediaUrl = `/api/media/${media.id}/stream`;
					if (hasThumbnail && index === 0 && media.file_type === "image") return;
					const item = {
						url: mediaUrl,
						type: media.file_type,
						mediaId: media.id
					};
					if (media.file_type === "video") {
						if (media.subtitles && Array.isArray(media.subtitles) && media.subtitles.length > 0) {
							item.subtitles = media.subtitles;
							item.subtitle = `/api/media/${media.id}/subtitle`;
						} else if (media.has_subtitle) item.subtitle = `/api/media/${media.id}/subtitle`;
					}
					items.push(item);
				}
			});
			return items;
		});
		const allImages = computed(() => {
			return allMediaItems.value.filter((item) => item.type === "image").map((item) => item.url);
		});
		const allMediaUrls = computed(() => {
			return allMediaItems.value.map((item) => item.url);
		});
		const currentThumbnailUrl = computed(() => {
			if (allMediaUrls.value.length === 0) return "";
			return allMediaUrls.value[currentThumbnailIndex.value];
		});
		const primaryMediaType = computed(() => {
			if (!post.value?.media_files || post.value.media_files.length === 0) return "image";
			return post.value.media_files[0]?.file_type === "video" ? "video" : "image";
		});
		const isVideoPost = computed(() => primaryMediaType.value === "video");
		const isYouTube = computed(() => post.value?.platform === "youtube");
		const isTikTok = computed(() => post.value?.platform === "tiktok");
		const isInstagramOrTwitter = computed(() => post.value?.platform === "instagram" || post.value?.platform === "twitter");
		onMounted(async () => {
			const postId = parseInt(route.params.id, 10);
			try {
				post.value = await postsStore.fetchPost(postId);
				if (post.value && !hasViewedPost(postId)) try {
					await api.post(`/posts/${postId}/increment-view`);
					markPostAsViewed(postId);
					logger_default.log("📊 Post view counted:", postId);
				} catch (error) {
					logger_default.warn("Failed to increment view count:", error);
				}
				if (authStore.isAuthenticated && post.value) try {
					const result = await favoritesApi.checkFavorite(post.value.id);
					isFavorited.value = result.is_favorited;
					favoriteId.value = result.favorite_id;
				} catch (error) {}
			} catch (error) {
				logger_default.error("Failed to fetch post:", error);
			} finally {
				loading.value = false;
			}
		});
		const goBack = () => {
			router.back();
		};
		const toggleFavorite = async () => {
			if (!authStore.isAuthenticated) {
				toast_default.warning(t("favorite.loginRequired"));
				router.push("/login");
				return;
			}
			if (!post.value || favoriteLoading.value) return;
			favoriteLoading.value = true;
			try {
				if (isFavorited.value && favoriteId.value) {
					await favoritesApi.deleteFavorite(favoriteId.value);
					isFavorited.value = false;
					favoriteId.value = null;
					toast_default.success(t("favorite.removeSuccess"));
				} else {
					const favorite = await favoritesApi.addFavorite({ post_id: post.value.id });
					isFavorited.value = true;
					favoriteId.value = favorite.id;
					toast_default.success(t("favorite.addSuccess"));
				}
			} catch (error) {
				console.error("Failed to toggle favorite:", error);
				toast_default.error(error.response?.data?.message || t("common.operationFailed"));
			} finally {
				favoriteLoading.value = false;
			}
		};
		const formatDate = (dateStr) => {
			return dayjs(dateStr).format("YYYY-MM-DD HH:mm");
		};
		const formatNumber = (num) => {
			if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
			if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
			return num.toString();
		};
		const openMediaViewer = (mediaIndex) => {
			if (!post.value) return;
			viewerMediaItems.value = allMediaItems.value;
			viewerInitialIndex.value = mediaIndex;
			showMediaViewer.value = true;
		};
		const getMediaIndex = (mediaFileIndex) => {
			return (post.value?.thumbnail_url ? 1 : 0) + mediaFileIndex;
		};
		const closeMediaViewer = () => {
			showMediaViewer.value = false;
		};
		useMediaPreload(allMediaItems, currentThumbnailIndex, {
			lookahead: 2,
			enabled: true
		});
		const prevThumbnail = () => {
			if (currentThumbnailIndex.value > 0) currentThumbnailIndex.value--;
		};
		const nextThumbnail = () => {
			if (currentThumbnailIndex.value < allMediaUrls.value.length - 1) currentThumbnailIndex.value++;
		};
		const __returned__ = {
			route,
			router,
			t,
			postsStore,
			authStore,
			post,
			loading,
			isFavorited,
			favoriteId,
			favoriteLoading,
			showMediaViewer,
			viewerMediaItems,
			viewerInitialIndex,
			currentThumbnailIndex,
			platformName,
			platformColor,
			isRetweet,
			showDescription,
			allMediaItems,
			allImages,
			allMediaUrls,
			currentThumbnailUrl,
			primaryMediaType,
			isVideoPost,
			isYouTube,
			isTikTok,
			isInstagramOrTwitter,
			goBack,
			toggleFavorite,
			formatDate,
			formatNumber,
			openMediaViewer,
			getMediaIndex,
			closeMediaViewer,
			prevThumbnail,
			nextThumbnail,
			get ArrowLeft() {
				return ArrowLeft;
			},
			get Calendar() {
				return Calendar;
			},
			get User() {
				return User;
			},
			get Eye() {
				return Eye;
			},
			get Heart() {
				return Heart;
			},
			get MessageCircle() {
				return MessageCircle;
			},
			get ExternalLink() {
				return ExternalLink;
			},
			get AlertCircle() {
				return AlertCircle;
			},
			get Maximize2() {
				return Maximize2;
			},
			get ChevronLeft() {
				return ChevronLeft;
			},
			get ChevronRight() {
				return ChevronRight;
			},
			get Repeat2() {
				return Repeat2;
			},
			MainLayout: MainLayout_default,
			LoadingSpinner: LoadingSpinner_default,
			GlassButton: GlassButton_default,
			MediaViewer: MediaViewerPlyr_default
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
				_push$1(`<div class="post-detail-page" data-v-384c9682${_scopeId}>`);
				if ($setup.loading) _push$1(ssrRenderComponent($setup["LoadingSpinner"], {
					size: "lg",
					text: _ctx.$t("common.loading")
				}, null, _parent$1, _scopeId));
				else if ($setup.post) {
					_push$1(`<div class="post-detail" data-v-384c9682${_scopeId}><button class="back-button glass-button" data-v-384c9682${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["ArrowLeft"], { size: 20 }, null, _parent$1, _scopeId));
					_push$1(` ${ssrInterpolate(_ctx.$t("common.back"))}</button><div class="${ssrRenderClass([{
						"video-layout": $setup.isVideoPost,
						"youtube-layout": $setup.isYouTube,
						"tiktok-layout": $setup.isTikTok
					}, "post-header glass-card"])}" data-v-384c9682${_scopeId}>`);
					if ($setup.post.thumbnail_url) {
						_push$1(`<div class="post-thumbnail-container" data-v-384c9682${_scopeId}><button class="${ssrRenderClass([{ "nav-btn-disabled": $setup.currentThumbnailIndex === 0 }, "thumbnail-nav-btn prev-thumbnail-btn"])}"${ssrIncludeBooleanAttr($setup.currentThumbnailIndex === 0) ? " disabled" : ""}${ssrRenderAttr("aria-label", _ctx.$t("common.previous"))} style="${ssrRenderStyle($setup.allMediaUrls.length > 1 ? null : { display: "none" })}" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["ChevronLeft"], { size: 20 }, null, _parent$1, _scopeId));
						_push$1(`</button><div class="post-thumbnail" data-v-384c9682${_scopeId}><img${ssrRenderAttr("src", $setup.currentThumbnailUrl)}${ssrRenderAttr("alt", $setup.post.title || "Post thumbnail")} loading="eager" decoding="async" fetchpriority="high" data-v-384c9682${_scopeId}><div class="thumbnail-overlay" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Maximize2"], { size: 32 }, null, _parent$1, _scopeId));
						_push$1(`</div>`);
						if ($setup.allMediaUrls.length > 1) _push$1(`<div class="thumbnail-counter" data-v-384c9682${_scopeId}>${ssrInterpolate($setup.currentThumbnailIndex + 1)} / ${ssrInterpolate($setup.allMediaUrls.length)}</div>`);
						else _push$1(`<!---->`);
						_push$1(`</div><button class="${ssrRenderClass([{ "nav-btn-disabled": $setup.currentThumbnailIndex === $setup.allMediaUrls.length - 1 }, "thumbnail-nav-btn next-thumbnail-btn"])}"${ssrIncludeBooleanAttr($setup.currentThumbnailIndex === $setup.allMediaUrls.length - 1) ? " disabled" : ""}${ssrRenderAttr("aria-label", _ctx.$t("common.next"))} style="${ssrRenderStyle($setup.allMediaUrls.length > 1 ? null : { display: "none" })}" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["ChevronRight"], { size: 20 }, null, _parent$1, _scopeId));
						_push$1(`</button></div>`);
					} else _push$1(`<!---->`);
					_push$1(`<div class="post-content-wrapper" data-v-384c9682${_scopeId}><div class="post-meta" data-v-384c9682${_scopeId}><div class="meta-item" data-v-384c9682${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Calendar"], { size: 18 }, null, _parent$1, _scopeId));
					_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatDate($setup.post.published_at || $setup.post.scraped_at))}</span></div><div class="meta-item" data-v-384c9682${_scopeId}><span class="platform-badge" style="${ssrRenderStyle({ background: $setup.platformColor })}" data-v-384c9682${_scopeId}>${ssrInterpolate($setup.platformName)}</span></div>`);
					if ($setup.isRetweet) {
						_push$1(`<div class="meta-item retweet-indicator" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Repeat2"], { size: 18 }, null, _parent$1, _scopeId));
						_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate(_ctx.$t("post.retweet"))}</span></div>`);
					} else _push$1(`<!---->`);
					_push$1(`</div>`);
					if ($setup.isRetweet) {
						_push$1(`<div class="retweet-info" data-v-384c9682${_scopeId}><div class="retweeter-info" data-v-384c9682${_scopeId}><div class="author-avatar" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["User"], { size: 24 }, null, _parent$1, _scopeId));
						_push$1(`</div><div class="author-details" data-v-384c9682${_scopeId}><h3 data-v-384c9682${_scopeId}>${ssrInterpolate($setup.post.author_name)}</h3>`);
						if ($setup.post.author_username) _push$1(`<p data-v-384c9682${_scopeId}>@${ssrInterpolate($setup.post.author_username)}</p>`);
						else _push$1(`<!---->`);
						_push$1(`</div></div><div class="retweet-arrow" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Repeat2"], { size: 24 }, null, _parent$1, _scopeId));
						_push$1(`</div><div class="original-author-info" data-v-384c9682${_scopeId}><div class="author-avatar original" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["User"], { size: 24 }, null, _parent$1, _scopeId));
						_push$1(`</div><div class="author-details" data-v-384c9682${_scopeId}><h3 data-v-384c9682${_scopeId}>${ssrInterpolate($setup.post.original_author_name)}</h3>`);
						if ($setup.post.original_author_username) _push$1(`<p data-v-384c9682${_scopeId}>@${ssrInterpolate($setup.post.original_author_username)}</p>`);
						else _push$1(`<!---->`);
						_push$1(`<span class="original-label" data-v-384c9682${_scopeId}>${ssrInterpolate(_ctx.$t("post.originalAuthor"))}</span></div></div></div>`);
					} else _push$1(`<!---->`);
					if (!$setup.isRetweet && $setup.post.author_name) _push$1(ssrRenderComponent(_component_RouterLink, {
						to: `/authors/${$setup.post.author_id || 0}`,
						custom: ""
					}, {
						default: withCtx(({ navigate }, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) {
								_push$2(`<div class="author-info clickable" role="button" tabindex="0" data-v-384c9682${_scopeId$1}><div class="author-avatar" data-v-384c9682${_scopeId$1}>`);
								_push$2(ssrRenderComponent($setup["User"], { size: 24 }, null, _parent$2, _scopeId$1));
								_push$2(`</div><div class="author-details" data-v-384c9682${_scopeId$1}><h3 data-v-384c9682${_scopeId$1}>${ssrInterpolate($setup.post.author_name)}</h3>`);
								if ($setup.post.author_username) _push$2(`<p data-v-384c9682${_scopeId$1}>@${ssrInterpolate($setup.post.author_username)}</p>`);
								else _push$2(`<!---->`);
								_push$2(`</div>`);
								_push$2(ssrRenderComponent($setup["ExternalLink"], {
									size: 18,
									class: "link-icon"
								}, null, _parent$2, _scopeId$1));
								_push$2(`</div>`);
							} else return [createVNode("div", {
								class: "author-info clickable",
								onClick: navigate,
								role: "button",
								tabindex: "0"
							}, [
								createVNode("div", { class: "author-avatar" }, [createVNode($setup["User"], { size: 24 })]),
								createVNode("div", { class: "author-details" }, [createVNode("h3", null, toDisplayString($setup.post.author_name), 1), $setup.post.author_username ? (openBlock(), createBlock("p", { key: 0 }, "@" + toDisplayString($setup.post.author_username), 1)) : createCommentVNode("", true)]),
								createVNode($setup["ExternalLink"], {
									size: 18,
									class: "link-icon"
								})
							], 8, ["onClick"])];
						}),
						_: 1
					}, _parent$1, _scopeId));
					else _push$1(`<!---->`);
					_push$1(`<h1 class="post-title" data-v-384c9682${_scopeId}>${ssrInterpolate($setup.post.title || "Untitled")}</h1>`);
					if ($setup.showDescription) _push$1(`<div class="post-description" data-v-384c9682${_scopeId}><p data-v-384c9682${_scopeId}>${ssrInterpolate($setup.post.description)}</p></div>`);
					else _push$1(`<!---->`);
					if ($setup.post.url) {
						_push$1(`<a${ssrRenderAttr("href", $setup.post.url)} target="_blank" rel="noopener noreferrer" class="stats-link" data-v-384c9682${_scopeId}><div class="post-stats clickable" data-v-384c9682${_scopeId}>`);
						if ($setup.post.view_count) {
							_push$1(`<div class="stat-item" data-v-384c9682${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["Eye"], { size: 20 }, null, _parent$1, _scopeId));
							_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.post.view_count))} ${ssrInterpolate(_ctx.$t("post.views"))}</span></div>`);
						} else _push$1(`<!---->`);
						if ($setup.post.like_count) {
							_push$1(`<div class="stat-item" data-v-384c9682${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["Heart"], { size: 20 }, null, _parent$1, _scopeId));
							_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.post.like_count))} ${ssrInterpolate(_ctx.$t("post.likes"))}</span></div>`);
						} else _push$1(`<!---->`);
						if ($setup.post.comment_count) {
							_push$1(`<div class="stat-item" data-v-384c9682${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["MessageCircle"], { size: 20 }, null, _parent$1, _scopeId));
							_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.post.comment_count))} ${ssrInterpolate(_ctx.$t("post.comments"))}</span></div>`);
						} else _push$1(`<!---->`);
						_push$1(ssrRenderComponent($setup["ExternalLink"], {
							size: 16,
							class: "link-icon"
						}, null, _parent$1, _scopeId));
						_push$1(`</div></a>`);
					} else {
						_push$1(`<div class="post-stats" data-v-384c9682${_scopeId}>`);
						if ($setup.post.view_count) {
							_push$1(`<div class="stat-item" data-v-384c9682${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["Eye"], { size: 20 }, null, _parent$1, _scopeId));
							_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.post.view_count))} ${ssrInterpolate(_ctx.$t("post.views"))}</span></div>`);
						} else _push$1(`<!---->`);
						if ($setup.post.like_count) {
							_push$1(`<div class="stat-item" data-v-384c9682${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["Heart"], { size: 20 }, null, _parent$1, _scopeId));
							_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.post.like_count))} ${ssrInterpolate(_ctx.$t("post.likes"))}</span></div>`);
						} else _push$1(`<!---->`);
						if ($setup.post.comment_count) {
							_push$1(`<div class="stat-item" data-v-384c9682${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["MessageCircle"], { size: 20 }, null, _parent$1, _scopeId));
							_push$1(`<span data-v-384c9682${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.post.comment_count))} ${ssrInterpolate(_ctx.$t("post.comments"))}</span></div>`);
						} else _push$1(`<!---->`);
						_push$1(`</div>`);
					}
					_push$1(`<div class="post-actions" data-v-384c9682${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["GlassButton"], { onClick: $setup.toggleFavorite }, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) {
								_push$2(ssrRenderComponent($setup["Heart"], {
									size: 18,
									fill: $setup.isFavorited ? "currentColor" : "none"
								}, null, _parent$2, _scopeId$1));
								_push$2(` ${ssrInterpolate(_ctx.$t("favorite.add"))}`);
							} else return [createVNode($setup["Heart"], {
								size: 18,
								fill: $setup.isFavorited ? "currentColor" : "none"
							}, null, 8, ["fill"]), createTextVNode(" " + toDisplayString(_ctx.$t("favorite.add")), 1)];
						}),
						_: 1
					}, _parent$1, _scopeId));
					if ($setup.post.url) {
						_push$1(`<a${ssrRenderAttr("href", $setup.post.url)} target="_blank" rel="noopener noreferrer" data-v-384c9682${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["GlassButton"], { variant: "secondary" }, {
							default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
								if (_push$2) {
									_push$2(ssrRenderComponent($setup["ExternalLink"], { size: 18 }, null, _parent$2, _scopeId$1));
									_push$2(` ${ssrInterpolate(_ctx.$t("post.viewOriginal"))}`);
								} else return [createVNode($setup["ExternalLink"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("post.viewOriginal")), 1)];
							}),
							_: 1
						}, _parent$1, _scopeId));
						_push$1(`</a>`);
					} else _push$1(`<!---->`);
					_push$1(`</div></div></div>`);
					if ($setup.post.media_files && $setup.post.media_files.length > 0) {
						_push$1(`<div class="media-section" data-v-384c9682${_scopeId}><h2 data-v-384c9682${_scopeId}>${ssrInterpolate(_ctx.$t("post.media"))} (${ssrInterpolate($setup.post.media_files.length)})</h2><div class="media-grid" data-v-384c9682${_scopeId}><!--[-->`);
						ssrRenderList($setup.post.media_files, (media, index) => {
							_push$1(`<div class="media-item glass-card" data-v-384c9682${_scopeId}>`);
							if (media.file_type === "image") _push$1(`<img${ssrRenderAttr("src", `/api/media/${media.id}/stream`)}${ssrRenderAttr("alt", $setup.post.title || "")} loading="lazy" decoding="async" class="clickable-image" data-v-384c9682${_scopeId}>`);
							else if (media.file_type === "video") _push$1(`<div class="video-thumbnail" data-v-384c9682${_scopeId}><video preload="none"${ssrRenderAttr("poster", "")} data-v-384c9682${_scopeId}><source${ssrRenderAttr("src", `/api/media/${media.id}/stream`)} type="video/mp4" data-v-384c9682${_scopeId}></video><div class="video-play-overlay" data-v-384c9682${_scopeId}><div class="play-button" data-v-384c9682${_scopeId}><svg width="64" height="64" viewBox="0 0 64 64" data-v-384c9682${_scopeId}><circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.9)" data-v-384c9682${_scopeId}></circle><polygon points="26,20 26,44 44,32" fill="#000" data-v-384c9682${_scopeId}></polygon></svg></div></div></div>`);
							else _push$1(`<!---->`);
							_push$1(`</div>`);
						});
						_push$1(`<!--]--></div></div>`);
					} else _push$1(`<!---->`);
					if ($setup.post.tags && $setup.post.tags.length > 0) {
						_push$1(`<div class="tags-section glass-card" data-v-384c9682${_scopeId}><h3 data-v-384c9682${_scopeId}>${ssrInterpolate(_ctx.$t("post.tags"))}</h3><div class="tags-list" data-v-384c9682${_scopeId}><!--[-->`);
						ssrRenderList($setup.post.tags, (tag) => {
							_push$1(`<span class="tag glass-badge" data-v-384c9682${_scopeId}>${ssrInterpolate(tag)}</span>`);
						});
						_push$1(`<!--]--></div></div>`);
					} else _push$1(`<!---->`);
					_push$1(`</div>`);
				} else {
					_push$1(`<div class="error-state glass-card" data-v-384c9682${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["AlertCircle"], { size: 64 }, null, _parent$1, _scopeId));
					_push$1(`<h3 data-v-384c9682${_scopeId}>${ssrInterpolate(_ctx.$t("common.error"))}</h3><p data-v-384c9682${_scopeId}>Post not found</p>`);
					_push$1(ssrRenderComponent($setup["GlassButton"], { onClick: $setup.goBack }, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) _push$2(`${ssrInterpolate(_ctx.$t("common.back"))}`);
							else return [createTextVNode(toDisplayString(_ctx.$t("common.back")), 1)];
						}),
						_: 1
					}, _parent$1, _scopeId));
					_push$1(`</div>`);
				}
				_push$1(`</div>`);
				_push$1(ssrRenderComponent($setup["MediaViewer"], {
					show: $setup.showMediaViewer,
					"media-items": $setup.viewerMediaItems,
					"initial-index": $setup.viewerInitialIndex,
					onClose: $setup.closeMediaViewer
				}, null, _parent$1, _scopeId));
			} else return [createVNode("div", { class: "post-detail-page" }, [$setup.loading ? (openBlock(), createBlock($setup["LoadingSpinner"], {
				key: 0,
				size: "lg",
				text: _ctx.$t("common.loading")
			}, null, 8, ["text"])) : $setup.post ? (openBlock(), createBlock("div", {
				key: 1,
				class: "post-detail"
			}, [
				createVNode("button", {
					class: "back-button glass-button",
					onClick: $setup.goBack
				}, [createVNode($setup["ArrowLeft"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.back")), 1)]),
				createVNode("div", { class: ["post-header glass-card", {
					"video-layout": $setup.isVideoPost,
					"youtube-layout": $setup.isYouTube,
					"tiktok-layout": $setup.isTikTok
				}] }, [$setup.post.thumbnail_url ? (openBlock(), createBlock("div", {
					key: 0,
					class: "post-thumbnail-container"
				}, [
					withDirectives(createVNode("button", {
						class: ["thumbnail-nav-btn prev-thumbnail-btn", { "nav-btn-disabled": $setup.currentThumbnailIndex === 0 }],
						onClick: withModifiers($setup.prevThumbnail, ["stop"]),
						disabled: $setup.currentThumbnailIndex === 0,
						"aria-label": _ctx.$t("common.previous")
					}, [createVNode($setup["ChevronLeft"], { size: 20 })], 10, ["disabled", "aria-label"]), [[vShow, $setup.allMediaUrls.length > 1]]),
					createVNode("div", {
						class: "post-thumbnail",
						onClick: ($event) => $setup.openMediaViewer($setup.currentThumbnailIndex)
					}, [
						createVNode(Transition, {
							name: "thumbnail-fade",
							mode: "out-in"
						}, {
							default: withCtx(() => [(openBlock(), createBlock("img", {
								key: $setup.currentThumbnailUrl,
								src: $setup.currentThumbnailUrl,
								alt: $setup.post.title || "Post thumbnail",
								loading: "eager",
								decoding: "async",
								fetchpriority: "high"
							}, null, 8, ["src", "alt"]))]),
							_: 1
						}),
						createVNode("div", { class: "thumbnail-overlay" }, [createVNode($setup["Maximize2"], { size: 32 })]),
						$setup.allMediaUrls.length > 1 ? (openBlock(), createBlock("div", {
							key: 0,
							class: "thumbnail-counter"
						}, toDisplayString($setup.currentThumbnailIndex + 1) + " / " + toDisplayString($setup.allMediaUrls.length), 1)) : createCommentVNode("", true)
					], 8, ["onClick"]),
					withDirectives(createVNode("button", {
						class: ["thumbnail-nav-btn next-thumbnail-btn", { "nav-btn-disabled": $setup.currentThumbnailIndex === $setup.allMediaUrls.length - 1 }],
						onClick: withModifiers($setup.nextThumbnail, ["stop"]),
						disabled: $setup.currentThumbnailIndex === $setup.allMediaUrls.length - 1,
						"aria-label": _ctx.$t("common.next")
					}, [createVNode($setup["ChevronRight"], { size: 20 })], 10, ["disabled", "aria-label"]), [[vShow, $setup.allMediaUrls.length > 1]])
				])) : createCommentVNode("", true), createVNode("div", { class: "post-content-wrapper" }, [
					createVNode("div", { class: "post-meta" }, [
						createVNode("div", { class: "meta-item" }, [createVNode($setup["Calendar"], { size: 18 }), createVNode("span", null, toDisplayString($setup.formatDate($setup.post.published_at || $setup.post.scraped_at)), 1)]),
						createVNode("div", { class: "meta-item" }, [createVNode("span", {
							class: "platform-badge",
							style: { background: $setup.platformColor }
						}, toDisplayString($setup.platformName), 5)]),
						$setup.isRetweet ? (openBlock(), createBlock("div", {
							key: 0,
							class: "meta-item retweet-indicator"
						}, [createVNode($setup["Repeat2"], { size: 18 }), createVNode("span", null, toDisplayString(_ctx.$t("post.retweet")), 1)])) : createCommentVNode("", true)
					]),
					$setup.isRetweet ? (openBlock(), createBlock("div", {
						key: 0,
						class: "retweet-info"
					}, [
						createVNode("div", { class: "retweeter-info" }, [createVNode("div", { class: "author-avatar" }, [createVNode($setup["User"], { size: 24 })]), createVNode("div", { class: "author-details" }, [createVNode("h3", null, toDisplayString($setup.post.author_name), 1), $setup.post.author_username ? (openBlock(), createBlock("p", { key: 0 }, "@" + toDisplayString($setup.post.author_username), 1)) : createCommentVNode("", true)])]),
						createVNode("div", { class: "retweet-arrow" }, [createVNode($setup["Repeat2"], { size: 24 })]),
						createVNode("div", { class: "original-author-info" }, [createVNode("div", { class: "author-avatar original" }, [createVNode($setup["User"], { size: 24 })]), createVNode("div", { class: "author-details" }, [
							createVNode("h3", null, toDisplayString($setup.post.original_author_name), 1),
							$setup.post.original_author_username ? (openBlock(), createBlock("p", { key: 0 }, "@" + toDisplayString($setup.post.original_author_username), 1)) : createCommentVNode("", true),
							createVNode("span", { class: "original-label" }, toDisplayString(_ctx.$t("post.originalAuthor")), 1)
						])])
					])) : createCommentVNode("", true),
					!$setup.isRetweet && $setup.post.author_name ? (openBlock(), createBlock(_component_RouterLink, {
						key: 1,
						to: `/authors/${$setup.post.author_id || 0}`,
						custom: ""
					}, {
						default: withCtx(({ navigate }) => [createVNode("div", {
							class: "author-info clickable",
							onClick: navigate,
							role: "button",
							tabindex: "0"
						}, [
							createVNode("div", { class: "author-avatar" }, [createVNode($setup["User"], { size: 24 })]),
							createVNode("div", { class: "author-details" }, [createVNode("h3", null, toDisplayString($setup.post.author_name), 1), $setup.post.author_username ? (openBlock(), createBlock("p", { key: 0 }, "@" + toDisplayString($setup.post.author_username), 1)) : createCommentVNode("", true)]),
							createVNode($setup["ExternalLink"], {
								size: 18,
								class: "link-icon"
							})
						], 8, ["onClick"])]),
						_: 1
					}, 8, ["to"])) : createCommentVNode("", true),
					createVNode("h1", { class: "post-title" }, toDisplayString($setup.post.title || "Untitled"), 1),
					$setup.showDescription ? (openBlock(), createBlock("div", {
						key: 2,
						class: "post-description"
					}, [createVNode("p", null, toDisplayString($setup.post.description), 1)])) : createCommentVNode("", true),
					$setup.post.url ? (openBlock(), createBlock("a", {
						key: 3,
						href: $setup.post.url,
						target: "_blank",
						rel: "noopener noreferrer",
						class: "stats-link"
					}, [createVNode("div", { class: "post-stats clickable" }, [
						$setup.post.view_count ? (openBlock(), createBlock("div", {
							key: 0,
							class: "stat-item"
						}, [createVNode($setup["Eye"], { size: 20 }), createVNode("span", null, toDisplayString($setup.formatNumber($setup.post.view_count)) + " " + toDisplayString(_ctx.$t("post.views")), 1)])) : createCommentVNode("", true),
						$setup.post.like_count ? (openBlock(), createBlock("div", {
							key: 1,
							class: "stat-item"
						}, [createVNode($setup["Heart"], { size: 20 }), createVNode("span", null, toDisplayString($setup.formatNumber($setup.post.like_count)) + " " + toDisplayString(_ctx.$t("post.likes")), 1)])) : createCommentVNode("", true),
						$setup.post.comment_count ? (openBlock(), createBlock("div", {
							key: 2,
							class: "stat-item"
						}, [createVNode($setup["MessageCircle"], { size: 20 }), createVNode("span", null, toDisplayString($setup.formatNumber($setup.post.comment_count)) + " " + toDisplayString(_ctx.$t("post.comments")), 1)])) : createCommentVNode("", true),
						createVNode($setup["ExternalLink"], {
							size: 16,
							class: "link-icon"
						})
					])], 8, ["href"])) : (openBlock(), createBlock("div", {
						key: 4,
						class: "post-stats"
					}, [
						$setup.post.view_count ? (openBlock(), createBlock("div", {
							key: 0,
							class: "stat-item"
						}, [createVNode($setup["Eye"], { size: 20 }), createVNode("span", null, toDisplayString($setup.formatNumber($setup.post.view_count)) + " " + toDisplayString(_ctx.$t("post.views")), 1)])) : createCommentVNode("", true),
						$setup.post.like_count ? (openBlock(), createBlock("div", {
							key: 1,
							class: "stat-item"
						}, [createVNode($setup["Heart"], { size: 20 }), createVNode("span", null, toDisplayString($setup.formatNumber($setup.post.like_count)) + " " + toDisplayString(_ctx.$t("post.likes")), 1)])) : createCommentVNode("", true),
						$setup.post.comment_count ? (openBlock(), createBlock("div", {
							key: 2,
							class: "stat-item"
						}, [createVNode($setup["MessageCircle"], { size: 20 }), createVNode("span", null, toDisplayString($setup.formatNumber($setup.post.comment_count)) + " " + toDisplayString(_ctx.$t("post.comments")), 1)])) : createCommentVNode("", true)
					])),
					createVNode("div", { class: "post-actions" }, [createVNode($setup["GlassButton"], { onClick: $setup.toggleFavorite }, {
						default: withCtx(() => [createVNode($setup["Heart"], {
							size: 18,
							fill: $setup.isFavorited ? "currentColor" : "none"
						}, null, 8, ["fill"]), createTextVNode(" " + toDisplayString(_ctx.$t("favorite.add")), 1)]),
						_: 1
					}), $setup.post.url ? (openBlock(), createBlock("a", {
						key: 0,
						href: $setup.post.url,
						target: "_blank",
						rel: "noopener noreferrer"
					}, [createVNode($setup["GlassButton"], { variant: "secondary" }, {
						default: withCtx(() => [createVNode($setup["ExternalLink"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("post.viewOriginal")), 1)]),
						_: 1
					})], 8, ["href"])) : createCommentVNode("", true)])
				])], 2),
				$setup.post.media_files && $setup.post.media_files.length > 0 ? (openBlock(), createBlock("div", {
					key: 0,
					class: "media-section"
				}, [createVNode("h2", null, toDisplayString(_ctx.$t("post.media")) + " (" + toDisplayString($setup.post.media_files.length) + ")", 1), createVNode("div", { class: "media-grid" }, [(openBlock(true), createBlock(Fragment, null, renderList($setup.post.media_files, (media, index) => {
					return openBlock(), createBlock("div", {
						key: media.id,
						class: "media-item glass-card"
					}, [media.file_type === "image" ? (openBlock(), createBlock("img", {
						key: 0,
						src: `/api/media/${media.id}/stream`,
						alt: $setup.post.title || "",
						loading: "lazy",
						decoding: "async",
						onClick: ($event) => $setup.openMediaViewer($setup.getMediaIndex(index)),
						class: "clickable-image"
					}, null, 8, [
						"src",
						"alt",
						"onClick"
					])) : media.file_type === "video" ? (openBlock(), createBlock("div", {
						key: 1,
						class: "video-thumbnail",
						onClick: ($event) => $setup.openMediaViewer($setup.getMediaIndex(index))
					}, [createVNode("video", {
						preload: "none",
						poster: ""
					}, [createVNode("source", {
						src: `/api/media/${media.id}/stream`,
						type: "video/mp4"
					}, null, 8, ["src"])]), createVNode("div", { class: "video-play-overlay" }, [createVNode("div", { class: "play-button" }, [(openBlock(), createBlock("svg", {
						width: "64",
						height: "64",
						viewBox: "0 0 64 64"
					}, [createVNode("circle", {
						cx: "32",
						cy: "32",
						r: "30",
						fill: "rgba(255,255,255,0.9)"
					}), createVNode("polygon", {
						points: "26,20 26,44 44,32",
						fill: "#000"
					})]))])])], 8, ["onClick"])) : createCommentVNode("", true)]);
				}), 128))])])) : createCommentVNode("", true),
				$setup.post.tags && $setup.post.tags.length > 0 ? (openBlock(), createBlock("div", {
					key: 1,
					class: "tags-section glass-card"
				}, [createVNode("h3", null, toDisplayString(_ctx.$t("post.tags")), 1), createVNode("div", { class: "tags-list" }, [(openBlock(true), createBlock(Fragment, null, renderList($setup.post.tags, (tag) => {
					return openBlock(), createBlock("span", {
						key: tag,
						class: "tag glass-badge"
					}, toDisplayString(tag), 1);
				}), 128))])])) : createCommentVNode("", true)
			])) : (openBlock(), createBlock("div", {
				key: 2,
				class: "error-state glass-card"
			}, [
				createVNode($setup["AlertCircle"], { size: 64 }),
				createVNode("h3", null, toDisplayString(_ctx.$t("common.error")), 1),
				createVNode("p", null, "Post not found"),
				createVNode($setup["GlassButton"], { onClick: $setup.goBack }, {
					default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.back")), 1)]),
					_: 1
				})
			]))]), createVNode($setup["MediaViewer"], {
				show: $setup.showMediaViewer,
				"media-items": $setup.viewerMediaItems,
				"initial-index": $setup.viewerInitialIndex,
				onClose: $setup.closeMediaViewer
			}, null, 8, [
				"show",
				"media-items",
				"initial-index"
			])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = PostDetailPage_vue_vue_type_script_setup_true_lang_default.setup;
PostDetailPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/PostDetailPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PostDetailPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(PostDetailPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-384c9682"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/PostDetailPage.vue"]
]);
export { PostDetailPage_default as t };
