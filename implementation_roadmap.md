# BKit Implementation Roadmap

## Phase 0: Foundation (CRITICAL - Must Do First)

### 1. Project Configuration Files

#### package.json
```json
{
  "name": "bkit",
  "version": "1.0.0",
  "description": "Markdown-native Brand Kit workspace",
  "main": "dist/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -w",
    "dev:renderer": "webpack serve --mode development",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc",
    "build:renderer": "webpack --mode production",
    "start": "electron .",
    "package": "electron-builder"
  },
  "dependencies": {
    "chokidar": "^3.5.3",
    "fuse.js": "^7.0.0"
  },
  "devDependencies": {
    "@codemirror/lang-markdown": "^6.2.4",
    "@codemirror/state": "^6.4.0",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.23.0",
    "codemirror": "^6.0.1",
    "concurrently": "^8.2.2",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "typescript": "^5.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1",
    "@types/node": "^20.10.6"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "renderer"]
}
```

#### webpack.config.js
```javascript
const path = require('path');

module.exports = {
  entry: './renderer/renderer.js',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  target: 'electron-renderer',
  devServer: {
    static: {
      directory: path.join(__dirname, 'renderer')
    },
    port: 8080
  }
};
```

**Status**: ❌ Missing entirely
**Impact**: HIGH - App won't build without these
**Effort**: 2-3 hours

---

## Phase 1: Core Fixes (Week 1)

### 2. Fix Type Imports
**Files**: `src/core/export/ContextExporter.ts`

Add missing import:
```typescript
import { FileIndexEntry } from '../../types';
```

**Status**: ❌ Broken
**Impact**: HIGH - TypeScript won't compile
**Effort**: 15 minutes

### 3. Implement Internal Link Rendering
**Files**: `renderer/renderer.js`, `src/preload.ts`, `src/main.ts`

Add IPC handler for link rendering:
```typescript
// main.ts
ipcMain.handle('link:render-html', (_, html: string) => {
  const workspacePath = this.workspaceManager.getWorkspacePath();
  if (!workspacePath) return html;
  return LinkResolver.renderLinksInHTML(html, workspacePath);
});

// preload.ts
link: {
  renderHTML: (html: string) => ipcRenderer.invoke('link:render-html', html)
}

// renderer.js
async processInternalLinks(html) {
  if (!this.currentWorkspace || !window.bkitAPI) return html;
  return await window.bkitAPI.link.renderHTML(html);
}
```

**Status**: ❌ Stubbed
**Impact**: HIGH - Links don't work
**Effort**: 1-2 hours

### 4. Add Missing CSS for Code Blocks
**Files**: `renderer/styles.css`

```css
.code-block-wrapper {
  position: relative;
  margin: 1em 0;
}

.code-copy-btn {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.code-block-wrapper:hover .code-copy-btn {
  opacity: 1;
}

.code-copy-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}
```

**Status**: ❌ Missing
**Impact**: MEDIUM - Code copy doesn't look good
**Effort**: 30 minutes

---

## Phase 2: Essential File Operations (Week 1-2)

### 5. File CRUD Operations

#### Backend (main.ts)
```typescript
ipcMain.handle('file:create', async (_, folderPath: string, fileName: string) => {
  const filePath = path.join(folderPath, fileName);
  try {
    fs.writeFileSync(filePath, '# ' + fileName.replace('.md', '') + '\n\n', 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:delete', async (_, filePath: string) => {
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:rename', async (_, oldPath: string, newName: string) => {
  const newPath = path.join(path.dirname(oldPath), newName);
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true, path: newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('folder:create', async (_, parentPath: string, folderName: string) => {
  const folderPath = path.join(parentPath, folderName);
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true, path: folderPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### Frontend (renderer.js)
Add context menus and UI for file operations

**Status**: ❌ Missing
**Impact**: HIGH - Can't manage files
**Effort**: 1 day

---

## Phase 3: UX Enhancements (Week 2)

### 6. Keyboard Shortcuts System

Create `renderer/lib/keyboard-shortcuts.js`:
```javascript
export class KeyboardShortcuts {
  constructor(app) {
    this.app = app;
    this.shortcuts = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register('cmd+k,ctrl+k', () => this.app.toggleSearch());
    this.register('cmd+p,ctrl+p', () => this.app.showQuickOpen());
    this.register('cmd+b,ctrl+b', () => this.app.toggleSidebar());
    this.register('cmd+s,ctrl+s', () => this.app.saveFile());
    this.register('cmd+n,ctrl+n', () => this.app.newFile());
    this.register('escape', () => this.app.closeOverlays());
  }
  
  register(keys, callback) {
    // Implementation
  }
  
  listen() {
    document.addEventListener('keydown', (e) => {
      // Handle keyboard events
    });
  }
}
```

**Status**: ❌ Missing
**Impact**: HIGH - Poor UX
**Effort**: 4-6 hours

### 7. Notification System

Create `renderer/components/Notifications.js`:
```javascript
export class NotificationManager {
  show(message, type = 'info') {
    // Toast notifications
  }
  
  showError(message) {
    this.show(message, 'error');
  }
  
  showSuccess(message) {
    this.show(message, 'success');
  }
}
```

**Status**: ❌ Missing
**Impact**: MEDIUM - No feedback
**Effort**: 2-3 hours

### 8. Loading States

Add loading indicators for async operations

**Status**: ❌ Missing
**Impact**: MEDIUM - Feels unresponsive
**Effort**: 2-3 hours

---

## Phase 4: Advanced Features (Week 3-4)

### 9. Link Autocomplete

Add autocomplete when typing `[[`:
- Listen for `[[` in editor
- Show dropdown with file suggestions
- Filter as user types
- Insert selected file path

**Status**: ❌ Missing
**Impact**: MEDIUM - Great UX improvement
**Effort**: 1 day

### 10. Graph View

Create visual graph of document links:
- Use D3.js or vis.js
- Show nodes (files) and edges (links)
- Interactive navigation
- Highlight orphaned pages

**Status**: ❌ Missing
**Impact**: MEDIUM - Nice to have
**Effort**: 2-3 days

### 11. Table of Contents

Auto-generate TOC from headings:
- Parse headings in current document
- Show in sidebar
- Click to scroll to section
- Highlight current section

**Status**: ❌ Missing
**Impact**: MEDIUM - Helpful for navigation
**Effort**: 4-6 hours

### 12. Additional Export Formats

Implement PDF, HTML, and combined MD exports

**Status**: ❌ Missing (only JSON)
**Impact**: MEDIUM - Users need different formats
**Effort**: 2-3 days

---

## Phase 5: Polish & Optimization (Week 5-6)

### 13. Settings Panel

Create settings UI:
- Font size/family
- Auto-save delay
- Theme customization
- Default view mode
- Editor preferences

**Status**: ❌ Missing
**Impact**: LOW - Nice to have
**Effort**: 2-3 days

### 14. Performance Optimizations

- Virtual scrolling for large file trees
- Lazy loading
- Index caching
- Memory cleanup

**Status**: ❌ Missing
**Impact**: MEDIUM - For large workspaces
**Effort**: 3-4 days

### 15. Recent Workspaces

Track and display recent workspaces for quick access

**Status**: ❌ Missing
**Impact**: LOW - Convenience
**Effort**: 4-6 hours

---

## Phase 6: Advanced Features (Future)

### 16. Version History
Basic file history tracking

### 17. Plugin System
Allow extensibility

### 18. Git Integration
Show git status, commit from app

### 19. Collaboration Features
Multi-user support (future)

---

## Recommended Implementation Order

### Week 1 (Foundation)
1. ✅ Create package.json
2. ✅ Create tsconfig.json  
3. ✅ Create webpack.config.js
4. ✅ Fix type imports
5. ✅ Implement internal link rendering
6. ✅ Add code block CSS
7. ✅ Implement file CRUD operations

### Week 2 (Core UX)
8. ✅ Keyboard shortcuts system
9. ✅ Notification system
10. ✅ Loading states
11. ✅ Unsaved changes indicator

### Week 3 (Enhancement)
12. ✅ Link autocomplete
13. ✅ Table of contents
14. ✅ Search improvements (regex, filters)
15. ✅ Quick file picker (Cmd+P)

### Week 4 (Advanced)
16. ✅ Graph view
17. ✅ Additional export formats
18. ✅ Settings panel

### Week 5-6 (Polish)
19. ✅ Performance optimizations
20. ✅ Recent workspaces
21. ✅ Help documentation
22. ✅ Accessibility improvements

---

## Next Steps

**Immediate Action Items:**

1. **Install dependencies** - Create package.json and run `npm install`
2. **Set up build system** - Add webpack config
3. **Fix TypeScript compilation** - Add missing imports
4. **Implement link rendering** - Make `[[links]]` work
5. **Add file operations** - Enable create/delete/rename

After these 5 items are complete, the app will be **minimally functional**.
