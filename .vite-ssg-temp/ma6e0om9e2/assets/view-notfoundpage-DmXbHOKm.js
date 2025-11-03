import { l as __plugin_vue_export_helper_default, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { createTextVNode, createVNode, defineComponent, mergeProps, useSSRContext, withCtx } from "vue";
import { useRouter } from "vue-router";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { ArrowLeft, Home } from "lucide-vue-next";
var NotFoundPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "NotFoundPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const goHome = () => {
			router.push("/");
		};
		const goBack = () => {
			router.back();
		};
		const __returned__ = {
			router,
			goHome,
			goBack,
			get Home() {
				return Home;
			},
			get ArrowLeft() {
				return ArrowLeft;
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
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "not-found-page" }, _attrs))} data-v-543787d3><div class="not-found-content glass-card" data-v-543787d3><div class="error-code" data-v-543787d3>404</div><h1 data-v-543787d3>Page Not Found</h1><p data-v-543787d3>The page you&#39;re looking for doesn&#39;t exist or has been moved.</p><div class="actions" data-v-543787d3>`);
	_push(ssrRenderComponent($setup["GlassButton"], {
		size: "lg",
		onClick: $setup.goHome
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["Home"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(` Go Home `);
			} else return [createVNode($setup["Home"], { size: 20 }), createTextVNode(" Go Home ")];
		}),
		_: 1
	}, _parent));
	_push(ssrRenderComponent($setup["GlassButton"], {
		size: "lg",
		variant: "ghost",
		onClick: $setup.goBack
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["ArrowLeft"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(` Go Back `);
			} else return [createVNode($setup["ArrowLeft"], { size: 20 }), createTextVNode(" Go Back ")];
		}),
		_: 1
	}, _parent));
	_push(`</div></div></div>`);
}
var _sfc_setup = NotFoundPage_vue_vue_type_script_setup_true_lang_default.setup;
NotFoundPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/NotFoundPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var NotFoundPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(NotFoundPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-543787d3"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/NotFoundPage.vue"]
]);
export { NotFoundPage_default as t };
