import { createI18n } from 'vue-i18n'

export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP'

export const supportedLocales: SupportedLocale[] = ['zh-CN', 'en-US', 'ja-JP']
export const defaultLocale: SupportedLocale = 'zh-CN'

const messages = {
  'zh-CN': {
    nav: {
      home: '首页',
      explore: '探索',
      community: '社区',
      about: '关于',
      contact: '反馈',
      studio: '发布',
      profile: '个人中心',
      login: '登录',
      register: '注册',
    },
    shell: {
      authCta: '登录 / 注册',
      profileCta: '个人中心',
      logout: '退出',
      theme: '主题',
      darkMode: '黑',
      lightMode: '白',
      language: '语言',
      footerTitle: '加入 HMRChan 的下一轮内容循环',
      footerBody: '浏览精选、参与讨论，或把你的草稿发布到社区。',
      footerCta: '开始发布',
      footerExplore: '探索社区',
    },
    home: {
      eyebrow: 'HMRChan 正式骨架',
      title: '内容、社区与创作者的高速入口。',
      body: '基于 Brand-style 的节奏重新搭建，首屏连接 home feed、精选内容与社区信号。',
      primary: '进入探索',
      secondary: '加入社区',
      featured: '精选内容',
      stories: '故事流',
      pulse: '社区脉冲',
      communityTitle: '社区信号，为快速判断而生。',
    },
    explore: {
      eyebrow: '探索',
      title: '探索内容流',
      body: '在作品式网格和列表视图之间切换，快速浏览帖子、作者与趋势。',
      grid: '网格',
      list: '列表',
      authors: '作者索引',
      authorTitle: '创作者索引',
    },
    community: {
      eyebrow: '社区',
      title: '社区现场',
      body: '讨论、反馈、收藏与关系动态的公共入口。',
      stats: '社区指标',
      latest: '最新讨论',
      liveTitle: '实时公共场域',
      threadTitle: '值得打开的讨论',
      discussionLabel: '讨论 · HMRChan',
    },
    post: {
      back: '返回探索',
      detail: '内容详情',
      discussion: '参与讨论',
    },
    about: {
      eyebrow: '关于',
      principles: '原则',
      title: '关于 HMRChan',
      body: '一个围绕内容发现、创作者主页、社区讨论和个人知识流构建的轻量产品。',
      ruleTitle: '社区规则',
      ruleBody: '少一点噪音，多一点上下文；尊重创作，保护账户安全。',
      entranceBody: '首页、探索、社区、个人中心会成为首轮正式产品的四个稳定入口。',
    },
    contact: {
      eyebrow: '反馈',
      title: '反馈与联系',
      body: '把问题、建议或合作想法发给我们。表单优先走 contact 接口，并自动降级 feedback。',
      name: '称呼',
      email: '邮箱',
      message: '内容',
      send: '发送反馈',
      sent: '已提交，我们会尽快查看。',
      apiEyebrow: '同源 API',
      fallbackTitle: '/api/v1/contact/send',
      fallbackBody: '如果 contact 服务不可用，表单会降级提交到 /api/v1/feedback。',
    },
    auth: {
      eyebrow: '认证',
      loginTitle: '登录 HMRChan',
      registerTitle: '创建账号',
      username: '用户名或邮箱',
      email: '邮箱',
      password: '密码',
      submitLogin: '登录',
      submitRegister: '注册',
      callbackEyebrow: 'OAuth',
      callbackTitle: '登录回调处理中',
      callbackBody:
        'Google 登录交接会通过同源 /api/v1/auth/google/exchange 完成，当前页面负责恢复会话。',
      recoveryEyebrow: 'Passkey',
      recoveryTitle: 'Passkey 恢复',
      recoveryBody: '通过邮箱、密码与恢复流程重新注册可信 Passkey。',
      error: '认证请求未完成，请稍后重试。',
    },
    profile: {
      title: '个人中心',
      overview: '概览',
      security: '安全',
      preferences: '偏好',
      favorites: '收藏',
      history: '历史',
      inbox: '收件箱',
      empty: '这个区域已经接好路由，下一步连接对应接口数据。',
      sessionFallback: '会话 façade 已就绪',
      active: '有效',
      guest: '访客',
      endpointHint: '下一轮会把这个分区连接到对应接口数据。',
    },
    studio: {
      eyebrow: '工作台',
      title: '发布工作台',
      body: '草稿、媒体上传和发布流程会从这里开始。',
      cta: '新建草稿',
      draftLabel: '草稿',
      draftEndpoint: '/api/v1/posts/drafts',
      draftTitle: '草稿列表、媒体上传、发布操作会在下一步接入。',
      draftBody: '当前路由和认证守卫已经就绪。',
    },
    error: {
      notFound: '页面不存在',
      home: '回到首页',
    },
  },
  'en-US': {
    nav: {
      home: 'Home',
      explore: 'Explore',
      community: 'Community',
      about: 'About',
      contact: 'Feedback',
      studio: 'Studio',
      profile: 'Profile',
      login: 'Log in',
      register: 'Sign up',
    },
    shell: {
      authCta: 'Log in / Sign up',
      profileCta: 'Profile',
      logout: 'Log out',
      theme: 'Theme',
      darkMode: 'Dark',
      lightMode: 'Light',
      language: 'Language',
      footerTitle: 'Join the next HMRChan loop',
      footerBody: 'Browse highlights, join discussions, or publish a draft to the community.',
      footerCta: 'Start publishing',
      footerExplore: 'Explore community',
    },
    home: {
      eyebrow: 'HMRChan official shell',
      title: 'A fast gateway for content, community, and creators.',
      body: 'Rebuilt with a Brand-style rhythm, now wired for home feeds, featured content, and community signals.',
      primary: 'Explore',
      secondary: 'Community',
      featured: 'Featured',
      stories: 'Story deck',
      pulse: 'Community pulse',
      communityTitle: 'Community signals, shaped for quick decisions.',
    },
    explore: {
      eyebrow: 'Explore',
      title: 'Explore feed',
      body: 'Switch between a portfolio-like grid and a compact list for posts, authors, and trends.',
      grid: 'Grid',
      list: 'List',
      authors: 'Authors',
      authorTitle: 'Creator index',
    },
    community: {
      eyebrow: 'Community',
      title: 'Community live',
      body: 'The public entrance for discussions, feedback, favorites, and relationship activity.',
      stats: 'Stats',
      latest: 'Latest discussions',
      liveTitle: 'Live public surface',
      threadTitle: 'Threads worth opening',
      discussionLabel: 'Discussion · HMRChan',
    },
    post: {
      back: 'Back to explore',
      detail: 'Post detail',
      discussion: 'Join discussion',
    },
    about: {
      eyebrow: 'About',
      principles: 'Principles',
      title: 'About HMRChan',
      body: 'A lightweight product for content discovery, creator profiles, community discussions, and personal knowledge loops.',
      ruleTitle: 'Community rules',
      ruleBody: 'Less noise, more context. Respect creators and keep accounts safe.',
      entranceBody:
        'Home, Explore, Community, and Profile are the stable first-round product entrances.',
    },
    contact: {
      eyebrow: 'Feedback',
      title: 'Feedback',
      body: 'Send questions, suggestions, or collaboration notes. The form falls back from contact to feedback.',
      name: 'Name',
      email: 'Email',
      message: 'Message',
      send: 'Send feedback',
      sent: 'Submitted. We will review it soon.',
      apiEyebrow: 'Same-origin API',
      fallbackTitle: '/api/v1/contact/send',
      fallbackBody: 'If contact is unavailable, the form falls back to /api/v1/feedback.',
    },
    auth: {
      eyebrow: 'Auth',
      loginTitle: 'Log in to HMRChan',
      registerTitle: 'Create account',
      username: 'Username or email',
      email: 'Email',
      password: 'Password',
      submitLogin: 'Log in',
      submitRegister: 'Sign up',
      callbackEyebrow: 'OAuth',
      callbackTitle: 'Completing sign-in',
      callbackBody:
        'The Google handoff will exchange through /api/v1/auth/google/exchange and this page restores the session.',
      recoveryEyebrow: 'Passkey',
      recoveryTitle: 'Passkey recovery',
      recoveryBody: 'Recover trust with email, password, and passkey registration.',
      error: 'The authentication request did not complete. Please try again.',
    },
    profile: {
      title: 'Profile',
      overview: 'Overview',
      security: 'Security',
      preferences: 'Preferences',
      favorites: 'Favorites',
      history: 'History',
      inbox: 'Inbox',
      empty: 'This route is wired. The next step is binding endpoint data.',
      sessionFallback: 'Session facade ready',
      active: 'active',
      guest: 'guest',
      endpointHint: 'This profile section will bind to its endpoint data in the next pass.',
    },
    studio: {
      eyebrow: 'Studio',
      title: 'Studio',
      body: 'Drafts, uploads, and publishing begin here.',
      cta: 'New draft',
      draftLabel: 'Drafts',
      draftEndpoint: '/api/v1/posts/drafts',
      draftTitle: 'Drafts, media uploads, and publishing actions are next to integrate.',
      draftBody: 'The route and auth guard are ready.',
    },
    error: {
      notFound: 'Page not found',
      home: 'HMRChan Home',
    },
  },
  'ja-JP': {
    nav: {
      home: 'ホーム',
      explore: '探索',
      community: 'コミュニティ',
      about: '概要',
      contact: 'フィードバック',
      studio: '投稿',
      profile: 'プロフィール',
      login: 'ログイン',
      register: '登録',
    },
    shell: {
      authCta: 'ログイン / 登録',
      profileCta: 'プロフィール',
      logout: 'ログアウト',
      theme: 'テーマ',
      darkMode: '黒',
      lightMode: '白',
      language: '言語',
      footerTitle: 'HMRChan の次のループへ',
      footerBody: 'ハイライトを読み、議論に参加し、下書きをコミュニティへ公開しましょう。',
      footerCta: '投稿を始める',
      footerExplore: 'コミュニティを見る',
    },
    home: {
      eyebrow: 'HMRChan 公式シェル',
      title: 'コンテンツ、コミュニティ、クリエイターへの高速入口。',
      body: 'Brand-style のリズムを保ちながら、フィード、注目コンテンツ、コミュニティ信号につなぎます。',
      primary: '探索する',
      secondary: 'コミュニティ',
      featured: '注目',
      stories: 'ストーリー',
      pulse: 'コミュニティ',
      communityTitle: '素早い判断のためのコミュニティ信号。',
    },
    explore: {
      eyebrow: '探索',
      title: '探索フィード',
      body: '作品風グリッドとリストを切り替えて、投稿、作者、トレンドを素早く確認できます。',
      grid: 'グリッド',
      list: 'リスト',
      authors: '作者',
      authorTitle: 'クリエイター索引',
    },
    community: {
      eyebrow: 'コミュニティ',
      title: 'コミュニティライブ',
      body: '議論、フィードバック、お気に入り、関係性の公開入口です。',
      stats: '指標',
      latest: '最新の議論',
      liveTitle: 'リアルタイム公開面',
      threadTitle: '開く価値のある議論',
      discussionLabel: '議論 · HMRChan',
    },
    post: {
      back: '探索へ戻る',
      detail: '投稿詳細',
      discussion: '議論に参加',
    },
    about: {
      eyebrow: '概要',
      principles: '原則',
      title: 'HMRChan について',
      body: 'コンテンツ発見、作者プロフィール、コミュニティ議論、個人の知識ループのための軽量プロダクトです。',
      ruleTitle: 'コミュニティルール',
      ruleBody: 'ノイズを減らし、文脈を増やす。創作を尊重し、アカウントを守ります。',
      entranceBody:
        'ホーム、探索、コミュニティ、プロフィールが初回プロダクトの安定した入口になります。',
    },
    contact: {
      eyebrow: 'フィードバック',
      title: 'フィードバック',
      body: '質問、提案、協業メモを送信できます。フォームは contact から feedback に自動フォールバックします。',
      name: '名前',
      email: 'メール',
      message: '内容',
      send: '送信',
      sent: '送信しました。確認します。',
      apiEyebrow: '同一オリジン API',
      fallbackTitle: '/api/v1/contact/send',
      fallbackBody:
        'contact が利用できない場合、フォームは /api/v1/feedback にフォールバックします。',
    },
    auth: {
      eyebrow: '認証',
      loginTitle: 'HMRChan にログイン',
      registerTitle: 'アカウント作成',
      username: 'ユーザー名またはメール',
      email: 'メール',
      password: 'パスワード',
      submitLogin: 'ログイン',
      submitRegister: '登録',
      callbackEyebrow: 'OAuth',
      callbackTitle: 'ログイン処理中',
      callbackBody:
        'Google ハンドオフは /api/v1/auth/google/exchange を経由し、このページでセッションを復元します。',
      recoveryEyebrow: 'Passkey',
      recoveryTitle: 'Passkey 復旧',
      recoveryBody: 'メール、パスワード、Passkey 登録で信頼を復旧します。',
      error: '認証リクエストが完了しませんでした。もう一度お試しください。',
    },
    profile: {
      title: 'プロフィール',
      overview: '概要',
      security: 'セキュリティ',
      preferences: '設定',
      favorites: 'お気に入り',
      history: '履歴',
      inbox: '受信箱',
      empty: 'ルートは接続済みです。次は API データを接続します。',
      sessionFallback: 'セッション façade は準備済み',
      active: '有効',
      guest: 'ゲスト',
      endpointHint: '次のパスでこのプロフィール分区を対応 API に接続します。',
    },
    studio: {
      eyebrow: 'スタジオ',
      title: '投稿スタジオ',
      body: '下書き、アップロード、公開フローはここから始まります。',
      cta: '下書きを作成',
      draftLabel: '下書き',
      draftEndpoint: '/api/v1/posts/drafts',
      draftTitle: '下書き、メディアアップロード、公開操作は次に接続します。',
      draftBody: 'ルートと認証ガードは準備済みです。',
    },
    error: {
      notFound: 'ページが見つかりません',
      home: 'HMRChan ホーム',
    },
  },
}

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale)
}

function resolveInitialLocale(): SupportedLocale {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('hmr.locale')
    if (isSupportedLocale(saved)) return saved
  }

  const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : ''
  if (browserLanguage.startsWith('ja')) return 'ja-JP'
  if (browserLanguage.startsWith('en')) return 'en-US'
  return defaultLocale
}

const initialLocale = resolveInitialLocale()

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: defaultLocale,
  messages,
})

export function applyLocale(locale: SupportedLocale): void {
  const globalComposer = i18n.global as unknown as {
    locale: SupportedLocale | { value: SupportedLocale }
  }

  if (typeof globalComposer.locale === 'string') {
    globalComposer.locale = locale
  } else {
    globalComposer.locale.value = locale
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
    document.documentElement.dataset.locale = locale
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('hmr.locale', locale)
  }
}

applyLocale(initialLocale)

export default i18n
