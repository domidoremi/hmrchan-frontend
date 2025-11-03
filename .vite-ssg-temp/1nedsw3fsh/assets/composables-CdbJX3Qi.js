import { c as logger_default, n as favoritesApi, r as postsApi } from "./api-services-BmQ9TwGt.js";
import { nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
function useKeyboardNavigation() {
	const handleKeyDown = (e) => {
		if (e.key === "Escape") {
			const event = new CustomEvent("close-modal");
			window.dispatchEvent(event);
		}
	};
	onMounted(() => {
		document.addEventListener("keydown", handleKeyDown);
	});
	onUnmounted(() => {
		document.removeEventListener("keydown", handleKeyDown);
	});
}
function useSkipLinks() {
	onMounted(() => {
		if (document.getElementById("skip-to-content")) return;
		const skipLink = document.createElement("a");
		skipLink.id = "skip-to-content";
		skipLink.href = "#main-content";
		skipLink.textContent = "跳到主内容";
		skipLink.className = "skip-link";
		skipLink.style.position = "absolute";
		skipLink.style.top = "-40px";
		skipLink.style.left = "0";
		skipLink.style.padding = "8px";
		skipLink.style.background = "var(--color-primary, #000)";
		skipLink.style.color = "white";
		skipLink.style.zIndex = "9999";
		skipLink.style.transition = "top 0.3s";
		skipLink.addEventListener("focus", () => {
			skipLink.style.top = "0";
		});
		skipLink.addEventListener("blur", () => {
			skipLink.style.top = "-40px";
		});
		document.body.insertBefore(skipLink, document.body.firstChild);
	});
}
var ToastManager = class {
	constructor() {
		this.container = null;
	}
	createContainer() {
		if (!this.container) {
			this.container = document.createElement("div");
			this.container.className = "toast-container";
			this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
			document.body.appendChild(this.container);
		}
		return this.container;
	}
	show(options) {
		const { message, type = "info", duration = 3e3 } = options;
		const container = this.createContainer();
		const toast$1 = document.createElement("div");
		toast$1.className = `toast toast-${type}`;
		toast$1.style.cssText = `
      padding: 12px 20px;
      background: var(--glass-bg-strong);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-primary);
      font-size: 14px;
      box-shadow: var(--glass-shadow);
      pointer-events: all;
      animation: slideInRight 0.3s ease;
      min-width: 200px;
      max-width: 400px;
    `;
		const colors = {
			success: "#10b981",
			error: "#ef4444",
			warning: "#f59e0b",
			info: "#3b82f6"
		};
		toast$1.style.borderLeftColor = colors[type];
		toast$1.style.borderLeftWidth = "4px";
		toast$1.textContent = message;
		container.appendChild(toast$1);
		setTimeout(() => {
			toast$1.style.animation = "slideOutRight 0.3s ease";
			setTimeout(() => {
				container.removeChild(toast$1);
				if (container.children.length === 0) {
					document.body.removeChild(container);
					this.container = null;
				}
			}, 300);
		}, duration);
	}
	success(message, duration) {
		this.show({
			message,
			type: "success",
			duration
		});
	}
	error(message, duration) {
		this.show({
			message,
			type: "error",
			duration
		});
	}
	warning(message, duration) {
		this.show({
			message,
			type: "warning",
			duration
		});
	}
	info(message, duration) {
		this.show({
			message,
			type: "info",
			duration
		});
	}
};
var style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
var toast_default = new ToastManager();
function throttle(func, wait = 300, options = {}) {
	let timeout = null;
	let previous = 0;
	let lastArgs = null;
	let lastContext = null;
	const { leading = true, trailing = true } = options;
	const later = () => {
		previous = leading === false ? 0 : Date.now();
		timeout = null;
		if (lastArgs) {
			func.apply(lastContext, lastArgs);
			lastArgs = null;
			lastContext = null;
		}
	};
	return function(...args) {
		const now = Date.now();
		if (!previous && leading === false) previous = now;
		const remaining = wait - (now - previous);
		lastContext = this;
		lastArgs = args;
		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			func.apply(lastContext, lastArgs);
			lastArgs = null;
			lastContext = null;
		} else if (!timeout && trailing !== false) timeout = setTimeout(later, remaining);
	};
}
var debug = (...args) => {
	console.log("[Waterfall]", ...args);
};
function useWaterfallLayout(containerRef, options = {}) {
	const { columnGap = 16, rowGap = 16, minColumnWidth = 300, breakpoints = {
		1600: 5,
		1400: 4,
		1100: 3,
		769: 2,
		481: 2,
		0: 2
	} } = options;
	const isInitialized = ref(false);
	const currentColumns = ref(2);
	const imageLoadListeners = /* @__PURE__ */ new Map();
	let imageLoadDebounceTimer = null;
	const calculateColumns = () => {
		const width = window.innerWidth;
		const sortedBreakpoints = Object.keys(breakpoints).map(Number).sort((a, b) => b - a);
		for (const bp of sortedBreakpoints) if (width >= bp) return breakpoints[bp] || 2;
		return 2;
	};
	const applyLayout = () => {
		if (!containerRef.value) return;
		const columns = calculateColumns();
		currentColumns.value = columns;
		const container = containerRef.value;
		const items = container.querySelectorAll(".post-card");
		if (items.length === 0) return;
		container.style.position = "relative";
		const columnWidth = (container.offsetWidth - columnGap * (columns - 1)) / columns;
		const columnHeights = new Array(columns).fill(0);
		items.forEach((item, index) => {
			item.style.position = "absolute";
			item.style.width = `${columnWidth}px`;
			const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
			const left = shortestColumn * (columnWidth + columnGap);
			const top = columnHeights[shortestColumn];
			item.style.left = `${left}px`;
			item.style.top = `${top}px`;
			const itemHeight = item.offsetHeight || 400;
			columnHeights[shortestColumn] += itemHeight + rowGap;
			item.querySelectorAll("img").forEach((img) => {
				if (img.complete && img.naturalHeight > 0) return;
				const oldListener = imageLoadListeners.get(img);
				if (oldListener) {
					img.removeEventListener("load", oldListener);
					img.removeEventListener("error", oldListener);
				}
				const handleImageLoad = () => {
					img.removeEventListener("load", handleImageLoad);
					img.removeEventListener("error", handleImageLoad);
					imageLoadListeners.delete(img);
					if (imageLoadDebounceTimer) clearTimeout(imageLoadDebounceTimer);
					imageLoadDebounceTimer = setTimeout(() => {
						if (containerRef.value) {
							applyLayout();
							debug("Images loaded, layout recalculated");
						}
						imageLoadDebounceTimer = null;
					}, 100);
				};
				img.addEventListener("load", handleImageLoad);
				img.addEventListener("error", handleImageLoad);
				imageLoadListeners.set(img, handleImageLoad);
			});
		});
		const maxHeight = Math.max(...columnHeights);
		container.style.height = `${maxHeight}px`;
		debug(`Applied layout: ${columns} columns, gap: ${columnGap}px (manual positioning)`);
	};
	const initLayout = async () => {
		await nextTick();
		if (!containerRef.value) {
			debug("Container not found");
			return;
		}
		applyLayout();
		isInitialized.value = true;
		debug("Layout initialized");
	};
	const updateLayout = async () => {
		await nextTick();
		applyLayout();
		debug("Layout updated");
	};
	const smoothUpdateLayout = async () => {
		if (!containerRef.value) return;
		await nextTick();
		const container = containerRef.value;
		const oldTransition = container.style.transition;
		container.style.transition = "none";
		const items = container.querySelectorAll(".post-card");
		const oldTransitions = [];
		items.forEach((item, index) => {
			const element = item;
			oldTransitions[index] = element.style.transition;
			element.style.transition = "none";
		});
		applyLayout();
		await nextTick();
		requestAnimationFrame(() => {
			container.style.transition = oldTransition || "";
			items.forEach((item, index) => {
				item.style.transition = oldTransitions[index] || "";
			});
		});
		debug("Layout smoothly updated");
	};
	const handleResize = throttle(() => {
		if (!containerRef.value) return;
		const newColumns = calculateColumns();
		if (newColumns !== currentColumns.value) {
			debug(`Columns changed: ${currentColumns.value} -> ${newColumns}`);
			applyLayout();
		}
	}, 150);
	const destroy = () => {
		if (!containerRef.value) return;
		if (imageLoadDebounceTimer) {
			clearTimeout(imageLoadDebounceTimer);
			imageLoadDebounceTimer = null;
		}
		imageLoadListeners.forEach((listener, img) => {
			img.removeEventListener("load", listener);
			img.removeEventListener("error", listener);
		});
		imageLoadListeners.clear();
		containerRef.value.style.position = "";
		containerRef.value.style.height = "";
		containerRef.value.style.columnCount = "";
		containerRef.value.style.columnGap = "";
		containerRef.value.style.rowGap = "";
		containerRef.value.querySelectorAll(".post-card").forEach((item) => {
			const element = item;
			element.style.position = "";
			element.style.left = "";
			element.style.top = "";
			element.style.width = "";
			element.style.breakInside = "";
			element.style.marginBottom = "";
		});
		isInitialized.value = false;
		debug("Layout destroyed");
	};
	onMounted(() => {
		initLayout();
		window.addEventListener("resize", handleResize);
	});
	onUnmounted(() => {
		window.removeEventListener("resize", handleResize);
		destroy();
	});
	return {
		isInitialized,
		currentColumns,
		initLayout,
		updateLayout,
		smoothUpdateLayout,
		destroy
	};
}
function useFavorites() {
	const { t } = useI18n();
	const favorites = ref([]);
	const favoritePosts = ref([]);
	const loading = ref(false);
	const error = ref(null);
	const pagination = ref({
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 0
	});
	const fetchFavorites = async (params) => {
		loading.value = true;
		error.value = null;
		try {
			const response = await favoritesApi.getFavorites(params);
			favorites.value = response.items;
			pagination.value = {
				page: response.page,
				page_size: response.page_size,
				total: response.total,
				total_pages: response.total_pages
			};
			const postIds = response.items.map((fav) => fav.post_id);
			if (postIds.length > 0) try {
				favoritePosts.value = (await postsApi.getPosts({
					page: 1,
					page_size: postIds.length
				})).items.filter((post) => postIds.includes(post.id));
			} catch (err) {
				console.error("Failed to fetch favorite posts:", err);
				favoritePosts.value = [];
			}
			else favoritePosts.value = [];
			return response;
		} catch (err) {
			error.value = err.message || "Failed to fetch favorites";
			throw err;
		} finally {
			loading.value = false;
		}
	};
	const addFavorite = async (data) => {
		try {
			const favorite = await favoritesApi.addFavorite(data);
			favorites.value.unshift(favorite);
			toast_default.success(t("favorite.addSuccess"));
			return favorite;
		} catch (err) {
			const message = err.response?.data?.message || t("favorite.addFailed");
			toast_default.error(message);
			throw err;
		}
	};
	const updateFavorite = async (favoriteId, data) => {
		try {
			const favorite = await favoritesApi.updateFavorite(favoriteId, data);
			const index = favorites.value.findIndex((f) => f.id === favoriteId);
			if (index !== -1) favorites.value[index] = favorite;
			toast_default.success(t("favorite.updateSuccess"));
			return favorite;
		} catch (err) {
			const message = err.response?.data?.message || t("favorite.updateFailed");
			toast_default.error(message);
			throw err;
		}
	};
	const deleteFavorite = async (favoriteId) => {
		try {
			await favoritesApi.deleteFavorite(favoriteId);
			favorites.value = favorites.value.filter((f) => f.id !== favoriteId);
			toast_default.success(t("favorite.removeSuccess"));
		} catch (err) {
			const message = err.response?.data?.message || t("favorite.removeFailed");
			toast_default.error(message);
			throw err;
		}
	};
	const isFavorited = async (postId) => {
		try {
			return await favoritesApi.isFavorited(postId);
		} catch {
			return false;
		}
	};
	return {
		favorites,
		favoritePosts,
		loading,
		error,
		pagination,
		fetchFavorites,
		addFavorite,
		updateFavorite,
		deleteFavorite,
		isFavorited
	};
}
function useInfiniteScroll(options) {
	const { onLoadMore, hasMore, threshold = 200, delay = 300, enabled = true } = options;
	const isLoading = ref(false);
	const isNearBottom = ref(false);
	let timeoutId = null;
	const checkScroll = () => {
		if (!enabled || isLoading.value || !hasMore()) return;
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		isNearBottom.value = document.documentElement.scrollHeight - (scrollTop + window.innerHeight) < threshold;
		if (isNearBottom.value) loadMore();
	};
	const loadMore = async () => {
		if (isLoading.value || !hasMore()) return;
		isLoading.value = true;
		try {
			await onLoadMore();
		} catch (error) {
			console.error("Failed to load more:", error);
		} finally {
			isLoading.value = false;
		}
	};
	const handleScroll = () => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = window.setTimeout(checkScroll, delay);
	};
	onMounted(() => {
		if (enabled) {
			window.addEventListener("scroll", handleScroll, { passive: true });
			checkScroll();
		}
	});
	onUnmounted(() => {
		window.removeEventListener("scroll", handleScroll);
		if (timeoutId) clearTimeout(timeoutId);
	});
	return {
		isLoading,
		isNearBottom,
		loadMore,
		checkScroll
	};
}
var ImagePreloader = class {
	constructor() {
		this.cache = /* @__PURE__ */ new Set();
		this.loading = /* @__PURE__ */ new Set();
		this.queue = [];
		this.maxConcurrent = 3;
	}
	preload(url) {
		if (this.cache.has(url) || this.loading.has(url)) return Promise.resolve();
		return new Promise((resolve, reject) => {
			this.loading.add(url);
			const img = new Image();
			img.onload = () => {
				this.cache.add(url);
				this.loading.delete(url);
				logger_default.log(`[Preload] ✅ 图片: ${url.substring(0, 50)}...`);
				resolve();
				this.processQueue();
			};
			img.onerror = () => {
				this.loading.delete(url);
				logger_default.warn(`[Preload] ❌ 图片失败: ${url.substring(0, 50)}...`);
				reject(/* @__PURE__ */ new Error(`Failed to preload: ${url}`));
				this.processQueue();
			};
			img.src = url;
		});
	}
	async preloadBatch(urls) {
		const uniqueUrls = [...new Set(urls)].filter((url) => !this.cache.has(url));
		if (uniqueUrls.length === 0) return;
		logger_default.log(`[Preload] 📦 批量预加载 ${uniqueUrls.length} 张图片`);
		for (const url of uniqueUrls) if (this.loading.size >= this.maxConcurrent) this.queue.push(url);
		else this.preload(url).catch(() => {});
	}
	processQueue() {
		if (this.queue.length > 0 && this.loading.size < this.maxConcurrent) {
			const url = this.queue.shift();
			if (url) this.preload(url).catch(() => {});
		}
	}
	async preloadPriority(urls) {
		this.queue = [];
		const uniqueUrls = [...new Set(urls)].filter((url) => !this.cache.has(url));
		logger_default.log(`[Preload] ⭐ 优先级预加载 ${uniqueUrls.length} 张图片`);
		for (const url of uniqueUrls) await this.preload(url).catch(() => {});
	}
	isCached(url) {
		return this.cache.has(url);
	}
	clearCache() {
		this.cache.clear();
		logger_default.log("[Preload] 🗑️ 清除图片缓存");
	}
	getStats() {
		return {
			cached: this.cache.size,
			loading: this.loading.size,
			queued: this.queue.length
		};
	}
};
var VideoPreloader = class {
	constructor() {
		this.cache = /* @__PURE__ */ new Map();
		this.loading = /* @__PURE__ */ new Set();
	}
	preloadMetadata(url) {
		if (this.cache.has(url) || this.loading.has(url)) return Promise.resolve();
		this.loading.add(url);
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.preload = "metadata";
			video.src = url;
			video.onloadedmetadata = () => {
				this.cache.set(url, video);
				this.loading.delete(url);
				logger_default.log(`[Preload] 🎬 视频元数据: ${url.substring(0, 50)}... (${video.duration.toFixed(1)}s)`);
				resolve();
			};
			video.onerror = () => {
				this.loading.delete(url);
				logger_default.warn(`[Preload] ❌ 视频失败: ${url.substring(0, 50)}...`);
				reject(/* @__PURE__ */ new Error(`Failed to preload video: ${url}`));
			};
		});
	}
	preloadPartial(url, seconds = 3) {
		if (this.cache.has(url) || this.loading.has(url)) return Promise.resolve();
		this.loading.add(url);
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.preload = "auto";
			video.src = url;
			let loaded = false;
			const checkProgress = () => {
				if (!loaded && video.buffered.length > 0) {
					const buffered = video.buffered.end(0);
					if (buffered >= seconds) {
						loaded = true;
						this.cache.set(url, video);
						this.loading.delete(url);
						logger_default.log(`[Preload] 🎬 视频部分加载: ${url.substring(0, 50)}... (${buffered.toFixed(1)}s)`);
						resolve();
					}
				}
			};
			video.addEventListener("progress", checkProgress);
			video.addEventListener("canplay", () => {
				if (!loaded) {
					loaded = true;
					this.loading.delete(url);
					this.cache.set(url, video);
					resolve();
				}
			});
			video.onerror = () => {
				this.loading.delete(url);
				reject(/* @__PURE__ */ new Error(`Failed to preload video: ${url}`));
			};
			setTimeout(() => {
				if (!loaded) {
					loaded = true;
					this.loading.delete(url);
					reject(/* @__PURE__ */ new Error(`Video preload timeout: ${url}`));
				}
			}, 1e4);
		});
	}
	async preloadBatchMetadata(urls) {
		const uniqueUrls = [...new Set(urls)].filter((url) => !this.cache.has(url));
		logger_default.log(`[Preload] 📦 批量预加载 ${uniqueUrls.length} 个视频元数据`);
		const promises = uniqueUrls.map((url) => this.preloadMetadata(url).catch(() => {}));
		await Promise.all(promises);
	}
	getCached(url) {
		return this.cache.get(url);
	}
	clearCache() {
		this.cache.clear();
		this.loading.clear();
		logger_default.log("[Preload] 🗑️ 清除视频缓存");
	}
	getStats() {
		return {
			cached: this.cache.size,
			loading: this.loading.size
		};
	}
};
var SmartPreloader = class {
	preloadPostThumbnails(posts, limit = 10) {
		const thumbnails = posts.slice(0, limit).filter((p) => p.thumbnail_url).map((p) => p.thumbnail_url);
		if (thumbnails.length > 0) imagePreloader.preloadBatch(thumbnails);
	}
	preloadNextBatch(allPosts, currentIndex, batchSize = 10) {
		const nextPosts = allPosts.slice(currentIndex + 1, currentIndex + 1 + batchSize);
		this.preloadPostThumbnails(nextPosts, batchSize);
	}
	preloadMediaResources(items, currentIndex, lookahead = 2) {
		items.slice(currentIndex + 1, currentIndex + 1 + lookahead).forEach((item) => {
			if (item.type === "image") imagePreloader.preload(item.url).catch(() => {});
			else if (item.type === "video") videoPreloader.preloadMetadata(item.url).catch(() => {});
		});
	}
	clearAll() {
		imagePreloader.clearCache();
		videoPreloader.clearCache();
	}
	getStats() {
		return {
			images: imagePreloader.getStats(),
			videos: videoPreloader.getStats()
		};
	}
};
const imagePreloader = new ImagePreloader();
const videoPreloader = new VideoPreloader();
const smartPreloader = new SmartPreloader();
if (typeof window !== "undefined") window.__preloader = {
	image: imagePreloader,
	video: videoPreloader,
	smart: smartPreloader
};
function useMediaPreload(mediaItems, currentIndex, options = {}) {
	const { lookahead = 2, enabled = true } = options;
	const preloadNearby = () => {
		if (!enabled || mediaItems.value.length === 0) return;
		smartPreloader.preloadMediaResources(mediaItems.value, currentIndex.value, lookahead);
	};
	watch(currentIndex, () => {
		if (enabled) setTimeout(preloadNearby, 300);
	});
	onMounted(() => {
		if (enabled) setTimeout(preloadNearby, 1e3);
	});
	return { preloadNearby };
}
var DEFAULT_OPTIONS = {
	maxSize: 5,
	maxWidth: 1024,
	maxHeight: 1024,
	quality: .8,
	accept: "image/jpeg,image/png,image/webp"
};
function useImageUpload(options = {}) {
	const config = {
		...DEFAULT_OPTIONS,
		...options
	};
	const { t } = useI18n();
	const uploading = ref(false);
	const preview = ref(null);
	const error = ref(null);
	function validateFile(file) {
		error.value = null;
		if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
			error.value = t("upload.onlyImages");
			toast_default.error(error.value);
			return false;
		}
		if (file.size / 1024 / 1024 > config.maxSize) {
			error.value = t("upload.tooLarge");
			toast_default.error(error.value);
			return false;
		}
		return true;
	}
	async function compressImage(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					let width = img.width;
					let height = img.height;
					if (width > config.maxWidth || height > config.maxHeight) {
						const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
						width = Math.floor(width * ratio);
						height = Math.floor(height * ratio);
					}
					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					if (!ctx) {
						reject(/* @__PURE__ */ new Error("Failed to get canvas context"));
						return;
					}
					ctx.drawImage(img, 0, 0, width, height);
					canvas.toBlob((blob) => {
						if (blob) resolve(blob);
						else reject(/* @__PURE__ */ new Error("Failed to compress image"));
					}, file.type, config.quality);
				};
				img.onerror = () => reject(/* @__PURE__ */ new Error("Failed to load image"));
				img.src = e.target?.result;
			};
			reader.onerror = () => reject(/* @__PURE__ */ new Error("Failed to read file"));
			reader.readAsDataURL(file);
		});
	}
	function createPreview(file) {
		if (preview.value) URL.revokeObjectURL(preview.value);
		preview.value = URL.createObjectURL(file);
	}
	async function selectImage() {
		return new Promise((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = config.accept;
			input.onchange = async (e) => {
				const file = e.target.files?.[0];
				if (!file) {
					resolve(null);
					return;
				}
				if (!validateFile(file)) {
					resolve(null);
					return;
				}
				try {
					uploading.value = true;
					const compressed = await compressImage(file);
					const compressedFile = new File([compressed], file.name, {
						type: file.type,
						lastModified: Date.now()
					});
					createPreview(compressedFile);
					const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
					const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
					logger_default.log(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
					resolve(compressedFile);
				} catch (err) {
					logger_default.error("Image compression failed:", err);
					error.value = t("upload.processingFailed");
					toast_default.error(error.value);
					resolve(null);
				} finally {
					uploading.value = false;
				}
			};
			input.click();
		});
	}
	async function uploadImage(file, uploadUrl) {
		uploading.value = true;
		error.value = null;
		try {
			const formData = new FormData();
			formData.append("file", file);
			const response = await fetch(uploadUrl, {
				method: "POST",
				body: formData,
				headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` }
			});
			if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
			const data = await response.json();
			toast_default.success("上传成功");
			return data.url || data.file_url || data.path;
		} catch (err) {
			const errorMsg = err.message || "上传失败";
			error.value = errorMsg;
			toast_default.error(errorMsg);
			throw err;
		} finally {
			uploading.value = false;
		}
	}
	function clearPreview() {
		const previewUrl = preview.value;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			preview.value = null;
		}
	}
	return {
		uploading,
		preview,
		error,
		selectImage,
		uploadImage,
		clearPreview
	};
}
export { useWaterfallLayout as a, useSkipLinks as c, useFavorites as i, useMediaPreload as n, toast_default as o, useInfiniteScroll as r, useKeyboardNavigation as s, useImageUpload as t };
