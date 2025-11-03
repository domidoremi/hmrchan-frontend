import { l as __plugin_vue_export_helper_default, o as MainLayout_default } from "./view-authorspage-B1NrczNS.js";
import { Fragment, computed, createBlock, createTextVNode, createVNode, defineComponent, openBlock, renderList, resolveComponent, toDisplayString, useSSRContext, withCtx } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderComponent, ssrRenderList } from "vue/server-renderer";
import { ArrowLeft } from "lucide-vue-next";
var lastUpdated = "2025-10-29";
var PrivacyPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PrivacyPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const { t } = useI18n();
		const goBack = () => {
			router.back();
		};
		const __returned__ = {
			router,
			t,
			lastUpdated,
			goBack,
			sections: computed(() => [
				{
					id: "intro",
					title: t("privacy.intro.title"),
					content: t("privacy.intro.content")
				},
				{
					id: "data-collection",
					title: t("privacy.dataCollection.title"),
					content: t("privacy.dataCollection.content")
				},
				{
					id: "cookies",
					title: t("privacy.cookies.title"),
					content: t("privacy.cookies.content")
				},
				{
					id: "data-use",
					title: t("privacy.dataUse.title"),
					content: t("privacy.dataUse.content")
				},
				{
					id: "data-sharing",
					title: t("privacy.dataSharing.title"),
					content: t("privacy.dataSharing.content")
				},
				{
					id: "your-rights",
					title: t("privacy.yourRights.title"),
					content: t("privacy.yourRights.content")
				},
				{
					id: "security",
					title: t("privacy.security.title"),
					content: t("privacy.security.content")
				},
				{
					id: "changes",
					title: t("privacy.changes.title"),
					content: t("privacy.changes.content")
				}
			]),
			MainLayout: MainLayout_default,
			get ArrowLeft() {
				return ArrowLeft;
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
	const _component_router_link = resolveComponent("router-link");
	_push(ssrRenderComponent($setup["MainLayout"], _attrs, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<div class="privacy-page" data-v-b512783f${_scopeId}><div class="privacy-header glass-card" data-v-b512783f${_scopeId}><button class="back-button glass-button" data-v-b512783f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["ArrowLeft"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("common.back"))}</button><h1 data-v-b512783f${_scopeId}>${ssrInterpolate(_ctx.$t("privacy.title"))}</h1><p class="last-updated" data-v-b512783f${_scopeId}>${ssrInterpolate(_ctx.$t("privacy.lastUpdated"))}: ${ssrInterpolate($setup.lastUpdated)}</p></div><div class="privacy-content glass-card" data-v-b512783f${_scopeId}><!--[-->`);
				ssrRenderList($setup.sections, (section) => {
					_push$1(`<section class="privacy-section" data-v-b512783f${_scopeId}><h2 data-v-b512783f${_scopeId}>${ssrInterpolate(section.title)}</h2><div data-v-b512783f${_scopeId}>${section.content ?? ""}</div></section>`);
				});
				_push$1(`<!--]--><div class="privacy-footer" data-v-b512783f${_scopeId}><p data-v-b512783f${_scopeId}>${ssrInterpolate(_ctx.$t("privacy.questions"))}</p>`);
				_push$1(ssrRenderComponent(_component_router_link, {
					to: "/preferences",
					class: "preferences-link"
				}, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) _push$2(`${ssrInterpolate(_ctx.$t("privacy.managePreferences"))}`);
						else return [createTextVNode(toDisplayString(_ctx.$t("privacy.managePreferences")), 1)];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(`</div></div></div>`);
			} else return [createVNode("div", { class: "privacy-page" }, [createVNode("div", { class: "privacy-header glass-card" }, [
				createVNode("button", {
					class: "back-button glass-button",
					onClick: $setup.goBack
				}, [createVNode($setup["ArrowLeft"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.back")), 1)]),
				createVNode("h1", null, toDisplayString(_ctx.$t("privacy.title")), 1),
				createVNode("p", { class: "last-updated" }, toDisplayString(_ctx.$t("privacy.lastUpdated")) + ": " + toDisplayString($setup.lastUpdated), 1)
			]), createVNode("div", { class: "privacy-content glass-card" }, [(openBlock(true), createBlock(Fragment, null, renderList($setup.sections, (section) => {
				return openBlock(), createBlock("section", {
					key: section.id,
					class: "privacy-section"
				}, [createVNode("h2", null, toDisplayString(section.title), 1), createVNode("div", { innerHTML: section.content }, null, 8, ["innerHTML"])]);
			}), 128)), createVNode("div", { class: "privacy-footer" }, [createVNode("p", null, toDisplayString(_ctx.$t("privacy.questions")), 1), createVNode(_component_router_link, {
				to: "/preferences",
				class: "preferences-link"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("privacy.managePreferences")), 1)]),
				_: 1
			})])])])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = PrivacyPage_vue_vue_type_script_setup_true_lang_default.setup;
PrivacyPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/PrivacyPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PrivacyPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(PrivacyPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-b512783f"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/PrivacyPage.vue"]
]);
export { PrivacyPage_default as t };
