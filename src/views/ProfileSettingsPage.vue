<template>
  <div class="settings-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.settings')"
        :subtitle="$t('profile.settingsSubtitle')"
        :hint="$t('profile.settingsHint')"
      >
        <template #actions>
          <Button variant="ghost" size="sm" type="button" @click="refreshSettingsData">
            <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
            {{ $t('common.refresh') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchProfile" />

      <template v-else-if="isLoading">
        <div class="settings-skeleton">
          <div class="settings-section glass-card">
            <div class="skeleton-header">
              <Skeleton width="100px" height="20px" />
            </div>
            <div class="skeleton-avatar-section">
              <Skeleton variant="avatar" width="80px" height="80px" />
              <Skeleton width="140px" height="40px" />
            </div>
          </div>
          <div class="settings-section glass-card">
            <div class="skeleton-header">
              <Skeleton width="120px" height="20px" />
            </div>
            <div class="skeleton-form">
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="100px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="profile">
        <div class="settings-layout">
          <div class="settings-main">
            <form class="settings-form" @submit.prevent="saveProfile">
              <!-- Avatar Section -->
              <section id="avatar-section" class="settings-section glass-card">
                <div class="section-header">
                  <div class="section-icon">
                    <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
                  </div>
                  <div>
                    <h2 class="section-title">{{ $t('profile.avatar') }}</h2>
                    <p class="section-desc">{{ $t('profile.avatarSectionHint') }}</p>
                  </div>
                </div>
                <div class="avatar-section">
                  <div class="avatar-wrapper">
                    <img
                      v-if="profile.avatar_url"
                      class="avatar-preview"
                      :src="normalizeAvatarUrl(profile.avatar_url) || profile.avatar_url"
                      :alt="profile.username"
                    />
                    <div v-else class="avatar-preview avatar-placeholder">
                      <AnimatedIcon name="user" :fallback-icon="User" size="xl" />
                    </div>
                    <div class="avatar-badge">
                      <AnimatedIcon name="sparkle" :fallback-icon="Camera" size="sm" />
                    </div>
                  </div>
                  <div class="avatar-info">
                    <p class="avatar-hint">
                      {{ $t('profile.avatarHint') }}
                    </p>
                    <label class="glass-button avatar-upload-btn">
                      <AnimatedIcon name="explore" :fallback-icon="Upload" size="sm" />
                      {{ $t('profile.uploadAvatar') }}
                      <input
                        type="file"
                        accept="image/*"
                        class="sr-only"
                        :aria-label="$t('profile.uploadAvatar')"
                        @change="handleAvatarSelect"
                      />
                    </label>
                    <div class="avatar-meta">
                      <span>{{ $t('profile.avatarMetaHint') }}</span>
                      <span class="meta-dot" />
                      <span>{{ $t('profile.avatarMetaPrivacy') }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Basic Info Section -->
              <section id="basic-info" class="settings-section glass-card">
                <div class="section-header">
                  <div class="section-icon">
                    <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
                  </div>
                  <div>
                    <h2 class="section-title">{{ $t('profile.basicInfo') }}</h2>
                    <p class="section-desc">{{ $t('profile.basicInfoHint') }}</p>
                  </div>
                </div>

                <!-- Username (readonly) -->
                <div class="form-group">
                  <label for="username">
                    <AnimatedIcon name="explore" :fallback-icon="AtSign" size="sm" />
                    {{ $t('profile.username') }}
                  </label>
                  <div class="input-wrapper input-readonly">
                    <Input
                      id="username"
                      :model-value="profile.username"
                      type="text"
                      class="input-with-icon"
                      autocomplete="username"
                      disabled
                      readonly
                    />
                    <AnimatedIcon
                      name="sparkle"
                      :fallback-icon="Lock"
                      size="sm"
                      class="input-icon-right"
                    />
                  </div>
                  <p class="field-hint">{{ $t('profile.usernameReadonly') }}</p>
                </div>

                <!-- Display Name -->
                <div class="form-group">
                  <label for="full_name">
                    <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
                    {{ $t('profile.fullName') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="full_name"
                      v-model="form.full_name"
                      type="text"
                      class="input-with-icon"
                      maxlength="255"
                      :placeholder="$t('profile.fullNamePlaceholder')"
                      autocomplete="name"
                    />
                  </div>
                  <p class="field-hint">{{ $t('profile.displayNameHint') }}</p>
                </div>

                <!-- Bio -->
                <div class="form-group">
                  <label for="bio">
                    <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
                    {{ $t('profile.bio') }}
                  </label>
                  <div class="input-wrapper">
                    <Textarea
                      id="bio"
                      v-model="form.bio"
                      class="bio-textarea"
                      maxlength="500"
                      rows="4"
                      :placeholder="$t('profile.bioPlaceholder')"
                    />
                  </div>
                  <div class="field-hint-row">
                    <p class="field-hint">{{ $t('profile.bioHint') }}</p>
                    <span
                      class="char-count"
                      :class="{ 'char-count--warning': (form.bio?.length || 0) > 450 }"
                    >
                      {{ form.bio?.length || 0 }}/500
                    </span>
                  </div>
                </div>

                <div class="form-actions">
                  <Button type="submit" :disabled="isSaving">
                    <span v-if="isSaving" class="spinner spinner-sm" />
                    <AnimatedIcon v-else name="sparkle" :fallback-icon="Save" size="sm" />
                    {{ $t('common.save') }}
                  </Button>
                  <Button type="button" variant="ghost" :disabled="isSaving" @click="fetchProfile">
                    <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                    {{ $t('common.reset') }}
                  </Button>
                </div>
              </section>
            </form>

            <!-- Change Email Section -->
            <section id="email-section" class="settings-section glass-card email-section">
              <div class="section-header">
                <div class="section-icon">
                  <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
                </div>
                <div>
                  <h2 class="section-title">{{ $t('email.changeEmailTitle') }}</h2>
                  <p class="section-desc">{{ $t('email.changeEmailHint') }}</p>
                </div>
              </div>

              <div class="form-group">
                <label>
                  <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
                  {{ $t('email.currentEmail') }}
                </label>
                <div class="input-wrapper input-readonly">
                  <Input
                    :model-value="profile.email"
                    type="email"
                    class="input-with-icon"
                    autocomplete="email"
                    disabled
                    readonly
                  />
                  <AnimatedIcon
                    name="sparkle"
                    :fallback-icon="Lock"
                    size="sm"
                    class="input-icon-right"
                  />
                </div>
              </div>

              <form @submit.prevent="handleChangeEmail">
                <div class="form-group">
                  <label for="new_email">
                    <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
                    {{ $t('email.newEmail') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="new_email"
                      v-model="emailForm.new_email"
                      type="email"
                      class="input-with-icon"
                      :placeholder="$t('email.newEmailPlaceholder')"
                      autocomplete="email"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="email_password">
                    <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
                    {{ $t('email.confirmWithPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="email_password"
                      v-model="emailForm.password"
                      :type="showEmailPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      autocomplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      :aria-label="passwordToggleLabel(showEmailPassword)"
                      :aria-pressed="showEmailPassword"
                      @click="showEmailPassword = !showEmailPassword"
                    >
                      <AnimatedIcon
                        v-if="showEmailPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                    </button>
                  </div>
                  <p class="field-hint">{{ $t('email.changeEmailVerifyHint') }}</p>
                </div>

                <div class="form-actions">
                  <Button
                    type="submit"
                    variant="secondary"
                    :disabled="isChangingEmail || !canChangeEmail"
                  >
                    <span v-if="isChangingEmail" class="spinner spinner-sm" />
                    <AnimatedIcon v-else name="explore" :fallback-icon="Mail" size="sm" />
                    {{ $t('email.changeEmailButton') }}
                  </Button>
                </div>
              </form>
            </section>

            <!-- Password Section -->
            <section id="password-section" class="settings-section glass-card password-section">
              <div class="section-header">
                <div class="section-icon section-icon--warning">
                  <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
                </div>
                <div>
                  <h2 class="section-title">{{ $t('profile.changePassword') }}</h2>
                  <p class="section-desc">{{ $t('profile.passwordHint') }}</p>
                </div>
              </div>
              <form @submit.prevent="changePassword">
                <!-- Hidden username for password managers -->
                <input
                  type="text"
                  :value="profile?.username"
                  autocomplete="username"
                  class="sr-only"
                  tabindex="-1"
                  aria-hidden="true"
                  readonly
                />

                <div class="form-group">
                  <label for="current_password">
                    <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
                    {{ $t('profile.currentPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="current_password"
                      v-model="passwordForm.current_password"
                      :type="showCurrentPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      autocomplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      :aria-label="passwordToggleLabel(showCurrentPassword)"
                      :aria-pressed="showCurrentPassword"
                      @click="showCurrentPassword = !showCurrentPassword"
                    >
                      <AnimatedIcon
                        v-if="showCurrentPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label for="new_password">
                    <AnimatedIcon name="sparkle" :fallback-icon="Lock" size="sm" />
                    {{ $t('profile.newPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="new_password"
                      v-model="passwordForm.new_password"
                      :type="showNewPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      autocomplete="new-password"
                      minlength="8"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      :aria-label="passwordToggleLabel(showNewPassword)"
                      :aria-pressed="showNewPassword"
                      @click="showNewPassword = !showNewPassword"
                    >
                      <AnimatedIcon
                        v-if="showNewPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                    </button>
                  </div>
                  <!-- Password Strength Indicator -->
                  <div v-if="passwordForm.new_password" class="password-strength">
                    <div class="strength-bar">
                      <div
                        class="strength-fill"
                        :class="passwordStrengthClass"
                        :style="{ width: `${passwordStrength * 25}%` }"
                      />
                    </div>
                    <span class="strength-text" :class="passwordStrengthClass">
                      {{ passwordStrengthText }}
                    </span>
                  </div>
                </div>

                <div class="form-group">
                  <label for="confirm_password">
                    <AnimatedIcon name="sparkle" :fallback-icon="CheckCircle" size="sm" />
                    {{ $t('profile.confirmPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="confirm_password"
                      v-model="passwordForm.confirm_password"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      :error="Boolean(passwordForm.confirm_password && !passwordsMatch)"
                      autocomplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      :aria-label="passwordToggleLabel(showConfirmPassword)"
                      :aria-pressed="showConfirmPassword"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      <AnimatedIcon
                        v-if="showConfirmPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                    </button>
                  </div>
                  <p v-if="passwordForm.confirm_password && !passwordsMatch" class="field-error">
                    {{ $t('profile.passwordMismatch') }}
                  </p>
                </div>

                <div class="form-actions">
                  <Button
                    type="submit"
                    variant="secondary"
                    :disabled="isChangingPassword || !canChangePassword"
                  >
                    <span v-if="isChangingPassword" class="spinner spinner-sm" />
                    <AnimatedIcon v-else name="sparkle" :fallback-icon="Shield" size="sm" />
                    {{ $t('profile.changePassword') }}
                  </Button>
                </div>
              </form>
            </section>

            <!-- 2FA Section -->
            <section id="two-factor-section" class="settings-section glass-card two-factor-section">
              <div class="section-header">
                <div class="section-icon section-icon--success">
                  <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
                </div>
                <div>
                  <h2 class="section-title">{{ $t('profile.twoFactorTitle') }}</h2>
                  <p class="section-desc">{{ $t('profile.twoFactorHint') }}</p>
                </div>
              </div>

              <div class="two-factor-status-card">
                <div class="two-factor-status-copy">
                  <p class="two-factor-status-label">{{ $t('profile.twoFactorStatusLabel') }}</p>
                  <p class="two-factor-status-value">
                    {{
                      isTwoFactorLoading
                        ? $t('common.loading')
                        : twoFactorStatus?.enabled
                          ? $t('profile.twoFactorEnabled')
                          : $t('profile.twoFactorDisabled')
                    }}
                  </p>
                  <p class="field-hint">
                    {{
                      isTwoFactorLoading
                        ? $t('profile.twoFactorStatusLoadingHint')
                        : twoFactorStatus?.enabled
                          ? $t('profile.twoFactorEnabledHint', {
                              count: twoFactorStatus.backup_codes_remaining,
                            })
                          : $t('profile.twoFactorDisabledHint')
                    }}
                  </p>
                </div>

                <div class="two-factor-actions">
                  <Button
                    v-if="!twoFactorStatus?.enabled && !twoFactorSetup"
                    type="button"
                    variant="secondary"
                    :loading="isSettingUpTwoFactor"
                    :disabled="isTwoFactorLoading"
                    @click="beginTwoFactorSetup"
                  >
                    <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
                    {{ $t('profile.twoFactorSetupAction') }}
                  </Button>

                  <template v-else-if="twoFactorStatus?.enabled">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      :disabled="isTwoFactorLoading"
                      @click="openBackupCodesDialog"
                    >
                      <AnimatedIcon name="explore" :fallback-icon="Key" size="sm" />
                      {{ $t('profile.twoFactorViewBackupCodes') }}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      :disabled="isTwoFactorLoading"
                      @click="openRegenerateDialog"
                    >
                      <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                      {{ $t('profile.twoFactorRegenerateAction') }}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      :disabled="isTwoFactorLoading"
                      @click="openDisableDialog"
                    >
                      <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
                      {{ $t('profile.twoFactorDisableAction') }}
                    </Button>
                  </template>
                </div>
              </div>

              <div v-if="twoFactorSetup" class="two-factor-setup">
                <div class="two-factor-setup-qr">
                  <img
                    class="two-factor-qr-image"
                    :src="normalizedTwoFactorQrCode"
                    :alt="$t('profile.twoFactorQrAlt')"
                  />
                </div>

                <div class="two-factor-setup-details">
                  <p class="field-hint">{{ $t('profile.twoFactorSetupInstructions') }}</p>

                  <div class="two-factor-secret-card">
                    <span class="two-factor-secret-label">{{
                      $t('profile.twoFactorManualCode')
                    }}</span>
                    <code class="two-factor-secret-value">{{ twoFactorSetup.secret }}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      @click="copyText(twoFactorSetup.secret)"
                    >
                      {{ $t('profile.twoFactorCopySecret') }}
                    </Button>
                  </div>

                  <div class="two-factor-backup-box">
                    <div class="two-factor-backup-header">
                      <h3>{{ $t('profile.twoFactorBackupCodesTitle') }}</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        @click="copyBackupCodes(setupBackupCodes)"
                      >
                        {{ $t('profile.twoFactorCopyBackupCodes') }}
                      </Button>
                    </div>
                    <p class="field-hint">{{ $t('profile.twoFactorBackupCodesHint') }}</p>
                    <div class="two-factor-backup-grid">
                      <code
                        v-for="code in setupBackupCodes"
                        :key="code"
                        class="two-factor-backup-code"
                      >
                        {{ code }}
                      </code>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="two_factor_code">
                      <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
                      {{ $t('profile.twoFactorVerifyCodeLabel') }}
                    </label>
                    <div class="input-wrapper">
                      <Input
                        id="two_factor_code"
                        v-model="twoFactorVerificationCode"
                        type="text"
                        class="input-with-icon"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="6"
                        :placeholder="$t('auth.twoFactorCodePlaceholder')"
                      />
                    </div>
                  </div>

                  <div class="form-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      :loading="isVerifyingTwoFactor"
                      :disabled="twoFactorVerificationCode.length < 6"
                      @click="confirmTwoFactorSetup"
                    >
                      <AnimatedIcon name="sparkle" :fallback-icon="CheckCircle" size="sm" />
                      {{ $t('profile.twoFactorConfirmSetup') }}
                    </Button>
                    <Button type="button" variant="ghost" @click="cancelTwoFactorSetup">
                      {{ $t('common.cancel') }}
                    </Button>
                  </div>
                </div>
              </div>

              <div
                v-else-if="twoFactorStatus?.enabled && latestBackupCodes.length"
                class="two-factor-backup-box two-factor-backup-box--saved"
              >
                <div class="two-factor-backup-header">
                  <h3>{{ $t('profile.twoFactorLatestBackupCodes') }}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="copyBackupCodes(latestBackupCodes)"
                  >
                    {{ $t('profile.twoFactorCopyBackupCodes') }}
                  </Button>
                </div>
                <p class="field-hint">{{ $t('profile.twoFactorBackupCodesSavedHint') }}</p>
                <div class="two-factor-backup-grid">
                  <code
                    v-for="code in latestBackupCodes"
                    :key="`latest-${code}`"
                    class="two-factor-backup-code"
                  >
                    {{ code }}
                  </code>
                </div>
              </div>
            </section>

            <section id="account-section" class="settings-section glass-card account-section">
              <div class="section-header">
                <div class="section-icon section-icon--warning">
                  <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
                </div>
                <div>
                  <h2 class="section-title">{{ $t('profile.accountToolsTitle') }}</h2>
                  <p class="section-desc">{{ $t('profile.accountToolsHint') }}</p>
                </div>
              </div>

              <div class="account-status-card">
                <div class="account-status-copy">
                  <p class="two-factor-status-label">{{ $t('profile.accountStatusLabel') }}</p>
                  <p class="two-factor-status-value">
                    {{
                      isDeletionStatusLoading
                        ? $t('common.loading')
                        : deletionStatus?.is_deleted
                          ? $t('profile.accountDeletionPending')
                          : $t('profile.accountActive')
                    }}
                  </p>
                  <p class="field-hint">
                    {{
                      isDeletionStatusLoading
                        ? $t('profile.accountStatusLoadingHint')
                        : deletionStatus?.is_deleted
                          ? $t('profile.accountDeletionPendingHint', {
                              days: deletionStatus.days_remaining ?? 0,
                            })
                          : $t('profile.accountActiveHint')
                    }}
                  </p>
                </div>

                <div class="account-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    :loading="isExportingData"
                    @click="exportAccountData"
                  >
                    <AnimatedIcon name="explore" :fallback-icon="Download" size="sm" />
                    {{ $t('profile.exportDataAction') }}
                  </Button>
                  <Button
                    v-if="deletionStatus?.is_deleted && deletionStatus.can_restore"
                    type="button"
                    variant="secondary"
                    size="sm"
                    :loading="isRestoringAccount"
                    @click="restoreAccountAccess"
                  >
                    <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
                    {{ $t('profile.restoreAccountAction') }}
                  </Button>
                  <Button
                    v-else
                    type="button"
                    variant="danger"
                    size="sm"
                    :disabled="isDeletionStatusLoading"
                    @click="openDeleteAccountDialog"
                  >
                    <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
                    {{ $t('profile.deleteAccountAction') }}
                  </Button>
                </div>
              </div>

              <div class="account-summary-card">
                <div class="account-summary-card__header">
                  <div>
                    <p class="two-factor-status-label">{{ $t('profile.dataSummaryTitle') }}</p>
                    <p class="field-hint">{{ $t('profile.dataSummaryHint') }}</p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    :loading="isDataSummaryLoading"
                    @click="refreshAccountDataSummary"
                  >
                    <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                    {{ $t('common.refresh') }}
                  </Button>
                </div>

                <div class="account-meta-grid">
                  <div class="account-meta-item">
                    <span class="account-meta-label">{{ $t('profile.accountCreatedAt') }}</span>
                    <span class="account-meta-value">
                      {{
                        dataSummary?.created_at
                          ? formatDateTime(dataSummary.created_at)
                          : formatDateTime(profile.created_at)
                      }}
                    </span>
                  </div>
                  <div class="account-meta-item">
                    <span class="account-meta-label">{{
                      $t('profile.accountSummaryUsername')
                    }}</span>
                    <span class="account-meta-value"
                      >@{{ dataSummary?.username || profile.username }}</span
                    >
                  </div>
                  <div class="account-meta-item">
                    <span class="account-meta-label">{{ $t('profile.accountSummaryEmail') }}</span>
                    <span class="account-meta-value">{{
                      dataSummary?.email || profile.email
                    }}</span>
                  </div>
                </div>

                <div v-if="dataSummary" class="account-count-grid">
                  <div
                    v-for="item in dataSummaryItems"
                    :key="item.key"
                    class="account-count-item glass-card"
                  >
                    <span class="account-count-value">{{ item.value }}</span>
                    <span class="account-count-label">{{ item.label }}</span>
                  </div>
                </div>
                <p v-else-if="!isDataSummaryLoading" class="field-hint">
                  {{ $t('profile.dataSummaryUnavailable') }}
                </p>
              </div>

              <div v-if="deletionStatus?.is_deleted" class="account-danger-box">
                <div class="account-meta-grid">
                  <div v-if="deletionStatus.deleted_at" class="account-meta-item">
                    <span class="account-meta-label">{{ $t('profile.accountDeletedAt') }}</span>
                    <span class="account-meta-value">{{
                      formatDateTime(deletionStatus.deleted_at)
                    }}</span>
                  </div>
                  <div v-if="deletionStatus.permanent_delete_at" class="account-meta-item">
                    <span class="account-meta-label">{{
                      $t('profile.accountPermanentDeleteAt')
                    }}</span>
                    <span class="account-meta-value">{{
                      formatDateTime(deletionStatus.permanent_delete_at)
                    }}</span>
                  </div>
                </div>
                <p class="field-hint">
                  {{ $t('profile.deleteAccountHint') }}
                </p>
              </div>
            </section>
          </div>

          <!-- Right Aside (Wide Screens) -->
          <aside class="settings-aside">
            <div class="settings-aside-card glass-card">
              <h3 class="aside-title">{{ $t('profile.settings') }}</h3>
              <nav class="aside-nav">
                <a class="aside-link" href="#avatar-section">{{ $t('profile.avatar') }}</a>
                <a class="aside-link" href="#basic-info">{{ $t('profile.basicInfo') }}</a>
                <a class="aside-link" href="#email-section">{{ $t('email.changeEmailTitle') }}</a>
                <a class="aside-link" href="#password-section">{{
                  $t('profile.changePassword')
                }}</a>
                <a class="aside-link" href="#two-factor-section">{{
                  $t('profile.twoFactorTitle')
                }}</a>
                <a class="aside-link" href="#account-section">{{
                  $t('profile.accountToolsTitle')
                }}</a>
              </nav>
            </div>

            <div class="settings-aside-card glass-card">
              <h3 class="aside-title">{{ $t('profile.summary') }}</h3>
              <div class="aside-meta">
                <div class="meta-row">
                  <span class="meta-label">{{ $t('profile.username') }}</span>
                  <span class="meta-value">@{{ profile.username }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">{{ $t('email.currentEmail') }}</span>
                  <span class="meta-value">{{ profile.email }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">{{ $t('profile.twoFactorSummaryLabel') }}</span>
                  <span class="meta-value">
                    {{
                      twoFactorStatus?.enabled
                        ? $t('profile.twoFactorEnabled')
                        : $t('profile.twoFactorDisabled')
                    }}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <ImageCropper
        v-if="showCropper"
        :image-src="cropImageSrc"
        @crop="handleCroppedImage"
        @cancel="closeCropper"
      />
    </Teleport>

    <!-- Email Verify Dialog -->
    <EmailVerifyDialog
      :is-open="showEmailVerify"
      :action="emailVerifyAction"
      :email="profile?.email ?? ''"
      :target-email="emailVerifyTarget"
      :password="emailVerifyPassword"
      :verification-token="emailVerificationToken"
      :new-password="emailVerifyNewPassword"
      @close="handleEmailVerifyClose"
      @verified="handleEmailVerified"
    />

    <Dialog
      :is-open="showBackupCodesDialog"
      :title="$t('profile.twoFactorBackupCodesTitle')"
      size="sm"
      @update:isOpen="showBackupCodesDialog = $event"
    >
      <div class="two-factor-backup-box two-factor-backup-box--dialog">
        <p class="field-hint">{{ $t('profile.twoFactorBackupCodesSavedHint') }}</p>
        <div v-if="latestBackupCodes.length" class="two-factor-backup-grid">
          <code
            v-for="code in latestBackupCodes"
            :key="`dialog-${code}`"
            class="two-factor-backup-code"
          >
            {{ code }}
          </code>
        </div>
        <p v-else class="field-hint">{{ $t('profile.twoFactorNoBackupCodes') }}</p>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" size="sm" @click="showBackupCodesDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="button"
          size="sm"
          :disabled="!latestBackupCodes.length"
          @click="copyBackupCodes(latestBackupCodes)"
        >
          {{ $t('profile.twoFactorCopyBackupCodes') }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      :is-open="showRegenerateDialog"
      :title="$t('profile.twoFactorRegenerateAction')"
      :description="$t('profile.twoFactorRegenerateHint')"
      size="sm"
      @update:isOpen="showRegenerateDialog = $event"
    >
      <div class="report-form">
        <div class="form-group">
          <label for="regenerate_backup_code">
            <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
            {{ $t('profile.twoFactorVerifyCodeLabel') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="regenerate_backup_code"
              v-model="regenerateBackupCode"
              type="text"
              class="input-with-icon"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              :placeholder="$t('auth.twoFactorCodePlaceholder')"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" size="sm" @click="showRegenerateDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="button"
          size="sm"
          :loading="isRegeneratingBackupCodes"
          :disabled="regenerateBackupCode.length < 6"
          @click="regenerateTwoFactorBackupCodes"
        >
          {{ $t('profile.twoFactorRegenerateAction') }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      :is-open="showDisableTwoFactorDialog"
      :title="$t('profile.twoFactorDisableAction')"
      :description="$t('profile.twoFactorDisableHint')"
      size="sm"
      @update:isOpen="showDisableTwoFactorDialog = $event"
    >
      <div class="report-form">
        <div class="form-group">
          <label for="disable_two_factor_code">
            <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
            {{ $t('profile.twoFactorVerifyCodeLabel') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="disable_two_factor_code"
              v-model="disableTwoFactorForm.code"
              type="text"
              class="input-with-icon"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              :placeholder="$t('auth.twoFactorCodePlaceholder')"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="disable_two_factor_password">
            <AnimatedIcon name="sparkle" :fallback-icon="Lock" size="sm" />
            {{ $t('profile.currentPassword') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="disable_two_factor_password"
              v-model="disableTwoFactorForm.password"
              :type="showDisableTwoFactorPassword ? 'text' : 'password'"
              class="input-with-icon"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(showDisableTwoFactorPassword)"
              :aria-pressed="showDisableTwoFactorPassword"
              @click="showDisableTwoFactorPassword = !showDisableTwoFactorPassword"
            >
              <AnimatedIcon
                v-if="showDisableTwoFactorPassword"
                name="explore"
                :fallback-icon="EyeOff"
                size="sm"
              />
              <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" size="sm" @click="showDisableTwoFactorDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          :loading="isDisablingTwoFactor"
          :disabled="disableTwoFactorForm.code.length < 6 || !disableTwoFactorForm.password"
          @click="disableTwoFactor"
        >
          {{ $t('profile.twoFactorDisableAction') }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      :is-open="showDeleteAccountDialog"
      :title="$t('profile.deleteAccountConfirmTitle')"
      :description="$t('profile.deleteAccountConfirmDesc')"
      size="sm"
      @update:isOpen="showDeleteAccountDialog = $event"
    >
      <div class="report-form">
        <div class="form-group">
          <label for="delete_account_reason">
            <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
            {{ $t('profile.deleteAccountReasonLabel') }}
          </label>
          <div class="input-wrapper">
            <Textarea
              id="delete_account_reason"
              v-model="deleteAccountReason"
              rows="3"
              :placeholder="$t('profile.deleteAccountReasonPlaceholder')"
            />
          </div>
          <p class="field-hint">{{ $t('profile.deleteAccountHint') }}</p>
        </div>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" size="sm" @click="showDeleteAccountDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          :loading="isDeletingAccount"
          @click="confirmDeleteAccount"
        >
          {{ $t('profile.deleteAccountAction') }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileSettingsPage' })

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
// ... icons imports ...
import {
  User,
  Camera,
  Upload,
  FileText,
  AtSign,
  Lock,
  Key,
  Eye,
  EyeOff,
  Shield,
  Save,
  CheckCircle,
  RefreshCw,
  Mail,
  Download,
  RotateCcw,
  Trash2,
} from 'lucide-vue-next'
import {
  userService,
  normalizeAvatarUrl,
  twoFactorService,
  type UserProfile,
  type TwoFactorStatusResponse,
  type TwoFactorSetupResponse,
  ApiError,
} from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import { refreshAvatarCache } from '@/composables/useUserAvatar'
import { checkPasswordStrength } from '@/utils/crypto'
import { ensureVerificationToken, isVerificationCancelledError } from '@/api/verificationBridge'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import Dialog from '@/components/ui/Dialog.vue'

// 动态导入大型组件以减少初始包体积
const ImageCropper = defineAsyncComponent(() => import('@/components/ui/ImageCropper.vue'))
const EmailVerifyDialog = defineAsyncComponent(
  () => import('@/components/ui/EmailVerifyDialog.vue')
)

const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const profile = ref<UserProfile | null>(null)
// ... refs ...
const isLoading = ref(false)
const isSaving = ref(false)
const isChangingPassword = ref(false)
const error = ref<string | null>(null)
const isTwoFactorLoading = ref(false)
const isSettingUpTwoFactor = ref(false)
const isVerifyingTwoFactor = ref(false)
const isRegeneratingBackupCodes = ref(false)
const isDisablingTwoFactor = ref(false)
const isDeletionStatusLoading = ref(false)
const isExportingData = ref(false)
const isDeletingAccount = ref(false)
const isRestoringAccount = ref(false)

const showCropper = ref(false)
const cropImageSrc = ref('')

// Password visibility toggles
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const showEmailPassword = ref(false)
const showDisableTwoFactorPassword = ref(false)
let profileFetchController: AbortController | null = null
let profileFetchToken = 0

function passwordToggleLabel(visible: boolean): string {
  return visible
    ? `${t('common.hide')} ${t('auth.password')}`
    : `${t('common.show')} ${t('auth.password')}`
}

// Change email
const isChangingEmail = ref(false)
const emailForm = ref({
  new_email: '',
  password: '',
})
const twoFactorStatus = ref<TwoFactorStatusResponse | null>(null)
const twoFactorSetup = ref<TwoFactorSetupResponse | null>(null)
const twoFactorVerificationCode = ref('')
const latestBackupCodes = ref<string[]>([])
const showBackupCodesDialog = ref(false)
const showRegenerateDialog = ref(false)
const showDisableTwoFactorDialog = ref(false)
const showDeleteAccountDialog = ref(false)
const regenerateBackupCode = ref('')
const deleteAccountReason = ref('')
const disableTwoFactorForm = ref({
  code: '',
  password: '',
})
type AccountDeletionStatus = Awaited<ReturnType<typeof userService.getDeletionStatus>>
const deletionStatus = ref<AccountDeletionStatus | null>(null)
type AccountDataSummary = Awaited<ReturnType<typeof userService.getDataSummary>> & {
  username?: string
  email?: string
  created_at?: string
  data_counts?: Record<string, number>
}
const dataSummary = ref<AccountDataSummary | null>(null)
const isDataSummaryLoading = ref(false)
const dataSummaryItems = computed(() => {
  const counts = (dataSummary.value?.data_counts ?? {}) as Record<string, number>

  return [
    { key: 'favorites', label: t('profile.dataSummaryFavorites'), value: counts['favorites'] ?? 0 },
    { key: 'comments', label: t('profile.dataSummaryComments'), value: counts['comments'] ?? 0 },
    {
      key: 'discussions',
      label: t('profile.dataSummaryDiscussions'),
      value: counts['discussions'] ?? 0,
    },
    {
      key: 'discussion_comments',
      label: t('profile.dataSummaryDiscussionComments'),
      value: counts['discussion_comments'] ?? 0,
    },
    { key: 'following', label: t('profile.dataSummaryFollowing'), value: counts['following'] ?? 0 },
    { key: 'followers', label: t('profile.dataSummaryFollowers'), value: counts['followers'] ?? 0 },
    {
      key: 'search_history',
      label: t('profile.dataSummarySearchHistory'),
      value: counts['search_history'] ?? 0,
    },
    {
      key: 'browsing_history',
      label: t('profile.dataSummaryBrowsingHistory'),
      value: counts['browsing_history'] ?? 0,
    },
    {
      key: 'notifications',
      label: t('profile.dataSummaryNotifications'),
      value: counts['notifications'] ?? 0,
    },
    { key: 'reports', label: t('profile.dataSummaryReports'), value: counts['reports'] ?? 0 },
  ]
})

const canChangeEmail = computed(() => {
  return (
    emailForm.value.new_email &&
    emailForm.value.new_email !== profile.value?.email &&
    emailForm.value.password
  )
})

// Email verification code dialog
const showEmailVerify = ref(false)
const emailVerifyAction = ref('')
const emailVerificationToken = ref('')
// 'change_email' | 'change_password'
type PendingAction = 'change_email' | 'change_password'
const pendingAction = ref<PendingAction | null>(null)

const emailVerifyTarget = computed(() => {
  if (pendingAction.value === 'change_email') {
    return emailForm.value.new_email
  }
  return undefined
})

const emailVerifyPassword = computed(() => {
  if (pendingAction.value === 'change_password') {
    return passwordForm.value.current_password
  }
  if (pendingAction.value === 'change_email') {
    return emailForm.value.password
  }
  return undefined
})

const emailVerifyNewPassword = computed(() => {
  if (pendingAction.value === 'change_password') {
    return passwordForm.value.new_password
  }
  return undefined
})

const form = ref({
  username: '',
  full_name: '',
  bio: '',
})

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

// ... password strength computed ...
const passwordStrengthResult = computed(() => {
  return checkPasswordStrength(passwordForm.value.new_password)
})

const passwordStrength = computed(() => {
  // 映射到 0-4 范围以兼容现有 UI
  const { level } = passwordStrengthResult.value
  if (level === 'weak') return 1
  if (level === 'fair') return 2
  if (level === 'good') return 3
  return 4
})

const passwordStrengthClass = computed(() => {
  const { level } = passwordStrengthResult.value
  return `strength-${level}`
})

const passwordStrengthText = computed(() => {
  const { level } = passwordStrengthResult.value
  const textMap = {
    weak: t('profile.passwordWeak'),
    fair: t('profile.passwordFair'),
    good: t('profile.passwordGood'),
    strong: t('profile.passwordStrong'),
  }
  return textMap[level]
})

const passwordsMatch = computed(() => {
  return passwordForm.value.new_password === passwordForm.value.confirm_password
})

const canChangePassword = computed(() => {
  return (
    passwordForm.value.current_password &&
    passwordForm.value.new_password.length >= 8 &&
    passwordsMatch.value
  )
})

const normalizedTwoFactorQrCode = computed(() => {
  const raw = twoFactorSetup.value?.qr_code?.trim()
  if (!raw) return ''
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/png;base64,${raw}`
})

const setupBackupCodes = computed(() => twoFactorSetup.value?.backup_codes ?? [])

async function fetchProfile() {
  profileFetchController?.abort()
  const controller = new AbortController()
  profileFetchController = controller
  const requestToken = ++profileFetchToken

  isLoading.value = true
  error.value = null

  try {
    const data = await userService.getProfile({
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted || requestToken !== profileFetchToken) return
    profile.value = data
    form.value = {
      username: data.username,
      full_name: data.full_name || '',
      bio: data.bio || '',
    }
  } catch (err) {
    if (controller.signal.aborted || requestToken !== profileFetchToken) return
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    if (requestToken === profileFetchToken) {
      isLoading.value = false
      if (profileFetchController === controller) {
        profileFetchController = null
      }
    }
  }
}

async function fetchTwoFactorStatus() {
  isTwoFactorLoading.value = true
  try {
    twoFactorStatus.value = await twoFactorService.getStatus()
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isTwoFactorLoading.value = false
  }
}

async function fetchDeletionStatus() {
  isDeletionStatusLoading.value = true
  try {
    deletionStatus.value = await userService.getDeletionStatus()
  } catch {
    deletionStatus.value = null
  } finally {
    isDeletionStatusLoading.value = false
  }
}

async function fetchDataSummary(options: { silent?: boolean } = {}) {
  const { silent = true } = options
  isDataSummaryLoading.value = true

  try {
    const summary = await userService.getDataSummary()
    dataSummary.value = summary as AccountDataSummary
  } catch {
    dataSummary.value = null
    if (!silent) {
      toastStore.error(t('common.error'))
    }
  } finally {
    isDataSummaryLoading.value = false
  }
}

async function refreshAccountDataSummary() {
  await fetchDataSummary({ silent: false })
}

async function refreshSettingsData() {
  await Promise.allSettled([
    fetchProfile(),
    fetchTwoFactorStatus(),
    fetchDeletionStatus(),
    fetchDataSummary({ silent: true }),
  ])
}

async function saveProfile() {
  if (isSaving.value) return

  const validation = userService.validateUsername(form.value.username)
  if (!validation.valid) {
    toastStore.error(t(validation.error!))
    return
  }

  isSaving.value = true

  try {
    const updated = await userService.updateProfile({
      username: form.value.username !== profile.value?.username ? form.value.username : undefined,
      full_name: form.value.full_name || undefined,
      bio: form.value.bio || undefined,
    })
    profile.value = updated
    toastStore.success(t('profile.updateSuccess'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isSaving.value = false
  }
}

async function beginTwoFactorSetup() {
  if (isSettingUpTwoFactor.value) return

  isSettingUpTwoFactor.value = true
  try {
    twoFactorSetup.value = await twoFactorService.setup()
    twoFactorVerificationCode.value = ''
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isSettingUpTwoFactor.value = false
  }
}

function cancelTwoFactorSetup() {
  twoFactorSetup.value = null
  twoFactorVerificationCode.value = ''
}

async function confirmTwoFactorSetup() {
  if (isVerifyingTwoFactor.value || twoFactorVerificationCode.value.length < 6) return

  isVerifyingTwoFactor.value = true
  try {
    await twoFactorService.verify(twoFactorVerificationCode.value)
    latestBackupCodes.value = [...setupBackupCodes.value]
    twoFactorSetup.value = null
    twoFactorVerificationCode.value = ''
    await Promise.all([fetchTwoFactorStatus(), authStore.fetchCurrentUser()])
    toastStore.success(t('profile.twoFactorSetupSuccess'))
    showBackupCodesDialog.value = true
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isVerifyingTwoFactor.value = false
  }
}

function openBackupCodesDialog() {
  showBackupCodesDialog.value = true
}

function openRegenerateDialog() {
  regenerateBackupCode.value = ''
  showRegenerateDialog.value = true
}

function openDisableDialog() {
  disableTwoFactorForm.value = {
    code: '',
    password: '',
  }
  showDisableTwoFactorPassword.value = false
  showDisableTwoFactorDialog.value = true
}

async function regenerateTwoFactorBackupCodes() {
  if (isRegeneratingBackupCodes.value || regenerateBackupCode.value.length < 6) return

  isRegeneratingBackupCodes.value = true
  try {
    const response = await twoFactorService.regenerateBackupCodes(regenerateBackupCode.value)
    latestBackupCodes.value = [...response.backup_codes]
    regenerateBackupCode.value = ''
    showRegenerateDialog.value = false
    await fetchTwoFactorStatus()
    toastStore.success(response.message || t('profile.twoFactorBackupCodesRegenerated'))
    showBackupCodesDialog.value = true
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isRegeneratingBackupCodes.value = false
  }
}

async function disableTwoFactor() {
  if (
    isDisablingTwoFactor.value ||
    disableTwoFactorForm.value.code.length < 6 ||
    !disableTwoFactorForm.value.password
  ) {
    return
  }

  isDisablingTwoFactor.value = true
  try {
    const response = await twoFactorService.disable(
      disableTwoFactorForm.value.code,
      disableTwoFactorForm.value.password
    )
    twoFactorSetup.value = null
    latestBackupCodes.value = []
    showDisableTwoFactorDialog.value = false
    disableTwoFactorForm.value = {
      code: '',
      password: '',
    }
    await Promise.all([fetchTwoFactorStatus(), authStore.fetchCurrentUser()])
    toastStore.success(response.message || t('profile.twoFactorDisabledSuccess'))
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isDisablingTwoFactor.value = false
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toastStore.success(t('profile.twoFactorCopied'))
  } catch {
    toastStore.error(t('common.error'))
  }
}

async function copyBackupCodes(codes: string[]) {
  if (!codes.length) return
  await copyText(codes.join('\n'))
}

function openDeleteAccountDialog() {
  deleteAccountReason.value = ''
  showDeleteAccountDialog.value = true
}

async function exportAccountData() {
  if (isExportingData.value) return

  isExportingData.value = true
  try {
    const blob = await userService.exportData()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `hmrchan-account-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toastStore.success(t('profile.exportDataSuccess'))
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isExportingData.value = false
  }
}

async function confirmDeleteAccount() {
  if (isDeletingAccount.value) return

  isDeletingAccount.value = true
  try {
    await userService.deleteAccount(deleteAccountReason.value.trim() || undefined)
    showDeleteAccountDialog.value = false
    deleteAccountReason.value = ''
    await fetchDeletionStatus()
    toastStore.success(t('profile.deleteAccountSuccess'))
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isDeletingAccount.value = false
  }
}

async function restoreAccountAccess() {
  if (isRestoringAccount.value) return

  isRestoringAccount.value = true
  try {
    await userService.restoreAccount()
    await Promise.allSettled([fetchDeletionStatus(), fetchProfile(), authStore.fetchCurrentUser()])
    toastStore.success(t('profile.restoreAccountSuccess'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isRestoringAccount.value = false
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

async function changePassword() {
  if (isChangingPassword.value) return

  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    toastStore.error(t('profile.passwordMismatch'))
    return
  }

  if (passwordForm.value.new_password.length < 8) {
    toastStore.error(t('profile.passwordTooShort'))
    return
  }

  isChangingPassword.value = true
  try {
    emailVerificationToken.value = await ensureVerificationToken('change_password', {
      password: passwordForm.value.current_password,
    })
    pendingAction.value = 'change_password'
    emailVerifyAction.value = 'change_password'
    showEmailVerify.value = true
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isChangingPassword.value = false
  }
}

async function handleChangeEmail() {
  if (!canChangeEmail.value) return

  isChangingEmail.value = true
  try {
    emailVerificationToken.value = await ensureVerificationToken('change_email', {
      password: emailForm.value.password,
    })
    pendingAction.value = 'change_email'
    emailVerifyAction.value = 'change_email'
    showEmailVerify.value = true
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isChangingEmail.value = false
  }
}

function handleEmailVerifyClose() {
  showEmailVerify.value = false
  pendingAction.value = null
  emailVerifyAction.value = ''
  emailVerificationToken.value = ''
}

/** Called when email OTP verification succeeds */
async function handleEmailVerified() {
  showEmailVerify.value = false

  if (pendingAction.value === 'change_email') {
    // 邮箱已在 verifyEmailCode 中完成更换
    toastStore.success(t('email.changeEmailSuccess'))
    emailForm.value = { new_email: '', password: '' }
    await fetchProfile()
  } else if (pendingAction.value === 'change_password') {
    // 密码已在 verifyEmailCode 中完成修改
    toastStore.success(t('profile.passwordChanged'))
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: '',
    }
  }
  pendingAction.value = null
  emailVerifyAction.value = ''
  emailVerificationToken.value = ''
}

// 头像上传限制
const AVATAR_LIMITS = {
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}

function handleAvatarSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!AVATAR_LIMITS.ALLOWED_TYPES.includes(file.type)) {
    toastStore.error(t('profile.avatarTypeError'))
    input.value = ''
    return
  }

  // 验证文件大小
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > AVATAR_LIMITS.MAX_FILE_SIZE_MB) {
    toastStore.error(t('profile.avatarSizeError', { max: AVATAR_LIMITS.MAX_FILE_SIZE_MB }))
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    cropImageSrc.value = e.target?.result as string
    showCropper.value = true
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function closeCropper() {
  showCropper.value = false
  cropImageSrc.value = ''
}

async function handleCroppedImage(blob: Blob) {
  showCropper.value = false

  const file = new File([blob], 'avatar.png', { type: 'image/png' })

  try {
    const result = await userService.uploadAvatar(file)
    // 文件名包含时间戳，本身就是唯一的，无需额外添加参数破坏缓存
    const cleanUrl = result.url

    if (profile.value) {
      profile.value.avatar_url = cleanUrl
    }
    if (authStore.user) {
      authStore.user.avatar_url = cleanUrl
    }
    // 刷新全局头像缓存，确保导航栏等组件立即更新
    refreshAvatarCache()
    // 同步更新 auth store 中的用户数据
    await authStore.fetchCurrentUser()
    toastStore.success(t('profile.avatarUpdated'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

onMounted(() => {
  void refreshSettingsData()
})

onUnmounted(() => {
  profileFetchController?.abort()
  profileFetchController = null
})
</script>

<style scoped>
.settings-page {
  min-height: 100dvh;
  min-height: 100svh;
  padding: clamp(1rem, 3vw, 1.5rem) 0;
}

.settings-layout {
  display: grid;
  gap: clamp(1rem, 3vw, 1.5rem);
}

.settings-main {
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 2vw, 1rem);
  min-width: 0;
}

.settings-aside {
  display: none;
}

.settings-aside-card {
  padding: clamp(0.875rem, 2.5vw, 1.25rem);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  border: 1px solid var(--glass-border-subtle);
}

.aside-title {
  margin: 0 0 var(--spacing-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.aside-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aside-link {
  text-decoration: none;
  color: var(--color-text-secondary);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  border-left: 2px solid transparent;
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.aside-link:hover {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.04);
  border-left-color: var(--color-primary);
}

.aside-meta {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-3);
  font-size: var(--text-xs);
}

.meta-label {
  color: var(--color-text-tertiary);
}

.meta-value {
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
  text-align: right;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Skeleton Loading */
.settings-skeleton {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 3vw, 1.5rem);
  max-width: min(90vw, 60rem);
}

.skeleton-header {
  margin-bottom: var(--spacing-4);
}

.skeleton-avatar-section {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 1.5rem);
}

.skeleton-avatar {
  width: 6.25rem;
  height: 6.25rem;
  border-radius: var(--radius-full);
}

.skeleton-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* Settings Section */
.settings-section {
  padding: clamp(1rem, 3vw, 1.5rem);
  position: relative;
  z-index: 1;
  max-width: min(90vw, 55rem);
  border-left: 3px solid transparent;
  transition: border-color var(--duration-fast) var(--ease-smooth);
}

.settings-section:hover {
  border-left-color: rgba(var(--color-primary-rgb), 0.2);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-5);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--glass-border-subtle);
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  border-radius: var(--radius-lg);
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.section-header:hover .section-icon {
  transform: scale(1.05);
}

.section-icon--warning {
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.1);
  color: var(--color-warning, #f59e0b);
}

.section-icon--success {
  background: rgba(var(--color-success-rgb, 16, 185, 129), 0.12);
  color: var(--color-success);
}

.section-title {
  font-size: clamp(var(--text-base), 2vw, var(--text-lg));
  font-weight: var(--font-semibold);
  margin: 0;
}

.section-desc {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* Avatar Section */
.avatar-section {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 1.5rem);
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar-preview {
  width: 6.25rem;
  height: 6.25rem;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 3px solid var(--glass-border-medium);
  transition: border-color var(--duration-fast) var(--ease-smooth);
}

.avatar-wrapper:hover .avatar-preview {
  border-color: var(--color-primary);
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-bg);
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.avatar-wrapper:hover .avatar-badge {
  transform: scale(1.1);
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.avatar-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.avatar-meta .meta-dot {
  width: 0.25rem;
  height: 0.25rem;
  border-radius: var(--radius-full);
  background: var(--color-text-tertiary);
}

.avatar-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.avatar-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.avatar-upload-btn:hover {
  transform: var(--lift-sm);
}

/* Form Styles */
.settings-form {
  max-width: min(90vw, 60rem);
}

.form-group {
  margin-bottom: var(--spacing-5);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.input-wrapper {
  position: relative;
}

.input-wrapper .input-with-icon {
  width: 100%;
  padding-right: var(--spacing-10);
}

.input-readonly .input-with-icon {
  opacity: 0.7;
  cursor: not-allowed;
  background: var(--glass-bg-light);
}

.input-icon-right {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.bio-textarea {
  resize: vertical;
  min-height: 6.25rem;
  padding-right: var(--spacing-4) !important;
}

.field-hint {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: var(--spacing-2) 0 0;
}

.field-hint-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-2);
}

.field-error {
  font-size: var(--text-sm);
  color: var(--color-error);
  margin: var(--spacing-2) 0 0;
}

.char-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.char-count--warning {
  color: var(--color-warning, #f59e0b);
}

/* Password Toggle */
.password-toggle {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.password-toggle:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-light);
}

/* Password Strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

.strength-bar {
  flex: 1;
  height: 0.25rem;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: all var(--transition-base);
}

.strength-fill.strength-weak {
  background: var(--color-error);
}

.strength-fill.strength-fair {
  background: var(--color-warning, #f59e0b);
}

.strength-fill.strength-good {
  background: var(--color-info, #3b82f6);
}

.strength-fill.strength-strong {
  background: var(--color-success);
}

.strength-text {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.strength-text.strength-weak {
  color: var(--color-error);
}

.strength-text.strength-fair {
  color: var(--color-warning, #f59e0b);
}

.strength-text.strength-good {
  color: var(--color-info, #3b82f6);
}

.strength-text.strength-strong {
  color: var(--color-success);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--glass-border);
}

/* Two-Factor Authentication */
.two-factor-section {
  overflow: hidden;
}

.two-factor-status-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(0.875rem, 2vw, 1.25rem);
  padding: clamp(0.875rem, 2vw, 1.125rem);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.04), transparent 55%),
    var(--glass-bg-light);
}

.two-factor-status-copy {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.two-factor-status-label {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.two-factor-status-value {
  margin: 0;
  font-size: clamp(var(--text-base), 2vw, var(--text-lg));
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.two-factor-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.two-factor-setup {
  display: grid;
  grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  gap: clamp(1rem, 3vw, 1.5rem);
  margin-top: var(--spacing-5);
  align-items: start;
}

.two-factor-setup-qr {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(0.875rem, 2vw, 1.125rem);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border-subtle);
  background: var(--glass-bg-light);
}

.two-factor-qr-image {
  inline-size: min(100%, 13rem);
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: var(--radius-lg);
  background: #fff;
  padding: 0.75rem;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.two-factor-setup-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.two-factor-secret-card {
  display: grid;
  gap: 0.75rem;
  padding: clamp(0.875rem, 2vw, 1rem);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border-subtle);
  background: rgba(var(--color-primary-rgb), 0.03);
}

.two-factor-secret-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.two-factor-secret-value {
  display: block;
  padding: 0.75rem 0.875rem;
  border-radius: var(--radius-md);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.two-factor-backup-box {
  display: grid;
  gap: 0.875rem;
  padding: clamp(0.875rem, 2vw, 1rem);
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(var(--color-primary-rgb), 0.22);
  background: rgba(var(--color-primary-rgb), 0.03);
}

.two-factor-backup-box--saved {
  margin-top: var(--spacing-5);
  border-color: rgba(var(--color-success-rgb, 16, 185, 129), 0.28);
  background: rgba(var(--color-success-rgb, 16, 185, 129), 0.05);
}

.two-factor-backup-box--dialog {
  padding: 0;
  border: none;
  background: transparent;
}

.two-factor-backup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.two-factor-backup-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.two-factor-backup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
}

.two-factor-backup-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border-subtle);
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-variant-numeric: tabular-nums;
}

.report-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
}

.report-form .form-group {
  margin-bottom: 0;
}

.account-section {
  display: grid;
  gap: var(--spacing-5);
}

.account-status-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(0.875rem, 2vw, 1.25rem);
  padding: clamp(0.875rem, 2vw, 1.125rem);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(var(--color-warning-rgb, 245, 158, 11), 0.06), transparent 58%),
    var(--glass-bg-light);
}

.account-status-copy {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}

.account-summary-card {
  display: grid;
  gap: 1rem;
  padding: clamp(0.875rem, 2vw, 1.125rem);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
}

.account-summary-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.account-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.account-count-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
}

.account-count-item {
  display: grid;
  gap: 0.25rem;
  padding: 0.875rem;
}

.account-count-value {
  font-size: clamp(1.125rem, 2.5vw, 1.5rem);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.account-count-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.account-danger-box {
  display: grid;
  gap: 0.875rem;
  padding: clamp(0.875rem, 2vw, 1rem);
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(var(--color-warning-rgb, 245, 158, 11), 0.28);
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.05);
}

.account-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.875rem;
}

.account-meta-item {
  display: grid;
  gap: 0.25rem;
}

.account-meta-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.account-meta-value {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
  overflow-wrap: anywhere;
}

/* Tablet and below */
@media (max-width: 1024px) {
  .settings-form,
  .settings-section {
    max-width: 100%;
  }
}

/* Wide screens */
@media (min-width: 1200px) {
  .settings-layout {
    grid-template-columns: minmax(0, 1fr) 16rem;
    align-items: start;
  }

  .settings-aside {
    display: flex;
    flex-direction: column;
    gap: clamp(0.625rem, 1.5vw, 0.875rem);
    position: sticky;
    top: calc(var(--navbar-height) + var(--spacing-4));
    max-height: calc(100dvh - var(--navbar-height) - var(--spacing-8));
    height: fit-content;
    overflow-y: auto;
  }

  .settings-form,
  .settings-section {
    max-width: 100%;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .settings-section {
    margin-bottom: var(--spacing-4);
  }

  .section-header {
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-3);
  }

  .section-icon {
    width: 2rem;
    height: 2rem;
  }

  .avatar-section {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-4);
  }

  .avatar-info {
    width: 100%;
    align-items: center;
  }

  .avatar-upload-btn {
    width: 100%;
    justify-content: center;
    padding: var(--spacing-3) var(--spacing-4);
  }

  .form-group {
    margin-bottom: var(--spacing-4);
  }

  .form-group :deep(.ui-input) {
    min-height: 3rem;
    font-size: 1rem; /* Prevent iOS zoom */
  }

  .bio-textarea {
    min-height: 7.5rem;
  }

  .form-actions {
    flex-direction: column;
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-3);
  }

  .form-actions :deep(button) {
    width: 100%;
    min-height: 3rem;
  }

  .two-factor-status-card,
  .account-status-card,
  .two-factor-backup-header,
  .two-factor-setup {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .two-factor-actions {
    inline-size: 100%;
    justify-content: stretch;
  }

  .account-actions {
    inline-size: 100%;
    justify-content: stretch;
  }

  .two-factor-actions :deep(button) {
    inline-size: 100%;
  }

  .account-actions :deep(button) {
    inline-size: 100%;
  }

  .two-factor-setup-qr {
    inline-size: min(100%, 16rem);
    margin-inline: auto;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .avatar-preview {
    width: 5rem;
    height: 5rem;
  }

  .avatar-badge {
    width: 1.5rem;
    height: 1.5rem;
  }

  .two-factor-backup-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .settings-page .settings-section {
  border-radius: 12px;
  border-left-width: 3px;
}

#app[data-ui-style='material'] .settings-page .section-icon {
  border-radius: 8px;
}

#app[data-ui-style='material'] .settings-page .settings-aside-card {
  border-radius: 12px;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--color-surface, #fff);
  box-shadow: var(--shadow-sm);
}

#app[data-ui-style='material'] .settings-page .aside-link {
  border-radius: 4px;
  border-left-width: 2px;
}

#app[data-ui-style='material'] .settings-page .avatar-upload-btn:hover {
  transform: translateY(-1px);
}

#app[data-ui-style='material'] .settings-page .strength-bar {
  border-radius: 2px;
}

#app[data-ui-style='material'] .settings-page .strength-fill {
  border-radius: 2px;
}

/* ===== Dark Theme ===== */
[data-theme='dark'] .settings-page .settings-section:hover {
  border-left-color: rgba(var(--color-primary-rgb), 0.3);
}

[data-theme='dark'] .settings-page .section-header {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .settings-page .form-actions {
  border-top-color: rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .settings-page .avatar-preview {
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .settings-page .input-readonly .input-with-icon {
  background: rgba(255, 255, 255, 0.04);
}

/* ===== Blue Theme ===== */
[data-theme='blue'] .settings-page .settings-section:hover {
  border-left-color: rgba(59, 130, 246, 0.3);
}

[data-theme='blue'] .settings-page .section-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

[data-theme='blue'] .settings-page .section-icon--warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

[data-theme='blue'] .settings-page .section-icon--success {
  background: rgba(var(--color-success-rgb, 16, 185, 129), 0.12);
  color: var(--color-success);
}

[data-theme='blue'] .settings-page .aside-link:hover {
  color: #3b82f6;
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.04);
}

[data-theme='blue'] .settings-page .avatar-badge {
  background: #3b82f6;
}

[data-theme='blue'] .settings-page .avatar-preview:hover {
  border-color: #3b82f6;
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .settings-page .settings-aside-card {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .settings-page .settings-aside-card {
  background: #ffffff;
  border-color: rgba(59, 130, 246, 0.1);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.06);
}

#app[data-ui-style='material'][data-theme='blue'] .settings-page .settings-section {
  border-color: rgba(59, 130, 246, 0.08);
}

#app[data-ui-style='material'][data-theme='blue'] .settings-page .settings-section:hover {
  border-left-color: #3b82f6;
}
</style>
