/**
 * 在 `next build` 之后执行：把 standalone 产物与静态资源整理到 dist/windows-bundle，
 * 供复制到 Windows 或用于 Inno Setup 打包。
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const standalone = join(root, ".next", "standalone")
const out = join(root, "dist", "windows-bundle")

if (!existsSync(standalone)) {
  console.error("未找到 .next/standalone，请先执行: npm run build")
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

cpSync(standalone, out, { recursive: true })

const pub = join(root, "public")
if (existsSync(pub)) {
  cpSync(pub, join(out, "public"), { recursive: true })
}

const staticSrc = join(root, ".next", "static")
if (!existsSync(staticSrc)) {
  console.error("未找到 .next/static，请确认 next build 已成功完成")
  process.exit(1)
}
mkdirSync(join(out, ".next", "static"), { recursive: true })
cpSync(staticSrc, join(out, ".next", "static"), { recursive: true })

// 必须仅含 ASCII：Win7 cmd 默认按系统 ANSI 解析 .bat，UTF-8 中文会导致整行乱码、命令拆错、%PORT% 无法展开
const startBat = `@echo off
cd /d "%~dp0"
set PORT=3000
set HOSTNAME=127.0.0.1
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install LTS from https://nodejs.org/
  pause
  exit /b 1
)
node -e "var m=process.version.match(/^v(\\d+)/);process.exit(!m||+m[1]<18?1:0)"
if errorlevel 1 (
  echo.
  echo ERROR: Node.js 18 or newer is required.
  echo This Next.js 16 app cannot run on old Node ^(e.g. Windows 7 default installs^).
  echo Upgrade to Windows 10/11 and install Node 20 LTS, or use another PC.
  echo.
  pause
  exit /b 1
)
echo.
echo   Starting photo app on http://127.0.0.1:%PORT% ...
echo   Close this window to stop the server.
echo.
timeout /t 2 /nobreak >nul
start http://127.0.0.1:%PORT%
node server.js
pause
`
writeFileSync(join(out, "启动照片处理.bat"), startBat, "ascii")

const readme = `照片处理（Next.js 独立运行包）
================================

一、环境要求
------------
• Windows 10 或 Windows 11（不支持 Windows 7：即使用新 Node，本程序也无法在该系统上可靠运行）。
• 已安装 Node.js 18 或更高（建议 20 LTS），安装时勾选 Add to PATH。

二、首次使用
------------
1. 将本文件夹复制到任意目录（如 D:\\PhotoTool）。
2. 可选：在本目录放置 .env.local，内容示例：
   ARK_API_KEY=你的密钥
   ARK_IMAGE_MODEL=你的模型ID
   也可登录网页后在右上角「我的」里填写。
3. 双击「启动照片处理.bat」。
4. 浏览器访问 http://127.0.0.1:3000

三、防火墙
----------
若本机防火墙拦截，请允许 Node.js 访问专用网络/公用网络。

四、若出现「找不到应用程序」或 SyntaxError
--------------------------------------
• 先弹出「http://127.0.0.1」「找不到应用程序」：多为未设置默认浏览器；可装 Chrome
  并设为默认，或在服务启动后手动打开 http://127.0.0.1:3000。
• 黑窗口里出现 SyntaxError: Unexpected token '?'：说明 Node 版本过低（常见于 Win7）。
  Next.js 16 需要 Node 18+，与 Win7 不兼容，请换 Win10/11 的电脑使用本程序。
• 若 bat 里仍有中文乱码：请使用重新执行 npm run build:win 后生成的新版「启动照片处理.bat」
  （纯英文，勿用记事本另存为带中文的编码覆盖）。

五、停止服务
------------
关闭运行「启动照片处理.bat」的黑色命令行窗口即可。

六、无法自动打开浏览器时
------------------------
服务启动后，可手动在浏览器地址栏输入：http://127.0.0.1:3000
`
// UTF-8 BOM：便于 Win7 记事本正确显示中文
writeFileSync(join(out, "使用说明.txt"), "\uFEFF" + readme, "utf8")

const envExample = `# 可选：复制为 .env.local 后填写（也可仅在网页「我的」中配置）
ARK_API_KEY=
ARK_IMAGE_MODEL=
# ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
`
writeFileSync(join(out, "env.example.txt"), envExample, "utf8")

console.log("已生成: " + out)
console.log("下一步（在 Windows 上）：")
console.log("  1) 将整个 windows-bundle 文件夹复制到目标电脑；或")
console.log("  2) 用 Inno Setup 打开 installer/PhotoToolSetup.iss 编译得到 Setup.exe")
