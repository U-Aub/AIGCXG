; 在 Windows 上安装 Inno Setup 6+ 后，用 ISCC.exe 编译本脚本生成安装包。
; 命令示例:
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" PhotoToolSetup.iss
; 请先在项目根目录执行: npm run build:win

#define MyAppName "照片处理"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Local"
#define BundleDir "..\dist\windows-bundle"

[Setup]
AppId={{A7E8F9C0-1B2D-4E5F-9A0B-1C2D3E4F5A6B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=..\dist\installer
OutputBaseFilename=PhotoTool_Setup_{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
; 若已安装简体中文语言文件，可取消下行注释以使用中文安装向导：
; [Languages]
; Name: "zh"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Files]
Source: "{#BundleDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.map"

[Icons]
Name: "{group}\启动 {#MyAppName}"; Filename: "{app}\启动照片处理.bat"; WorkingDir: "{app}"
Name: "{group}\使用说明"; Filename: "{app}\使用说明.txt"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\启动照片处理.bat"; WorkingDir: "{app}"

[Run]
Filename: "{app}\使用说明.txt"; Description: "查看使用说明"; Flags: shellexec postinstall skipifsilent unchecked
