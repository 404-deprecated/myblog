// Giscus 评论系统配置
// 配置步骤：
// 1. 在 GitHub 仓库 Settings → Features 里开启 Discussions
// 2. 访问 https://giscus.app 填入仓库信息，获取下面的配置值
// 3. 把 TODO 替换成真实值后重启开发服务器

export const GISCUS_CONFIG = {
  repo: '404-deprecated/myblog' as `${string}/${string}`,
  repoId: 'TODO_REPO_ID',         // giscus.app 生成的 repoId
  category: 'Announcements',
  categoryId: 'TODO_CATEGORY_ID', // giscus.app 生成的 categoryId
  mapping: 'pathname' as const,
  reactionsEnabled: '1' as const,
  emitMetadata: '0' as const,
  inputPosition: 'bottom' as const,
  lang: 'zh-CN',
}
