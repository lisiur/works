// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 自定义域名；Pages Source 切到 GitHub Actions 后由工作流发布（ISSUE-124 AC10）
  site: 'https://apps.hapaul.top',
  // 按源文件形态输出：src/pages/x/index.astro → /x/index.html、src/pages/x/y.astro → /x/y.html，
  // 恰好保持现有「目录形态与 .html 形态并存」的地址（AC1）
  build: {
    format: 'preserve',
  },
});
