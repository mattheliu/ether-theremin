# Contributing / 参与开发

Install with `npm ci`. Before submitting a change, run:

```sh
npm run check
npm run build
```

- Keep audible output opt-in and release microphone tracks on stop, errors, cancellation and page backgrounding. Never upload microphone audio.
- Add meaningful synthetic-signal or lifecycle regression tests when changing audio behavior. State which hardware/browser was actually tested; do not treat simulated input as hardware validation.
- Keep all user-facing copy in both locale files. Use typed message keys in the engine, and retain Chinese as the default language. Do not recreate the engine when switching languages.
- Preserve third-party license notices. Do not commit deployment identifiers, tokens, device-specific diagnostics, recordings, environment files or generated output.
- Keep fixes focused. Avoid unrelated dependency upgrades or audio algorithm changes during UI and translation work.

修改音频流程时补充信号或生命周期回归测试，并说明实测设备。可翻译文案须同时更新中英文，音频引擎只返回消息键。不得提交个人部署标识、凭证、录音或设备诊断记录；保留第三方许可。提交前运行上面的检查与构建命令。

The `miniflare > sharp` override pins Sharp 0.35.4 to address [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), while Miniflare still pins an affected patch. Remove the override only after the upstream dependency includes the fix, then rerun `npm audit`, checks and a production build. 该补丁约束用于修复开发运行时的图片依赖；上游纳入修复后再移除并重新验证。
