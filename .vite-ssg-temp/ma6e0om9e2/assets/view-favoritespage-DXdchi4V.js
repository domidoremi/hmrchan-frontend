import { a as LoadingSpinner_default, l as __plugin_vue_export_helper_default, o as MainLayout_default, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { a as useWaterfallLayout, i as useFavorites } from "./composables-CdbJX3Qi.js";
import { r as PostCard_default } from "./view-explorepage-DthVi5zR.js";
import { Fragment, createBlock, createTextVNode, createVNode, defineComponent, nextTick, onMounted, openBlock, ref, renderList, resolveComponent, toDisplayString, useSSRContext, watch, withCtx } from "vue";
import { ssrInterpolate, ssrRenderComponent, ssrRenderList } from "vue/server-renderer";
import { Compass, Heart } from "lucide-vue-next";
var FavoritesPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "FavoritesPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const { favoritePosts, loading, fetchFavorites } = useFavorites();
		const gridRef = ref(null);
		const { updateLayout } = useWaterfallLayout(gridRef, {
			columnGap: 16,
			rowGap: 16
		});
		onMounted(async () => {
			try {
				await fetchFavorites();
				await nextTick();
				await updateLayout();
			} catch (error) {
				console.error("Failed to load favorites:", error);
			}
		});
		watch(() => favoritePosts.value.length, async () => {
			await nextTick();
			await updateLayout();
		});
		const __returned__ = {
			favoritePosts,
			loading,
			fetchFavorites,
			gridRef,
			updateLayout,
			get Heart() {
				return Heart;
			},
			get Compass() {
				return Compass;
			},
			MainLayout: MainLayout_default,
			PostCard: PostCard_default,
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
	const _component_RouterLink = resolveComponent("RouterLink");
	_push(ssrRenderComponent($setup["MainLayout"], _attrs, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<div class="favorites-page" data-v-c7dc6a43${_scopeId}><h1 class="page-title" data-v-c7dc6a43${_scopeId}>${ssrInterpolate(_ctx.$t("nav.favorites"))}</h1>`);
				if ($setup.loading) _push$1(ssrRenderComponent($setup["LoadingSpinner"], { size: "lg" }, null, _parent$1, _scopeId));
				else if ($setup.favoritePosts.length > 0) {
					_push$1(`<div class="favorites-list" data-v-c7dc6a43${_scopeId}><div class="favorites-grid" data-v-c7dc6a43${_scopeId}><!--[-->`);
					ssrRenderList($setup.favoritePosts, (post) => {
						_push$1(ssrRenderComponent($setup["PostCard"], {
							key: post.id,
							post
						}, null, _parent$1, _scopeId));
					});
					_push$1(`<!--]--></div></div>`);
				} else {
					_push$1(`<div class="empty-state glass-card" data-v-c7dc6a43${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Heart"], { size: 64 }, null, _parent$1, _scopeId));
					_push$1(`<h3 data-v-c7dc6a43${_scopeId}>No favorites yet</h3><p data-v-c7dc6a43${_scopeId}>Start adding content to your favorites!</p>`);
					_push$1(ssrRenderComponent(_component_RouterLink, { to: "/explore" }, {
						default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
							if (_push$2) _push$2(ssrRenderComponent($setup["GlassButton"], null, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) {
										_push$3(ssrRenderComponent($setup["Compass"], { size: 18 }, null, _parent$3, _scopeId$2));
										_push$3(` Explore Content `);
									} else return [createVNode($setup["Compass"], { size: 18 }), createTextVNode(" Explore Content ")];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							else return [createVNode($setup["GlassButton"], null, {
								default: withCtx(() => [createVNode($setup["Compass"], { size: 18 }), createTextVNode(" Explore Content ")]),
								_: 1
							})];
						}),
						_: 1
					}, _parent$1, _scopeId));
					_push$1(`</div>`);
				}
				_push$1(`</div>`);
			} else return [createVNode("div", { class: "favorites-page" }, [createVNode("h1", { class: "page-title" }, toDisplayString(_ctx.$t("nav.favorites")), 1), $setup.loading ? (openBlock(), createBlock($setup["LoadingSpinner"], {
				key: 0,
				size: "lg"
			})) : $setup.favoritePosts.length > 0 ? (openBlock(), createBlock("div", {
				key: 1,
				class: "favorites-list"
			}, [createVNode("div", {
				ref: "gridRef",
				class: "favorites-grid"
			}, [(openBlock(true), createBlock(Fragment, null, renderList($setup.favoritePosts, (post) => {
				return openBlock(), createBlock($setup["PostCard"], {
					key: post.id,
					post
				}, null, 8, ["post"]);
			}), 128))], 512)])) : (openBlock(), createBlock("div", {
				key: 2,
				class: "empty-state glass-card"
			}, [
				createVNode($setup["Heart"], { size: 64 }),
				createVNode("h3", null, "No favorites yet"),
				createVNode("p", null, "Start adding content to your favorites!"),
				createVNode(_component_RouterLink, { to: "/explore" }, {
					default: withCtx(() => [createVNode($setup["GlassButton"], null, {
						default: withCtx(() => [createVNode($setup["Compass"], { size: 18 }), createTextVNode(" Explore Content ")]),
						_: 1
					})]),
					_: 1
				})
			]))])];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = FavoritesPage_vue_vue_type_script_setup_true_lang_default.setup;
FavoritesPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/FavoritesPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var FavoritesPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(FavoritesPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-c7dc6a43"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/FavoritesPage.vue"]
]);
export { FavoritesPage_default as t };
