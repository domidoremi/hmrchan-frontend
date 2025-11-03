import { a as uploadApi, c as logger_default, o as useAuthStore, s as api } from "./api-services-BmQ9TwGt.js";
import { c as getUserAvatar, l as __plugin_vue_export_helper_default, o as MainLayout_default, s as GlassButton_default } from "./view-authorspage-B1NrczNS.js";
import { o as toast_default, t as useImageUpload } from "./composables-CdbJX3Qi.js";
import { a as formatRelativeTime } from "./view-explorepage-DthVi5zR.js";
import { n as GlassInput_default } from "./view-loginpage-D99sZB2K.js";
import { computed, createBlock, createCommentVNode, createTextVNode, createVNode, defineComponent, onMounted, openBlock, ref, toDisplayString, useSSRContext, watch, withCtx, withModifiers } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ssrInterpolate, ssrRenderAttr, ssrRenderClass, ssrRenderComponent, ssrRenderSlot, ssrRenderTeleport } from "vue/server-renderer";
import { AlertTriangle, Calendar, Camera, CheckCircle, Edit, Eye, Heart, Info, Lock, LogOut, Mail, Shield, Trash2, User, X } from "lucide-vue-next";
var GlassModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "GlassModal",
	props: {
		modelValue: {
			type: Boolean,
			required: true
		},
		title: {
			type: String,
			required: false,
			default: ""
		},
		size: {
			type: String,
			required: false,
			default: "md"
		},
		hideHeader: {
			type: Boolean,
			required: false,
			default: false
		},
		closeOnBackdrop: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { expose: __expose, emit: __emit }) {
		__expose();
		const props = __props;
		const emit = __emit;
		const sizeClass = computed(() => `modal-${props.size}`);
		const close = () => {
			emit("update:modelValue", false);
		};
		const handleBackdropClick = () => {
			if (props.closeOnBackdrop) close();
		};
		watch(() => props.modelValue, (isOpen) => {
			if (isOpen) document.body.style.overflow = "hidden";
			else document.body.style.overflow = "";
		});
		const __returned__ = {
			props,
			emit,
			sizeClass,
			close,
			handleBackdropClick,
			get X() {
				return X;
			}
		};
		Object.defineProperty(__returned__, "__isScriptSetup", {
			enumerable: false,
			value: true
		});
		return __returned__;
	}
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
	ssrRenderTeleport(_push, (_push$1) => {
		if ($props.modelValue) {
			_push$1(`<div class="glass-modal-backdrop" data-v-a862857d><div class="${ssrRenderClass([$setup.sizeClass, "glass-modal"])}" data-v-a862857d>`);
			if (!$props.hideHeader) {
				_push$1(`<div class="modal-header" data-v-a862857d><h3 class="modal-title" data-v-a862857d>${ssrInterpolate($props.title)}</h3><button class="modal-close" data-v-a862857d>`);
				_push$1(ssrRenderComponent($setup["X"], { size: 20 }, null, _parent));
				_push$1(`</button></div>`);
			} else _push$1(`<!---->`);
			_push$1(`<div class="modal-body" data-v-a862857d>`);
			ssrRenderSlot(_ctx.$slots, "default", {}, null, _push$1, _parent);
			_push$1(`</div>`);
			if (_ctx.$slots.footer) {
				_push$1(`<div class="modal-footer" data-v-a862857d>`);
				ssrRenderSlot(_ctx.$slots, "footer", {}, null, _push$1, _parent);
				_push$1(`</div>`);
			} else _push$1(`<!---->`);
			_push$1(`</div></div>`);
		} else _push$1(`<!---->`);
	}, "body", false, _parent);
}
var _sfc_setup$1 = GlassModal_vue_vue_type_script_setup_true_lang_default.setup;
GlassModal_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ui/GlassModal.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var GlassModal_default = /* @__PURE__ */ __plugin_vue_export_helper_default(GlassModal_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender$1],
	["__scopeId", "data-v-a862857d"],
	["__file", "F:/Projects/hmrchan/frontend/src/components/ui/GlassModal.vue"]
]);
var ProfilePage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ProfilePage",
	setup(__props, { expose: __expose }) {
		__expose();
		const router = useRouter();
		const authStore = useAuthStore();
		const { user } = storeToRefs(authStore);
		const { t } = useI18n();
		const avatarRefreshKey = ref(Date.now());
		const avatarUrl = computed(() => {
			const url = getUserAvatar(user.value, 120);
			if (user.value?.avatar_url && url.startsWith("/uploads/")) return `${url}?t=${avatarRefreshKey.value}`;
			return url;
		});
		const { uploading: uploadingAvatar, preview: avatarPreview, selectImage } = useImageUpload({
			maxSize: 2,
			maxWidth: 512,
			maxHeight: 512,
			quality: .9
		});
		const showEditModal = ref(false);
		const showPasswordModal = ref(false);
		const showDeleteModal = ref(false);
		const updating = ref(false);
		const changingPassword = ref(false);
		const deleting = ref(false);
		const editForm = ref({
			full_name: "",
			email: ""
		});
		const passwordForm = ref({
			current_password: "",
			new_password: "",
			confirm_password: ""
		});
		const deleteForm = ref({ password: "" });
		const favoritesCount = ref(0);
		const viewsCount = ref(0);
		const joinedDays = computed(() => {
			if (!user.value?.created_at) return 0;
			const created = new Date(user.value.created_at);
			const diff = (/* @__PURE__ */ new Date()).getTime() - created.getTime();
			return Math.floor(diff / (1e3 * 60 * 60 * 24));
		});
		onMounted(() => {
			if (!user.value) {
				router.push("/login");
				return;
			}
			editForm.value.full_name = user.value.full_name || "";
			editForm.value.email = user.value.email || "";
			loadStats();
		});
		async function loadStats() {
			try {
				const response = await api.get(`/users/${user.value?.id}/stats`, { cache: false });
				favoritesCount.value = response.favorites_count || 0;
				viewsCount.value = response.views_count || 0;
				logger_default.debug("User stats loaded:", response);
			} catch (error) {
				logger_default.error("Failed to load stats:", error);
				favoritesCount.value = 0;
				viewsCount.value = 0;
			}
		}
		async function handleUpdateProfile() {
			if (!user.value) return;
			updating.value = true;
			try {
				await api.patch(`/users/${user.value.id}`, {
					full_name: editForm.value.full_name,
					email: editForm.value.email
				});
				await authStore.fetchCurrentUser();
				toast_default.success(t("profile.profileUpdated"));
				showEditModal.value = false;
			} catch (error) {
				toast_default.error(error.response?.data?.detail || t("profile.profileUpdateFailed"));
			} finally {
				updating.value = false;
			}
		}
		async function handleChangePassword() {
			if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
				toast_default.error(t("profile.passwordMismatch"));
				return;
			}
			if (passwordForm.value.new_password.length < 8) {
				toast_default.error(t("profile.passwordMinLength"));
				return;
			}
			changingPassword.value = true;
			try {
				await api.post(`/users/${user.value?.id}/reset-password`, {
					current_password: passwordForm.value.current_password,
					new_password: passwordForm.value.new_password
				});
				toast_default.success(t("profile.passwordChanged"));
				passwordForm.value = {
					current_password: "",
					new_password: "",
					confirm_password: ""
				};
				showPasswordModal.value = false;
				setTimeout(() => {
					authStore.logout();
					router.push("/login");
				}, 1500);
			} catch (error) {
				toast_default.error(error.response?.data?.detail || t("profile.passwordChangeFailed"));
			} finally {
				changingPassword.value = false;
			}
		}
		async function handleAvatarUpload() {
			try {
				const file = await selectImage();
				if (!file) return;
				uploadingAvatar.value = true;
				toast_default.info(t("profile.avatarUploading"));
				const response = await uploadApi.uploadAvatar(file);
				console.log("✅ Avatar uploaded:", response);
				await authStore.fetchCurrentUser();
				avatarRefreshKey.value = Date.now();
				console.log("🔄 Force refresh avatar with new key:", avatarRefreshKey.value);
				toast_default.success(t("profile.avatarUploadSuccess"));
			} catch (error) {
				console.error("Avatar upload failed:", error);
				toast_default.error(error.response?.data?.detail || t("profile.avatarUploadFailed"));
			} finally {
				uploadingAvatar.value = false;
			}
		}
		function sendVerificationEmail() {
			toast_default.info(t("profile.sendVerification"));
		}
		async function handleDeleteAccount() {
			if (!deleteForm.value.password) {
				toast_default.error(t("profile.enterPasswordToConfirm"));
				return;
			}
			deleting.value = true;
			try {
				await api.delete(`/users/${user.value?.id}`, { data: { password: deleteForm.value.password } });
				toast_default.success(t("profile.accountDeleted"));
				authStore.logout();
				router.push("/");
			} catch (error) {
				toast_default.error(error.response?.data?.detail || t("profile.accountDeleteFailed"));
			} finally {
				deleting.value = false;
			}
		}
		function handleLogout() {
			authStore.logout();
			toast_default.success(t("auth.logoutSuccess"));
			router.push("/");
		}
		function formatDate(dateStr) {
			if (!dateStr) return t("profile.notSet");
			return formatRelativeTime(dateStr);
		}
		const __returned__ = {
			router,
			authStore,
			user,
			t,
			avatarRefreshKey,
			avatarUrl,
			uploadingAvatar,
			avatarPreview,
			selectImage,
			showEditModal,
			showPasswordModal,
			showDeleteModal,
			updating,
			changingPassword,
			deleting,
			editForm,
			passwordForm,
			deleteForm,
			favoritesCount,
			viewsCount,
			joinedDays,
			loadStats,
			handleUpdateProfile,
			handleChangePassword,
			handleAvatarUpload,
			sendVerificationEmail,
			handleDeleteAccount,
			handleLogout,
			formatDate,
			get UserIcon() {
				return User;
			},
			get Mail() {
				return Mail;
			},
			get Camera() {
				return Camera;
			},
			get Edit() {
				return Edit;
			},
			get Lock() {
				return Lock;
			},
			get Shield() {
				return Shield;
			},
			get CheckCircle() {
				return CheckCircle;
			},
			get Heart() {
				return Heart;
			},
			get Eye() {
				return Eye;
			},
			get Calendar() {
				return Calendar;
			},
			get Info() {
				return Info;
			},
			get AlertTriangle() {
				return AlertTriangle;
			},
			get LogOut() {
				return LogOut;
			},
			get Trash2() {
				return Trash2;
			},
			MainLayout: MainLayout_default,
			GlassButton: GlassButton_default,
			GlassInput: GlassInput_default,
			GlassModal: GlassModal_default
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
				_push$1(`<div class="profile-page" data-v-5e02ae5f${_scopeId}><section class="profile-header glass-card" data-v-5e02ae5f${_scopeId}><div class="profile-banner" data-v-5e02ae5f${_scopeId}></div><div class="profile-info" data-v-5e02ae5f${_scopeId}><div class="avatar-container" data-v-5e02ae5f${_scopeId}><div class="avatar" data-v-5e02ae5f${_scopeId}><img${ssrRenderAttr("src", $setup.avatarUrl)}${ssrRenderAttr("alt", $setup.user?.username || "User")} data-v-5e02ae5f${_scopeId}></div><button class="avatar-upload-btn"${ssrRenderAttr("aria-label", _ctx.$t("profile.uploadAvatar"))} data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Camera"], { size: 16 }, null, _parent$1, _scopeId));
				_push$1(`</button></div><div class="user-details" data-v-5e02ae5f${_scopeId}><h1 class="user-name" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.user?.full_name || $setup.user?.username)}</h1><p class="user-username" data-v-5e02ae5f${_scopeId}>@${ssrInterpolate($setup.user?.username)}</p><div class="user-badges" data-v-5e02ae5f${_scopeId}>`);
				if ($setup.user?.is_admin) {
					_push$1(`<span class="badge badge-admin" data-v-5e02ae5f${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["Shield"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(` ${ssrInterpolate(_ctx.$t("profile.admin"))}</span>`);
				} else _push$1(`<!---->`);
				if ($setup.user?.is_verified) {
					_push$1(`<span class="badge badge-verified" data-v-5e02ae5f${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["CheckCircle"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(` ${ssrInterpolate(_ctx.$t("profile.verified"))}</span>`);
				} else _push$1(`<!---->`);
				_push$1(`</div></div><div class="profile-actions" data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["GlassButton"], {
					variant: "secondary",
					onClick: ($event) => $setup.showEditModal = true
				}, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) {
							_push$2(ssrRenderComponent($setup["Edit"], { size: 18 }, null, _parent$2, _scopeId$1));
							_push$2(` ${ssrInterpolate(_ctx.$t("profile.editProfile"))}`);
						} else return [createVNode($setup["Edit"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.editProfile")), 1)];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(ssrRenderComponent($setup["GlassButton"], {
					variant: "secondary",
					onClick: ($event) => $setup.showPasswordModal = true
				}, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) {
							_push$2(ssrRenderComponent($setup["Lock"], { size: 18 }, null, _parent$2, _scopeId$1));
							_push$2(` ${ssrInterpolate(_ctx.$t("profile.changePassword"))}`);
						} else return [createVNode($setup["Lock"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.changePassword")), 1)];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(`</div></div></section><div class="stats-grid" data-v-5e02ae5f${_scopeId}><div class="stat-card glass-card" data-v-5e02ae5f${_scopeId}><div class="stat-icon" data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Heart"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`</div><div class="stat-info" data-v-5e02ae5f${_scopeId}><div class="stat-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.favoritesCount)}</div><div class="stat-label" data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.favorites"))}</div></div></div><div class="stat-card glass-card" data-v-5e02ae5f${_scopeId}><div class="stat-icon" data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Eye"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`</div><div class="stat-info" data-v-5e02ae5f${_scopeId}><div class="stat-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.viewsCount)}</div><div class="stat-label" data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.views"))}</div></div></div><div class="stat-card glass-card" data-v-5e02ae5f${_scopeId}><div class="stat-icon" data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Calendar"], { size: 24 }, null, _parent$1, _scopeId));
				_push$1(`</div><div class="stat-info" data-v-5e02ae5f${_scopeId}><div class="stat-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.joinedDays)}</div><div class="stat-label" data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.days"))}</div></div></div></div><section class="account-info glass-card" data-v-5e02ae5f${_scopeId}><h2 data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Info"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("profile.accountInfo"))}</h2><div class="info-grid" data-v-5e02ae5f${_scopeId}><div class="info-item" data-v-5e02ae5f${_scopeId}><label data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.username"))}</label><div class="info-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.user?.username)}</div></div><div class="info-item" data-v-5e02ae5f${_scopeId}><label data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.email"))}</label><div class="info-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.user?.email)} `);
				if ($setup.user?.is_verified) {
					_push$1(`<span class="verified-badge" data-v-5e02ae5f${_scopeId}>`);
					_push$1(ssrRenderComponent($setup["CheckCircle"], { size: 14 }, null, _parent$1, _scopeId));
					_push$1(` ${ssrInterpolate(_ctx.$t("profile.verified"))}</span>`);
				} else _push$1(`<button class="verify-btn" data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.sendVerification"))}</button>`);
				_push$1(`</div></div><div class="info-item" data-v-5e02ae5f${_scopeId}><label data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.fullName"))}</label><div class="info-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.user?.full_name || _ctx.$t("profile.notSet"))}</div></div><div class="info-item" data-v-5e02ae5f${_scopeId}><label data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.joinedAt"))}</label><div class="info-value" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.formatDate($setup.user?.created_at))}</div></div><div class="info-item" data-v-5e02ae5f${_scopeId}><label data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.accountStatus"))}</label><div class="info-value" data-v-5e02ae5f${_scopeId}><span class="${ssrRenderClass(["status-badge", $setup.user?.is_active ? "status-active" : "status-inactive"])}" data-v-5e02ae5f${_scopeId}>${ssrInterpolate($setup.user?.is_active ? _ctx.$t("profile.active") : _ctx.$t("profile.inactive"))}</span></div></div></div></section><section class="danger-zone glass-card" data-v-5e02ae5f${_scopeId}><h2 data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["AlertTriangle"], { size: 20 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("profile.dangerZone"))}</h2><p class="danger-description" data-v-5e02ae5f${_scopeId}>${ssrInterpolate(_ctx.$t("profile.dangerZoneDescription"))}</p><div class="danger-actions" data-v-5e02ae5f${_scopeId}><button class="danger-btn" data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["LogOut"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("profile.logout"))}</button><button class="danger-btn danger-delete" data-v-5e02ae5f${_scopeId}>`);
				_push$1(ssrRenderComponent($setup["Trash2"], { size: 18 }, null, _parent$1, _scopeId));
				_push$1(` ${ssrInterpolate(_ctx.$t("profile.deleteAccount"))}</button></div></section></div>`);
				_push$1(ssrRenderComponent($setup["GlassModal"], {
					modelValue: $setup.showEditModal,
					"onUpdate:modelValue": ($event) => $setup.showEditModal = $event,
					title: _ctx.$t("profile.editProfile")
				}, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) {
							_push$2(`<form class="edit-form" data-v-5e02ae5f${_scopeId$1}><div class="form-group" data-v-5e02ae5f${_scopeId$1}><label data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.fullName"))}</label>`);
							_push$2(ssrRenderComponent($setup["GlassInput"], {
								modelValue: $setup.editForm.full_name,
								"onUpdate:modelValue": ($event) => $setup.editForm.full_name = $event,
								type: "text",
								placeholder: _ctx.$t("profile.fullName"),
								icon: $setup.UserIcon
							}, null, _parent$2, _scopeId$1));
							_push$2(`</div><div class="form-group" data-v-5e02ae5f${_scopeId$1}><label data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.email"))}</label>`);
							_push$2(ssrRenderComponent($setup["GlassInput"], {
								modelValue: $setup.editForm.email,
								"onUpdate:modelValue": ($event) => $setup.editForm.email = $event,
								type: "email",
								placeholder: _ctx.$t("profile.email"),
								icon: $setup.Mail
							}, null, _parent$2, _scopeId$1));
							_push$2(`</div><div class="modal-actions" data-v-5e02ae5f${_scopeId$1}>`);
							_push$2(ssrRenderComponent($setup["GlassButton"], {
								type: "button",
								variant: "ghost",
								onClick: ($event) => $setup.showEditModal = false
							}, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) _push$3(`${ssrInterpolate(_ctx.$t("common.cancel"))}`);
									else return [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							_push$2(ssrRenderComponent($setup["GlassButton"], {
								type: "submit",
								loading: $setup.updating
							}, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) _push$3(`${ssrInterpolate(_ctx.$t("common.save"))}`);
									else return [createTextVNode(toDisplayString(_ctx.$t("common.save")), 1)];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							_push$2(`</div></form>`);
						} else return [createVNode("form", {
							onSubmit: withModifiers($setup.handleUpdateProfile, ["prevent"]),
							class: "edit-form"
						}, [
							createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.fullName")), 1), createVNode($setup["GlassInput"], {
								modelValue: $setup.editForm.full_name,
								"onUpdate:modelValue": ($event) => $setup.editForm.full_name = $event,
								type: "text",
								placeholder: _ctx.$t("profile.fullName"),
								icon: $setup.UserIcon
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"icon"
							])]),
							createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.email")), 1), createVNode($setup["GlassInput"], {
								modelValue: $setup.editForm.email,
								"onUpdate:modelValue": ($event) => $setup.editForm.email = $event,
								type: "email",
								placeholder: _ctx.$t("profile.email"),
								icon: $setup.Mail
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"icon"
							])]),
							createVNode("div", { class: "modal-actions" }, [createVNode($setup["GlassButton"], {
								type: "button",
								variant: "ghost",
								onClick: ($event) => $setup.showEditModal = false
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)]),
								_: 1
							}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
								type: "submit",
								loading: $setup.updating
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.save")), 1)]),
								_: 1
							}, 8, ["loading"])])
						], 32)];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(ssrRenderComponent($setup["GlassModal"], {
					modelValue: $setup.showPasswordModal,
					"onUpdate:modelValue": ($event) => $setup.showPasswordModal = $event,
					title: _ctx.$t("profile.changePassword")
				}, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) {
							_push$2(`<form class="password-form" data-v-5e02ae5f${_scopeId$1}><div class="form-group" data-v-5e02ae5f${_scopeId$1}><label data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.currentPassword"))}</label>`);
							_push$2(ssrRenderComponent($setup["GlassInput"], {
								modelValue: $setup.passwordForm.current_password,
								"onUpdate:modelValue": ($event) => $setup.passwordForm.current_password = $event,
								type: "password",
								placeholder: _ctx.$t("profile.currentPassword"),
								icon: $setup.Lock,
								autocomplete: "current-password"
							}, null, _parent$2, _scopeId$1));
							_push$2(`</div><div class="form-group" data-v-5e02ae5f${_scopeId$1}><label data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.newPassword"))}</label>`);
							_push$2(ssrRenderComponent($setup["GlassInput"], {
								modelValue: $setup.passwordForm.new_password,
								"onUpdate:modelValue": ($event) => $setup.passwordForm.new_password = $event,
								type: "password",
								placeholder: _ctx.$t("profile.passwordMinLength"),
								icon: $setup.Lock,
								autocomplete: "new-password"
							}, null, _parent$2, _scopeId$1));
							_push$2(`</div><div class="form-group" data-v-5e02ae5f${_scopeId$1}><label data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.confirmPassword"))}</label>`);
							_push$2(ssrRenderComponent($setup["GlassInput"], {
								modelValue: $setup.passwordForm.confirm_password,
								"onUpdate:modelValue": ($event) => $setup.passwordForm.confirm_password = $event,
								type: "password",
								placeholder: _ctx.$t("profile.confirmPassword"),
								icon: $setup.Lock,
								autocomplete: "new-password"
							}, null, _parent$2, _scopeId$1));
							_push$2(`</div><div class="modal-actions" data-v-5e02ae5f${_scopeId$1}>`);
							_push$2(ssrRenderComponent($setup["GlassButton"], {
								type: "button",
								variant: "ghost",
								onClick: ($event) => $setup.showPasswordModal = false
							}, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) _push$3(`${ssrInterpolate(_ctx.$t("common.cancel"))}`);
									else return [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							_push$2(ssrRenderComponent($setup["GlassButton"], {
								type: "submit",
								loading: $setup.changingPassword
							}, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) _push$3(`${ssrInterpolate(_ctx.$t("profile.changePassword"))}`);
									else return [createTextVNode(toDisplayString(_ctx.$t("profile.changePassword")), 1)];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							_push$2(`</div></form>`);
						} else return [createVNode("form", {
							onSubmit: withModifiers($setup.handleChangePassword, ["prevent"]),
							class: "password-form"
						}, [
							createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.currentPassword")), 1), createVNode($setup["GlassInput"], {
								modelValue: $setup.passwordForm.current_password,
								"onUpdate:modelValue": ($event) => $setup.passwordForm.current_password = $event,
								type: "password",
								placeholder: _ctx.$t("profile.currentPassword"),
								icon: $setup.Lock,
								autocomplete: "current-password"
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"icon"
							])]),
							createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.newPassword")), 1), createVNode($setup["GlassInput"], {
								modelValue: $setup.passwordForm.new_password,
								"onUpdate:modelValue": ($event) => $setup.passwordForm.new_password = $event,
								type: "password",
								placeholder: _ctx.$t("profile.passwordMinLength"),
								icon: $setup.Lock,
								autocomplete: "new-password"
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"icon"
							])]),
							createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.confirmPassword")), 1), createVNode($setup["GlassInput"], {
								modelValue: $setup.passwordForm.confirm_password,
								"onUpdate:modelValue": ($event) => $setup.passwordForm.confirm_password = $event,
								type: "password",
								placeholder: _ctx.$t("profile.confirmPassword"),
								icon: $setup.Lock,
								autocomplete: "new-password"
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"icon"
							])]),
							createVNode("div", { class: "modal-actions" }, [createVNode($setup["GlassButton"], {
								type: "button",
								variant: "ghost",
								onClick: ($event) => $setup.showPasswordModal = false
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)]),
								_: 1
							}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
								type: "submit",
								loading: $setup.changingPassword
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("profile.changePassword")), 1)]),
								_: 1
							}, 8, ["loading"])])
						], 32)];
					}),
					_: 1
				}, _parent$1, _scopeId));
				_push$1(ssrRenderComponent($setup["GlassModal"], {
					modelValue: $setup.showDeleteModal,
					"onUpdate:modelValue": ($event) => $setup.showDeleteModal = $event,
					title: _ctx.$t("profile.deleteAccount")
				}, {
					default: withCtx((_$1, _push$2, _parent$2, _scopeId$1) => {
						if (_push$2) {
							_push$2(`<div class="delete-confirm" data-v-5e02ae5f${_scopeId$1}>`);
							_push$2(ssrRenderComponent($setup["AlertTriangle"], {
								size: 48,
								class: "warning-icon"
							}, null, _parent$2, _scopeId$1));
							_push$2(`<h3 data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.deleteConfirmTitle"))}</h3><p data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.deleteWarning"))}:</p><ul data-v-5e02ae5f${_scopeId$1}><li data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.deleteItems.profile"))}</li><li data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.deleteItems.favorites"))}</li><li data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.deleteItems.access"))}</li></ul><div class="form-group" data-v-5e02ae5f${_scopeId$1}><label data-v-5e02ae5f${_scopeId$1}>${ssrInterpolate(_ctx.$t("profile.enterPasswordToConfirm"))}</label>`);
							_push$2(ssrRenderComponent($setup["GlassInput"], {
								modelValue: $setup.deleteForm.password,
								"onUpdate:modelValue": ($event) => $setup.deleteForm.password = $event,
								type: "password",
								placeholder: _ctx.$t("auth.password"),
								icon: $setup.Lock
							}, null, _parent$2, _scopeId$1));
							_push$2(`</div><div class="modal-actions" data-v-5e02ae5f${_scopeId$1}>`);
							_push$2(ssrRenderComponent($setup["GlassButton"], {
								type: "button",
								variant: "ghost",
								onClick: ($event) => $setup.showDeleteModal = false
							}, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) _push$3(`${ssrInterpolate(_ctx.$t("common.cancel"))}`);
									else return [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							_push$2(ssrRenderComponent($setup["GlassButton"], {
								type: "button",
								variant: "secondary",
								loading: $setup.deleting,
								onClick: $setup.handleDeleteAccount
							}, {
								default: withCtx((_$2, _push$3, _parent$3, _scopeId$2) => {
									if (_push$3) _push$3(`${ssrInterpolate(_ctx.$t("common.confirm"))}`);
									else return [createTextVNode(toDisplayString(_ctx.$t("common.confirm")), 1)];
								}),
								_: 1
							}, _parent$2, _scopeId$1));
							_push$2(`</div></div>`);
						} else return [createVNode("div", { class: "delete-confirm" }, [
							createVNode($setup["AlertTriangle"], {
								size: 48,
								class: "warning-icon"
							}),
							createVNode("h3", null, toDisplayString(_ctx.$t("profile.deleteConfirmTitle")), 1),
							createVNode("p", null, toDisplayString(_ctx.$t("profile.deleteWarning")) + ":", 1),
							createVNode("ul", null, [
								createVNode("li", null, toDisplayString(_ctx.$t("profile.deleteItems.profile")), 1),
								createVNode("li", null, toDisplayString(_ctx.$t("profile.deleteItems.favorites")), 1),
								createVNode("li", null, toDisplayString(_ctx.$t("profile.deleteItems.access")), 1)
							]),
							createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.enterPasswordToConfirm")), 1), createVNode($setup["GlassInput"], {
								modelValue: $setup.deleteForm.password,
								"onUpdate:modelValue": ($event) => $setup.deleteForm.password = $event,
								type: "password",
								placeholder: _ctx.$t("auth.password"),
								icon: $setup.Lock
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"icon"
							])]),
							createVNode("div", { class: "modal-actions" }, [createVNode($setup["GlassButton"], {
								type: "button",
								variant: "ghost",
								onClick: ($event) => $setup.showDeleteModal = false
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)]),
								_: 1
							}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
								type: "button",
								variant: "secondary",
								loading: $setup.deleting,
								onClick: $setup.handleDeleteAccount
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.confirm")), 1)]),
								_: 1
							}, 8, ["loading"])])
						])];
					}),
					_: 1
				}, _parent$1, _scopeId));
			} else return [
				createVNode("div", { class: "profile-page" }, [
					createVNode("section", { class: "profile-header glass-card" }, [createVNode("div", { class: "profile-banner" }), createVNode("div", { class: "profile-info" }, [
						createVNode("div", { class: "avatar-container" }, [createVNode("div", { class: "avatar" }, [createVNode("img", {
							src: $setup.avatarUrl,
							alt: $setup.user?.username || "User"
						}, null, 8, ["src", "alt"])]), createVNode("button", {
							class: "avatar-upload-btn",
							onClick: $setup.handleAvatarUpload,
							"aria-label": _ctx.$t("profile.uploadAvatar")
						}, [createVNode($setup["Camera"], { size: 16 })], 8, ["aria-label"])]),
						createVNode("div", { class: "user-details" }, [
							createVNode("h1", { class: "user-name" }, toDisplayString($setup.user?.full_name || $setup.user?.username), 1),
							createVNode("p", { class: "user-username" }, "@" + toDisplayString($setup.user?.username), 1),
							createVNode("div", { class: "user-badges" }, [$setup.user?.is_admin ? (openBlock(), createBlock("span", {
								key: 0,
								class: "badge badge-admin"
							}, [createVNode($setup["Shield"], { size: 14 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.admin")), 1)])) : createCommentVNode("", true), $setup.user?.is_verified ? (openBlock(), createBlock("span", {
								key: 1,
								class: "badge badge-verified"
							}, [createVNode($setup["CheckCircle"], { size: 14 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.verified")), 1)])) : createCommentVNode("", true)])
						]),
						createVNode("div", { class: "profile-actions" }, [createVNode($setup["GlassButton"], {
							variant: "secondary",
							onClick: ($event) => $setup.showEditModal = true
						}, {
							default: withCtx(() => [createVNode($setup["Edit"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.editProfile")), 1)]),
							_: 1
						}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
							variant: "secondary",
							onClick: ($event) => $setup.showPasswordModal = true
						}, {
							default: withCtx(() => [createVNode($setup["Lock"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.changePassword")), 1)]),
							_: 1
						}, 8, ["onClick"])])
					])]),
					createVNode("div", { class: "stats-grid" }, [
						createVNode("div", { class: "stat-card glass-card" }, [createVNode("div", { class: "stat-icon" }, [createVNode($setup["Heart"], { size: 24 })]), createVNode("div", { class: "stat-info" }, [createVNode("div", { class: "stat-value" }, toDisplayString($setup.favoritesCount), 1), createVNode("div", { class: "stat-label" }, toDisplayString(_ctx.$t("profile.favorites")), 1)])]),
						createVNode("div", { class: "stat-card glass-card" }, [createVNode("div", { class: "stat-icon" }, [createVNode($setup["Eye"], { size: 24 })]), createVNode("div", { class: "stat-info" }, [createVNode("div", { class: "stat-value" }, toDisplayString($setup.viewsCount), 1), createVNode("div", { class: "stat-label" }, toDisplayString(_ctx.$t("profile.views")), 1)])]),
						createVNode("div", { class: "stat-card glass-card" }, [createVNode("div", { class: "stat-icon" }, [createVNode($setup["Calendar"], { size: 24 })]), createVNode("div", { class: "stat-info" }, [createVNode("div", { class: "stat-value" }, toDisplayString($setup.joinedDays), 1), createVNode("div", { class: "stat-label" }, toDisplayString(_ctx.$t("profile.days")), 1)])])
					]),
					createVNode("section", { class: "account-info glass-card" }, [createVNode("h2", null, [createVNode($setup["Info"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.accountInfo")), 1)]), createVNode("div", { class: "info-grid" }, [
						createVNode("div", { class: "info-item" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.username")), 1), createVNode("div", { class: "info-value" }, toDisplayString($setup.user?.username), 1)]),
						createVNode("div", { class: "info-item" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.email")), 1), createVNode("div", { class: "info-value" }, [createTextVNode(toDisplayString($setup.user?.email) + " ", 1), $setup.user?.is_verified ? (openBlock(), createBlock("span", {
							key: 0,
							class: "verified-badge"
						}, [createVNode($setup["CheckCircle"], { size: 14 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.verified")), 1)])) : (openBlock(), createBlock("button", {
							key: 1,
							class: "verify-btn",
							onClick: $setup.sendVerificationEmail
						}, toDisplayString(_ctx.$t("profile.sendVerification")), 1))])]),
						createVNode("div", { class: "info-item" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.fullName")), 1), createVNode("div", { class: "info-value" }, toDisplayString($setup.user?.full_name || _ctx.$t("profile.notSet")), 1)]),
						createVNode("div", { class: "info-item" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.joinedAt")), 1), createVNode("div", { class: "info-value" }, toDisplayString($setup.formatDate($setup.user?.created_at)), 1)]),
						createVNode("div", { class: "info-item" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.accountStatus")), 1), createVNode("div", { class: "info-value" }, [createVNode("span", { class: ["status-badge", $setup.user?.is_active ? "status-active" : "status-inactive"] }, toDisplayString($setup.user?.is_active ? _ctx.$t("profile.active") : _ctx.$t("profile.inactive")), 3)])])
					])]),
					createVNode("section", { class: "danger-zone glass-card" }, [
						createVNode("h2", null, [createVNode($setup["AlertTriangle"], { size: 20 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.dangerZone")), 1)]),
						createVNode("p", { class: "danger-description" }, toDisplayString(_ctx.$t("profile.dangerZoneDescription")), 1),
						createVNode("div", { class: "danger-actions" }, [createVNode("button", {
							class: "danger-btn",
							onClick: $setup.handleLogout
						}, [createVNode($setup["LogOut"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.logout")), 1)]), createVNode("button", {
							class: "danger-btn danger-delete",
							onClick: ($event) => $setup.showDeleteModal = true
						}, [createVNode($setup["Trash2"], { size: 18 }), createTextVNode(" " + toDisplayString(_ctx.$t("profile.deleteAccount")), 1)], 8, ["onClick"])])
					])
				]),
				createVNode($setup["GlassModal"], {
					modelValue: $setup.showEditModal,
					"onUpdate:modelValue": ($event) => $setup.showEditModal = $event,
					title: _ctx.$t("profile.editProfile")
				}, {
					default: withCtx(() => [createVNode("form", {
						onSubmit: withModifiers($setup.handleUpdateProfile, ["prevent"]),
						class: "edit-form"
					}, [
						createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.fullName")), 1), createVNode($setup["GlassInput"], {
							modelValue: $setup.editForm.full_name,
							"onUpdate:modelValue": ($event) => $setup.editForm.full_name = $event,
							type: "text",
							placeholder: _ctx.$t("profile.fullName"),
							icon: $setup.UserIcon
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"placeholder",
							"icon"
						])]),
						createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.email")), 1), createVNode($setup["GlassInput"], {
							modelValue: $setup.editForm.email,
							"onUpdate:modelValue": ($event) => $setup.editForm.email = $event,
							type: "email",
							placeholder: _ctx.$t("profile.email"),
							icon: $setup.Mail
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"placeholder",
							"icon"
						])]),
						createVNode("div", { class: "modal-actions" }, [createVNode($setup["GlassButton"], {
							type: "button",
							variant: "ghost",
							onClick: ($event) => $setup.showEditModal = false
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)]),
							_: 1
						}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
							type: "submit",
							loading: $setup.updating
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.save")), 1)]),
							_: 1
						}, 8, ["loading"])])
					], 32)]),
					_: 1
				}, 8, [
					"modelValue",
					"onUpdate:modelValue",
					"title"
				]),
				createVNode($setup["GlassModal"], {
					modelValue: $setup.showPasswordModal,
					"onUpdate:modelValue": ($event) => $setup.showPasswordModal = $event,
					title: _ctx.$t("profile.changePassword")
				}, {
					default: withCtx(() => [createVNode("form", {
						onSubmit: withModifiers($setup.handleChangePassword, ["prevent"]),
						class: "password-form"
					}, [
						createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.currentPassword")), 1), createVNode($setup["GlassInput"], {
							modelValue: $setup.passwordForm.current_password,
							"onUpdate:modelValue": ($event) => $setup.passwordForm.current_password = $event,
							type: "password",
							placeholder: _ctx.$t("profile.currentPassword"),
							icon: $setup.Lock,
							autocomplete: "current-password"
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"placeholder",
							"icon"
						])]),
						createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.newPassword")), 1), createVNode($setup["GlassInput"], {
							modelValue: $setup.passwordForm.new_password,
							"onUpdate:modelValue": ($event) => $setup.passwordForm.new_password = $event,
							type: "password",
							placeholder: _ctx.$t("profile.passwordMinLength"),
							icon: $setup.Lock,
							autocomplete: "new-password"
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"placeholder",
							"icon"
						])]),
						createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.confirmPassword")), 1), createVNode($setup["GlassInput"], {
							modelValue: $setup.passwordForm.confirm_password,
							"onUpdate:modelValue": ($event) => $setup.passwordForm.confirm_password = $event,
							type: "password",
							placeholder: _ctx.$t("profile.confirmPassword"),
							icon: $setup.Lock,
							autocomplete: "new-password"
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"placeholder",
							"icon"
						])]),
						createVNode("div", { class: "modal-actions" }, [createVNode($setup["GlassButton"], {
							type: "button",
							variant: "ghost",
							onClick: ($event) => $setup.showPasswordModal = false
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)]),
							_: 1
						}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
							type: "submit",
							loading: $setup.changingPassword
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("profile.changePassword")), 1)]),
							_: 1
						}, 8, ["loading"])])
					], 32)]),
					_: 1
				}, 8, [
					"modelValue",
					"onUpdate:modelValue",
					"title"
				]),
				createVNode($setup["GlassModal"], {
					modelValue: $setup.showDeleteModal,
					"onUpdate:modelValue": ($event) => $setup.showDeleteModal = $event,
					title: _ctx.$t("profile.deleteAccount")
				}, {
					default: withCtx(() => [createVNode("div", { class: "delete-confirm" }, [
						createVNode($setup["AlertTriangle"], {
							size: 48,
							class: "warning-icon"
						}),
						createVNode("h3", null, toDisplayString(_ctx.$t("profile.deleteConfirmTitle")), 1),
						createVNode("p", null, toDisplayString(_ctx.$t("profile.deleteWarning")) + ":", 1),
						createVNode("ul", null, [
							createVNode("li", null, toDisplayString(_ctx.$t("profile.deleteItems.profile")), 1),
							createVNode("li", null, toDisplayString(_ctx.$t("profile.deleteItems.favorites")), 1),
							createVNode("li", null, toDisplayString(_ctx.$t("profile.deleteItems.access")), 1)
						]),
						createVNode("div", { class: "form-group" }, [createVNode("label", null, toDisplayString(_ctx.$t("profile.enterPasswordToConfirm")), 1), createVNode($setup["GlassInput"], {
							modelValue: $setup.deleteForm.password,
							"onUpdate:modelValue": ($event) => $setup.deleteForm.password = $event,
							type: "password",
							placeholder: _ctx.$t("auth.password"),
							icon: $setup.Lock
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"placeholder",
							"icon"
						])]),
						createVNode("div", { class: "modal-actions" }, [createVNode($setup["GlassButton"], {
							type: "button",
							variant: "ghost",
							onClick: ($event) => $setup.showDeleteModal = false
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.cancel")), 1)]),
							_: 1
						}, 8, ["onClick"]), createVNode($setup["GlassButton"], {
							type: "button",
							variant: "secondary",
							loading: $setup.deleting,
							onClick: $setup.handleDeleteAccount
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(_ctx.$t("common.confirm")), 1)]),
							_: 1
						}, 8, ["loading"])])
					])]),
					_: 1
				}, 8, [
					"modelValue",
					"onUpdate:modelValue",
					"title"
				])
			];
		}),
		_: 1
	}, _parent));
}
var _sfc_setup = ProfilePage_vue_vue_type_script_setup_true_lang_default.setup;
ProfilePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/ProfilePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ProfilePage_default = /* @__PURE__ */ __plugin_vue_export_helper_default(ProfilePage_vue_vue_type_script_setup_true_lang_default, [
	["ssrRender", _sfc_ssrRender],
	["__scopeId", "data-v-5e02ae5f"],
	["__file", "F:/Projects/hmrchan/frontend/src/views/ProfilePage.vue"]
]);
export { ProfilePage_default as t };
