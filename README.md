# 小小数学花园

纯前端中文加减法练习，适合横屏平板和手机。默认 100 以内进位、退位，支持四档难度、15/18/20 题、数字键盘和选择题、图解、总结、复习与本地进度。

## 本地运行

需要 Node.js 22+ 和 pnpm 10+。

```sh
pnpm install
pnpm dev
```

```sh
pnpm test
pnpm build
pnpm preview
```

## 发布到 GitHub Pages

1. 将项目提交到自己的 GitHub 仓库，默认分支为 `main`。
2. 在仓库 Settings → Pages → Build and deployment 中，选择 GitHub Actions。
3. 推送 `main`，或手动运行 Deploy math garden to Pages 工作流。
4. 工作流完成后，通过 Pages 页面给出的地址打开应用。

构建使用相对资源路径，兼容 `https://用户名.github.io/仓库名/` 和用户主页仓库。页面内部不使用路径路由，刷新时不会出现子路由 404。如需固定资源前缀，可通过 `BASE_PATH=/仓库名/ pnpm build` 指定。

无需 API 密钥、账号或服务器。不会自动创建仓库或发布到外部账户。首次访问需要网络；尚未加入离线 service worker。

## 练习与评分

每次从有限且符合约束的题库随机抽题，加减题数相差最多 1，不生成负数答案。每题最多两次作答；第一次错误可重试，第二次错误显示方法。使用图解的题目记为「一起练习完成」，不计入独立答对。每完成一次练习收获一朵花，无计时、无扣分。

所有设置和进度仅保存在当前浏览器 localStorage，最多保存 50 次总结。无法保存时仍可练习，但关闭页面后可能丢失进度。家长设置可清空本机进度。浏览器清理数据也会删除进度，暂不支持跨设备同步。

## 验证

`src/math.test.ts` 验证题目范围、进退位、答案、唯一性、候选选项、平衡和评分。`e2e/smoke.mjs` 使用 Playwright 检查各尺寸布局、键盘/选择作答、重试、提示、总结、恢复和重置。运行前先启动本地预览：

```sh
pnpm build
pnpm preview --port 4173
node e2e/smoke.mjs
```

脚本使用系统 Edge（Windows）或 Playwright Chromium，可通过 `BROWSER_PATH` 指定浏览器。真实 iPad 和目标 Android 平板仍需实机试用。
