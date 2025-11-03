import { o as useAuthStore } from "./api-services-BmQ9TwGt.js";
import { l as __plugin_vue_export_helper_default, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { computed, createBlock, createTextVNode, createVNode, defineComponent, mergeProps, openBlock, ref, resolveComponent, resolveDynamicComponent, toDisplayString, useSSRContext, withCtx } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrIncludeBooleanAttr, ssrInterpolate, ssrRenderAttr, ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderSlot, ssrRenderVNode } from "vue/server-renderer";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, User } from "lucide-vue-next";
var GlassInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "GlassInput",
	props: {
		modelValue: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: false,
			default: "text"
		},
		placeholder: {
			type: String,
			required: false,
			default: ""
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		icon: {
			type: null,
			required: false
		}
	},
	emits: [
		"update:modelValue",
		"focus",
		"blur"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const isFocused = ref(false);
		const inputClass = computed(() => {
			return ["glass-input", {
				"has-icon": props.icon,
				"is-focused": isFocused.value,
				"is-disabled": props.disabled
			}];
		});
		const handleInput = (event) => {
			const target = event.target;
			emit("update:modelValue", target.value);
		};
		const handleFocus = () => {
			isFocused.value = true;
			emit("focus");
		};
		const handleBlur = () => {
			isFocused.value = false;
			emit("blur");
		};
		const __returned__ = {
			props,
			emit,
			isFocused,
			inputClass,
			handleInput,
			handleFocus,
			handleBlur
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "glass-input-wrapper" }, _attrs))} data-v-b0191d12>`);
	if ($props.icon) {
		_push(`<div class="input-icon" data-v-b0191d12>`);
		ssrRenderVNode(_push, createVNode(resolveDynamicComponent($props.icon), { size: 20 }, null), _parent);
		_push(`</div>`);
	} else _push(`<!---->`);
	_push(`<input${ssrRenderAttr("type", $props.type)}${ssrRenderAttr("value", $props.modelValue)}${ssrRenderAttr("placeholder", $props.placeholder)}${ssrIncludeBooleanAttr($props.disabled) ? " disabled" : ""} class="${ssrRenderClass($setup.inputClass)}" data-v-b0191d12>`);
	if (_ctx.$slots.suffix) {
		_push(`<div class="input-suffix" data-v-b0191d12>`);
		ssrRenderSlot(_ctx.$slots, "suffix", {}, null, _push, _parent);
		_push(`</div>`);
	} else _push(`<!---->`);
	_push(`</div>`);
}
var _sfc_setup$1 = GlassInput_vue_vue_type_script_setup_true_lang_default.setup;
GlassInput_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/GlassInput.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var GlassInput_default = /* @__PURE__ */ __plugin_vue_export_helper_default(GlassInput_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-b0191d12"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/GlassInput.vue"]
]);
var LoginPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "LoginPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const authStore = useAuthStore();
		const { t } = useI18n();
		const formData = ref({
			username: "",
			password: ""
		});
		const showPassword = ref(false);
		const loading = ref(false);
		const error = ref("");
		const handleLogin = async () => {
			if (!formData.value.username || !formData.value.password) {
				error.value = t("auth.fillAllFields");
				return;
			}
			loading.value = true;
			error.value = "";
			try {
				await authStore.login(formData.value);
				router.push("/");
			} catch (err) {
				error.value = err.response?.data?.message || t("auth.loginFailedMessage");
			} finally {
				loading.value = false;
			}
		};
		const __returned__ = {
			router,
			authStore,
			t,
			formData,
			showPassword,
			loading,
			error,
			handleLogin,
			get User() {
				return User;
			},
			get Lock() {
				return Lock;
			},
			get Eye() {
				return Eye;
			},
			get EyeOff() {
				return EyeOff;
			},
			get AlertCircle() {
				return AlertCircle;
			},
			get ArrowLeft() {
				return ArrowLeft;
			},
			GlassInput: GlassInput_default,
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
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "login-page" }, _attrs))} data-v-67e64f9f><div class="login-container" data-v-67e64f9f><div class="login-card glass-card" data-v-67e64f9f><div class="login-header" data-v-67e64f9f><div class="brand-logo" data-v-67e64f9f>HMR</div><h1 data-v-67e64f9f>${ssrInterpolate(_ctx.$t("app.name"))}</h1><p data-v-67e64f9f>${ssrInterpolate(_ctx.$t("app.description"))}</p></div><form class="login-form" data-v-67e64f9f><div class="form-group" data-v-67e64f9f><label data-v-67e64f9f>${ssrInterpolate(_ctx.$t("auth.username"))}</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.username,
		"onUpdate:modelValue": ($event) => $setup.formData.username = $event,
		type: "text",
		placeholder: _ctx.$t("auth.username"),
		icon: $setup.User,
		disabled: $setup.loading,
		autocomplete: "username"
	}, null, _parent));
	_push(`</div><div class="form-group" data-v-67e64f9f><label data-v-67e64f9f>${ssrInterpolate(_ctx.$t("auth.password"))}</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.password,
		"onUpdate:modelValue": ($event) => $setup.formData.password = $event,
		type: $setup.showPassword ? "text" : "password",
		placeholder: _ctx.$t("auth.password"),
		icon: $setup.Lock,
		disabled: $setup.loading,
		autocomplete: "current-password"
	}, {
		suffix: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<button type="button" class="password-toggle"${ssrRenderAttr("aria-label", $setup.showPassword ? _ctx.$t("auth.hidePassword") : _ctx.$t("auth.showPassword"))} data-v-67e64f9f${_scopeId}>`);
				if (!$setup.showPassword) _push$1(ssrRenderComponent($setup["Eye"], { size: 18 }, null, _parent$1, _scopeId));
				else _push$1(ssrRenderComponent($setup["EyeOff"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(`</button>`);
			} else return [createVNode("button", {
				type: "button",
				class: "password-toggle",
				onClick: ($event) => $setup.showPassword = !$setup.showPassword,
				"aria-label": $setup.showPassword ? _ctx.$t("auth.hidePassword") : _ctx.$t("auth.showPassword")
			}, [!$setup.showPassword ? (openBlock(), createBlock($setup["Eye"], {
				key: 0,
				size: 18
			})) : (openBlock(), createBlock($setup["EyeOff"], {
				key: 1,
				size: 18
			}))], 8, ["onClick", "aria-label"])];
		}),
		_: 1
	}, _parent));
	_push(`</div>`);
	if ($setup.error) {
		_push(`<div class="error-message" data-v-67e64f9f>`);
		_push(ssrRenderComponent($setup["AlertCircle"], { size: 16 }, null, _parent));
		_push(`<span data-v-67e64f9f>${ssrInterpolate($setup.error)}</span></div>`);
	} else _push(`<!---->`);
	_push(ssrRenderComponent($setup["GlassButton"], {
		type: "submit",
		size: "lg",
		loading: $setup.loading,
		class: "login-button"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("auth.login"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("auth.login")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`<div class="register-link" data-v-67e64f9f>${ssrInterpolate(_ctx.$t("auth.noAccount"))} `);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/register" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("auth.registerNow"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("auth.registerNow")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</div>`);
	_push(ssrRenderComponent(_component_RouterLink, {
		to: "/",
		class: "back-link"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(ssrRenderComponent($setup["ArrowLeft"], { size: 16 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("common.back"))}`);
			} else return [createVNode($setup["ArrowLeft"], { size: 16 }), createTextVNode(" " + toDisplayString(_ctx.$t("common.back")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`</form></div><div class="decoration decoration-1" data-v-67e64f9f></div><div class="decoration decoration-2" data-v-67e64f9f></div><div class="decoration decoration-3" data-v-67e64f9f></div></div></div>`);
}
var _sfc_setup = LoginPage_vue_vue_type_script_setup_true_lang_default.setup;
LoginPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/LoginPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var LoginPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(LoginPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-67e64f9f"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/LoginPage.vue"]
]);
export { GlassInput_default as n, LoginPage_default as t };
