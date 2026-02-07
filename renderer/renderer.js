import { CodeMirrorEditor } from './lib/codemirror-setup.js';

class BKitApp {
  constructor() {
    this.currentWorkspace = null;
    this.currentFile = null;
    this.currentTheme = 'light';
    this.viewMode = 'read';
    this.editor = null;
    this.splitEditor = null;
    this.fileTree = null;
    this.backlinksPanel = null;
    this.searchPanel = null;
    this.headings = [];
    this.saveTimer = null;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.initializeElements();
    this.configureMarked();
    this.attachEventListeners();
    this.initializeTheme();
    this.initializeComponents();
  }

  initializeElements() {
    this.elements = {
      // Header
      workspaceName: document.getElementById('workspaceName'),
      newWorkspaceBtn: document.getElementById('newWorkspaceBtn'),
      openWorkspaceBtn: document.getElementById('openWorkspaceBtn'),
      openFileBtn: document.getElementById('openFileBtn'),
      searchBtn: document.getElementById('searchBtn'),
      exportBtn: document.getElementById('exportBtn'),
      themeToggle: document.getElementById('themeToggle'),
      
      // Sidebar
      fileTree: document.getElementById('fileTree'),
      backlinksContainer: document.getElementById('backlinksContainer'),
      sidebarTabs: document.querySelectorAll('.sidebar-tab'),
      filesPanel: document.getElementById('filesPanel'),
      backlinksPanel: document.getElementById('backlinksPanel'),
      
      // Search
      searchOverlay: document.getElementById('searchOverlay'),
      
      // Content
      welcomeScreen: document.getElementById('welcomeScreen'),
      documentContainer: document.getElementById('documentContainer'),
      documentTitle: document.getElementById('documentTitle'),
      documentPath: document.getElementById('documentPath'),
      
      // Views
      viewModeBtns: document.querySelectorAll('.view-mode-btn'),
      readView: document.getElementById('readView'),
      editView: document.getElementById('editView'),
      splitView: document.getElementById('splitView'),
      renderedMarkdown: document.getElementById('renderedMarkdown'),
      editorContainer: document.getElementById('editorContainer'),
      splitEditorContainer: document.getElementById('splitEditorContainer'),
      splitPreview: document.getElementById('splitPreview'),
      
      // Welcome
      welcomeNewBtn: document.getElementById('welcomeNewBtn'),
      welcomeOpenBtn: document.getElementById('welcomeOpenBtn'),
      welcomeFileBtn: document.getElementById('welcomeFileBtn')
    };
  }

  initializeComponents() {
    // File tree
    this.fileTree = new FileTree(
      this.elements.fileTree,
      (filePath) => this.openFile(filePath)
    );

    // Backlinks
    this.backlinksPanel = new BacklinksPanel(
      this.elements.backlinksContainer,
      (filePath) => this.openFile(filePath)
    );

    // Search
    this.searchPanel = new SearchPanel(
      this.elements.searchOverlay,
      (filePath) => {
        this.hideSearch();
        this.openFile(filePath);
      }
    );
    this.searchPanel.initialize();
  }

  configureMarked() {
    const self = this;
    
    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
      smartLists: true,
      smartypants: false
    });

    const renderer = new marked.Renderer();

    const originalHeading = renderer.heading;
    renderer.heading = function(text, level, raw) {
      const id = self.generateHeadingId(raw);
      self.headings.push({ text: raw, depth: level, id });
      return `<h${level} id="${id}">${text}</h${level}>\n`;
    };

    const originalCode = renderer.code;
    renderer.code = function(code, language) {
      const lang = language || '';
      let highlighted;
      
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          highlighted = hljs.highlightAuto(code).value;
        }
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }

      const escapedCode = self.escapeAttribute(code);
      return `
        <div class="code-block-wrapper">
          <button class="code-copy-btn" data-code="${escapedCode}">Copy</button>
          <pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>
        </div>
      `;
    };

    marked.setOptions({ renderer });
  }

  generateHeadingId(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  escapeAttribute(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  attachEventListeners() {
    // Workspace actions
    this.elements.newWorkspaceBtn.addEventListener('click', () => this.createWorkspace());
    this.elements.openWorkspaceBtn.addEventListener('click', () => this.openWorkspace());
    this.elements.openFileBtn.addEventListener('click', () => this.openSingleFile());
    this.elements.welcomeNewBtn.addEventListener('click', () => this.createWorkspace());
    this.elements.welcomeOpenBtn.addEventListener('click', () => this.openWorkspace());
    this.elements.welcomeFileBtn.addEventListener('click', () => this.openSingleFile());

    // Search & Export
    this.elements.searchBtn.addEventListener('click', () => this.toggleSearch());
    this.elements.exportBtn.addEventListener('click', () => this.exportContext());
    
    // Theme
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Sidebar tabs
    this.elements.sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.switchSidebarTab(tabName);
      });
    });

    // View modes
    this.elements.viewModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.switchViewMode(mode);
      });
    });

    // Workspace events
    if (window.bkitAPI) {
      window.bkitAPI.workspace.onFileChanged((filePath) => {
        if (this.currentFile && this.currentFile.path === filePath) {
          this.reloadCurrentFile();
        }
      });

      window.bkitAPI.workspace.onTreeChanged(() => {
        this.refreshFileTree();
      });
    }
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('bkit-theme') || 'light';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update highlight.js theme
    const lightTheme = document.getElementById('hljs-light');
    const darkTheme = document.getElementById('hljs-dark');
    
    if (theme === 'dark') {
      lightTheme.disabled = true;
      darkTheme.disabled = false;
    } else {
      lightTheme.disabled = false;
      darkTheme.disabled = true;
    }
    
    localStorage.setItem('bkit-theme', theme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    
    // Update editors if they exist
    if (this.editor || this.splitEditor) {
      this.reinitializeEditors();
    }
  }

  async createWorkspace() {
    const name = prompt('Enter workspace name:');
    if (!name) return;

    if (window.bkitAPI) {
      const workspace = await window.bkitAPI.workspace.create(name);
      if (workspace) {
        this.handleWorkspaceOpened(workspace);
      }
    }
  }

  async openWorkspace() {
    if (window.bkitAPI) {
      const workspace = await window.bkitAPI.workspace.open();
      if (workspace) {
        this.handleWorkspaceOpened(workspace);
      }
    }
  }

  async openSingleFile() {
    if (window.bkitAPI) {
      const file = await window.bkitAPI.file.openSingle();
      if (file) {
        this.currentWorkspace = null;
        this.currentFile = file;
        this.displayFile(file);
        this.elements.exportBtn.disabled = true;
      }
    }
  }

  handleWorkspaceOpened(workspace) {
    this.currentWorkspace = workspace;
    this.elements.workspaceName.textContent = workspace.config.name;
    this.fileTree.render(workspace.tree);
    this.elements.welcomeScreen.style.display = 'none';
    this.elements.exportBtn.disabled = false;
  }

  async refreshFileTree() {
    if (window.bkitAPI && this.currentWorkspace) {
      const tree = await window.bkitAPI.workspace.getTree();
      if (tree) {
        this.fileTree.render(tree);
      }
    }
  }

  async openFile(filePath) {
    if (window.bkitAPI) {
      const file = await window.bkitAPI.file.read(filePath);
      if (file) {
        this.currentFile = file;
        this.displayFile(file);
        
        // Update backlinks
        if (this.currentWorkspace) {
          this.backlinksPanel.render(filePath);
        }
        
        // Update file tree active state
        this.fileTree.setActive(filePath);
      }
    }
  }

  displayFile(file) {
    this.elements.welcomeScreen.style.display = 'none';
    this.elements.documentContainer.style.display = 'flex';
    
    this.elements.documentTitle.textContent = file.name;
    this.elements.documentPath.textContent = file.relativePath || file.path;
    
    // Reset headings
    this.headings = [];
    
    // Render content based on current view mode
    this.renderContent(file.content);
  }

  renderContent(content) {
    switch (this.viewMode) {
      case 'read':
        this.renderMarkdown(content);
        break;
      case 'edit':
        this.renderEditor(content);
        break;
      case 'split':
        this.renderSplit(content);
        break;
    }
  }

  renderMarkdown(content) {
    this.headings = [];
    let html = marked.parse(content);
    
    // Process internal links if we have a workspace
    if (this.currentWorkspace && window.bkitAPI) {
      html = this.processInternalLinks(html);
    }
    
    // Sanitize HTML
    const clean = DOMPurify.sanitize(html);
    this.elements.renderedMarkdown.innerHTML = clean;
    
    // Attach internal link handlers
    this.attachInternalLinkHandlers(this.elements.renderedMarkdown);
    
    // Attach code copy handlers
    this.attachCodeCopyHandlers(this.elements.renderedMarkdown);
    
    // Highlight code blocks
    this.elements.renderedMarkdown.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }

  processInternalLinks(html) {
    // This will be handled by LinkResolver on the backend
    // For now, we'll just return the HTML as-is
    return html;
  }

  attachInternalLinkHandlers(container) {
    container.querySelectorAll('.internal-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const path = link.getAttribute('data-path');
        if (path) {
          await this.openFile(path);
        }
      });
    });
  }

  attachCodeCopyHandlers(container) {
    container.querySelectorAll('.code-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        if (code) {
          const decoded = this.decodeAttribute(code);
          navigator.clipboard.writeText(decoded).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => {
              btn.textContent = 'Copy';
            }, 2000);
          });
        }
      });
    });
  }

  decodeAttribute(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  renderEditor(content) {
    if (!this.editor) {
      this.editor = new CodeMirrorEditor(
        this.elements.editorContainer,
        { theme: this.currentTheme }
      );
      this.editor.initialize(content, this.currentTheme);
      this.editor.onChange((newContent) => this.handleContentChange(newContent));
    } else {
      this.editor.setContent(content);
    }
  }

  renderSplit(content) {
    if (!this.splitEditor) {
      this.splitEditor = new CodeMirrorEditor(
        this.elements.splitEditorContainer,
        { theme: this.currentTheme }
      );
      this.splitEditor.initialize(content, this.currentTheme);
      this.splitEditor.onChange((newContent) => {
        this.handleContentChange(newContent);
        this.updateSplitPreview(newContent);
      });
    } else {
      this.splitEditor.setContent(content);
    }
    
    this.updateSplitPreview(content);
  }

  updateSplitPreview(content) {
    this.headings = [];
    let html = marked.parse(content);
    
    if (this.currentWorkspace && window.bkitAPI) {
      html = this.processInternalLinks(html);
    }
    
    const clean = DOMPurify.sanitize(html);
    this.elements.splitPreview.innerHTML = clean;
    
    this.attachInternalLinkHandlers(this.elements.splitPreview);
    this.attachCodeCopyHandlers(this.elements.splitPreview);
    
    this.elements.splitPreview.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }

  handleContentChange(content) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveFile(content);
    }, 1000);
  }

  async saveFile(content) {
    if (this.currentFile && window.bkitAPI) {
      const success = await window.bkitAPI.file.write(this.currentFile.path, content);
      if (success) {
        console.log('File saved');
      }
    }
  }

  async reloadCurrentFile() {
    if (this.currentFile && window.bkitAPI) {
      const file = await window.bkitAPI.file.read(this.currentFile.path);
      if (file) {
        this.currentFile = file;
        
        // Only update if we're in read mode to avoid overwriting edits
        if (this.viewMode === 'read') {
          this.renderContent(file.content);
        }
      }
    }
  }

  switchViewMode(mode) {
    this.viewMode = mode;
    
    // Update button states
    this.elements.viewModeBtns.forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Hide all views
    this.elements.readView.style.display = 'none';
    this.elements.editView.style.display = 'none';
    this.elements.splitView.style.display = 'none';
    
    // Show selected view
    if (this.currentFile) {
      switch (mode) {
        case 'read':
          this.elements.readView.style.display = 'block';
          this.renderMarkdown(this.currentFile.content);
          break;
        case 'edit':
          this.elements.editView.style.display = 'flex';
          this.renderEditor(this.currentFile.content);
          break;
        case 'split':
          this.elements.splitView.style.display = 'flex';
          this.renderSplit(this.currentFile.content);
          break;
      }
    }
  }

  reinitializeEditors() {
    const content = this.currentFile?.content || '';
    
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
      if (this.viewMode === 'edit') {
        this.renderEditor(content);
      }
    }
    
    if (this.splitEditor) {
      this.splitEditor.destroy();
      this.splitEditor = null;
      if (this.viewMode === 'split') {
        this.renderSplit(content);
      }
    }
  }

  switchSidebarTab(tabName) {
    // Update tab states
    this.elements.sidebarTabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Show/hide panels
    if (tabName === 'files') {
      this.elements.filesPanel.style.display = 'block';
      this.elements.backlinksPanel.style.display = 'none';
    } else if (tabName === 'backlinks') {
      this.elements.filesPanel.style.display = 'none';
      this.elements.backlinksPanel.style.display = 'block';
    }
  }

  toggleSearch() {
    if (this.elements.searchOverlay.style.display === 'none') {
      this.showSearch();
    } else {
      this.hideSearch();
    }
  }

  showSearch() {
    this.elements.searchOverlay.style.display = 'block';
    this.searchPanel.show();
    
    // Focus search input
    setTimeout(() => {
      const input = this.elements.searchOverlay.querySelector('.search-input');
      if (input) input.focus();
    }, 100);
  }

  hideSearch() {
    this.elements.searchOverlay.style.display = 'none';
    this.searchPanel.hide();
  }

  async exportContext() {
    if (window.bkitAPI) {
      const result = await window.bkitAPI.export.context();
      if (result.success) {
        alert(`Context exported successfully to:\n${result.path}`);
      } else {
        alert('Failed to export context');
      }
    }
  }
}

// Initialize app
new BKitApp();