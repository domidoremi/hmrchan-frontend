import { c as logger_default, o as useAuthStore } from "./api-services-BmQ9TwGt.js";
import { l as __plugin_vue_export_helper_default, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { o as toast_default } from "./composables-CdbJX3Qi.js";
import { n as GlassInput_default } from "./view-loginpage-D99sZB2K.js";
import { createBlock, createTextVNode, createVNode, defineComponent, mergeProps, openBlock, ref, resolveComponent, toDisplayString, useSSRContext, withCtx } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Mail, User, UserCircle } from "lucide-vue-next";
var RegisterPage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RegisterPage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const authStore = useAuthStore();
		const { t } = useI18n();
		const formData = ref({
			username: "",
			email: "",
			full_name: "",
			password: "",
			confirmPassword: ""
		});
		const showPassword = ref(false);
		const showConfirmPassword = ref(false);
		const loading = ref(false);
		const error = ref("");
		const success = ref("");
		async function handleRegister() {
			error.value = "";
			if (!formData.value.username || !formData.value.email || !formData.value.password) {
				error.value = t("auth.fillAllFields");
				return;
			}
			if (formData.value.username.length < 3 || formData.value.username.length > 50) {
				error.value = t("auth.usernameLength");
				return;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
				error.value = t("auth.invalidEmail");
				return;
			}
			if (formData.value.password.length < 8) {
				error.value = t("auth.passwordLength");
				return;
			}
			if (formData.value.password !== formData.value.confirmPassword) {
				error.value = t("auth.passwordMismatch");
				return;
			}
			loading.value = true;
			error.value = "";
			success.value = "";
			try {
				await authStore.register({
					username: formData.value.username,
					email: formData.value.email,
					password: formData.value.password,
					full_name: formData.value.full_name || void 0
				});
				success.value = t("auth.registrationSuccess");
				toast_default.success(t("auth.registrationSuccess"));
				setTimeout(() => {
					router.push("/");
				}, 1500);
			} catch (err) {
				logger_default.error("Registration failed:", err);
				error.value = err.response?.data?.detail || authStore.error || t("auth.registrationFailed");
				toast_default.error(error.value);
			} finally {
				loading.value = false;
			}
		}
		const __returned__ = {
			router,
			authStore,
			t,
			formData,
			showPassword,
			showConfirmPassword,
			loading,
			error,
			success,
			handleRegister,
			get User() {
				return User;
			},
			get Mail() {
				return Mail;
			},
			get UserCircle() {
				return UserCircle;
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
			get CheckCircle() {
				return CheckCircle;
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
	_push(`<div${ssrRenderAttrs(mergeProps({ class: "register-page" }, _attrs))} data-v-3bf35c6e><div class="register-container" data-v-3bf35c6e><div class="register-card glass-card" data-v-3bf35c6e><div class="register-header" data-v-3bf35c6e><div class="brand-logo" data-v-3bf35c6e>HMR</div><h1 data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.registerTitle"))}</h1><p data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.registerDescription"))}</p></div><form class="register-form" data-v-3bf35c6e><div class="form-group" data-v-3bf35c6e><label data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.username"))} *</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.username,
		"onUpdate:modelValue": ($event) => $setup.formData.username = $event,
		type: "text",
		placeholder: _ctx.$t("auth.usernamePlaceholder"),
		icon: $setup.User,
		disabled: $setup.loading
	}, null, _parent));
	_push(`</div><div class="form-group" data-v-3bf35c6e><label data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.email"))} *</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.email,
		"onUpdate:modelValue": ($event) => $setup.formData.email = $event,
		type: "email",
		placeholder: _ctx.$t("auth.emailPlaceholder"),
		icon: $setup.Mail,
		disabled: $setup.loading
	}, null, _parent));
	_push(`</div><div class="form-group" data-v-3bf35c6e><label data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.fullName"))} (${ssrInterpolate(_ctx.$t("profile.notSet"))})</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.full_name,
		"onUpdate:modelValue": ($event) => $setup.formData.full_name = $event,
		type: "text",
		placeholder: _ctx.$t("auth.fullNamePlaceholder"),
		icon: $setup.UserCircle,
		disabled: $setup.loading
	}, null, _parent));
	_push(`</div><div class="form-group" data-v-3bf35c6e><label data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.password"))} *</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.password,
		"onUpdate:modelValue": ($event) => $setup.formData.password = $event,
		type: $setup.showPassword ? "text" : "password",
		placeholder: _ctx.$t("auth.passwordPlaceholder"),
		icon: $setup.Lock,
		disabled: $setup.loading
	}, {
		suffix: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<button type="button" class="password-toggle" data-v-3bf35c6e${_scopeId}>`);
				if (!$setup.showPassword) _push$1(ssrRenderComponent($setup["Eye"], { size: 18 }, null, _parent$1, _scopeId));
				else _push$1(ssrRenderComponent($setup["EyeOff"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(`</button>`);
			} else return [createVNode("button", {
				type: "button",
				class: "password-toggle",
				onClick: ($event) => $setup.showPassword = !$setup.showPassword
			}, [!$setup.showPassword ? (openBlock(), createBlock($setup["Eye"], {
				key: 0,
				size: 18
			})) : (openBlock(), createBlock($setup["EyeOff"], {
				key: 1,
				size: 18
			}))], 8, ["onClick"])];
		}),
		_: 1
	}, _parent));
	_push(`</div><div class="form-group" data-v-3bf35c6e><label data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.confirmPassword"))} *</label>`);
	_push(ssrRenderComponent($setup["GlassInput"], {
		modelValue: $setup.formData.confirmPassword,
		"onUpdate:modelValue": ($event) => $setup.formData.confirmPassword = $event,
		type: $setup.showConfirmPassword ? "text" : "password",
		placeholder: _ctx.$t("auth.confirmPasswordPlaceholder"),
		icon: $setup.Lock,
		disabled: $setup.loading
	}, {
		suffix: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) {
				_push$1(`<button type="button" class="password-toggle" data-v-3bf35c6e${_scopeId}>`);
				if (!$setup.showConfirmPassword) _push$1(ssrRenderComponent($setup["Eye"], { size: 18 }, null, _parent$1, _scopeId));
				else _push$1(ssrRenderComponent($setup["EyeOff"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(`</button>`);
			} else return [createVNode("button", {
				type: "button",
				class: "password-toggle",
				onClick: ($event) => $setup.showConfirmPassword = !$setup.showConfirmPassword
			}, [!$setup.showConfirmPassword ? (openBlock(), createBlock($setup["Eye"], {
				key: 0,
				size: 18
			})) : (openBlock(), createBlock($setup["EyeOff"], {
				key: 1,
				size: 18
			}))], 8, ["onClick"])];
		}),
		_: 1
	}, _parent));
	_push(`</div>`);
	if ($setup.error) {
		_push(`<div class="error-message" data-v-3bf35c6e>`);
		_push(ssrRenderComponent($setup["AlertCircle"], { size: 16 }, null, _parent));
		_push(`<span data-v-3bf35c6e>${ssrInterpolate($setup.error)}</span></div>`);
	} else _push(`<!---->`);
	if ($setup.success) {
		_push(`<div class="success-message" data-v-3bf35c6e>`);
		_push(ssrRenderComponent($setup["CheckCircle"], { size: 16 }, null, _parent));
		_push(`<span data-v-3bf35c6e>${ssrInterpolate($setup.success)}</span></div>`);
	} else _push(`<!---->`);
	_push(ssrRenderComponent($setup["GlassButton"], {
		type: "submit",
		size: "lg",
		loading: $setup.loading,
		class: "register-button"
	}, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("auth.registerButton"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("auth.registerButton")), 1)];
		}),
		_: 1
	}, _parent));
	_push(`<div class="login-link" data-v-3bf35c6e>${ssrInterpolate(_ctx.$t("auth.hasAccount"))} `);
	_push(ssrRenderComponent(_component_RouterLink, { to: "/login" }, {
		default: withCtx((_, _push$1, _parent$1, _scopeId) => {
			if (_push$1) _push$1(`${ssrInterpolate(_ctx.$t("auth.loginNow"))}`);
			else return [createTextVNode(toDisplayString(_ctx.$t("auth.loginNow")), 1)];
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
	_push(`</form></div><div class="decoration decoration-1" data-v-3bf35c6e></div><div class="decoration decoration-2" data-v-3bf35c6e></div><div class="decoration decoration-3" data-v-3bf35c6e></div></div></div>`);
}
var _sfc_setup = RegisterPage_vue_vue_type_script_setup_true_lang_default.setup;
RegisterPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/RegisterPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var RegisterPage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(RegisterPage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-3bf35c6e"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/RegisterPage.vue"]
]);
export { RegisterPage_default as t };
