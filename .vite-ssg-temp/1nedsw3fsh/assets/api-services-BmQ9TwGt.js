import { computed, ref } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
var RequestCache = class {
	constructor() {
		this.cache = /* @__PURE__ */ new Map();
		this.pending = /* @__PURE__ */ new Map();
	}
	getCacheKey(url, params) {
		return `${url}${params ? JSON.stringify(params) : ""}`;
	}
	isValid(item) {
		return Date.now() - item.timestamp < item.ttl;
	}
	get(url, params) {
		const key = this.getCacheKey(url, params);
		const item = this.cache.get(key);
		if (!item) return null;
		if (!this.isValid(item)) {
			this.cache.delete(key);
			return null;
		}
		console.log(`[Cache] Hit: ${key}`);
		return item.data;
	}
	set(url, data, params, ttl = 300 * 1e3) {
		const key = this.getCacheKey(url, params);
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl
		});
		console.log(`[Cache] Set: ${key} (TTL: ${ttl}ms)`);
	}
	clear(url, params) {
		if (url) {
			const key = this.getCacheKey(url, params);
			this.cache.delete(key);
			console.log(`[Cache] Clear: ${key}`);
		} else {
			this.cache.clear();
			console.log("[Cache] Clear all");
		}
	}
	clearExpired() {
		let count = 0;
		for (const [key, item] of this.cache.entries()) if (!this.isValid(item)) {
			this.cache.delete(key);
			count++;
		}
		if (count > 0) console.log(`[Cache] Cleared ${count} expired items`);
	}
	async dedupe(key, requestFn, config = {}) {
		const { ttl = 300 * 1e3, force = false } = config;
		if (!force) {
			const cached = this.get(key);
			if (cached) return cached;
		}
		if (this.pending.has(key)) {
			console.log(`[Dedupe] Waiting for pending request: ${key}`);
			return this.pending.get(key);
		}
		console.log(`[Dedupe] New request: ${key}`);
		const promise = requestFn().then((data) => {
			this.set(key, data, void 0, ttl);
			this.pending.delete(key);
			return data;
		}).catch((error) => {
			this.pending.delete(key);
			console.log(`[Dedupe] Request failed, clearing pending: ${key}`);
			throw error;
		});
		this.pending.set(key, promise);
		return promise;
	}
	cancelPending(key) {
		if (key) {
			this.pending.delete(key);
			console.log(`[Dedupe] Cancel: ${key}`);
		} else {
			this.pending.clear();
			console.log("[Dedupe] Cancel all pending requests");
		}
	}
	getStats() {
		return {
			cacheSize: this.cache.size,
			pendingSize: this.pending.size,
			items: Array.from(this.cache.entries()).map(([key, item]) => ({
				key,
				valid: this.isValid(item),
				age: Date.now() - item.timestamp,
				ttl: item.ttl
			}))
		};
	}
};
const requestCache = new RequestCache();
if (typeof window !== "undefined") setInterval(() => {
	requestCache.clearExpired();
}, 300 * 1e3);
var logger_default = {
	log(...args) {
		console.log(...args);
	},
	error(...args) {
		console.error(...args);
	},
	warn(...args) {
		console.warn(...args);
	},
	info(...args) {
		console.info(...args);
	},
	debug(...args) {
		console.debug(...args);
	},
	criticalError(...args) {
		console.error(...args);
	},
	group(label, callback) {
		console.group(label);
		callback();
		console.groupEnd();
	},
	table(data) {
		console.table(data);
	}
};
var apiClient = axios.create({
	baseURL: "/api",
	timeout: 1e4,
	headers: { "Content-Type": "application/json" }
});
var isConfigured = false;
if (!isConfigured) {
	apiClient.interceptors.request.use((config) => {
		const authStore = useAuthStore();
		if (authStore.token) config.headers.Authorization = `Bearer ${authStore.token}`;
		return config;
	}, (error) => {
		logger_default.error("Request error:", error);
		return Promise.reject(error);
	});
	apiClient.interceptors.response.use((response) => {
		logger_default.debug(`Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
		return response;
	}, (error) => {
		if (error.response) {
			const { status } = error.response;
			logger_default.error(`Response error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${status}`);
			if (status === 401) {
				useAuthStore().logout();
				window.location.href = "/login";
			}
			if (status === 403) logger_default.warn("Permission denied");
			if (status === 429) logger_default.warn("Too many requests");
			if (status >= 500) logger_default.error("Server error");
		} else if (error.request) {
			logger_default.error("Network error - no response received:", error.message);
			logger_default.debug("Request details:", {
				url: error.config?.url,
				method: error.config?.method,
				timeout: error.config?.timeout
			});
		} else logger_default.error("Request setup error:", error.message);
		return Promise.reject(error);
	});
	isConfigured = true;
}
const api = {
	get(url, config) {
		const { cache = true, ttl = 300 * 1e3,...axiosConfig } = config || {};
		if (cache) {
			const cacheKey = `GET:${url}:${JSON.stringify(axiosConfig.params || {})}`;
			return requestCache.dedupe(cacheKey, () => apiClient.get(url, axiosConfig).then((res) => res.data), {
				ttl,
				force: false
			});
		}
		return apiClient.get(url, axiosConfig).then((res) => res.data);
	},
	post(url, data, config) {
		return apiClient.post(url, data, config).then((res) => res.data);
	},
	put(url, data, config) {
		return apiClient.put(url, data, config).then((res) => res.data);
	},
	patch(url, data, config) {
		return apiClient.patch(url, data, config).then((res) => res.data);
	},
	delete(url, config) {
		return apiClient.delete(url, config).then((res) => res.data);
	},
	clearCache(url, params) {
		if (url) {
			const cacheKey = `GET:${url}:${JSON.stringify(params || {})}`;
			requestCache.clear(cacheKey);
		} else requestCache.clear();
	},
	getCacheStats() {
		return requestCache.getStats();
	}
};
const useAuthStore = defineStore("auth", () => {
	const user = ref(null);
	const token = ref(null);
	const loading = ref(false);
	const error = ref(null);
	const isAuthenticated = computed(() => !!token.value);
	const isAdmin = computed(() => user.value?.is_admin ?? false);
	async function register(data) {
		loading.value = true;
		error.value = null;
		try {
			const response = await api.post("/auth/register", data);
			token.value = response.access_token;
			user.value = response.user;
			localStorage.setItem("access_token", response.access_token);
			localStorage.setItem("user", JSON.stringify(response.user));
			return response;
		} catch (err) {
			error.value = err.response?.data?.detail || "Registration failed";
			throw err;
		} finally {
			loading.value = false;
		}
	}
	async function login(credentials) {
		loading.value = true;
		error.value = null;
		try {
			const response = await api.post("/auth/login", credentials);
			token.value = response.access_token;
			user.value = response.user;
			localStorage.setItem("access_token", response.access_token);
			localStorage.setItem("user", JSON.stringify(response.user));
			return response;
		} catch (err) {
			error.value = err.response?.data?.detail || "Login failed";
			throw err;
		} finally {
			loading.value = false;
		}
	}
	function logout() {
		user.value = null;
		token.value = null;
		error.value = null;
		localStorage.removeItem("access_token");
		localStorage.removeItem("user");
		if (typeof window !== "undefined") sessionStorage.clear();
	}
	async function fetchCurrentUser() {
		if (!token.value) return;
		try {
			const response = await api.get("/auth/me");
			user.value = response;
			localStorage.setItem("user", JSON.stringify(response));
		} catch (err) {
			logger_default.error("Failed to fetch user:", err);
			logout();
		}
	}
	function restoreAuth() {
		const savedToken = localStorage.getItem("access_token");
		const savedUser = localStorage.getItem("user");
		if (savedToken && savedUser) {
			token.value = savedToken;
			try {
				user.value = JSON.parse(savedUser);
			} catch (err) {
				logger_default.error("Failed to parse saved user:", err);
				logout();
			}
		}
	}
	return {
		user,
		token,
		loading,
		error,
		isAuthenticated,
		isAdmin,
		register,
		login,
		logout,
		fetchCurrentUser,
		restoreAuth
	};
}, { persist: {
	key: "auth",
	storage: sessionStorage
} });
const postsApi = {
	getPosts(params) {
		return api.get("/posts", { params });
	},
	getPostById(postId) {
		return api.get(`/posts/${postId}`);
	},
	searchPosts(query, params) {
		return api.get("/posts", { params: {
			...params,
			q: query
		} });
	},
	getPostsByPlatform(platform, params) {
		return api.get("/posts", { params: {
			...params,
			platform
		} });
	},
	getPostStats() {
		return api.get("/posts/stats/summary");
	}
};
const authorsApi = {
	getAuthors(params) {
		return api.get("/authors", { params });
	},
	getAuthorById(authorId) {
		return api.get(`/authors/${authorId}`);
	},
	getAuthorPosts(authorId, params) {
		return api.get(`/authors/${authorId}/posts`, { params });
	}
};
const favoritesApi = {
	getFavorites(params) {
		return api.get("/favorites", { params });
	},
	addFavorite(data) {
		return api.post("/favorites", data);
	},
	updateFavorite(favoriteId, data) {
		return api.put(`/favorites/${favoriteId}`, data);
	},
	deleteFavorite(favoriteId) {
		return api.delete(`/favorites/${favoriteId}`);
	},
	getFolders() {
		return api.get("/favorites/folders");
	},
	async checkFavorite(postId) {
		return api.get(`/favorites/check/${postId}`, { cache: false });
	},
	async isFavorited(postId) {
		try {
			return (await this.checkFavorite(postId)).is_favorited;
		} catch {
			return false;
		}
	}
};
const statsApi = {
	async getPlatformStats() {
		return (await postsApi.getPostStats()).by_platform || {};
	},
	async getFullStats() {
		return postsApi.getPostStats();
	}
};
const uploadApi = {
	async uploadAvatar(file) {
		const formData = new FormData();
		formData.append("file", file);
		return api.post("/upload/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
	},
	async uploadUserAvatar(userId, file) {
		const formData = new FormData();
		formData.append("file", file);
		return api.post(`/upload/users/${userId}/avatar`, formData, { headers: { "Content-Type": "multipart/form-data" } });
	}
};
export { uploadApi as a, logger_default as c, statsApi as i, favoritesApi as n, useAuthStore as o, postsApi as r, api as s, authorsApi as t };
