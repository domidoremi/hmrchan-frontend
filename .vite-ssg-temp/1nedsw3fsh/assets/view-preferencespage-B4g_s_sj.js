import { o as useAuthStore } from "./api-services-BmQ9TwGt.js";
import { l as __plugin_vue_export_helper_default, o as MainLayout_default } from "./view-authorspage-B1NrczNS.js";
import { n as useSettingsStore } from "./view-homepage-BmVNjp4X.js";
import { o as toast_default } from "./composables-CdbJX3Qi.js";
import { computed, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, openBlock, toDisplayString, useSSRContext, withCtx } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrIncludeBooleanAttr, ssrInterpolate, ssrRenderAttr, ssrRenderComponent } from "vue/server-renderer";
import { ArrowLeft, Check, Cloud, Database, Download, Monitor, PlayCircle, RefreshCw, Upload } from "lucide-vue-next";
var PreferencesPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PreferencesPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const { t } = useI18n();
		const settingsStore = useSettingsStore();
		const authStore = useAuthStore();
		const settings = computed(() => settingsStore.settings);
		const { syncing, lastSyncedAt } = storeToRefs(settingsStore);
		const goBack = () => {
			router.back();
		};
		const toggleSetting = (key) => {
			settingsStore.toggleSetting(key);
			toast_default.success(t("preferences.settingsSaved"));
		};
		const updateSetting = (key, value) => {
			settingsStore.updateSetting(key, value);
			toast_default.success(t("preferences.settingsSaved"));
		};
		const exportPreferences = () => {
			const data = settingsStore.exportSettings();
			const blob = new Blob([data], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "himeri-chan-preferences.json";
			a.click();
			URL.revokeObjectURL(url);
			toast_default.success(t("preferences.exportSuccess"));
		};
		const showImportDialog = () => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = "application/json";
			input.onchange = (e) => {
				const file = e.target.files?.[0];
				if (file) {
					const reader = new FileReader();
					reader.onload = (e$1) => {
						const data = e$1.target?.result;
						if (settingsStore.importSettings(data)) toast_default.success(t("preferences.importSuccess"));
						else toast_default.error(t("preferences.importFailed"));
					};
					reader.readAsText(file);
				}
			};
			input.click();
		};
		const resetPreferences = () => {
			if (confirm(t("preferences.resetConfirm"))) {
				settingsStore.resetSettings();
				toast_default.success(t("preferences.resetSuccess"));
			}
		};
		const __returned__ = {
			router,
			t,
			settingsStore,
			authStore,
			settings,
			syncing,
			lastSyncedAt,
			goBack,
			toggleSetting,
			updateSetting,
			exportPreferences,
			showImportDialog,
			resetPreferences,
			MainLayout: MainLayout_default,
			get ArrowLeft() {
				return ArrowLeft;
			},
			get Monitor() {
				return Monitor;
			},
			get PlayCircle() {
				return PlayCircle;
			},
			get Database() {
				return Database;
			},
			get Download() {
				return Download;
			},
			get Upload() {
				return Upload;
			},
			get RefreshCw() {
				return RefreshCw;
			},
			get Check() {
				return Check;
			},
			get Cloud() {
				return Cloud;
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
	_push(ssrRenderComponent($setup["MainLayout"], _attrs, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<div class="preferences-page" data-v-4d6b9e31${_scopeId}><div class="preferences-header glass-card" data-v-4d6b9e31${_scopeId}><button class="back-button glass-button" data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["ArrowLeft"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("common.back"))}</button><div class="header-content" data-v-4d6b9e31${_scopeId}><div class="header-text" data-v-4d6b9e31${_scopeId}><h1 data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.title"))}</h1><p class="subtitle" data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.subtitle"))}</p></div>`);
				if ($setup.authStore.isAuthenticated) {
					_push$1(`<div class="sync-status" data-v-4d6b9e31${_scopeId}>`);
					if ($setup.syncing) {
						_push$1(`<div class="status-item syncing" data-v-4d6b9e31${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["RefreshCw"], {
							size: 16,
							class: "spinning"
						}, null, _parent$1, _scopeId));
						_push$1(`<span data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.syncing"))}</span></div>`);
					} else if ($setup.lastSyncedAt) {
						_push$1(`<div class="status-item synced" data-v-4d6b9e31${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Check"], { size: 16 }, null, _parent$1, _scopeId));
						_push$1(`<span data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.synced"))}</span></div>`);
					} else {
						_push$1(`<div class="status-item local-only" data-v-4d6b9e31${_scopeId}>`);
						_push$1(ssrRenderComponent($setup["Cloud"], { size: 16 }, null, _parent$1, _scopeId));
						_push$1(`<span data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.localOnly"))}</span></div>`);
					}
					_push$1(`</div>`);
				} else _push$1(`<!---->`);
				_push$1(`</div></div><div class="preferences-content" data-v-4d6b9e31${_scopeId}><section class="preference-section glass-card" data-v-4d6b9e31${_scopeId}><h2 data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Monitor"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("preferences.display"))}</h2><div class="preference-item" data-v-4d6b9e31${_scopeId}><div class="item-info" data-v-4d6b9e31${_scopeId}><label data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.showHeroSection"))}</label><p class="item-description" data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.showHeroSectionDesc"))}</p></div><label class="toggle-switch" data-v-4d6b9e31${_scopeId}><input type="checkbox"${ssrIncludeBooleanAttr($setup.settings.showHeroSection) ? " checked" : ""} data-v-4d6b9e31${_scopeId}><span class="toggle-slider" data-v-4d6b9e31${_scopeId}></span></label></div><div class="preference-item" data-v-4d6b9e31${_scopeId}><div class="item-info" data-v-4d6b9e31${_scopeId}><label data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.enableAnimations"))}</label><p class="item-description" data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.enableAnimationsDesc"))}</p></div><label class="toggle-switch" data-v-4d6b9e31${_scopeId}><input type="checkbox"${ssrIncludeBooleanAttr($setup.settings.enableAnimations) ? " checked" : ""} data-v-4d6b9e31${_scopeId}><span class="toggle-slider" data-v-4d6b9e31${_scopeId}></span></label></div><div class="preference-item" data-v-4d6b9e31${_scopeId}><div class="item-info" data-v-4d6b9e31${_scopeId}><label data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.postsPerPage"))}</label><p class="item-description" data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.postsPerPageDesc"))}</p></div><select class="select-input"${ssrRenderAttr("value", $setup.settings.postsPerPage)} data-v-4d6b9e31${_scopeId}><option${ssrRenderAttr("value", 10)} data-v-4d6b9e31${_scopeId}>10</option><option${ssrRenderAttr("value", 20)} data-v-4d6b9e31${_scopeId}>20</option><option${ssrRenderAttr("value", 30)} data-v-4d6b9e31${_scopeId}>30</option><option${ssrRenderAttr("value", 50)} data-v-4d6b9e31${_scopeId}>50</option></select></div></section><section class="preference-section glass-card" data-v-4d6b9e31${_scopeId}><h2 data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["PlayCircle"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("preferences.media"))}</h2><div class="preference-item" data-v-4d6b9e31${_scopeId}><div class="item-info" data-v-4d6b9e31${_scopeId}><label data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.autoPlayVideos"))}</label><p class="item-description" data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.autoPlayVideosDesc"))}</p></div><label class="toggle-switch" data-v-4d6b9e31${_scopeId}><input type="checkbox"${ssrIncludeBooleanAttr($setup.settings.autoPlayVideos) ? " checked" : ""} data-v-4d6b9e31${_scopeId}><span class="toggle-slider" data-v-4d6b9e31${_scopeId}></span></label></div><div class="preference-item" data-v-4d6b9e31${_scopeId}><div class="item-info" data-v-4d6b9e31${_scopeId}><label data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.showImagePreviews"))}</label><p class="item-description" data-v-4d6b9e31${_scopeId}>${ssrInterpolate(_ctx.$t("preferences.showImagePreviewsDesc"))}</p></div><label class="toggle-switch" data-v-4d6b9e31${_scopeId}><input type="checkbox"${ssrIncludeBooleanAttr($setup.settings.showImagePreviews) ? " checked" : ""} data-v-4d6b9e31${_scopeId}><span class="toggle-slider" data-v-4d6b9e31${_scopeId}></span></label></div></section><section class="preference-section glass-card" data-v-4d6b9e31${_scopeId}><h2 data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Database"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("preferences.dataManagement"))}</h2><div class="data-actions" data-v-4d6b9e31${_scopeId}><button class="action-button" data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Download"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("preferences.exportData"))}</button><button class="action-button" data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Upload"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("preferences.importData"))}</button><button class="action-button danger" data-v-4d6b9e31${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["RefreshCw"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("preferences.resetDefaults"))}</button></div></section></div></div>`);
			} else return [createVNode("div", { class: "preferences-page" }, [createVNode("div", { class: "preferences-header glass-card" }, [createVNode("button", {
				class: "back-button glass-button",
				onClick: $setup.goBack
			}, [createVNode($setup["ArrowLeft"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.back")), 1)]), createVNode("div", { class: "header-content" }, [createVNode("div", { class: "header-text" }, [createVNode("h1", null, toDisplayString(_ctx.$t("preferences.title")), 1), createVNode("p", { class: "subtitle" }, toDisplayString(_ctx.$t("preferences.subtitle")), 1)]), $setup.authStore.isAuthenticated ? (openBlock(), createBlock("div", {
				key: 0,
				class: "sync-status"
			}, [$setup.syncing ? (openBlock(), createBlock("div", {
				key: 0,
				class: "status-item syncing"
			}, [createVNode($setup["RefreshCw"], {
				size: 16,
				class: "spinning"
			}), createVNode("span", null, toDisplayString(_ctx.$t("preferences.syncing")), 1)])) : $setup.lastSyncedAt ? (openBlock(), createBlock("div", {
				key: 1,
				class: "status-item synced"
			}, [createVNode($setup["Check"], { size: 16 }), createVNode("span", null, toDisplayString(_ctx.$t("preferences.synced")), 1)])) : (openBlock(), createBlock("div", {
				key: 2,
				class: "status-item local-only"
			}, [createVNode($setup["Cloud"], { size: 16 }), createVNode("span", null, toDisplayString(_ctx.$t("preferences.localOnly")), 1)]))])) : createCommentVNode("", true)])]), createVNode("div", { class: "preferences-content" }, [
				createVNode("section", { class: "preference-section glass-card" }, [
					createVNode("h2", null, [createVNode($setup["Monitor"], { size: 24 }), createTextVNode(" " + toDisplayString(_ctx.$t("preferences.display")), 1)]),
					createVNode("div", { class: "preference-item" }, [createVNode("div", { class: "item-info" }, [createVNode("label", null, toDisplayString(_ctx.$t("preferences.showHeroSection")), 1), createVNode("p", { class: "item-description" }, toDisplayString(_ctx.$t("preferences.showHeroSectionDesc")), 1)]), createVNode("label", { class: "toggle-switch" }, [createVNode("input", {
						type: "checkbox",
						checked: $setup.settings.showHeroSection,
						onChange: ($event) => $setup.toggleSetting("showHeroSection")
					}, null, 40, ["checked", "onChange"]), createVNode("span", { class: "toggle-slider" })])]),
					createVNode("div", { class: "preference-item" }, [createVNode("div", { class: "item-info" }, [createVNode("label", null, toDisplayString(_ctx.$t("preferences.enableAnimations")), 1), createVNode("p", { class: "item-description" }, toDisplayString(_ctx.$t("preferences.enableAnimationsDesc")), 1)]), createVNode("label", { class: "toggle-switch" }, [createVNode("input", {
						type: "checkbox",
						checked: $setup.settings.enableAnimations,
						onChange: ($event) => $setup.toggleSetting("enableAnimations")
					}, null, 40, ["checked", "onChange"]), createVNode("span", { class: "toggle-slider" })])]),
					createVNode("div", { class: "preference-item" }, [createVNode("div", { class: "item-info" }, [createVNode("label", null, toDisplayString(_ctx.$t("preferences.postsPerPage")), 1), createVNode("p", { class: "item-description" }, toDisplayString(_ctx.$t("preferences.postsPerPageDesc")), 1)]), createVNode("select", {
						class: "select-input",
						value: $setup.settings.postsPerPage,
						onChange: ($event) => $setup.updateSetting("postsPerPage", parseInt($event.target.value))
					}, [
						createVNode("option", { value: 10 }, "10"),
						createVNode("option", { value: 20 }, "20"),
						createVNode("option", { value: 30 }, "30"),
						createVNode("option", { value: 50 }, "50")
					], 40, ["value", "onChange"])])
				]),
				createVNode("section", { class: "preference-section glass-card" }, [
					createVNode("h2", null, [createVNode($setup["PlayCircle"], { size: 24 }), createTextVNode(" " + toDisplayString(_ctx.$t("preferences.media")), 1)]),
					createVNode("div", { class: "preference-item" }, [createVNode("div", { class: "item-info" }, [createVNode("label", null, toDisplayString(_ctx.$t("preferences.autoPlayVideos")), 1), createVNode("p", { class: "item-description" }, toDisplayString(_ctx.$t("preferences.autoPlayVideosDesc")), 1)]), createVNode("label", { class: "toggle-switch" }, [createVNode("input", {
						type: "checkbox",
						checked: $setup.settings.autoPlayVideos,
						onChange: ($event) => $setup.toggleSetting("autoPlayVideos")
					}, null, 40, ["checked", "onChange"]), createVNode("span", { class: "toggle-slider" })])]),
					createVNode("div", { class: "preference-item" }, [createVNode("div", { class: "item-info" }, [createVNode("label", null, toDisplayString(_ctx.$t("preferences.showImagePreviews")), 1), createVNode("p", { class: "item-description" }, toDisplayString(_ctx.$t("preferences.showImagePreviewsDesc")), 1)]), createVNode("label", { class: "toggle-switch" }, [createVNode("input", {
						type: "checkbox",
						checked: $setup.settings.showImagePreviews,
						onChange: ($event) => $setup.toggleSetting("showImagePreviews")
					}, null, 40, ["checked", "onChange"]), createVNode("span", { class: "toggle-slider" })])])
				]),
				createVNode("section", { class: "preference-section glass-card" }, [createVNode("h2", null, [createVNode($setup["Database"], { size: 24 }), createTextVNode(" " + toDisplayString(_ctx.$t("preferences.dataManagement")), 1)]), createVNode("div", { class: "data-actions" }, [
					createVNode("button", {
						onClick: $setup.exportPreferences,
						class: "action-button"
					}, [createVNode($setup["Download"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("preferences.exportData")), 1)]),
					createVNode("button", {
						onClick: $setup.showImportDialog,
						class: "action-button"
					}, [createVNode($setup["Upload"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("preferences.importData")), 1)]),
					createVNode("button", {
						onClick: $setup.resetPreferences,
						class: "action-button danger"
					}, [createVNode($setup["RefreshCw"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("preferences.resetDefaults")), 1)])
				])])
			])])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = PreferencesPage_vue_vue_type_script_setup_true_lang_default.setup;
PreferencesPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/PreferencesPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PreferencesPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(PreferencesPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-4d6b9e31"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/PreferencesPage.vue"]
]);
export { PreferencesPage_default as t };
