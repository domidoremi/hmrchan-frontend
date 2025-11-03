import { o as useAuthStore, t as authorsApi } from "./api-services-BmQ9TwGt.js";
import { o as toast_default } from "./composables-CdbJX3Qi.js";
import { Fragment, computed, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, mergeProps, onBeforeUnmount, onMounted, onUnmounted, openBlock, ref, renderList, resolveComponent, toDisplayString, useSSRContext, watch, withCtx } from "vue";
import { defineStore, storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderAttr, ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderList, ssrRenderSlot, ssrRenderStyle } from "vue/server-renderer";
import { ArrowUp, Calendar, CheckCircle, Compass, Database, ExternalLink, FileText, Heart, Home, Languages, LogOut, Menu, Moon, Search, Settings, Sun, User, Users, X } from "lucide-vue-next";
import dayjs from "dayjs";
const useThemeStore = defineStore("theme", () => {
	const theme = ref("auto");
	const isDark = ref(false);
	function initTheme() {
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme && [
			"light",
			"dark",
			"auto"
		].includes(savedTheme)) theme.value = savedTheme;
		updateTheme();
	}
	function updateTheme() {
		let shouldBeDark = false;
		if (theme.value === "dark") shouldBeDark = true;
		else if (theme.value === "auto") shouldBeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		isDark.value = shouldBeDark;
		if (shouldBeDark) document.documentElement.setAttribute("data-theme", "dark");
		else document.documentElement.setAttribute("data-theme", "light");
	}
	function setTheme(newTheme) {
		theme.value = newTheme;
		localStorage.setItem("theme", newTheme);
		updateTheme();
	}
	function toggleTheme() {
		if (theme.value === "light") setTheme("dark");
		else setTheme("light");
	}
	watch(() => theme.value, () => {
		if (theme.value === "auto") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			const handleChange = () => updateTheme();
			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		}
	});
	return {
		theme,
		isDark,
		initTheme,
		setTheme,
		toggleTheme
	};
});
var __plugin_vue_export_helper_default = (sfc, props) => {
	const target = sfc.__vccOpts || sfc;
	for (const [key, val] of props) target[key] = val;
	return target;
};
function generateDefaultAvatar(name, size = 200) {
	return `https://ui-avatars.com/api/?${new URLSearchParams({
		name: name || "User",
		size: size.toString(),
		background: "8B5CF6",
		color: "ffffff",
		bold: "true",
		format: "svg"
	}).toString()}`;
}
function getAvatarUrl(avatarUrl, username, fullName, size = 200) {
	if (avatarUrl) return avatarUrl;
	return generateDefaultAvatar(fullName || username || "User", size);
}
function getUserAvatar(user, size = 200) {
	if (!user) return generateDefaultAvatar("User", size);
	let avatarUrl = user.avatar_url;
	if (avatarUrl && avatarUrl.startsWith("/uploads/")) avatarUrl = avatarUrl;
	return getAvatarUrl(avatarUrl, user.username, user.full_name, size);
}
var GlassButton_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "GlassButton",
	props: {
		variant: {
			type: String,
			required: false,
			default: "primary"
		},
		size: {
			type: String,
			required: false,
			default: "md"
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		loading: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["click"],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const buttonClass = computed(() => {
			return [
				"glass-button",
				`btn-${props.variant}`,
				`btn-${props.size}`,
				{
					"btn-disabled": props.disabled,
					"btn-loading": props.loading
				}
			];
		});
		const handleClick = (event) => {
			if (!props.disabled && !props.loading) emit("click", event);
		};
		const __returned__ = {
			props,
			emit,
			buttonClass,
			handleClick
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$6(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<button${ssrRenderAttrs(mergeProps({
		class: $setup.buttonClass,
		disabled: $props.disabled || $props.loading
	}, _attrs))} data-v-c9ac5c32>`);
	if ($props.loading) _push(`<span class="spinner-small" data-v-c9ac5c32></span>`);
	else ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
	_push(`</button>`);
}
var _sfc_setup$6 = GlassButton_vue_vue_type_script_setup_true_lang_default.setup;
GlassButton_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/GlassButton.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var GlassButton_default = /* @__PURE__ */ __plugin_vue_export_helper_default(GlassButton_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$6],
	["__scopeId", "data-v-c9ac5c32"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/GlassButton.vue"]
]);
var AppNavbar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AppNavbar",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const { locale } = useI18n();
		const authStore = useAuthStore();
		const themeStore = useThemeStore();
		const { user, isAuthenticated } = storeToRefs(authStore);
		const { isDark } = storeToRefs(themeStore);
		const searchQuery = ref("");
		const showLanguageMenu = ref(false);
		const showUserMenu = ref(false);
		const mobileMenuOpen = ref(false);
		const avatarError = ref(false);
		const languageMenuRef = ref(null);
		const userMenuRef = ref(null);
		const mobileNavRef = ref(null);
		const mobileMenuButtonRef = ref(null);
		const currentLocale = computed(() => locale.value);
		const userAvatarUrl = computed(() => {
			if (avatarError.value) return getUserAvatar({
				...user.value,
				avatar_url: null
			}, 40);
			return getUserAvatar(user.value, 40);
		});
		const handleAvatarError = () => {
			avatarError.value = true;
		};
		const locales = [
			{
				code: "en",
				name: "English"
			},
			{
				code: "zh-CN",
				name: "简体中文"
			},
			{
				code: "ja",
				name: "日本語"
			}
		];
		const toggleTheme = () => {
			themeStore.toggleTheme();
		};
		const changeLanguage = (newLocale) => {
			locale.value = newLocale;
			localStorage.setItem("locale", newLocale);
			showLanguageMenu.value = false;
		};
		const handleSearch = () => {
			if (searchQuery.value.trim()) {
				router.push({
					path: "/explore",
					query: { q: searchQuery.value }
				});
				searchQuery.value = "";
			}
		};
		const handleLogout = () => {
			authStore.logout();
			showUserMenu.value = false;
			router.push("/login");
		};
		const toggleMobileMenu = () => {
			mobileMenuOpen.value = !mobileMenuOpen.value;
		};
		const closeMobileMenu = () => {
			mobileMenuOpen.value = false;
		};
		const handleClickOutside = (event) => {
			const target = event.target;
			if (showLanguageMenu.value && languageMenuRef.value) {
				if (!languageMenuRef.value.contains(target)) showLanguageMenu.value = false;
			}
			if (showUserMenu.value && userMenuRef.value) {
				if (!userMenuRef.value.contains(target)) showUserMenu.value = false;
			}
			if (mobileMenuOpen.value && mobileNavRef.value && mobileMenuButtonRef.value) {
				if (!mobileNavRef.value.contains(target) && !mobileMenuButtonRef.value.contains(target)) mobileMenuOpen.value = false;
			}
		};
		onMounted(() => {
			document.addEventListener("click", handleClickOutside);
		});
		onBeforeUnmount(() => {
			document.removeEventListener("click", handleClickOutside);
		});
		const __returned__ = {
			router,
			locale,
			authStore,
			themeStore,
			user,
			isAuthenticated,
			isDark,
			searchQuery,
			showLanguageMenu,
			showUserMenu,
			mobileMenuOpen,
			avatarError,
			languageMenuRef,
			userMenuRef,
			mobileNavRef,
			mobileMenuButtonRef,
			currentLocale,
			userAvatarUrl,
			handleAvatarError,
			locales,
			toggleTheme,
			changeLanguage,
			handleSearch,
			handleLogout,
			toggleMobileMenu,
			closeMobileMenu,
			handleClickOutside,
			get Home() {
				return Home;
			},
			get Compass() {
				return Compass;
			},
			get Heart() {
				return Heart;
			},
			get Users() {
				return Users;
			},
			get Search() {
				return Search;
			},
			get Sun() {
				return Sun;
			},
			get Moon() {
				return Moon;
			},
			get Languages() {
				return Languages;
			},
			get User() {
				return User;
			},
			get Settings() {
				return Settings;
			},
			get LogOut() {
				return LogOut;
			},
			get Menu() {
				return Menu;
			},
			get X() {
				return X;
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
function _sfc_ssrRender$5(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	const _component_RouterLink = resolveComponent("RouterLink");
	_push(`<nav${ssrRenderAttrs(mergeProps({ class: "glass-navbar" }, _attrs))} data-v-39aa73b6><div class="container navbar-content" data-v-39aa73b6>`);
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/",
		class: "navbar-brand"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`<div class="brand-logo" data-v-39aa73b6${_scopeId}>HMR</div><span class="brand-name" data-v-39aa73b6${_scopeId}>Chan</span>`);
			else return [createVNode("div", { class: "brand-logo" }, "HMR"), createVNode("span", { class: "brand-name" }, "Chan")];
		}),
		_: 1
	}, _parent));
	_push(`<div id="mobile-nav" class="${ssrRenderClass([{ "nav-open": $setup.mobileMenuOpen }, "navbar-nav"])}" data-v-39aa73b6>`);
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/",
		class: "nav-link",
		onClick: $setup.closeMobileMenu,
		"aria-label": _ctx.$t("nav.home")
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["Home"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(`<span data-v-39aa73b6${_scopeId}>${ssrInterpolate(_ctx.$t("nav.home"))}</span>`);
			} else return [createVNode($setup["Home"], { size: 20 }), createVNode("span", null, toDisplayString(_ctx.$t("nav.home")), 1)];
		}),
		_: 1
	}, _parent));
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/explore",
		class: "nav-link",
		onClick: $setup.closeMobileMenu,
		"aria-label": _ctx.$t("nav.explore")
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["Compass"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(`<span data-v-39aa73b6${_scopeId}>${ssrInterpolate(_ctx.$t("nav.explore"))}</span>`);
			} else return [createVNode($setup["Compass"], { size: 20 }), createVNode("span", null, toDisplayString(_ctx.$t("nav.explore")), 1)];
		}),
		_: 1
	}, _parent));
	if ($setup.isAuthenticated) _push(ssrRenderComponent(_component_RouterLink, {
		to: "/favorites",
		class: "nav-link",
		onClick: $setup.closeMobileMenu,
		"aria-label": _ctx.$t("nav.favorites")
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["Heart"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(`<span data-v-39aa73b6${_scopeId}>${ssrInterpolate(_ctx.$t("nav.favorites"))}</span>`);
			} else return [createVNode($setup["Heart"], { size: 20 }), createVNode("span", null, toDisplayString(_ctx.$t("nav.favorites")), 1)];
		}),
		_: 1
	}, _parent));
	else _push(`<!---->`);
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/authors",
		class: "nav-link",
		onClick: $setup.closeMobileMenu,
		"aria-label": _ctx.$t("nav.authors")
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["Users"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(`<span data-v-39aa73b6${_scopeId}>${ssrInterpolate(_ctx.$t("nav.authors"))}</span>`);
			} else return [createVNode($setup["Users"], { size: 20 }), createVNode("span", null, toDisplayString(_ctx.$t("nav.authors")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</div><div class="navbar-search" data-v-39aa73b6>`);
	_push(ssrRenderComponent($setup["Search"], { size: 18 }, null, _parent));
	_push(`<input${ssrRenderAttr("value", $setup.searchQuery)} type="search"${ssrRenderAttr("placeholder", _ctx.$t("search.placeholder"))} data-v-39aa73b6></div><div class="navbar-actions" data-v-39aa73b6><button class="action-button"${ssrRenderAttr("title", _ctx.$t("settings.theme"))}${ssrRenderAttr("aria-label", _ctx.$t("settings.toggleTheme"))}${ssrRenderAttr("aria-pressed", $setup.isDark ? "true" : "false")} data-v-39aa73b6>`);
	if (!$setup.isDark) _push(ssrRenderComponent($setup["Sun"], { size: 20 }, null, _parent));
	else _push(ssrRenderComponent($setup["Moon"], { size: 20 }, null, _parent));
	_push(`</button><div class="language-menu-wrapper" data-v-39aa73b6><button class="action-button"${ssrRenderAttr("aria-label", _ctx.$t("aria.languageMenu"))}${ssrRenderAttr("aria-expanded", $setup.showLanguageMenu ? "true" : "false")}${ssrRenderAttr("aria-haspopup", true)} data-v-39aa73b6>`);
	_push(ssrRenderComponent($setup["Languages"], { size: 20 }, null, _parent));
	_push(`</button>`);
	if ($setup.showLanguageMenu) {
		_push(`<div class="language-menu glass-card" role="menu"${ssrRenderAttr("aria-label", _ctx.$t("aria.languageMenu"))} data-v-39aa73b6><!--[-->`);
		ssrRenderList($setup.locales, (locale) => {
			_push(`<button class="${ssrRenderClass([{ active: $setup.currentLocale === locale.code }, "language-item"])}" data-v-39aa73b6>${ssrInterpolate(locale.name)}</button>`);
		});
		_push(`<!--]--></div>`);
	} else _push(`<!---->`);
	_push(`</div>`);
	if ($setup.isAuthenticated) {
		_push(`<div class="user-menu" data-v-39aa73b6><button class="user-avatar"${ssrRenderAttr("aria-label", _ctx.$t("aria.userMenu"))}${ssrRenderAttr("aria-expanded", $setup.showUserMenu ? "true" : "false")}${ssrRenderAttr("aria-haspopup", true)} data-v-39aa73b6><img${ssrRenderAttr("src", $setup.userAvatarUrl)}${ssrRenderAttr("alt", $setup.user?.username || "User")} data-v-39aa73b6></button>`);
		if ($setup.showUserMenu) {
			_push(`<div class="user-dropdown glass-card" role="menu"${ssrRenderAttr("aria-label", _ctx.$t("aria.userMenu"))} data-v-39aa73b6><div class="user-info" data-v-39aa73b6><p class="user-name" data-v-39aa73b6>${ssrInterpolate($setup.user?.username)}</p><p class="user-email" data-v-39aa73b6>${ssrInterpolate($setup.user?.email)}</p></div><div class="dropdown-divider" data-v-39aa73b6></div>`);
			_push(ssrRenderComponent(_component_RouterLink, {
				to: "/profile",
				class: "dropdown-item",
				onClick: ($event) => $setup.showUserMenu = false
			}, {
				default: withCtx((_, _push$1, _parent$1, _scopeId) => {
					if (_push$1) {
						_push$1(ssrRenderComponent($setup["User"], { size: 18 }, null, _parent$1, _scopeId));
						_push$1(` ${ssrInterpolate(_ctx.$t("nav.profile"))}`);
					} else return [createVNode($setup["User"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.profile")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_RouterLink, {
				to: "/favorites",
				class: "dropdown-item",
				onClick: ($event) => $setup.showUserMenu = false
			}, {
				default: withCtx((_, _push$1, _parent$1, _scopeId) => {
					if (_push$1) {
						_push$1(ssrRenderComponent($setup["Heart"], { size: 18 }, null, _parent$1, _scopeId));
						_push$1(` ${ssrInterpolate(_ctx.$t("nav.favorites"))}`);
					} else return [createVNode($setup["Heart"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.favorites")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_RouterLink, {
				to: "/settings",
				class: "dropdown-item",
				onClick: ($event) => $setup.showUserMenu = false
			}, {
				default: withCtx((_, _push$1, _parent$1, _scopeId) => {
					if (_push$1) {
						_push$1(ssrRenderComponent($setup["Settings"], { size: 18 }, null, _parent$1, _scopeId));
						_push$1(` ${ssrInterpolate(_ctx.$t("nav.settings"))}`);
					} else return [createVNode($setup["Settings"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.settings")), 1)];
				}),
				_: 1
			}, _parent));
			_push(`<div class="dropdown-divider" data-v-39aa73b6></div><button class="dropdown-item" data-v-39aa73b6>`);
			_push(ssrRenderComponent($setup["LogOut"], { size: 18 }, null, _parent));
			_push(` ${ssrInterpolate(_ctx.$t("nav.logout"))}</button></div>`);
		} else _push(`<!---->`);
		_push(`</div>`);
	} else _push(ssrRenderComponent(_component_RouterLink, { to: "/login" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(ssrRenderComponent($setup["GlassButton"], { size: "sm" }, {
				default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
					if (_push$2) _push$2(`${ssrInterpolate(_ctx.$t("nav.login"))}`);
					else return [createTextVNode(toDisplayString(_ctx.$t("nav.login")), 1)];
				}),
				_: 1
			}, _parent$1, _scopeId));
			else return [createVNode($setup["GlassButton"], { size: "sm" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("nav.login")), 1)]),
				_: 1
			})];
		}),
		_: 1
	}, _parent));
	_push(`<button class="mobile-menu-button show-on-mobile"${ssrRenderAttr("aria-label", $setup.mobileMenuOpen ? _ctx.$t("aria.closeMenu") : _ctx.$t("aria.openMenu"))}${ssrRenderAttr("aria-expanded", $setup.mobileMenuOpen ? "true" : "false")}${ssrRenderAttr("aria-controls", "mobile-nav")} data-v-39aa73b6>`);
	if (!$setup.mobileMenuOpen) _push(ssrRenderComponent($setup["Menu"], { size: 24 }, null, _parent));
	else _push(ssrRenderComponent($setup["X"], { size: 24 }, null, _parent));
	_push(`</button></div></div></nav>`);
}
var _sfc_setup$5 = AppNavbar_vue_vue_type_script_setup_true_lang_default.setup;
AppNavbar_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/layout/AppNavbar.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var AppNavbar_default = /* @__PURE__ */ __plugin_vue_export_helper_default(AppNavbar_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$5],
	["__scopeId", "data-v-39aa73b6"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/layout/AppNavbar.vue"]
]);
var AppFooter_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AppFooter",
	setup(__props, { expose: __expose }) {
		__expose();
		const { t } = useI18n();
		const __returned__ = {
			t,
			platforms: [
				{
					name: "youtube",
					label: "YouTube"
				},
				{
					name: "twitter",
					label: "Twitter"
				},
				{
					name: "tiktok",
					label: "TikTok"
				},
				{
					name: "instagram",
					label: "Instagram"
				}
			]
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$4(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	const _component_RouterLink = resolveComponent("RouterLink");
	_push(`<footer${ssrRenderAttrs(mergeProps({ class: "app-footer" }, _attrs))} data-v-772024c0><div class="container" data-v-772024c0><div class="footer-content footer-desktop" data-v-772024c0><div class="footer-section" data-v-772024c0><h2 data-v-772024c0>${ssrInterpolate(_ctx.$t("app.name"))}</h2><p data-v-772024c0>${ssrInterpolate(_ctx.$t("app.description"))}</p></div><div class="footer-section" data-v-772024c0><h2 data-v-772024c0>${ssrInterpolate(_ctx.$t("nav.explore"))}</h2><ul class="footer-links" data-v-772024c0><li data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/explore?platform=youtube" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`YouTube`);
			else return [createTextVNode("YouTube")];
		}),
		_: 1
	}, _parent));
	_push(`</li><li data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/explore?platform=twitter" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`Twitter`);
			else return [createTextVNode("Twitter")];
		}),
		_: 1
	}, _parent));
	_push(`</li><li data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/explore?platform=tiktok" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`TikTok`);
			else return [createTextVNode("TikTok")];
		}),
		_: 1
	}, _parent));
	_push(`</li><li data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/explore?platform=instagram" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`Instagram`);
			else return [createTextVNode("Instagram")];
		}),
		_: 1
	}, _parent));
	_push(`</li></ul></div><div class="footer-section" data-v-772024c0><h2 data-v-772024c0>${ssrInterpolate(_ctx.$t("common.more"))}</h2><ul class="footer-links" data-v-772024c0><li data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/authors" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("nav.authors"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("nav.authors")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</li><li data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/settings" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("nav.settings"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("nav.settings")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</li></ul></div></div><div class="footer-content footer-mobile" data-v-772024c0><div class="footer-mobile-links" data-v-772024c0>`);
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/explore",
		class: "footer-mobile-link"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("nav.explore"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("nav.explore")), 1)];
		}),
		_: 1
	}, _parent));
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/authors",
		class: "footer-mobile-link"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("nav.authors"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("nav.authors")), 1)];
		}),
		_: 1
	}, _parent));
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/settings",
		class: "footer-mobile-link"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("nav.settings"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("nav.settings")), 1)];
		}),
		_: 1
	}, _parent));
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/privacy",
		class: "footer-mobile-link"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("nav.privacy"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("nav.privacy")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</div><div class="footer-divider" data-v-772024c0></div><div class="footer-platforms" data-v-772024c0><!--[-->`);
	ssrRenderList($setup.platforms, (platform) => {
		_push(ssrRenderComponent(_component_RouterLink, {
			key: platform.name,
			to: `/explore?platform=${platform.name}`,
			class: "platform-chip"
		}, {
			default: withCtx((_, _push$1, _parent$1, _scopeId) => {
				if (_push$1) _push$1(`${ssrInterpolate(platform.label)}`);
				else return [createTextVNode(toDisplayString(platform.label), 1)];
			}),
			_: 2
		}, _parent));
	});
	_push(`<!--]--></div></div><div class="footer-bottom" data-v-772024c0><p class="footer-copyright" data-v-772024c0>© 2025 HMRChan</p><p class="footer-text" data-v-772024c0>${ssrInterpolate(_ctx.$t("app.description"))}</p></div></div></footer>`);
}
var _sfc_setup$4 = AppFooter_vue_vue_type_script_setup_true_lang_default.setup;
AppFooter_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/layout/AppFooter.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var AppFooter_default = /* @__PURE__ */ __plugin_vue_export_helper_default(AppFooter_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$4],
	["__scopeId", "data-v-772024c0"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/layout/AppFooter.vue"]
]);
var scrollThreshold = 300;
var BackToTop_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "BackToTop",
	setup(__props, { expose: __expose }) {
		__expose();
		const visible = ref(false);
		const handleScroll = () => {
			visible.value = window.pageYOffset > scrollThreshold;
		};
		const scrollToTop = () => {
			window.scrollTo({
				top: 0,
				behavior: "smooth"
			});
		};
		onMounted(() => {
			window.addEventListener("scroll", handleScroll);
			handleScroll();
		});
		onUnmounted(() => {
			window.removeEventListener("scroll", handleScroll);
		});
		const __returned__ = {
			visible,
			scrollThreshold,
			handleScroll,
			scrollToTop,
			get ArrowUp() {
				return ArrowUp;
			}
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$3(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	if ($setup.visible) {
		_push(`<button${ssrRenderAttrs(mergeProps({
			class: "back-to-top",
			title: _ctx.$t("common.backToTop"),
			"aria-label": _ctx.$t("common.backToTop")
		}, _attrs))} data-v-1b4e09af>`);
		_push(ssrRenderComponent($setup["ArrowUp"], { size: 24 }, null, _parent));
		_push(`</button>`);
	} else _push(`<!---->`);
}
var _sfc_setup$3 = BackToTop_vue_vue_type_script_setup_true_lang_default.setup;
BackToTop_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/BackToTop.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var BackToTop_default = /* @__PURE__ */ __plugin_vue_export_helper_default(BackToTop_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$3],
	["__scopeId", "data-v-1b4e09af"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/BackToTop.vue"]
]);
var MainLayout_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MainLayout",
	setup(__props, { expose: __expose }) {
		__expose();
		const __returned__ = {
			AppNavbar: AppNavbar_default,
			AppFooter: AppFooter_default,
			BackToTop: BackToTop_default
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$2(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "main-layout" }, _attrs))} data-v-ccff5985>`);
	_push(ssrRenderComponent($setup["AppNavbar"], null, null, _parent));
	_push(`<main class="main-content" data-v-ccff5985><div class="container" data-v-ccff5985>`);
	ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
	_push(`</div></main>`);
	_push(ssrRenderComponent($setup["AppFooter"], null, null, _parent));
	_push(ssrRenderComponent($setup["BackToTop"], null, null, _parent));
	_push(`</div>`);
}
var _sfc_setup$2 = MainLayout_vue_vue_type_script_setup_true_lang_default.setup;
MainLayout_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/layout/MainLayout.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var MainLayout_default = /* @__PURE__ */ __plugin_vue_export_helper_default(MainLayout_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$2],
	["__scopeId", "data-v-ccff5985"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/layout/MainLayout.vue"]
]);
var LoadingSpinner_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "LoadingSpinner",
	props: {
		size: {
			type: String,
			required: false,
			default: "md"
		},
		text: {
			type: String,
			required: false
		}
	},
	setup(__props, { expose: __expose }) {
		__expose();
		const props = __props;
		const __returned__ = {
			props,
			sizeClass: computed(() => `spinner-${props.size}`)
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({ class: ["spinner-container", $setup.sizeClass] }, _attrs))} data-v-af762d05><div class="spinner" data-v-af762d05></div>`);
	if ($props.text) _push(`<p class="spinner-text" data-v-af762d05>${ssrInterpolate($props.text)}</p>`);
	else _push(`<!---->`);
	_push(`</div>`);
}
var _sfc_setup$1 = LoadingSpinner_vue_vue_type_script_setup_true_lang_default.setup;
LoadingSpinner_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/LoadingSpinner.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var LoadingSpinner_default = /* @__PURE__ */ __plugin_vue_export_helper_default(LoadingSpinner_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-af762d05"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/LoadingSpinner.vue"]
]);
const PLATFORMS = [
	"youtube",
	"twitter",
	"tiktok",
	"instagram"
];
const PLATFORM_NAMES = {
	youtube: "YouTube",
	twitter: "Twitter",
	tiktok: "TikTok",
	instagram: "Instagram"
};
const PLATFORM_COLORS = {
	youtube: "#FF0000",
	twitter: "#1DA1F2",
	tiktok: "#000000",
	instagram: "#E4405F"
};
var AuthorsPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	name: "AuthorsPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const { t } = useI18n();
		const loading = ref(true);
		const authors = ref([]);
		const totalFollowers = computed(() => {
			return authors.value.reduce((sum, author) => sum + (author.follower_count || 0), 0);
		});
		const totalPosts = computed(() => {
			return authors.value.reduce((sum, author) => sum + (author.post_count || 0), 0);
		});
		onMounted(async () => {
			try {
				authors.value = (await authorsApi.getAuthors({
					page: 1,
					page_size: 100
				})).items;
			} catch (error) {
				console.error("Failed to fetch authors:", error);
				toast_default.error(t("author.loadFailed"));
			} finally {
				loading.value = false;
			}
		});
		const formatNumber = (num) => {
			if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
			if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
			return num.toString();
		};
		const formatDate = (dateStr) => {
			return dayjs(dateStr).format("YYYY-MM-DD");
		};
		const truncateText = (text, maxLength) => {
			if (!text || text.length <= maxLength) return text;
			return text.slice(0, maxLength) + "...";
		};
		const getPlatformColor = (platform) => {
			return PLATFORM_COLORS[platform] || "#666";
		};
		const getPlatformName = (platform) => {
			return PLATFORM_NAMES[platform] || platform;
		};
		const onImageError = (event) => {
			const img = event.target;
			img.style.display = "none";
			const placeholder = img.parentElement?.querySelector(".avatar-placeholder");
			if (placeholder) placeholder.style.display = "flex";
		};
		const __returned__ = {
			t,
			loading,
			authors,
			totalFollowers,
			totalPosts,
			formatNumber,
			formatDate,
			truncateText,
			getPlatformColor,
			getPlatformName,
			onImageError,
			get User() {
				return User;
			},
			get Users() {
				return Users;
			},
			get CheckCircle() {
				return CheckCircle;
			},
			get Calendar() {
				return Calendar;
			},
			get ExternalLink() {
				return ExternalLink;
			},
			get FileText() {
				return FileText;
			},
			get Database() {
				return Database;
			},
			MainLayout: MainLayout_default,
			LoadingSpinner: LoadingSpinner_default
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
				_push$1(`<div class="authors-page" data-v-bb4d3219${_scopeId}><div class="page-header" data-v-bb4d3219${_scopeId}><h1 class="page-title" data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.title"))}</h1><div class="header-stats" data-v-bb4d3219${_scopeId}><div class="stat-item" data-v-bb4d3219${_scopeId}><span class="stat-label" data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.totalFollowers"))}</span><span class="stat-value" data-v-bb4d3219${_scopeId}>${ssrInterpolate($setup.formatNumber($setup.totalFollowers))}</span></div><div class="stat-item" data-v-bb4d3219${_scopeId}><span class="stat-label" data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.totalPosts"))}</span><span class="stat-value" data-v-bb4d3219${_scopeId}>${ssrInterpolate($setup.totalPosts)}</span></div></div></div>`);
				if ($setup.loading) _push$1(ssrRenderComponent($setup["LoadingSpinner"], { size: "lg" }, null, _parent$1, _scopeId));
				else if ($setup.authors.length > 0) {
					_push$1(`<div class="authors-list" data-v-bb4d3219${_scopeId}><!--[-->`);
					ssrRenderList($setup.authors, (author) => {
						_push$1(`<div class="author-card glass-card" data-v-bb4d3219${_scopeId}>`);
						if (author.profile_banner_url) _push$1(`<div class="card-banner" style="${ssrRenderStyle({ backgroundImage: `url(${author.profile_banner_url})` })}" data-v-bb4d3219${_scopeId}></div>`);
						else _push$1(`<!---->`);
						_push$1(`<div class="card-overlay" data-v-bb4d3219${_scopeId}></div><div class="card-content" data-v-bb4d3219${_scopeId}><div class="author-avatar-section" data-v-bb4d3219${_scopeId}><div class="avatar-wrapper" data-v-bb4d3219${_scopeId}>`);
						if (author.avatar_url) _push$1(`<img${ssrRenderAttr("src", author.avatar_url)}${ssrRenderAttr("alt", author.name)} class="avatar-image" data-v-bb4d3219${_scopeId}>`);
						else {
							_push$1(`<div class="avatar-placeholder" data-v-bb4d3219${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["User"], { size: 48 }, null, _parent$1, _scopeId));
							_push$1(`</div>`);
						}
						_push$1(`</div></div><div class="author-content" data-v-bb4d3219${_scopeId}><div class="author-header" data-v-bb4d3219${_scopeId}><div class="author-info" data-v-bb4d3219${_scopeId}><div class="name-row" data-v-bb4d3219${_scopeId}><h3 class="author-name" data-v-bb4d3219${_scopeId}>${ssrInterpolate(author.name)}</h3>`);
						if (author.is_verified) _push$1(ssrRenderComponent($setup["CheckCircle"], {
							size: 20,
							class: "verified-badge"
						}, null, _parent$1, _scopeId));
						else _push$1(`<!---->`);
						_push$1(`</div><p class="author-username" data-v-bb4d3219${_scopeId}>@${ssrInterpolate(author.username)}</p></div><div class="platform-badge" style="${ssrRenderStyle({ background: $setup.getPlatformColor(author.platform) })}" data-v-bb4d3219${_scopeId}>${ssrInterpolate($setup.getPlatformName(author.platform))}</div></div>`);
						if (author.description) _push$1(`<p class="author-bio" data-v-bb4d3219${_scopeId}>${ssrInterpolate($setup.truncateText(author.description, 120))}</p>`);
						else _push$1(`<!---->`);
						_push$1(`<div class="author-stats" data-v-bb4d3219${_scopeId}><div class="stat-item" data-v-bb4d3219${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Users"], { size: 16 }, null, _parent$1, _scopeId));
						_push$1(`<span class="stat-value" data-v-bb4d3219${_scopeId}>${ssrInterpolate($setup.formatNumber(author.follower_count || 0))}</span><span class="stat-label" data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.followers"))}</span></div><div class="stat-item" data-v-bb4d3219${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["FileText"], { size: 16 }, null, _parent$1, _scopeId));
						_push$1(`<span class="stat-value" data-v-bb4d3219${_scopeId}>${ssrInterpolate($setup.formatNumber(author.video_count || 0))}</span><span class="stat-label" data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("platform." + author.platform))} ${ssrInterpolate(_ctx.$t("author.posts"))}</span></div>`);
						if (author.post_count > 0) {
							_push$1(`<div class="stat-item scraped" data-v-bb4d3219${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["Database"], { size: 16 }, null, _parent$1, _scopeId));
							_push$1(`<span class="stat-value" data-v-bb4d3219${_scopeId}>${ssrInterpolate(author.post_count)}</span><span class="stat-label" data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.scraped"))}</span></div>`);
						} else _push$1(`<!---->`);
						_push$1(`</div><div class="author-footer" data-v-bb4d3219${_scopeId}><div class="author-meta" data-v-bb4d3219${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Calendar"], { size: 14 }, null, _parent$1, _scopeId));
						_push$1(`<span data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.platformJoined"))}: ${ssrInterpolate($setup.formatDate(author.created_at))}</span></div>`);
						if (author.profile_url) {
							_push$1(`<a${ssrRenderAttr("href", author.profile_url)} target="_blank" rel="noopener noreferrer" class="profile-link" data-v-bb4d3219${_scopeId}>`);
							_push$1(ssrRenderComponent($setup["ExternalLink"], { size: 16 }, null, _parent$1, _scopeId));
							_push$1(` ${ssrInterpolate(_ctx.$t("author.viewOriginal"))}</a>`);
						} else _push$1(`<!---->`);
						_push$1(`</div></div></div></div>`);
					});
					_push$1(`<!--]--></div>`);
				} else {
					_push$1(`<div class="empty-state glass-card" data-v-bb4d3219${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Users"], { size: 64 }, null, _parent$1, _scopeId));
					_push$1(`<h3 data-v-bb4d3219${_scopeId}>${ssrInterpolate(_ctx.$t("author.noAuthors"))}</h3></div>`);
				}
				_push$1(`</div>`);
			} else return [createVNode("div", { class: "authors-page" }, [createVNode("div", { class: "page-header" }, [createVNode("h1", { class: "page-title" }, toDisplayString(_ctx.$t("author.title")), 1), createVNode("div", { class: "header-stats" }, [createVNode("div", { class: "stat-item" }, [createVNode("span", { class: "stat-label" }, toDisplayString(_ctx.$t("author.totalFollowers")), 1), createVNode("span", { class: "stat-value" }, toDisplayString($setup.formatNumber($setup.totalFollowers)), 1)]), createVNode("div", { class: "stat-item" }, [createVNode("span", { class: "stat-label" }, toDisplayString(_ctx.$t("author.totalPosts")), 1), createVNode("span", { class: "stat-value" }, toDisplayString($setup.totalPosts), 1)])])]), $setup.loading ? (openBlock(), createBlock($setup["LoadingSpinner"], {
				key: 0,
				size: "lg"
			})) : $setup.authors.length > 0 ? (openBlock(), createBlock("div", {
				key: 1,
				class: "authors-list"
			}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.authors, (author) => {
				return openBlock(), createBlock("div", {
					key: author.id,
					class: "author-card glass-card"
				}, [
					author.profile_banner_url ? (openBlock(), createBlock("div", {
						key: 0,
						class: "card-banner",
						style: { backgroundImage: `url(${author.profile_banner_url})` }
					}, null, 4)) : createCommentVNode("", true),
					createVNode("div", { class: "card-overlay" }),
					createVNode("div", { class: "card-content" }, [createVNode("div", { class: "author-avatar-section" }, [createVNode("div", { class: "avatar-wrapper" }, [author.avatar_url ? (openBlock(), createBlock("img", {
						key: 0,
						src: author.avatar_url,
						alt: author.name,
						class: "avatar-image",
						onError: $setup.onImageError
					}, null, 40, ["src", "alt"])) : (openBlock(), createBlock("div", {
						key: 1,
						class: "avatar-placeholder"
					}, [createVNode($setup["User"], { size: 48 })]))])]), createVNode("div", { class: "author-content" }, [
						createVNode("div", { class: "author-header" }, [createVNode("div", { class: "author-info" }, [createVNode("div", { class: "name-row" }, [createVNode("h3", { class: "author-name" }, toDisplayString(author.name), 1), author.is_verified ? (openBlock(), createBlock($setup["CheckCircle"], {
							key: 0,
							size: 20,
							class: "verified-badge"
						})) : createCommentVNode("", true)]), createVNode("p", { class: "author-username" }, "@" + toDisplayString(author.username), 1)]), createVNode("div", {
							class: "platform-badge",
							style: { background: $setup.getPlatformColor(author.platform) }
						}, toDisplayString($setup.getPlatformName(author.platform)), 5)]),
						author.description ? (openBlock(), createBlock("p", {
							key: 0,
							class: "author-bio"
						}, toDisplayString($setup.truncateText(author.description, 120)), 1)) : createCommentVNode("", true),
						createVNode("div", { class: "author-stats" }, [
							createVNode("div", { class: "stat-item" }, [
								createVNode($setup["Users"], { size: 16 }),
								createVNode("span", { class: "stat-value" }, toDisplayString($setup.formatNumber(author.follower_count || 0)), 1),
								createVNode("span", { class: "stat-label" }, toDisplayString(_ctx.$t("author.followers")), 1)
							]),
							createVNode("div", { class: "stat-item" }, [
								createVNode($setup["FileText"], { size: 16 }),
								createVNode("span", { class: "stat-value" }, toDisplayString($setup.formatNumber(author.video_count || 0)), 1),
								createVNode("span", { class: "stat-label" }, toDisplayString(_ctx.$t("platform." + author.platform)) + " " + toDisplayString(_ctx.$t("author.posts")), 1)
							]),
							author.post_count > 0 ? (openBlock(), createBlock("div", {
								key: 0,
								class: "stat-item scraped"
							}, [
								createVNode($setup["Database"], { size: 16 }),
								createVNode("span", { class: "stat-value" }, toDisplayString(author.post_count), 1),
								createVNode("span", { class: "stat-label" }, toDisplayString(_ctx.$t("author.scraped")), 1)
							])) : createCommentVNode("", true)
						]),
						createVNode("div", { class: "author-footer" }, [createVNode("div", { class: "author-meta" }, [createVNode($setup["Calendar"], { size: 14 }), createVNode("span", null, toDisplayString(_ctx.$t("author.platformJoined")) + ": " + toDisplayString($setup.formatDate(author.created_at)), 1)]), author.profile_url ? (openBlock(), createBlock("a", {
							key: 0,
							href: author.profile_url,
							target: "_blank",
							rel: "noopener noreferrer",
							class: "profile-link"
						}, [createVNode($setup["ExternalLink"], { size: 16 }), createTextVNode(" " + toDisplayString(_ctx.$t("author.viewOriginal")), 1)], 8, ["href"])) : createCommentVNode("", true)])
					])])
				]);
			}), 128))])) : (openBlock(), createBlock("div", {
				key: 2,
				class: "empty-state glass-card"
			}, [createVNode($setup["Users"], { size: 64 }), createVNode("h3", null, toDisplayString(_ctx.$t("author.noAuthors")), 1)]))])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = AuthorsPage_vue_vue_type_script_setup_true_lang_default.setup;
AuthorsPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/AuthorsPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var AuthorsPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(AuthorsPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-bb4d3219"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/AuthorsPage.vue"]
]);
export { LoadingSpinner_default as a, getUserAvatar as c, PLATFORM_NAMES as i, __plugin_vue_export_helper_default as l, PLATFORMS as n, MainLayout_default as o, PLATFORM_COLORS as r, GlassButton_default as s, AuthorsPage_default as t, useThemeStore as u };
