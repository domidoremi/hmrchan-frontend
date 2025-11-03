import { o as useAuthStore } from "./api-services-BmQ9TwGt.js";
import { l as __plugin_vue_export_helper_default, o as MainLayout_default, s as GlassButton_default, u as useThemeStore } from "./view-authorspage-B1NrczNS.js";
import { n as useSettingsStore } from "./view-homepage-BmVNjp4X.js";
import { Fragment, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, openBlock, renderList, resolveDynamicComponent, toDisplayString, useSSRContext, withCtx } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderAttr, ssrRenderClass, ssrRenderComponent, ssrRenderList, ssrRenderVNode } from "vue/server-renderer";
import { Languages, LogOut, Monitor, Moon, Palette, PlayCircle, Sun, User } from "lucide-vue-next";
var SettingsPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SettingsPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const { locale } = useI18n();
		const authStore = useAuthStore();
		const themeStore = useThemeStore();
		const settingsStore = useSettingsStore();
		const { user } = storeToRefs(authStore);
		const { theme } = storeToRefs(themeStore);
		const themeOptions = [
			{
				value: "light",
				icon: Sun
			},
			{
				value: "dark",
				icon: Moon
			},
			{
				value: "auto",
				icon: Monitor
			}
		];
		const localeOptions = [
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
		const setTheme = (newTheme) => {
			themeStore.setTheme(newTheme);
		};
		const changeLanguage = (newLocale) => {
			locale.value = newLocale;
			localStorage.setItem("locale", newLocale);
		};
		const handleLogout = () => {
			authStore.logout();
			router.push("/login");
		};
		const __returned__ = {
			router,
			locale,
			authStore,
			themeStore,
			settingsStore,
			user,
			theme,
			themeOptions,
			localeOptions,
			setTheme,
			changeLanguage,
			handleLogout,
			get Palette() {
				return Palette;
			},
			get Languages() {
				return Languages;
			},
			get User() {
				return User;
			},
			get LogOut() {
				return LogOut;
			},
			get Monitor() {
				return Monitor;
			},
			get PlayCircle() {
				return PlayCircle;
			},
			MainLayout: MainLayout_default,
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
				_push$1(`<div class="settings-page" data-v-51f5375f${_scopeId}><h1 class="page-title" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("nav.settings"))}</h1><div class="settings-grid" data-v-51f5375f${_scopeId}><div class="settings-card glass-card" data-v-51f5375f${_scopeId}><div class="card-header" data-v-51f5375f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Palette"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`<h2 data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("settings.theme"))}</h2></div><div class="settings-content" data-v-51f5375f${_scopeId}><div class="theme-options" data-v-51f5375f${_scopeId}><!--[-->`);
				ssrRenderList($setup.themeOptions, (themeOption) => {
					_push$1(`<button class="${ssrRenderClass([{ active: $setup.theme === themeOption.value }, "theme-option"])}" data-v-51f5375f${_scopeId}>`);
					ssrRenderVNode(_push$1, createVNode(resolveDynamicComponent(themeOption.icon), { size: 20 }, null), _parent$1, _scopeId);
					_push$1(`<span data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t(`settings.${themeOption.value}`))}</span></button>`);
				});
				_push$1(`<!--]--></div></div></div><div class="settings-card glass-card" data-v-51f5375f${_scopeId}><div class="card-header" data-v-51f5375f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Monitor"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`<h2 data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("settings.display"))}</h2></div><div class="settings-content" data-v-51f5375f${_scopeId}><div class="setting-row" data-v-51f5375f${_scopeId}><div class="setting-info" data-v-51f5375f${_scopeId}><div class="setting-label" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("settings.showHeroSection"))}</div><div class="setting-description" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("settings.showHeroSectionDesc"))}</div></div><button class="${ssrRenderClass([{ active: $setup.settingsStore.settings.showHeroSection }, "toggle-switch"])}" role="switch"${ssrRenderAttr("aria-checked", $setup.settingsStore.settings.showHeroSection ? "true" : "false")}${ssrRenderAttr("aria-label", _ctx.$t("settings.showHeroSection"))} data-v-51f5375f${_scopeId}><span class="toggle-slider" data-v-51f5375f${_scopeId}></span></button></div><div class="setting-row" data-v-51f5375f${_scopeId}><div class="setting-info" data-v-51f5375f${_scopeId}><div class="setting-label" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.enableAnimations"))}</div><div class="setting-description" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.enableAnimationsDesc"))}</div></div><button class="${ssrRenderClass([{ active: $setup.settingsStore.settings.enableAnimations }, "toggle-switch"])}" role="switch"${ssrRenderAttr("aria-checked", $setup.settingsStore.settings.enableAnimations ? "true" : "false")}${ssrRenderAttr("aria-label", _ctx.$t("preferences.enableAnimations"))} data-v-51f5375f${_scopeId}><span class="toggle-slider" data-v-51f5375f${_scopeId}></span></button></div><div class="setting-row" data-v-51f5375f${_scopeId}><div class="setting-info" data-v-51f5375f${_scopeId}><div class="setting-label" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.postsPerPage"))}</div><div class="setting-description" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.postsPerPageDesc"))}</div></div><select class="select-input"${ssrRenderAttr("value", $setup.settingsStore.settings.postsPerPage)} data-v-51f5375f${_scopeId}><option${ssrRenderAttr("value", 10)} data-v-51f5375f${_scopeId}>10</option><option${ssrRenderAttr("value", 20)} data-v-51f5375f${_scopeId}>20</option><option${ssrRenderAttr("value", 30)} data-v-51f5375f${_scopeId}>30</option><option${ssrRenderAttr("value", 50)} data-v-51f5375f${_scopeId}>50</option></select></div></div></div><div class="settings-card glass-card" data-v-51f5375f${_scopeId}><div class="card-header" data-v-51f5375f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["PlayCircle"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`<h2 data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.media"))}</h2></div><div class="settings-content" data-v-51f5375f${_scopeId}><div class="setting-row" data-v-51f5375f${_scopeId}><div class="setting-info" data-v-51f5375f${_scopeId}><div class="setting-label" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.autoPlayVideos"))}</div><div class="setting-description" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.autoPlayVideosDesc"))}</div></div><button class="${ssrRenderClass([{ active: $setup.settingsStore.settings.autoPlayVideos }, "toggle-switch"])}" role="switch"${ssrRenderAttr("aria-checked", $setup.settingsStore.settings.autoPlayVideos ? "true" : "false")}${ssrRenderAttr("aria-label", _ctx.$t("preferences.autoPlayVideos"))} data-v-51f5375f${_scopeId}><span class="toggle-slider" data-v-51f5375f${_scopeId}></span></button></div><div class="setting-row" data-v-51f5375f${_scopeId}><div class="setting-info" data-v-51f5375f${_scopeId}><div class="setting-label" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.showImagePreviews"))}</div><div class="setting-description" data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.showImagePreviewsDesc"))}</div></div><button class="${ssrRenderClass([{ active: $setup.settingsStore.settings.showImagePreviews }, "toggle-switch"])}" role="switch"${ssrRenderAttr("aria-checked", $setup.settingsStore.settings.showImagePreviews ? "true" : "false")}${ssrRenderAttr("aria-label", _ctx.$t("preferences.showImagePreviews"))} data-v-51f5375f${_scopeId}><span class="toggle-slider" data-v-51f5375f${_scopeId}></span></button></div></div></div><div class="settings-card glass-card" data-v-51f5375f${_scopeId}><div class="card-header" data-v-51f5375f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Languages"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`<h2 data-v-51f5375f${_scopeId}>${ssrInterpolate(_ctx.$t("settings.language"))}</h2></div><div class="settings-content" data-v-51f5375f${_scopeId}><div class="language-options" data-v-51f5375f${_scopeId}><!--[-->`);
				ssrRenderList($setup.localeOptions, (localeOption) => {
					_push$1(`<button class="${ssrRenderClass([{ active: $setup.locale === localeOption.code }, "language-option"])}" data-v-51f5375f${_scopeId}>${ssrInterpolate(localeOption.name)}</button>`);
				});
				_push$1(`<!--]--></div></div></div>`);
				if ($setup.user) {
					_push$1(`<div class="settings-card glass-card" data-v-51f5375f${_scopeId}><div class="card-header" data-v-51f5375f${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["User"], { size: 24 }, null, _parent$1, _scopeId));
					_push$1(`<h3 data-v-51f5375f${_scopeId}>Account</h3></div><div class="settings-content" data-v-51f5375f${_scopeId}><div class="user-info" data-v-51f5375f${_scopeId}><div class="info-row" data-v-51f5375f${_scopeId}><span class="label" data-v-51f5375f${_scopeId}>Username:</span><span class="value" data-v-51f5375f${_scopeId}>${ssrInterpolate($setup.user.username)}</span></div><div class="info-row" data-v-51f5375f${_scopeId}><span class="label" data-v-51f5375f${_scopeId}>Email:</span><span class="value" data-v-51f5375f${_scopeId}>${ssrInterpolate($setup.user.email)}</span></div><div class="info-row" data-v-51f5375f${_scopeId}><span class="label" data-v-51f5375f${_scopeId}>Role:</span><span class="value" data-v-51f5375f${_scopeId}>${ssrInterpolate($setup.user.is_admin ? "Admin" : "User")}</span></div></div>`);
					_push$1(ssrRenderComponent($setup["GlassButton"], {
						variant: "secondary",
						onClick: $setup.handleLogout
					}, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) {
								_push$2(ssrRenderComponent($setup["LogOut"], { size: 18 }, null, _parent$2, _scopeId$1));
								_push$2(` ${ssrInterpolate(_ctx.$t("nav.logout"))}`);
							} else return [createVNode($setup["LogOut"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.logout")), 1)];
						}),
						_: 1
					}, _parent$1, _scopeId));
					_push$1(`</div></div>`);
				} else _push$1(`<!---->`);
				_push$1(`</div></div>`);
			} else return [createVNode("div", { class: "settings-page" }, [createVNode("h1", { class: "page-title" }, toDisplayString(_ctx.$t("nav.settings")), 1), createVNode("div", { class: "settings-grid" }, [
				createVNode("div", { class: "settings-card glass-card" }, [createVNode("div", { class: "card-header" }, [createVNode($setup["Palette"], { size: 24 }), createVNode("h2", null, toDisplayString(_ctx.$t("settings.theme")), 1)]), createVNode("div", { class: "settings-content" }, [createVNode("div", { class: "theme-options" }, [(openBlock(), createBlock(Fragment, null, renderList($setup.themeOptions, (themeOption) => {
					return createVNode("button", {
						key: themeOption.value,
						class: ["theme-option", { active: $setup.theme === themeOption.value }],
						onClick: ($event) => $setup.setTheme(themeOption.value)
					}, [(openBlock(), createBlock(resolveDynamicComponent(themeOption.icon), { size: 20 })), createVNode("span", null, toDisplayString(_ctx.$t(`settings.${themeOption.value}`)), 1)], 10, ["onClick"]);
				}), 64))])])]),
				createVNode("div", { class: "settings-card glass-card" }, [createVNode("div", { class: "card-header" }, [createVNode($setup["Monitor"], { size: 24 }), createVNode("h2", null, toDisplayString(_ctx.$t("settings.display")), 1)]), createVNode("div", { class: "settings-content" }, [
					createVNode("div", { class: "setting-row" }, [createVNode("div", { class: "setting-info" }, [createVNode("div", { class: "setting-label" }, toDisplayString(_ctx.$t("settings.showHeroSection")), 1), createVNode("div", { class: "setting-description" }, toDisplayString(_ctx.$t("settings.showHeroSectionDesc")), 1)]), createVNode("button", {
						class: ["toggle-switch", { active: $setup.settingsStore.settings.showHeroSection }],
						onClick: ($event) => $setup.settingsStore.toggleSetting("showHeroSection"),
						role: "switch",
						"aria-checked": $setup.settingsStore.settings.showHeroSection ? "true" : "false",
						"aria-label": _ctx.$t("settings.showHeroSection")
					}, [createVNode("span", { class: "toggle-slider" })], 10, [
						"onClick",
						"aria-checked",
						"aria-label"
					])]),
					createVNode("div", { class: "setting-row" }, [createVNode("div", { class: "setting-info" }, [createVNode("div", { class: "setting-label" }, toDisplayString(_ctx.$t("preferences.enableAnimations")), 1), createVNode("div", { class: "setting-description" }, toDisplayString(_ctx.$t("preferences.enableAnimationsDesc")), 1)]), createVNode("button", {
						class: ["toggle-switch", { active: $setup.settingsStore.settings.enableAnimations }],
						onClick: ($event) => $setup.settingsStore.toggleSetting("enableAnimations"),
						role: "switch",
						"aria-checked": $setup.settingsStore.settings.enableAnimations ? "true" : "false",
						"aria-label": _ctx.$t("preferences.enableAnimations")
					}, [createVNode("span", { class: "toggle-slider" })], 10, [
						"onClick",
						"aria-checked",
						"aria-label"
					])]),
					createVNode("div", { class: "setting-row" }, [createVNode("div", { class: "setting-info" }, [createVNode("div", { class: "setting-label" }, toDisplayString(_ctx.$t("preferences.postsPerPage")), 1), createVNode("div", { class: "setting-description" }, toDisplayString(_ctx.$t("preferences.postsPerPageDesc")), 1)]), createVNode("select", {
						class: "select-input",
						value: $setup.settingsStore.settings.postsPerPage,
						onChange: ($event) => $setup.settingsStore.updateSetting("postsPerPage", parseInt($event.target.value))
					}, [
						createVNode("option", { value: 10 }, "10"),
						createVNode("option", { value: 20 }, "20"),
						createVNode("option", { value: 30 }, "30"),
						createVNode("option", { value: 50 }, "50")
					], 40, ["value", "onChange"])])
				])]),
				createVNode("div", { class: "settings-card glass-card" }, [createVNode("div", { class: "card-header" }, [createVNode($setup["PlayCircle"], { size: 24 }), createVNode("h2", null, toDisplayString(_ctx.$t("preferences.media")), 1)]), createVNode("div", { class: "settings-content" }, [createVNode("div", { class: "setting-row" }, [createVNode("div", { class: "setting-info" }, [createVNode("div", { class: "setting-label" }, toDisplayString(_ctx.$t("preferences.autoPlayVideos")), 1), createVNode("div", { class: "setting-description" }, toDisplayString(_ctx.$t("preferences.autoPlayVideosDesc")), 1)]), createVNode("button", {
					class: ["toggle-switch", { active: $setup.settingsStore.settings.autoPlayVideos }],
					onClick: ($event) => $setup.settingsStore.toggleSetting("autoPlayVideos"),
					role: "switch",
					"aria-checked": $setup.settingsStore.settings.autoPlayVideos ? "true" : "false",
					"aria-label": _ctx.$t("preferences.autoPlayVideos")
				}, [createVNode("span", { class: "toggle-slider" })], 10, [
					"onClick",
					"aria-checked",
					"aria-label"
				])]), createVNode("div", { class: "setting-row" }, [createVNode("div", { class: "setting-info" }, [createVNode("div", { class: "setting-label" }, toDisplayString(_ctx.$t("preferences.showImagePreviews")), 1), createVNode("div", { class: "setting-description" }, toDisplayString(_ctx.$t("preferences.showImagePreviewsDesc")), 1)]), createVNode("button", {
					class: ["toggle-switch", { active: $setup.settingsStore.settings.showImagePreviews }],
					onClick: ($event) => $setup.settingsStore.toggleSetting("showImagePreviews"),
					role: "switch",
					"aria-checked": $setup.settingsStore.settings.showImagePreviews ? "true" : "false",
					"aria-label": _ctx.$t("preferences.showImagePreviews")
				}, [createVNode("span", { class: "toggle-slider" })], 10, [
					"onClick",
					"aria-checked",
					"aria-label"
				])])])]),
				createVNode("div", { class: "settings-card glass-card" }, [createVNode("div", { class: "card-header" }, [createVNode($setup["Languages"], { size: 24 }), createVNode("h2", null, toDisplayString(_ctx.$t("settings.language")), 1)]), createVNode("div", { class: "settings-content" }, [createVNode("div", { class: "language-options" }, [(openBlock(), createBlock(Fragment, null, renderList($setup.localeOptions, (localeOption) => {
					return createVNode("button", {
						key: localeOption.code,
						class: ["language-option", { active: $setup.locale === localeOption.code }],
						onClick: ($event) => $setup.changeLanguage(localeOption.code)
					}, toDisplayString(localeOption.name), 11, ["onClick"]);
				}), 64))])])]),
				$setup.user ? (openBlock(), createBlock("div", {
					key: 0,
					class: "settings-card glass-card"
				}, [createVNode("div", { class: "card-header" }, [createVNode($setup["User"], { size: 24 }), createVNode("h3", null, "Account")]), createVNode("div", { class: "settings-content" }, [createVNode("div", { class: "user-info" }, [
					createVNode("div", { class: "info-row" }, [createVNode("span", { class: "label" }, "Username:"), createVNode("span", { class: "value" }, toDisplayString($setup.user.username), 1)]),
					createVNode("div", { class: "info-row" }, [createVNode("span", { class: "label" }, "Email:"), createVNode("span", { class: "value" }, toDisplayString($setup.user.email), 1)]),
					createVNode("div", { class: "info-row" }, [createVNode("span", { class: "label" }, "Role:"), createVNode("span", { class: "value" }, toDisplayString($setup.user.is_admin ? "Admin" : "User"), 1)])
				]), createVNode($setup["GlassButton"], {
					variant: "secondary",
					onClick: $setup.handleLogout
				}, {
					default: withCtx(() => [createVNode($setup["LogOut"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("nav.logout")), 1)]),
					_: 1
				})])])) : createCommentVNode("", true)
			])])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = SettingsPage_vue_vue_type_script_setup_true_lang_default.setup;
SettingsPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/SettingsPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var SettingsPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(SettingsPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-51f5375f"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/SettingsPage.vue"]
]);
export { SettingsPage_default as t };
