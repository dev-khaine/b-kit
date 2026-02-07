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