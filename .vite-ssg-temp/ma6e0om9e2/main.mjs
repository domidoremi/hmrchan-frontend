import { c as logger_default, o as useAuthStore } from "./assets/api-services-BmQ9TwGt.js";
import { l as __plugin_vue_export_helper_default, u as useThemeStore } from "./assets/view-authorspage-B1NrczNS.js";
import { n as useSettingsStore } from "./assets/view-homepage-BmVNjp4X.js";
import { c as useSkipLinks, s as useKeyboardNavigation } from "./assets/composables-CdbJX3Qi.js";
import { KeepAlive, Transition, createApp, createBlock, createVNode, defineComponent, mergeProps, onErrorCaptured, onMounted, openBlock, ref, resolveDynamicComponent, useSSRContext, watch, withCtx } from "vue";
import { createPinia, storeToRefs } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { RouterView, createRouter, createWebHistory, useRouter } from "vue-router";
import { createI18n, useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderAttrs, ssrRenderComponent, ssrRenderSlot, ssrRenderVNode } from "vue/server-renderer";
var ErrorBoundary_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ErrorBoundary",
	props: {
		fallback: {
			type: Boolean,
			required: false,
			default: true
		},
		onError: {
			type: Function,
			required: false
		}
	},
	setup(__props, { expose: __expose }) {
		__expose();
		const props = __props;
		const error$3 = ref(null);
		const errorInfo = ref("");
		const hasError = ref(false);
		const router$1 = useRouter();
		const { t } = useI18n();
		const isDev = true;
		onErrorCaptured((err, instance, info) => {
			logger_default.criticalError("[ErrorBoundary] Caught error:", err);
			logger_default.criticalError("[ErrorBoundary] Error info:", info);
			error$3.value = err;
			errorInfo.value = info;
			hasError.value = true;
			if (props.onError) props.onError(err, instance, info);
			return false;
		});
		const reset = () => {
			error$3.value = null;
			errorInfo.value = "";
			hasError.value = false;
		};
		const goHome = () => {
			reset();
			router$1.push("/");
		};
		const reload = () => {
			window.location.reload();
		};
		const __returned__ = {
			props,
			error: error$3,
			errorInfo,
			hasError,
			router: router$1,
			t,
			isDev,
			reset,
			goHome,
			reload
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	if ($setup.hasError && $props.fallback) {
		_push(`<div${ssrRenderAttrs(mergeProps({ class: "error-boundary" }, _attrs))} data-v-0455a002><div class="error-container" data-v-0455a002><div class="error-icon" data-v-0455a002>⚠️</div><h1 class="error-title" data-v-0455a002>${ssrInterpolate($setup.t("error.title"))}</h1><p class="error-message" data-v-0455a002>${ssrInterpolate($setup.error?.message || $setup.t("error.unknown"))}</p>`);
		if ($setup.isDev) _push(`<details class="error-details" data-v-0455a002><summary data-v-0455a002>${ssrInterpolate($setup.t("error.details"))}</summary><pre class="error-stack" data-v-0455a002>${ssrInterpolate($setup.error?.stack)}</pre><p class="error-info" data-v-0455a002><strong data-v-0455a002>${ssrInterpolate($setup.t("error.componentInfo"))}:</strong> ${ssrInterpolate($setup.errorInfo)}</p></details>`);
		else _push(`<!---->`);
		_push(`<div class="error-actions" data-v-0455a002><button class="btn btn-primary" data-v-0455a002>${ssrInterpolate($setup.t("error.retry"))}</button><button class="btn btn-secondary" data-v-0455a002>${ssrInterpolate($setup.t("error.goHome"))}</button><button class="btn btn-secondary" data-v-0455a002>${ssrInterpolate($setup.t("error.reload"))}</button></div></div></div>`);
	} else ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
}
var _sfc_setup$1 = ErrorBoundary_vue_vue_type_script_setup_true_lang_default.setup;
ErrorBoundary_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ErrorBoundary.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var ErrorBoundary_default = /* @__PURE__ */ __plugin_vue_export_helper_default(ErrorBoundary_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-0455a002"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ErrorBoundary.vue"]
]);
var App_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "App",
	setup(__props, { expose: __expose }) {
		__expose();
		const authStore = useAuthStore();
		const themeStore$1 = useThemeStore();
		const settingsStore$1 = useSettingsStore();
		const { isDark } = storeToRefs(themeStore$1);
		const router$1 = useRouter();
		const transitionName = ref("fade");
		const cachedComponents = [
			"HomePage",
			"ExplorePage",
			"AuthorsPage"
		];
		watch(() => router$1.currentRoute.value, (to) => {
			const transition = to?.meta?.transition;
			if (transition === "slide-left") transitionName.value = "slide-left";
			else if (transition === "slide-right") transitionName.value = "slide-right";
			else transitionName.value = "fade";
		}, { immediate: false });
		useKeyboardNavigation();
		useSkipLinks();
		onMounted(async () => {
			themeStore$1.initTheme();
			settingsStore$1.initSettings();
			authStore.restoreAuth();
			if (authStore.isAuthenticated) Promise.all([authStore.fetchCurrentUser().catch(() => {
				console.warn("Failed to fetch current user, using cached data");
			}), settingsStore$1.loadFromServer().catch(() => {
				console.warn("Failed to load server settings, using local settings");
			})]).catch(() => {});
		});
		watch(() => authStore.isAuthenticated, async (isAuthenticated) => {
			if (isAuthenticated) await settingsStore$1.loadFromServer();
		});
		const __returned__ = {
			authStore,
			themeStore: themeStore$1,
			settingsStore: settingsStore$1,
			isDark,
			router: router$1,
			transitionName,
			cachedComponents,
			get RouterView() {
				return RouterView;
			},
			ErrorBoundary: ErrorBoundary_default
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({
		id: "app",
		"data-theme": $setup.isDark ? "dark" : "light"
	}, _attrs))}>`);
	_push(ssrRenderComponent($setup["ErrorBoundary"], null, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<main id="main-content" tabindex="-1"${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["RouterView"], null, {
					default: withCtx(({ Component, route }, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) {
							_push$2(``);
							ssrRenderVNode(_push$2, createVNode(resolveDynamicComponent(Component), { key: route.path }, null), _parent$2, _scopeId$1);
						} else return [createVNode(Transition, {
							name: $setup.transitionName,
							mode: "out-in"
						}, {
							default: withCtx(() => [(openBlock(), createBlock(KeepAlive, {
								include: $setup.cachedComponents,
								max: 5
							}, [(openBlock(), createBlock(resolveDynamicComponent(Component), { key: route.path }))], 1024))]),
							_: 2
						}, 1032, ["name"])];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(`</main>`);
			} else return [createVNode("main", {
				id: "main-content",
				tabindex: "-1"
			}, [createVNode($setup["RouterView"], null, {
				default: withCtx(({ Component, route }) => [createVNode(Transition, {
					name: $setup.transitionName,
					mode: "out-in"
				}, {
					default: withCtx(() => [(openBlock(), createBlock(KeepAlive, {
						include: $setup.cachedComponents,
						max: 5
					}, [(openBlock(), createBlock(resolveDynamicComponent(Component), { key: route.path }))], 1024))]),
					_: 2
				}, 1032, ["name"])]),
				_: 1
			})])];
		}),
		_: 1
	}, _parent));
	_push(`</div>`);
}
var _sfc_setup = App_vue_vue_type_script_setup_true_lang_default.setup;
App_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/App.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var App_default = /* @__PURE__ */ __plugin_vue_export_helper_default(App_vue_vue_type_script_setup_true_lang_default, [["ssrRender", _sfc_ssrRender], ["__file", "F:/Projects/hmrchan/frontend/src/App.vue"]]);
var router = createRouter({
	history: createWebHistory("/"),
	routes: [
		{
			path: "/",
			name: "home",
			component: () => import(
				/* webpackChunkName: "home" */
				"./assets/HomePage-nvdZOGkQ.js"
),
			meta: {
				title: "Home",
				preload: true
			}
		},
		{
			path: "/explore",
			name: "explore",
			component: () => import(
				/* webpackChunkName: "explore" */
				"./assets/ExplorePage-CVjKtrAB.js"
),
			meta: {
				title: "Explore",
				preload: true
			}
		},
		{
			path: "/login",
			name: "login",
			component: () => import("./assets/LoginPage-Dmh7umMd.js"),
			meta: {
				title: "Login",
				guest: true
			}
		},
		{
			path: "/register",
			name: "register",
			component: () => import("./assets/RegisterPage-Q-e7-AB3.js"),
			meta: {
				title: "Register",
				guest: true
			}
		},
		{
			path: "/posts/:id",
			name: "post-detail",
			component: () => import("./assets/PostDetailPage-BGuwlXmj.js"),
			meta: { title: "Post Detail" }
		},
		{
			path: "/favorites",
			name: "favorites",
			component: () => import("./assets/FavoritesPage-CwLaOsrg.js"),
			meta: {
				title: "Favorites",
				requiresAuth: true
			}
		},
		{
			path: "/authors",
			name: "authors",
			component: () => import("./assets/AuthorsPage-BDjjczRh.js"),
			meta: { title: "Authors" }
		},
		{
			path: "/settings",
			name: "settings",
			component: () => import("./assets/SettingsPage-DYUOi40_.js"),
			meta: {
				title: "Settings",
				requiresAuth: true
			}
		},
		{
			path: "/profile",
			name: "profile",
			component: () => import("./assets/ProfilePage-Crd-c3i1.js"),
			meta: {
				title: "Profile",
				requiresAuth: true
			}
		},
		{
			path: "/preferences",
			name: "preferences",
			component: () => import("./assets/PreferencesPage-ihJ3EhZ6.js"),
			meta: { title: "Preferences" }
		},
		{
			path: "/privacy",
			name: "privacy",
			component: () => import("./assets/PrivacyPage-YJNbVcp-.js"),
			meta: { title: "Privacy Policy" }
		},
		{
			path: "/:pathMatch(.*)*",
			name: "not-found",
			component: () => import("./assets/NotFoundPage-CZmulxIK.js"),
			meta: { title: "404" }
		}
	],
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) return {
			...savedPosition,
			behavior: "smooth"
		};
		if (to.hash) return {
			el: to.hash,
			behavior: "smooth"
		};
		return {
			top: 0,
			behavior: "smooth"
		};
	}
});
router.beforeEach((to, from, next) => {
	const authStore = useAuthStore();
	const appName = "himeri chan";
	if (to.meta.title) document.title = `${to.meta.title} - ${appName}`;
	if (to.meta.requiresAuth && !authStore.isAuthenticated) {
		next({
			name: "login",
			query: { redirect: to.fullPath }
		});
		return;
	}
	if (to.meta.guest && authStore.isAuthenticated) {
		next({ name: "home" });
		return;
	}
	next();
});
var router_default = router;
var en_default = {
	app: {
		"name": "HMRChan",
		"description": "Social Media Content Aggregator"
	},
	nav: {
		"home": "Home",
		"explore": "Explore",
		"authors": "Authors",
		"profile": "Profile",
		"settings": "Settings",
		"favorites": "Favorites",
		"privacy": "Privacy Policy",
		"login": "Login",
		"register": "Register",
		"logout": "Logout"
	},
	platform: {
		"youtube": "YouTube",
		"twitter": "Twitter",
		"tiktok": "TikTok",
		"instagram": "Instagram",
		"all": "All Platforms"
	},
	post: {
		"title": "Post",
		"description": "Description",
		"author": "Author",
		"views": "views",
		"likes": "likes",
		"comments": "comments",
		"duration": "Duration",
		"published": "Published",
		"publishedAt": "Published at",
		"scraped": "Scraped",
		"scrapedAt": "Scraped at",
		"viewOriginal": "View Original",
		"retweet": "Retweet",
		"originalAuthor": "Original Author",
		"tags": "Tags",
		"media": "Media",
		"relatedPosts": "Related Posts",
		"loadingMedia": "Loading...",
		"video": "Video",
		"image": "Image",
		"videoNotSupported": "Your browser does not support video playback",
		"addToFavorites": "Add to Favorites",
		"unfavorite": "Remove from Favorites"
	},
	search: {
		"placeholder": "Search content...",
		"noResults": "No results found",
		"searching": "Searching...",
		"tryDifferent": "Try different keywords"
	},
	filter: {
		"sortBy": "Sort By",
		"latest": "Latest",
		"popular": "Most Popular",
		"oldest": "Oldest",
		"platform": "Platform",
		"hasMedia": "Has Media",
		"dateRange": "Date Range",
		"published": "Published Date"
	},
	auth: {
		"login": "Login",
		"logout": "Logout",
		"username": "Username",
		"password": "Password",
		"email": "Email",
		"fullName": "Full Name",
		"rememberMe": "Remember Me",
		"forgotPassword": "Forgot Password?",
		"loginSuccess": "Login successful",
		"loginFailed": "Login failed",
		"logoutSuccess": "Logout successful",
		"registerTitle": "Create Account",
		"registerDescription": "Join us and unlock more exciting content",
		"registerButton": "Register",
		"noAccount": "Don't have an account?",
		"hasAccount": "Already have an account?",
		"registerNow": "Register now",
		"loginNow": "Login now",
		"confirmPassword": "Confirm Password",
		"usernamePlaceholder": "Username (3-50 characters)",
		"emailPlaceholder": "Email address",
		"fullNamePlaceholder": "Your name",
		"passwordPlaceholder": "Password (at least 8 characters)",
		"confirmPasswordPlaceholder": "Enter password again",
		"fillAllFields": "Please fill in all required fields",
		"usernameLength": "Username must be 3-50 characters",
		"invalidEmail": "Please enter a valid email address",
		"passwordLength": "Password must be at least 8 characters",
		"passwordMismatch": "Passwords do not match",
		"registrationSuccess": "Registration successful! Redirecting...",
		"registrationFailed": "Registration failed, please try again",
		"loginFailedMessage": "Login failed. Please try again."
	},
	favorite: {
		"add": "Add to Favorites",
		"remove": "Remove from Favorites",
		"folder": "Folder",
		"tags": "Tags",
		"notes": "Notes",
		"addSuccess": "Added to favorites",
		"removeSuccess": "Removed from favorites",
		"addFailed": "Failed to add favorite",
		"removeFailed": "Failed to remove favorite",
		"updateSuccess": "Favorite updated",
		"updateFailed": "Failed to update favorite",
		"loginRequired": "Please login to add favorites"
	},
	settings: {
		"theme": "Theme",
		"language": "Language",
		"display": "Display Settings",
		"showHeroSection": "Show Hero Section",
		"showHeroSectionDesc": "Display the hero banner on the home page",
		"hideHeroSection": "Hide hero banner (can be restored in settings)",
		"light": "Light",
		"dark": "Dark",
		"auto": "Auto",
		"toggleTheme": "Toggle theme"
	},
	common: {
		"loading": "Loading...",
		"error": "Error",
		"success": "Success",
		"cancel": "Cancel",
		"confirm": "Confirm",
		"save": "Save",
		"delete": "Delete",
		"edit": "Edit",
		"close": "Close",
		"more": "More",
		"less": "Less",
		"back": "Back",
		"next": "Next",
		"previous": "Previous",
		"page": "Page",
		"of": "of",
		"total": "Total",
		"reset": "Reset",
		"apply": "Apply",
		"order": "Order",
		"noMore": "No more items",
		"swipeToView": "Swipe to view",
		"loadFailed": "Failed to load",
		"operationFailed": "Operation failed",
		"loadFailedContent": "Failed to load content",
		"noData": "No data found",
		"zoomIn": "Zoom In",
		"zoomOut": "Zoom Out",
		"backToTop": "Back to Top",
		"fullscreen": "Fullscreen",
		"download": "Download"
	},
	author: {
		"title": "Authors",
		"followers": "Followers",
		"posts": "Posts",
		"videos": "Videos",
		"verified": "Verified",
		"joined": "Joined",
		"platformJoined": "Joined Platform",
		"bio": "Bio",
		"profile": "Profile",
		"viewProfile": "View Profile",
		"viewOriginal": "View on Platform",
		"scraped": "Collected",
		"noAuthors": "No authors found",
		"loadFailed": "Failed to load authors",
		"totalFollowers": "Total Followers",
		"totalPosts": "Total Posts"
	},
	profile: {
		"title": "Profile",
		"editProfile": "Edit Profile",
		"changePassword": "Change Password",
		"deleteAccount": "Delete Account",
		"accountInfo": "Account Information",
		"dangerZone": "Danger Zone",
		"username": "Username",
		"email": "Email",
		"fullName": "Full Name",
		"joinedAt": "Joined At",
		"accountStatus": "Account Status",
		"active": "Active",
		"inactive": "Inactive",
		"verified": "Verified",
		"notVerified": "Not Verified",
		"sendVerification": "Send Verification Email",
		"admin": "Administrator",
		"favorites": "Favorites",
		"views": "Views",
		"days": "Days",
		"currentPassword": "Current Password",
		"newPassword": "New Password",
		"confirmPassword": "Confirm Password",
		"passwordMinLength": "Password must be at least 8 characters",
		"passwordMismatch": "Passwords do not match",
		"passwordChanged": "Password changed successfully, please login again",
		"passwordChangeFailed": "Failed to change password",
		"profileUpdated": "Profile updated successfully",
		"profileUpdateFailed": "Failed to update profile",
		"deleteConfirmTitle": "Confirm Account Deletion?",
		"deleteWarning": "This action cannot be undone. All your data will be permanently deleted",
		"enterPasswordToConfirm": "Please enter your password to confirm",
		"accountDeleted": "Account deleted",
		"accountDeleteFailed": "Failed to delete account",
		"dangerZoneDescription": "These actions are irreversible, please proceed with caution",
		"avatarUploading": "Uploading avatar...",
		"avatarUploadSuccess": "Avatar uploaded successfully",
		"avatarUploadFailed": "Failed to upload avatar",
		"notSet": "Not Set",
		"logout": "Logout",
		"personalInfo": "Personal Information",
		"statistics": "Statistics",
		"deleteItems": {
			"profile": "Profile and settings",
			"favorites": "All favorites and comments",
			"access": "Account access"
		}
	},
	access: {
		"limit": "Access Limit",
		"limitMessage": "Showing {current} / {limit} posts",
		"loginForMore": "Login to see more",
		"unlimited": "Unlimited"
	},
	upload: {
		"onlyImages": "Only JPG, PNG, WebP images are supported",
		"processingFailed": "Image processing failed",
		"tooLarge": "File too large, maximum 5MB"
	},
	error: {
		"title": "Something went wrong",
		"unknown": "Unknown error",
		"details": "Error Details",
		"componentInfo": "Component Info",
		"retry": "Retry",
		"goHome": "Go Home",
		"reload": "Reload Page"
	},
	errors: {
		"permissionDenied": "Permission denied",
		"tooManyRequests": "Too many requests, please try again later",
		"serverError": "Server error, please try again later",
		"networkError": "Network error, please check your connection",
		"unknownError": "Unknown error",
		"videoPlaybackFailed": "Video playback failed"
	},
	aria: {
		"closeMenu": "Close menu",
		"openMenu": "Open menu",
		"userMenu": "User menu",
		"languageMenu": "Language menu",
		"togglePassword": "Toggle password visibility",
		"previousImage": "Previous image",
		"nextImage": "Next image",
		"closeViewer": "Close viewer",
		"loading": "Loading"
	},
	cookies: {
		"title": "Cookie Notice",
		"description": "We use cookies to improve your browsing experience, provide personalized content, and analyze website traffic.",
		"learnMore": "Learn more",
		"acceptAll": "Accept All",
		"rejectAll": "Reject All",
		"customize": "Customize",
		"customizeTitle": "Customize Cookie Settings",
		"essential": "Essential Cookies",
		"essentialDesc": "These cookies are necessary for the website to function and cannot be disabled.",
		"analytics": "Analytics Cookies",
		"analyticsDesc": "Help us understand how visitors use our website to improve our services.",
		"performance": "Performance Cookies",
		"performanceDesc": "Collect information about website performance to help us optimize loading speed.",
		"personalization": "Personalization Cookies",
		"personalizationDesc": "Remember your preferences to provide personalized content.",
		"required": "Required"
	},
	preferences: {
		"title": "User Preferences",
		"subtitle": "Customize your browsing experience",
		"syncing": "Syncing...",
		"synced": "Synced",
		"localOnly": "Local only",
		"display": "Display Settings",
		"showHeroSection": "Show Hero Banner",
		"showHeroSectionDesc": "Display welcome banner and statistics at the top of homepage",
		"enableAnimations": "Enable Animations",
		"enableAnimationsDesc": "Enable page transitions and interaction animations",
		"postsPerPage": "Posts Per Page",
		"postsPerPageDesc": "Set the number of posts displayed per page",
		"media": "Media Settings",
		"autoPlayVideos": "Auto-play Videos",
		"autoPlayVideosDesc": "Automatically start playback when opening videos (MediaViewer only)",
		"showImagePreviews": "Show Image Previews",
		"showImagePreviewsDesc": "Display image thumbnails in lists",
		"privacy": "Privacy & Data",
		"analyticsEnabled": "Analytics",
		"analyticsEnabledDesc": "Allow collection of anonymous usage data to improve services",
		"performanceCookies": "Performance Cookies",
		"performanceCookiesDesc": "Collect performance data to optimize website speed",
		"personalizedContent": "Personalized Content",
		"personalizedContentDesc": "Recommend content based on your preferences",
		"dataCollection": "Data Collection",
		"dataCollectionDesc": "Allow collection of usage data for analysis",
		"privacyNote": "We value your privacy. All data collection is anonymous and used solely to improve our services.",
		"readPrivacyPolicy": "Read Privacy Policy",
		"dataManagement": "Data Management",
		"exportData": "Export Settings",
		"importData": "Import Settings",
		"resetDefaults": "Reset to Defaults",
		"settingsSaved": "Settings saved",
		"exportSuccess": "Settings exported",
		"importSuccess": "Settings imported",
		"importFailed": "Import failed",
		"resetConfirm": "Are you sure you want to reset to default settings?",
		"resetSuccess": "Settings reset"
	},
	privacy: {
		"title": "Privacy Policy",
		"lastUpdated": "Last updated",
		"questions": "If you have any questions, please contact us.",
		"managePreferences": "Manage Preferences",
		"intro": {
			"title": "Introduction",
			"content": "<p>Welcome to himeri chan! We value your privacy and this policy explains how we collect, use, and protect your personal information.</p><p>By using our service, you agree to the practices described in this privacy policy.</p>"
		},
		"dataCollection": {
			"title": "Information We Collect",
			"content": "<p>We collect the following types of information:</p><ul><li><strong>Account Information</strong>: Username, email address, avatar (if you choose to provide)</li><li><strong>Usage Data</strong>: Browsing history, search queries, favorited content</li><li><strong>Technical Data</strong>: IP address, browser type, device information, cookies</li><li><strong>Preferences</strong>: Your custom settings and preferences</li></ul>"
		},
		"cookies": {
			"title": "Cookie Usage",
			"content": "<p>We use the following types of cookies:</p><ul><li><strong>Essential Cookies</strong>: Ensure proper website operation (cannot be disabled)</li><li><strong>Functional Cookies</strong>: Remember your preference settings</li><li><strong>Analytics Cookies</strong>: Understand website usage (requires your consent)</li><li><strong>Performance Cookies</strong>: Optimize website performance (requires your consent)</li></ul><p>You can manage cookies in your preferences.</p>"
		},
		"dataUse": {
			"title": "How We Use Information",
			"content": "<p>We use collected information to:</p><ul><li>Provide and improve our services</li><li>Personalize your experience</li><li>Analyze website usage</li><li>Send important notifications and updates</li><li>Prevent fraud and abuse</li></ul>"
		},
		"dataSharing": {
			"title": "Information Sharing",
			"content": "<p>We do <strong>not</strong> sell your personal information. We may share information in the following cases:</p><ul><li>With your explicit consent</li><li>To comply with legal requirements</li><li>With our service providers (who are bound by confidentiality agreements)</li></ul>"
		},
		"yourRights": {
			"title": "Your Rights",
			"content": "<p>You have the right to:</p><ul><li>Access and download your personal data</li><li>Correct inaccurate information</li><li>Delete your account and data</li><li>Object to certain data processing</li><li>Withdraw consent at any time</li></ul><p>You can manage these settings in your profile.</p>"
		},
		"security": {
			"title": "Data Security",
			"content": "<p>We take appropriate technical and organizational measures to protect your data:</p><ul><li>Encrypted transmission (HTTPS)</li><li>Secure data storage</li><li>Access control and permission management</li><li>Regular security audits</li></ul>"
		},
		"changes": {
			"title": "Policy Changes",
			"content": "<p>We may update this privacy policy from time to time. Significant changes will be communicated through website notifications or email.</p><p>Please review this page regularly for the latest information.</p>"
		}
	}
};
var zh_CN_default = {
	app: {
		"name": "HMRChan",
		"description": "社交媒体内容聚合系统"
	},
	nav: {
		"home": "首页",
		"explore": "探索",
		"authors": "作者",
		"profile": "个人中心",
		"settings": "设置",
		"favorites": "收藏",
		"privacy": "隐私政策",
		"login": "登录",
		"register": "注册",
		"logout": "登出"
	},
	platform: {
		"youtube": "YouTube",
		"twitter": "Twitter",
		"tiktok": "TikTok",
		"instagram": "Instagram",
		"all": "全部平台"
	},
	post: {
		"title": "帖子",
		"description": "描述",
		"author": "作者",
		"views": "观看",
		"likes": "喜欢",
		"comments": "评论",
		"duration": "时长",
		"published": "发布时间",
		"publishedAt": "发布时间",
		"scraped": "抓取时间",
		"scrapedAt": "抓取时间",
		"viewOriginal": "查看原帖",
		"retweet": "转发",
		"originalAuthor": "原作者",
		"tags": "标签",
		"media": "媒体",
		"relatedPosts": "相关帖子",
		"loadingMedia": "加载中...",
		"video": "视频",
		"image": "图片",
		"videoNotSupported": "您的浏览器不支持视频播放",
		"addToFavorites": "添加到收藏",
		"unfavorite": "取消收藏"
	},
	search: {
		"placeholder": "搜索内容...",
		"noResults": "未找到结果",
		"searching": "搜索中...",
		"tryDifferent": "尝试其他关键词"
	},
	filter: {
		"sortBy": "排序方式",
		"latest": "最新",
		"popular": "最热门",
		"oldest": "最早",
		"platform": "平台",
		"hasMedia": "包含媒体",
		"dateRange": "日期范围",
		"published": "发布日期"
	},
	auth: {
		"login": "登录",
		"logout": "退出",
		"username": "用户名",
		"password": "密码",
		"email": "邮箱",
		"fullName": "姓名",
		"rememberMe": "记住我",
		"forgotPassword": "忘记密码？",
		"loginSuccess": "登录成功",
		"loginFailed": "登录失败",
		"logoutSuccess": "退出成功",
		"registerTitle": "创建账号",
		"registerDescription": "加入我们，解锁更多精彩内容",
		"registerButton": "注册",
		"noAccount": "还没有账号？",
		"hasAccount": "已有账号？",
		"registerNow": "立即注册",
		"loginNow": "立即登录",
		"confirmPassword": "确认密码",
		"usernamePlaceholder": "用户名（3-50个字符）",
		"emailPlaceholder": "邮箱地址",
		"fullNamePlaceholder": "您的姓名",
		"passwordPlaceholder": "密码（至少8个字符）",
		"confirmPasswordPlaceholder": "再次输入密码",
		"fillAllFields": "请填写所有必填项",
		"usernameLength": "用户名长度应为3-50个字符",
		"invalidEmail": "请输入有效的邮箱地址",
		"passwordLength": "密码长度至少为8个字符",
		"passwordMismatch": "两次输入的密码不一致",
		"registrationSuccess": "注册成功！正在跳转...",
		"registrationFailed": "注册失败，请重试",
		"loginFailedMessage": "登录失败，请重试"
	},
	favorite: {
		"add": "添加收藏",
		"remove": "取消收藏",
		"folder": "文件夹",
		"tags": "标签",
		"notes": "备注",
		"addSuccess": "已添加到收藏",
		"removeSuccess": "已取消收藏",
		"addFailed": "添加收藏失败",
		"removeFailed": "取消收藏失败",
		"updateSuccess": "收藏已更新",
		"updateFailed": "更新收藏失败",
		"loginRequired": "请登录后添加收藏"
	},
	settings: {
		"theme": "主题",
		"language": "语言",
		"display": "显示设置",
		"showHeroSection": "显示首页横幅",
		"showHeroSectionDesc": "在首页显示横幅区域",
		"hideHeroSection": "隐藏首页横幅（可在设置中恢复）",
		"light": "浅色",
		"dark": "深色",
		"auto": "自动",
		"toggleTheme": "切换主题"
	},
	common: {
		"loading": "加载中...",
		"error": "错误",
		"success": "成功",
		"cancel": "取消",
		"confirm": "确认",
		"save": "保存",
		"delete": "删除",
		"edit": "编辑",
		"close": "关闭",
		"more": "更多",
		"less": "收起",
		"back": "返回",
		"next": "下一页",
		"previous": "上一页",
		"page": "第",
		"of": "页，共",
		"total": "总计",
		"reset": "重置",
		"apply": "应用",
		"order": "排序",
		"noMore": "没有更多了",
		"swipeToView": "滑动查看",
		"loadFailed": "加载失败",
		"operationFailed": "操作失败",
		"loadFailedContent": "内容加载失败",
		"noData": "暂无数据",
		"zoomIn": "放大",
		"zoomOut": "缩小",
		"backToTop": "回到顶部",
		"fullscreen": "全屏",
		"download": "下载"
	},
	author: {
		"title": "创作者",
		"followers": "粉丝",
		"posts": "帖子",
		"videos": "视频",
		"verified": "已认证",
		"joined": "加入时间",
		"platformJoined": "加入平台",
		"bio": "简介",
		"profile": "主页",
		"viewProfile": "查看主页",
		"viewOriginal": "查看原始页面",
		"scraped": "已收集",
		"noAuthors": "暂无创作者",
		"loadFailed": "加载创作者失败",
		"totalFollowers": "总粉丝数",
		"totalPosts": "总帖子数"
	},
	profile: {
		"title": "个人中心",
		"editProfile": "编辑资料",
		"changePassword": "修改密码",
		"deleteAccount": "删除账户",
		"accountInfo": "账户信息",
		"dangerZone": "危险区域",
		"username": "用户名",
		"email": "邮箱",
		"fullName": "姓名",
		"joinedAt": "注册时间",
		"accountStatus": "账户状态",
		"active": "活跃",
		"inactive": "已禁用",
		"verified": "已验证",
		"notVerified": "未验证",
		"sendVerification": "发送验证邮件",
		"admin": "管理员",
		"favorites": "收藏",
		"views": "浏览",
		"days": "天",
		"currentPassword": "当前密码",
		"newPassword": "新密码",
		"confirmPassword": "确认密码",
		"passwordMinLength": "密码至少8个字符",
		"passwordMismatch": "两次密码不一致",
		"passwordChanged": "密码修改成功，请重新登录",
		"passwordChangeFailed": "密码修改失败",
		"profileUpdated": "资料更新成功",
		"profileUpdateFailed": "资料更新失败",
		"deleteConfirmTitle": "确认删除账户？",
		"deleteWarning": "此操作不可恢复，您的所有数据将被永久删除",
		"enterPasswordToConfirm": "请输入您的密码确认",
		"accountDeleted": "账户已删除",
		"accountDeleteFailed": "账户删除失败",
		"dangerZoneDescription": "这些操作不可逆，请谨慎执行",
		"avatarUploading": "正在上传头像...",
		"avatarUploadSuccess": "头像上传成功",
		"avatarUploadFailed": "头像上传失败",
		"notSet": "未设置",
		"logout": "登出账户",
		"personalInfo": "个人信息",
		"statistics": "统计数据",
		"deleteItems": {
			"profile": "个人资料和设置",
			"favorites": "所有收藏和评论",
			"access": "账户访问权限"
		}
	},
	access: {
		"limit": "访问限制",
		"limitMessage": "当前显示 {current} / {limit} 条帖子",
		"loginForMore": "登录查看更多",
		"unlimited": "无限制",
		"guestMode": "访客模式",
		"nearLimit": "接近访问限制",
		"contentAccess": "内容访问",
		"guestMessage": "您正在查看最新 {limit} 条内容，登录后可查看更多精彩内容",
		"nearLimitMessage": "还可以查看 {remaining} 条内容，升级会员解锁全部内容",
		"loadedMessage": "已加载 {current}/{limit} 条内容"
	},
	upload: {
		"onlyImages": "只支持 JPG、PNG、WebP 格式的图片",
		"processingFailed": "图片处理失败",
		"tooLarge": "文件太大，最大支持 5MB"
	},
	error: {
		"title": "出错了",
		"unknown": "未知错误",
		"details": "错误详情",
		"componentInfo": "组件信息",
		"retry": "重试",
		"goHome": "返回首页",
		"reload": "刷新页面"
	},
	errors: {
		"permissionDenied": "权限不足",
		"tooManyRequests": "请求过于频繁，请稍后再试",
		"serverError": "服务器错误，请稍后再试",
		"networkError": "网络错误，请检查您的连接",
		"unknownError": "未知错误",
		"videoPlaybackFailed": "视频播放失败"
	},
	aria: {
		"closeMenu": "关闭菜单",
		"openMenu": "打开菜单",
		"userMenu": "用户菜单",
		"languageMenu": "语言菜单",
		"togglePassword": "切换密码可见性",
		"previousImage": "上一张图片",
		"nextImage": "下一张图片",
		"closeViewer": "关闭查看器",
		"loading": "正在加载"
	},
	cookies: {
		"title": "Cookie 使用提示",
		"description": "我们使用 Cookie 来改善您的浏览体验，提供个性化内容和分析网站流量。",
		"learnMore": "了解更多",
		"acceptAll": "接受全部",
		"rejectAll": "拒绝全部",
		"customize": "自定义设置",
		"customizeTitle": "自定义 Cookie 设置",
		"essential": "必需 Cookie",
		"essentialDesc": "这些 Cookie 对网站的正常运行是必需的，无法禁用。",
		"analytics": "分析 Cookie",
		"analyticsDesc": "帮助我们了解访问者如何使用网站，以改进我们的服务。",
		"performance": "性能 Cookie",
		"performanceDesc": "收集有关网站性能的信息，帮助我们优化加载速度。",
		"personalization": "个性化 Cookie",
		"personalizationDesc": "记住您的偏好，为您提供个性化内容。",
		"required": "必需"
	},
	preferences: {
		"title": "用户偏好设置",
		"subtitle": "自定义您的浏览体验",
		"syncing": "同步中...",
		"synced": "已同步",
		"localOnly": "仅本地",
		"display": "显示设置",
		"showHeroSection": "显示首页横幅",
		"showHeroSectionDesc": "在首页顶部显示欢迎横幅和统计信息",
		"enableAnimations": "启用动画效果",
		"enableAnimationsDesc": "启用页面过渡和交互动画",
		"postsPerPage": "每页帖子数量",
		"postsPerPageDesc": "设置每页显示的帖子数量",
		"media": "媒体设置",
		"autoPlayVideos": "自动播放视频",
		"autoPlayVideosDesc": "打开视频时自动开始播放（仅在打开 MediaViewer 时）",
		"showImagePreviews": "显示图片预览",
		"showImagePreviewsDesc": "在列表中显示图片缩略图",
		"privacy": "隐私和数据",
		"analyticsEnabled": "分析统计",
		"analyticsEnabledDesc": "允许收集匿名使用数据以改进服务",
		"performanceCookies": "性能 Cookie",
		"performanceCookiesDesc": "收集性能数据以优化网站速度",
		"personalizedContent": "个性化内容",
		"personalizedContentDesc": "根据您的偏好推荐内容",
		"dataCollection": "数据收集",
		"dataCollectionDesc": "允许收集使用数据用于分析",
		"privacyNote": "我们重视您的隐私。所有数据收集都是匿名的，仅用于改进服务。",
		"readPrivacyPolicy": "阅读隐私政策",
		"dataManagement": "数据管理",
		"exportData": "导出设置",
		"importData": "导入设置",
		"resetDefaults": "恢复默认",
		"settingsSaved": "设置已保存",
		"exportSuccess": "设置已导出",
		"importSuccess": "设置已导入",
		"importFailed": "导入失败",
		"resetConfirm": "确定要恢复默认设置吗？",
		"resetSuccess": "设置已恢复"
	},
	privacy: {
		"title": "隐私政策",
		"lastUpdated": "最后更新",
		"questions": "如有问题，请联系我们。",
		"managePreferences": "管理偏好设置",
		"intro": {
			"title": "简介",
			"content": "<p>欢迎使用 himeri chan！我们重视您的隐私，本政策说明我们如何收集、使用和保护您的个人信息。</p><p>使用我们的服务即表示您同意本隐私政策中描述的做法。</p>"
		},
		"dataCollection": {
			"title": "我们收集的信息",
			"content": "<p>我们收集以下类型的信息：</p><ul><li><strong>账户信息</strong>：用户名、邮箱地址、头像（如果您选择提供）</li><li><strong>使用数据</strong>：浏览历史、搜索查询、收藏的内容</li><li><strong>技术数据</strong>：IP 地址、浏览器类型、设备信息、Cookie</li><li><strong>偏好设置</strong>：您的自定义设置和偏好</li></ul>"
		},
		"cookies": {
			"title": "Cookie 使用",
			"content": "<p>我们使用以下类型的 Cookie：</p><ul><li><strong>必需 Cookie</strong>：确保网站正常运行（无法禁用）</li><li><strong>功能 Cookie</strong>：记住您的偏好设置</li><li><strong>分析 Cookie</strong>：了解网站使用情况（需要您的同意）</li><li><strong>性能 Cookie</strong>：优化网站性能（需要您的同意）</li></ul><p>您可以在偏好设置中管理 Cookie。</p>"
		},
		"dataUse": {
			"title": "信息使用方式",
			"content": "<p>我们使用收集的信息用于：</p><ul><li>提供和改进我们的服务</li><li>个性化您的体验</li><li>分析网站使用情况</li><li>发送重要通知和更新</li><li>防止欺诈和滥用</li></ul>"
		},
		"dataSharing": {
			"title": "信息共享",
			"content": "<p>我们<strong>不会</strong>出售您的个人信息。我们可能在以下情况下共享信息：</p><ul><li>经您明确同意</li><li>遵守法律要求</li><li>与我们的服务提供商（他们受保密协议约束）</li></ul>"
		},
		"yourRights": {
			"title": "您的权利",
			"content": "<p>您有权：</p><ul><li>访问和下载您的个人数据</li><li>更正不准确的信息</li><li>删除您的账户和数据</li><li>反对某些数据处理</li><li>随时撤回同意</li></ul><p>您可以在个人中心管理这些设置。</p>"
		},
		"security": {
			"title": "数据安全",
			"content": "<p>我们采取适当的技术和组织措施来保护您的数据：</p><ul><li>加密传输（HTTPS）</li><li>安全的数据存储</li><li>访问控制和权限管理</li><li>定期安全审计</li></ul>"
		},
		"changes": {
			"title": "政策变更",
			"content": "<p>我们可能会不时更新本隐私政策。重大变更将通过网站通知或电子邮件告知您。</p><p>请定期查看本页面以了解最新信息。</p>"
		}
	}
};
var ja_default = {
	app: {
		"name": "HMRChan",
		"description": "ソーシャルメディアコンテンツアグリゲーター"
	},
	nav: {
		"home": "ホーム",
		"explore": "探索",
		"authors": "作者",
		"profile": "プロフィール",
		"settings": "設定",
		"favorites": "お気に入り",
		"privacy": "プライバシーポリシー",
		"login": "ログイン",
		"register": "登録",
		"logout": "ログアウト"
	},
	platform: {
		"youtube": "YouTube",
		"twitter": "Twitter",
		"tiktok": "TikTok",
		"instagram": "Instagram",
		"all": "すべてのプラットフォーム"
	},
	post: {
		"title": "投稿",
		"description": "説明",
		"author": "作者",
		"views": "再生回数",
		"likes": "いいね",
		"comments": "コメント",
		"duration": "長さ",
		"published": "公開日時",
		"publishedAt": "公開日時",
		"scrapedAt": "取得日時",
		"scraped": "取得日時",
		"tags": "タグ",
		"media": "メディア",
		"viewOriginal": "元の投稿を見る",
		"retweet": "リツイート",
		"originalAuthor": "元の作者",
		"relatedPosts": "関連投稿",
		"loadingMedia": "読み込み中...",
		"video": "動画",
		"image": "画像",
		"videoNotSupported": "お使いのブラウザは動画再生に対応していません",
		"addToFavorites": "お気に入りに追加",
		"unfavorite": "お気に入りから削除"
	},
	search: {
		"placeholder": "コンテンツを検索...",
		"noResults": "結果が見つかりません",
		"searching": "検索中...",
		"tryDifferent": "別のキーワードを試す"
	},
	filter: {
		"sortBy": "並び替え",
		"latest": "最新",
		"popular": "人気",
		"oldest": "古い順",
		"platform": "プラットフォーム",
		"hasMedia": "メディアあり",
		"dateRange": "期間",
		"published": "公開日"
	},
	auth: {
		"login": "ログイン",
		"logout": "ログアウト",
		"username": "ユーザー名",
		"password": "パスワード",
		"email": "メール",
		"fullName": "氏名",
		"rememberMe": "ログイン状態を保持",
		"forgotPassword": "パスワードを忘れましたか？",
		"loginSuccess": "ログイン成功",
		"loginFailed": "ログイン失敗",
		"logoutSuccess": "ログアウト成功",
		"registerTitle": "アカウント作成",
		"registerDescription": "登録して、もっと楽しもう",
		"registerButton": "登録",
		"noAccount": "アカウントをお持ちではありませんか？",
		"hasAccount": "すでにアカウントをお持ちですか？",
		"registerNow": "今すぐ登録",
		"loginNow": "今すぐログイン",
		"confirmPassword": "パスワード確認",
		"usernamePlaceholder": "ユーザー名（3-50文字）",
		"emailPlaceholder": "メールアドレス",
		"fullNamePlaceholder": "お名前",
		"passwordPlaceholder": "パスワード（8文字以上）",
		"confirmPasswordPlaceholder": "パスワードを再入力",
		"fillAllFields": "必須項目をすべて入力してください",
		"usernameLength": "ユーザー名は3-50文字で入力してください",
		"invalidEmail": "有効なメールアドレスを入力してください",
		"passwordLength": "パスワードは8文字以上で入力してください",
		"passwordMismatch": "パスワードが一致しません",
		"registrationSuccess": "登録成功！リダイレクト中...",
		"registrationFailed": "登録に失敗しました。もう一度お試しください",
		"loginFailedMessage": "ログインに失敗しました。もう一度お試しください。"
	},
	favorite: {
		"add": "お気に入りに追加",
		"remove": "お気に入りから削除",
		"folder": "フォルダ",
		"tags": "タグ",
		"notes": "メモ",
		"addSuccess": "お気に入りに追加しました",
		"removeSuccess": "お気に入りから削除しました",
		"addFailed": "追加に失敗しました",
		"removeFailed": "削除に失敗しました",
		"updateSuccess": "更新しました",
		"updateFailed": "更新に失敗しました",
		"loginRequired": "ログインしてください"
	},
	settings: {
		"theme": "テーマ",
		"language": "言語",
		"display": "表示設定",
		"showHeroSection": "ヒーローセクションを表示",
		"showHeroSectionDesc": "ホームページにヒーローバナーを表示",
		"hideHeroSection": "ヒーローバナーを非表示（設定で復元可能）",
		"light": "ライト",
		"dark": "ダーク",
		"auto": "自動",
		"toggleTheme": "テーマ切り替え"
	},
	common: {
		"loading": "読み込み中...",
		"error": "エラー",
		"success": "成功",
		"cancel": "キャンセル",
		"confirm": "確認",
		"save": "保存",
		"delete": "削除",
		"edit": "編集",
		"close": "閉じる",
		"more": "もっと見る",
		"less": "閉じる",
		"back": "戻る",
		"next": "次へ",
		"previous": "前へ",
		"page": "ページ",
		"of": "／",
		"total": "合計",
		"reset": "リセット",
		"apply": "適用",
		"order": "順序",
		"noMore": "これ以上ない",
		"swipeToView": "スワイプして詳細を表示",
		"loadFailed": "読み込みに失敗しました",
		"operationFailed": "操作に失敗しました",
		"loadFailedContent": "コンテンツの読み込みに失敗しました",
		"noData": "データがありません",
		"zoomIn": "拡大",
		"zoomOut": "縮小",
		"backToTop": "トップに戻る",
		"fullscreen": "全画面",
		"download": "ダウンロード"
	},
	author: {
		"title": "作者",
		"followers": "フォロワー",
		"posts": "投稿",
		"videos": "動画",
		"verified": "認証済み",
		"joined": "参加日",
		"platformJoined": "プラットフォーム参加",
		"bio": "プロフィール",
		"profile": "プロフィール",
		"viewProfile": "プロフィールを見る",
		"viewOriginal": "プラットフォームで見る",
		"scraped": "収集済み",
		"noAuthors": "作者が見つかりません",
		"loadFailed": "作者の読み込みに失敗しました",
		"totalFollowers": "総フォロワー数",
		"totalPosts": "総投稿数"
	},
	profile: {
		"title": "プロフィール",
		"editProfile": "プロフィール編集",
		"changePassword": "パスワード変更",
		"deleteAccount": "アカウント削除",
		"accountInfo": "アカウント情報",
		"dangerZone": "危険な操作",
		"username": "ユーザー名",
		"email": "メールアドレス",
		"fullName": "氏名",
		"joinedAt": "登録日時",
		"accountStatus": "アカウント状態",
		"active": "アクティブ",
		"inactive": "無効",
		"verified": "認証済み",
		"notVerified": "未認証",
		"sendVerification": "認証メール送信",
		"admin": "管理者",
		"favorites": "お気に入り",
		"views": "閲覧数",
		"days": "日",
		"currentPassword": "現在のパスワード",
		"newPassword": "新しいパスワード",
		"confirmPassword": "パスワード確認",
		"passwordMinLength": "パスワードは8文字以上",
		"passwordMismatch": "パスワードが一致しません",
		"passwordChanged": "パスワードを変更しました。再ログインしてください",
		"passwordChangeFailed": "パスワード変更に失敗しました",
		"profileUpdated": "プロフィールを更新しました",
		"profileUpdateFailed": "プロフィール更新に失敗しました",
		"deleteConfirmTitle": "アカウント削除の確認",
		"deleteWarning": "この操作は取り消せません。すべてのデータが永久に削除されます",
		"enterPasswordToConfirm": "パスワードを入力して確認してください",
		"accountDeleted": "アカウントを削除しました",
		"accountDeleteFailed": "アカウント削除に失敗しました",
		"dangerZoneDescription": "これらの操作は元に戻せません。慎重に実行してください",
		"avatarUploading": "アバターをアップロード中...",
		"avatarUploadSuccess": "アバターのアップロードに成功しました",
		"avatarUploadFailed": "アバターのアップロードに失敗しました",
		"notSet": "未設定",
		"logout": "ログアウト",
		"personalInfo": "個人情報",
		"statistics": "統計",
		"deleteItems": {
			"profile": "プロフィールと設定",
			"favorites": "すべてのお気に入りとコメント",
			"access": "アカウントアクセス"
		}
	},
	access: {
		"limit": "アクセス制限",
		"limitMessage": "{current} / {limit} 件の投稿を表示中",
		"loginForMore": "ログインしてさらに表示",
		"unlimited": "制限なし"
	},
	upload: {
		"onlyImages": "JPG、PNG、WebP形式の画像のみサポート",
		"processingFailed": "画像処理に失敗しました",
		"tooLarge": "ファイルが大きすぎます。最大5MB"
	},
	error: {
		"title": "エラーが発生しました",
		"unknown": "未知のエラー",
		"details": "エラー詳細",
		"componentInfo": "コンポーネント情報",
		"retry": "再試行",
		"goHome": "ホームに戻る",
		"reload": "ページを更新"
	},
	errors: {
		"permissionDenied": "権限がありません",
		"tooManyRequests": "リクエストが多すぎます。しばらく待ってから再度お試しください",
		"serverError": "サーバーエラー。しばらく待ってから再度お試しください",
		"networkError": "ネットワークエラー。接続を確認してください",
		"unknownError": "未知のエラー",
		"videoPlaybackFailed": "動画再生に失敗しました"
	},
	aria: {
		"closeMenu": "メニューを閉じる",
		"openMenu": "メニューを開く",
		"userMenu": "ユーザーメニュー",
		"languageMenu": "言語メニュー",
		"togglePassword": "パスワード表示切り替え",
		"previousImage": "前の画像",
		"nextImage": "次の画像",
		"closeViewer": "ビューアを閉じる",
		"loading": "読み込み中"
	},
	cookies: {
		"title": "Cookie 使用通知",
		"description": "当サイトでは、ブラウジング体験の向上、パーソナライズされたコンテンツの提供、トラフィック分析のために Cookie を使用しています。",
		"learnMore": "詳細を見る",
		"acceptAll": "すべて受け入れる",
		"rejectAll": "すべて拒否",
		"customize": "カスタマイズ",
		"customizeTitle": "Cookie 設定のカスタマイズ",
		"essential": "必須 Cookie",
		"essentialDesc": "これらの Cookie はウェブサイトの動作に必要であり、無効にすることはできません。",
		"analytics": "分析 Cookie",
		"analyticsDesc": "訪問者がウェブサイトをどのように使用しているかを理解し、サービスを改善するために役立ちます。",
		"performance": "パフォーマンス Cookie",
		"performanceDesc": "ウェブサイトのパフォーマンスに関する情報を収集し、読み込み速度の最適化に役立てます。",
		"personalization": "パーソナライゼーション Cookie",
		"personalizationDesc": "お客様の設定を記憶し、パーソナライズされたコンテンツを提供します。",
		"required": "必須"
	},
	preferences: {
		"title": "ユーザー設定",
		"subtitle": "ブラウジング体験をカスタマイズ",
		"syncing": "同期中...",
		"synced": "同期済み",
		"localOnly": "ローカルのみ",
		"display": "表示設定",
		"showHeroSection": "ヒーローバナーを表示",
		"showHeroSectionDesc": "ホームページの上部にウェルカムバナーと統計情報を表示",
		"enableAnimations": "アニメーションを有効化",
		"enableAnimationsDesc": "ページ遷移とインタラクションアニメーションを有効化",
		"postsPerPage": "ページあたりの投稿数",
		"postsPerPageDesc": "ページに表示される投稿数を設定",
		"media": "メディア設定",
		"autoPlayVideos": "動画の自動再生",
		"autoPlayVideosDesc": "動画を開いたときに自動的に再生を開始（MediaViewer のみ）",
		"showImagePreviews": "画像プレビューを表示",
		"showImagePreviewsDesc": "リストに画像のサムネイルを表示",
		"privacy": "プライバシーとデータ",
		"analyticsEnabled": "分析",
		"analyticsEnabledDesc": "匿名の使用データの収集を許可してサービスを改善",
		"performanceCookies": "パフォーマンス Cookie",
		"performanceCookiesDesc": "パフォーマンスデータを収集してウェブサイトの速度を最適化",
		"personalizedContent": "パーソナライズされたコンテンツ",
		"personalizedContentDesc": "お客様の設定に基づいてコンテンツを推奨",
		"dataCollection": "データ収集",
		"dataCollectionDesc": "分析用の使用データの収集を許可",
		"privacyNote": "お客様のプライバシーを尊重します。すべてのデータ収集は匿名であり、サービス改善のためにのみ使用されます。",
		"readPrivacyPolicy": "プライバシーポリシーを読む",
		"dataManagement": "データ管理",
		"exportData": "設定をエクスポート",
		"importData": "設定をインポート",
		"resetDefaults": "デフォルトに戻す",
		"settingsSaved": "設定を保存しました",
		"exportSuccess": "設定をエクスポートしました",
		"importSuccess": "設定をインポートしました",
		"importFailed": "インポートに失敗しました",
		"resetConfirm": "デフォルト設定に戻しますか？",
		"resetSuccess": "設定をリセットしました"
	},
	privacy: {
		"title": "プライバシーポリシー",
		"lastUpdated": "最終更新",
		"questions": "ご質問がございましたら、お問い合わせください。",
		"managePreferences": "設定を管理",
		"intro": {
			"title": "はじめに",
			"content": "<p>himeri chan へようこそ！当サイトではお客様のプライバシーを尊重し、このポリシーでは個人情報の収集、使用、保護方法について説明します。</p><p>当サービスを使用することにより、このプライバシーポリシーに記載されている慣行に同意したものとみなされます。</p>"
		},
		"dataCollection": {
			"title": "収集する情報",
			"content": "<p>以下の種類の情報を収集します：</p><ul><li><strong>アカウント情報</strong>：ユーザー名、メールアドレス、アバター（提供された場合）</li><li><strong>使用データ</strong>：閲覧履歴、検索クエリ、お気に入りのコンテンツ</li><li><strong>技術データ</strong>：IP アドレス、ブラウザの種類、デバイス情報、Cookie</li><li><strong>設定</strong>：カスタム設定と環境設定</li></ul>"
		},
		"cookies": {
			"title": "Cookie の使用",
			"content": "<p>以下の種類の Cookie を使用します：</p><ul><li><strong>必須 Cookie</strong>：ウェブサイトの適切な動作を保証（無効化不可）</li><li><strong>機能 Cookie</strong>：設定を記憶</li><li><strong>分析 Cookie</strong>：ウェブサイトの使用状況を理解（同意が必要）</li><li><strong>パフォーマンス Cookie</strong>：ウェブサイトのパフォーマンスを最適化（同意が必要）</li></ul><p>Cookie は設定で管理できます。</p>"
		},
		"dataUse": {
			"title": "情報の使用方法",
			"content": "<p>収集した情報は以下の目的で使用します：</p><ul><li>サービスの提供と改善</li><li>体験のパーソナライズ</li><li>ウェブサイトの使用状況の分析</li><li>重要な通知と更新の送信</li><li>不正行為と悪用の防止</li></ul>"
		},
		"dataSharing": {
			"title": "情報の共有",
			"content": "<p>お客様の個人情報を<strong>販売することはありません</strong>。以下の場合に情報を共有する場合があります：</p><ul><li>お客様の明示的な同意がある場合</li><li>法的要件を遵守する場合</li><li>サービスプロバイダーと（機密保持契約に基づく）</li></ul>"
		},
		"yourRights": {
			"title": "お客様の権利",
			"content": "<p>お客様には以下の権利があります：</p><ul><li>個人データへのアクセスとダウンロード</li><li>不正確な情報の修正</li><li>アカウントとデータの削除</li><li>特定のデータ処理への反対</li><li>いつでも同意を撤回</li></ul><p>これらの設定はプロフィールで管理できます。</p>"
		},
		"security": {
			"title": "データセキュリティ",
			"content": "<p>お客様のデータを保護するために適切な技術的および組織的措置を講じています：</p><ul><li>暗号化された送信（HTTPS）</li><li>安全なデータストレージ</li><li>アクセス制御と権限管理</li><li>定期的なセキュリティ監査</li></ul>"
		},
		"changes": {
			"title": "ポリシーの変更",
			"content": "<p>このプライバシーポリシーは随時更新される場合があります。重大な変更は、ウェブサイト通知または電子メールで通知されます。</p><p>最新情報については、このページを定期的にご確認ください。</p>"
		}
	}
};
const SUPPORTED_LOCALES = [
	"en",
	"zh-CN",
	"ja"
];
function getBrowserLocale() {
	const browserLocale = navigator.language;
	if (SUPPORTED_LOCALES.includes(browserLocale)) return browserLocale;
	const languageCode = browserLocale.split("-")[0] || "en";
	return SUPPORTED_LOCALES.find((locale) => locale.startsWith(languageCode)) || "en";
}
function getInitialLocale() {
	const savedLocale = localStorage.getItem("locale");
	if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) return savedLocale;
	return getBrowserLocale();
}
var i18n_default = createI18n({
	legacy: false,
	locale: getInitialLocale(),
	fallbackLocale: "en",
	messages: {
		en: en_default,
		"zh-CN": zh_CN_default,
		ja: ja_default
	}
});
var DEFAULT_LOADING = "data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"%3E%3Crect fill=\"%23f3f4f6\" width=\"100\" height=\"100\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%239ca3af\" font-size=\"14\"%3E加载中...%3C/text%3E%3C/svg%3E";
var DEFAULT_ERROR = "data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"%3E%3Crect fill=\"%23fef2f2\" width=\"100\" height=\"100\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23dc2626\" font-size=\"14\"%3E加载失败%3C/text%3E%3C/svg%3E";
var observerMap = /* @__PURE__ */ new WeakMap();
var loadImage = (el, src, options) => {
	const img = new Image();
	el.classList.add("lazy-loading");
	img.onload = () => {
		el.src = src;
		el.classList.remove("lazy-loading");
		el.classList.add("lazy-loaded");
	};
	img.onerror = () => {
		if (options.error) el.src = options.error;
		el.classList.remove("lazy-loading");
		el.classList.add("lazy-error");
	};
	img.src = src;
};
var createObserver = (el, binding) => {
	const options = typeof binding.value === "string" ? { src: binding.value } : binding.value;
	const { src, loading = DEFAULT_LOADING, error: error$3 = DEFAULT_ERROR, threshold = .01, rootMargin = "50px" } = options;
	if (loading && !el.src) el.src = loading;
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadImage(el, src, {
					...options,
					error: error$3
				});
				observer.unobserve(el);
				observerMap.delete(el);
			}
		});
	}, {
		threshold,
		rootMargin
	});
	observer.observe(el);
	observerMap.set(el, observer);
};
const lazyLoad = {
	mounted(el, binding) {
		if (!("IntersectionObserver" in window)) {
			el.src = typeof binding.value === "string" ? binding.value : binding.value.src;
			return;
		}
		createObserver(el, binding);
	},
	updated(el, binding) {
		if ((typeof binding.oldValue === "string" ? binding.oldValue : binding.oldValue?.src) !== (typeof binding.value === "string" ? binding.value : binding.value?.src)) {
			const oldObserver = observerMap.get(el);
			if (oldObserver) {
				oldObserver.unobserve(el);
				observerMap.delete(el);
			}
			createObserver(el, binding);
		}
	},
	unmounted(el) {
		const observer = observerMap.get(el);
		if (observer) {
			observer.unobserve(el);
			observerMap.delete(el);
		}
	}
};
var ServiceWorkerManager = class {
	constructor() {
		this.registration = null;
	}
	async register() {
		if (!("serviceWorker" in navigator)) {
			console.warn("Service Worker is not supported");
			return null;
		}
		console.log("Service Worker disabled in development mode");
		return null;
	}
	async unregister() {
		if (this.registration) return await this.registration.unregister();
		return false;
	}
	async update() {
		if (this.registration) await this.registration.update();
	}
	async sendMessage(message) {
		if (!this.registration || !this.registration.active) throw new Error("Service Worker is not active");
		return new Promise((resolve, reject) => {
			const messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = (event) => {
				if (event.data.error) reject(event.data.error);
				else resolve(event.data);
			};
			this.registration.active.postMessage(message, [messageChannel.port2]);
		});
	}
	async clearCache() {
		await this.sendMessage({ type: "CLEAR_CACHE" });
		console.log("[SW] Cache cleared");
	}
	async getCacheSize() {
		return await this.sendMessage({ type: "GET_CACHE_SIZE" });
	}
	async skipWaiting() {
		await this.sendMessage({ type: "SKIP_WAITING" });
	}
	onUpdateAvailable() {
		console.log("[SW] New version available");
		if (confirm("发现新版本，是否立即更新？")) this.skipWaiting().then(() => {
			window.location.reload();
		});
	}
};
new ServiceWorkerManager();
var app = createApp(App_default);
var pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
app.use(router_default);
app.use(i18n_default);
app.directive("lazy", lazyLoad);
app.config.errorHandler = (err, instance, info) => {
	logger_default.criticalError("[Global Error Handler]", err, info);
};
{
	const originalError = console.error;
	const originalWarn = console.warn;
	window.addEventListener("error", (event) => {
		const target = event.target;
		if (target && target.tagName === "IMG") {
			const src = target.src || "";
			if (src.includes("pbs.twimg.com") || src.includes("twimg.com")) {
				event.preventDefault();
				event.stopPropagation();
				return false;
			}
		}
	}, true);
	console.error = (...args) => {
		const message = args[0]?.toString() || "";
		const stack = args[0]?.stack?.toString() || "";
		if (message.includes("content_script") || message.includes("chrome-extension") || message.includes("A listener indicated an asynchronous response") || message.includes("message channel closed") || message.includes("fetchError") || message.includes("Request timeout") || message.includes("returning true, but the message channel closed") || stack.includes("content_script") || stack.includes("chrome-extension")) return;
		originalError.apply(console, args);
	};
	console.warn = (...args) => {
		if ((args[0]?.toString() || "").includes("setupReplaceUnsafeHeader")) return;
		originalWarn.apply(console, args);
	};
}
app.mount("#app");
var themeStore = useThemeStore();
var settingsStore = useSettingsStore();
themeStore.initTheme();
settingsStore.initSettings();
export {};
