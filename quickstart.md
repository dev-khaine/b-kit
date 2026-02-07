# 🚀 Quick Start Guide

## Installation (3 Steps)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the application**
   ```bash
   npm run dev
   ```

3. **Open a Markdown file**
   - Click "Open File" or drag-and-drop `sample.md` into the window

## That's it! 🎉

The application will:
- ✅ Launch in a desktop window
- ✅ Display a clean, professional interface
- ✅ Let you open any `.md` file
- ✅ Render it with full formatting
- ✅ Generate a clickable table of contents
- ✅ Watch the file for changes (auto-reload)
- ✅ Highlight code with syntax coloring
- ✅ Support dark/light themes

## Folder Structure

```
markdown-reader/
├── src/              # TypeScript source files
├── renderer/         # UI (HTML, CSS, JS)
├── dist/            # Compiled output (auto-generated)
├── sample.md        # Try this file first!
└── README.md        # Full documentation
```

## Development vs Production

**Development** (recommended for now):
```bash
npm run dev
```
- Auto-recompiles TypeScript on changes
- Hot reload support

**Production**:
```bash
npm run build
npm start
```

## Need Help?

See `README.md` for:
- Full feature list
- Troubleshooting guide
- Architecture details
- Security information