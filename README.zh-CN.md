<div align="center">

# 以太 ETHER

**触不到的，也能奏响。**

一台在浏览器里演奏的声纳特雷门琴。

[在线体验](https://ether-theremin-lzx-0909.leonliuzx.chatgpt.site/) · [快速开始](#快速开始) · [致谢](#致谢) · [English](README.md)

</div>

---

<img align="right" src="public/images/ether-art.jpg" width="28%" alt="AI 艺术图像：悬空的手靠近特雷门琴天线，细微光迹环绕其间" />

### 用声音，做一件小乐器

扬声器发出探测音，麦克风接收反射。挥动手掌，ETHER 把多普勒频移变成旋律。

- **隔空演奏。** 用电脑扬声器和麦克风感知手掌运动，控制连续音高。
- **调出自己的声音。** 调整音色、滑音与混响，可选择 C 五声音阶、C 大调或自由滑音。
- **选对麦克风。** 手动选择输入设备，查看校准实际检测到了什么。
- **声音留在本机。** 麦克风音频只在设备内处理，不录音、不上传。

界面支持中英文，默认中文。触控和键盘可作为备用演奏方式。

<br clear="all" />

## 快速开始

打开[在线体验](https://ether-theremin-lzx-0909.leonliuzx.chatgpt.site/)，或使用 **Node.js 22.13+** 和 npm 在本地运行。本地运行无需账号、API 密钥或云服务配置。

```sh
git clone https://github.com/openaigames/ether-theremin.git
cd ether-theremin
npm ci
npm run dev
```

打开终端显示的 localhost 地址。麦克风只在 HTTPS 或 localhost 上可用。

1. 使用内置扬声器与实体麦克风，避免耳机和虚拟音频输入。
2. 点击「开启声纳」，允许麦克风；保持手掌和电脑静止，等待校准完成。
3. 在扬声器附近推拉手掌：推近升调，拉远降调。旋律模式下停手保音 2.2 秒，再轻柔淡出；音域 C4–C5，较慢的响应便于小幅控制。
4. 选择音色、滑音、混响或 C 大调辅助。停止按钮、Escape 和页面进入后台都会停止探测并释放麦克风。

在「麦克风」下拉框中手动选择输入设备。自动模式遇到可识别的虚拟默认输入时，会尝试切换内置麦克风。权限未授予时，浏览器可能隐藏设备名称。

系统音量和「探测音量」控制探测音强度；「输出音量」只控制琴声。默认测试 18.5 至 21 kHz；手动启用「兼容频段」后，仅在高频检测失败时追加 16 至 18 kHz。部分人或宠物可能听到探测音，请从较低音量开始，如不适立即停止。

## 奏出第一段旋律

默认使用**旋律响应 + C 五声音阶**，音符为 C、D、E、G、A，并在音符边界留出缓冲，减少抖动。切换手势响应可恢复 C3–C6 的完整音域、较快变调和停手淡出；选择自由滑音则关闭音符吸附。

1. 开启声纳前，点击**听示范**。原创八音短句以 80 BPM 播放，不使用麦克风；停止按钮和 Escape 都能取消。
2. 开启声纳，点击**开始跟练**，自动选择旋律响应和 C 五声音阶。
3. 轻推手掌升调，轻拉降调。奏出亮起的音，稳住约半秒后进入下一音；跟练按你的速度进行。
4. 点击**收音**可留出休止，无需重新校准。下一次识别到手势时继续发声；停止演奏则释放麦克风。

练习音符为 `C4 E4 G4 A4 | G4 E4 D4 C4`，示范中的 A4 和最后一个 C4 各占两拍。跟练检查稳定音高，不评判节奏准确度。旋律模式仍通过运动调音，不测量手掌距离。

乐句与传统演奏技巧可参考 [Carolina Eyck 的教程](https://www.carolinaeyck.com/method)及 [Lydia Kavina 的教学](https://www.lydiakavina.com/learn)。传统天线琴的固定手位不能直接套用于声纳控制。

## 排障与隐私

「声纳校准诊断」显示实际输入设备、采样率、输入电平、音频处理设置及各频率的稳定性。

| 遇到的情况           | 可以尝试                                                   |
| -------------------- | ---------------------------------------------------------- |
| 输入几乎静音         | 选择实体麦克风，避免虚拟输入；检查系统输入音量和静音状态。 |
| 有输入，但探测音不足 | 检查扬声器输出、系统音量和探测音量；输出音量只控制琴声。   |
| 高频校准持续失败     | 尝试兼容频段；Mac 上检查麦克风模式，关闭语音隔离。         |
| 看不到设备名称       | 先授予麦克风权限，浏览器可能在授权前隐藏设备名称。         |

浏览器报告的处理设置无法排除 macOS 或硬件自身的音频处理。可参考 [Apple 麦克风模式说明](https://support.apple.com/en-ie/guide/mac-help/mchle82b42f0/mac)。

### 声音留在你这里

麦克风音频仅在当前设备内处理，不录音、不上传、不回放。诊断和设备标识只保留在当前页面内存中；主题偏好保存在浏览器本地。可选 WebMCP 工具仅在支持的浏览器中注册，用于读取状态、列出输入、配置参数和停止；工具不会主动请求麦克风或开始演奏。`state.message` 是稳定的消息键，客户端通过词典翻译。

## 它如何工作

1. **先听环境。** 测量静止时的背景，寻找当前硬件可用的载频。
2. **再听运动。** 比较载频两侧的频谱展宽，估计手掌运动方向。
3. **把运动变成音高。** 按时间积分运动信号，再叠加所选音色、滑音和混响。

<details>
<summary><strong>校准与信号处理细节</strong></summary>

参考 [Daniel Rapp / doppler](https://github.com/DanielRapp/doppler) 和 [SoundWave，CHI 2012](https://www.microsoft.com/en-us/research/publication/soundwave-using-doppler-effect-sense-gestures/)。频谱采用线性功率、静止基线扣除和间隔后的二次频带搜索，以多普勒频移判断运动方向，再按时间积分为音高变化。

校准使用多帧背景中位数，每个载频至少四帧通过接收电平、背景提升和信噪比门槛。频率范围受实际麦克风及音频处理采样率共同约束。

</details>

本项目感知运动，不测量绝对距离，也无法独立定位两只手；它借用特雷门琴的连续音高表达，不使用传统特雷门琴的电容感应原理。声纳性能依赖硬件、浏览器和房间反射。自动测试无法替代真实硬件测试。

## 开发与 i18n

```sh
npm run check    # 单元测试、类型检查、lint
npm run build    # 生成 Cloudflare Worker 构建
npm run start    # 在本地预览构建结果
```

欢迎参与。音频生命周期、隐私和翻译约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

<details>
<summary><strong>目录结构与 i18n</strong></summary>

| 目录                          | 内容                                   |
| ----------------------------- | -------------------------------------- |
| `app/`                        | 演奏页面、样式与页面元数据             |
| `components/`                 | 校准诊断、历史正文和实际使用的 UI 组件 |
| `lib/melody.ts`               | 音符吸附、保音包络和共享练习乐谱       |
| `components/melody-coach.tsx` | 试听与音符跟练                         |
| `lib/instrument.ts`           | 音频引擎、设备选择与生命周期           |
| `lib/signal.ts`               | 频谱分析、校准判定与音高积分           |
| `lib/locales/zh.ts`、`en.ts`  | 中英文界面、元数据、状态和错误文案     |
| `lib/instrument-errors.ts`    | 浏览器错误到稳定消息键的映射           |
| `lib/webmcp.ts`               | 可选的结构化浏览器工具                 |
| `tests/`                      | 合成声学数据和模拟音频设备测试         |

中文词典定义完整结构，英文词典用 `satisfies Locale` 校验缺项和错键。新增状态时添加消息键，两种语言同时补齐；引擎只传递 `MessageKey`，不要在引擎或 JSX 中写入可翻译文案。品牌名、引用名称、设备自报名称和工具协议使用稳定原文。切换语言不会重建音频引擎。

</details>

<details>
<summary><strong>部署与源码导出</strong></summary>

独立源码可直接运行和构建。若使用 Sites，请为自己的站点创建 `.openai/hosting.json`；参考 `.openai/hosting.example.json`。已有部署配置属于各自站点，不应复制别人的项目标识。

```sh
npm run export:source -- ../ether-theremin-source
```

导出脚本使用文件白名单，排除 Git 历史、个人部署配置、依赖目录、构建产物和临时文件，并检查常见凭证及本机路径。目标目录必须尚不存在。导出代码不会创建或公开任何远端仓库。

</details>

## 致谢

感谢让这个实验成为可能的创作者与项目：

- **[Emanuel Perez · @emanperez28](https://x.com/emanperez28/status/2097476030680244361)**：在 X 分享的声纳隔空滚动演示，启发了 ETHER 的声学手势交互。
- **[Thomas Kellogg · @oldnickels](https://x.com/oldnickels/status/2097563247046217944)**：提出做一台特雷门琴的点子，为 ETHER 的乐器方向提供了直接启发。
- **[Daniel Rapp · doppler](https://github.com/DanielRapp/doppler)**：在浏览器中实现声学多普勒运动检测；ETHER 改编了其中以 MIT 许可发布的频带算法。
- **[SoundWave · CHI 2012](https://www.microsoft.com/en-us/research/publication/soundwave-using-doppler-effect-sense-gestures/)**：使用扬声器和麦克风感知手势的研究基础。

乐器历史部分参考了 [Bob Moog Foundation](https://moogfoundation.org/bob-moogs-love-of-the-theremin/)、[Museums Victoria](https://collections.museumsvictoria.com.au/items/400678) 和 [Clara Rockmore 传记](https://nadiareisenberg-clararockmore.org/clara-rockmore-biography/)。更多资料与素材归属见[第三方许可与来源](THIRD_PARTY_NOTICES.md)。

## 许可与来源

项目自有代码采用 [MIT](LICENSE)。第三方素材各自保留原许可：doppler 和 shadcn 为 MIT；Manrope 字体为 OFL 1.1；馆藏照片为 CC BY 4.0。AI 主视觉为本项目生成的艺术图像，不是历史影像。具体归属、图片来源及历史参考见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
