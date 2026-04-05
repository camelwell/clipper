# clipper

simple lightweight desktop app for trimming MP4 files

![clipper](img/clipper_long.png)

## shortcuts

| Action | Shortcut |
|--------|----------|
| Play / Pause | `Space` |
| Set trim start | `I` |
| Set trim end | `O` |
| Frame step back/forward | `,` / `.` |
| Seek 5s back/forward | `Left` / `Right` |
| Seek 1s back/forward | `Shift+Left` / `Shift+Right` |
| Jump to start/end | `Home` / `End` |
| Open file | `Ctrl+O` |
| Export | `Ctrl+E` |
| Toggle file panel | `Ctrl+B` |
| Mute | `M` |
| Volume up/down | `Up` / `Down` |
| Reset trim | `Ctrl+Shift+R` |
| Close file | `Ctrl+W` |

## install

Download the latest installer from [Releases](../../releases).

## build from source

Requires [Node.js](https://nodejs.org/) (LTS).

```bash
git clone https://github.com/camelwell/clipper.git
cd clipper
npm install
```

### development

```bash
npm run dev
```

### package

```bash
npm run package
```

The installer will be output to `dist/clipper Setup x.x.x.exe`.
