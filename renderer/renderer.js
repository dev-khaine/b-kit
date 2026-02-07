// MarkdownRenderer class - handles all markdown rendering and UI interactions
class MarkdownRenderer {
  constructor() {
    this.currentTheme = 'light';
    this.currentFile = null;
    this.headings = [];
    this.activeHeading = null;

    // Wait for DOM and libraries to be ready
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
  }

  initializeElements() {
    this.elements = {
      openFileBtn: document.getElementById('openFileBtn'),
      dropZoneBtn: document.getElementById('dropZoneBtn'),
      themeToggle: document.getElementById('themeToggle'),
      dropZone: document.getElementById('dropZone'),
      markdownContent: document.getElementById('markdownContent'),
      renderedMarkdown: document.getElementById('renderedMarkdown'),
      documentTitle: document.getElementById('documentTitle'),
      documentPath: document.getElementById('documentPath'),
      tableOfContents: document.getElementById('tableOfContents')
    };
  }

  configureMarked() {
    const self = this;
    
    // Configure marked options for v9
    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
      smartLists: true,
      smartypants: false
    });

    // Create custom renderer
    const renderer = new marked.Renderer();

    // Override heading to add IDs and track headings
    const originalHeading = renderer.heading;
    renderer.heading = function(text, level, raw) {
      const id = self.generateHeadingId(raw);
      self.headings.push({ text: raw, depth: level, id });
      return `<h${level} id="${id}">${text}</h${level}>\n`;
    };

    // Override code to add syntax highlighting and copy button
    const originalCode = renderer.code;
    renderer.code = function(code, language, isEscaped) {
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
      .replace(/-+/g, '-')
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
    this.elements.openFileBtn.addEventListener('click', () => this.openFile());
    this.elements.dropZoneBtn.addEventListener('click', () => this.openFile());
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

    this.setupDragAndDrop();
    this.setupScrollSpy();

    // Listen for file changes from main process
    if (window.electronAPI) {
      window.electronAPI.onFileChanged((fileData) => {
        console.log('File changed, reloading...');
        this.renderMarkdown(fileData);
      });
    }
  }

  setupDragAndDrop() {
    const dropZone = this.elements.dropZone;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });

    // Remove highlight when leaving
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });

    // Handle file drop
    dropZone.addEventListener('drop', async (e) => {
      const files = Array.from(e.dataTransfer.files);
      const mdFile = files.find(file =>
        file.name.endsWith('.md') || file.name.endsWith('.markdown')
      );

      if (mdFile && window.electronAPI) {
        const fileData = await window.electronAPI.readDroppedFile(mdFile.path);
        if (fileData) {
          this.renderMarkdown(fileData);
        } else {
          alert('Failed to read file. Please make sure it is a valid Markdown file.');
        }
      } else if (!mdFile) {
        alert('Please drop a Markdown file (.md or .markdown)');
      }
    });
  }

  setupScrollSpy() {
    const contentArea = document.querySelector('.content-area');
    let ticking = false;

    contentArea.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateActiveHeading();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  updateActiveHeading() {
    if (this.headings.length === 0) return;

    const scrollPosition = document.querySelector('.content-area').scrollTop + 100;
    let activeId = null;

    // Find the heading that's currently in view
    for (let i = this.headings.length - 1; i >= 0; i--) {
      const heading = document.getElementById(this.headings[i].id);
      if (heading && heading.offsetTop <= scrollPosition) {
        activeId = this.headings[i].id;
        break;
      }
    }

    // Update active state in TOC
    if (activeId && activeId !== this.activeHeading) {
      this.activeHeading = activeId;
      document.querySelectorAll('.toc-link').forEach(link => {
        link.classList.remove('active');
      });
      const activeLink = document.querySelector(`a[href="#${activeId}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }
  }

  async openFile() {
    if (!window.electronAPI) {
      alert('Electron API not available');
      return;
    }

    const fileData = await window.electronAPI.openFileDialog();
    if (fileData) {
      this.renderMarkdown(fileData);
    }
  }

  renderMarkdown(fileData) {
    try {
      this.currentFile = fileData;
      this.headings = [];

      console.log('Parsing markdown content...');
      
      // Parse markdown to HTML
      let html;
      try {
        html = marked.parse(fileData.content);
      } catch (parseError) {
        console.error('Marked parsing error:', parseError);
        throw new Error('Failed to parse markdown: ' + parseError.message);
      }
      
      console.log('Sanitizing HTML...');
      
      // Sanitize HTML to prevent XSS
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'strong', 'em', 'del', 'code', 'pre',
          'a', 'img',
          'ul', 'ol', 'li',
          'blockquote',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span', 'button', 'input'
        ],
        ALLOWED_ATTR: [
          'id', 'class', 'href', 'src', 'alt', 'title', 
          'data-code', 'type', 'checked', 'disabled'
        ]
      });

      // Render the content
      this.elements.renderedMarkdown.innerHTML = sanitized;
      this.elements.documentTitle.textContent = fileData.name;
      this.elements.documentPath.textContent = fileData.path;

      // Show content, hide drop zone
      this.elements.dropZone.style.display = 'none';
      this.elements.markdownContent.style.display = 'block';

      // Generate table of contents
      this.generateTableOfContents();
      
      // Attach copy button handlers
      this.attachCopyButtons();
      
      // Attach TOC link handlers
      this.attachTocLinks();

      console.log('Markdown rendered successfully');

    } catch (error) {
      console.error('Error rendering markdown:', error);
      console.error('Error stack:', error.stack);
      alert('Failed to render markdown file: ' + error.message + '\n\nPlease report this to https://github.com/markedjs/marked');
    }
  }

  generateTableOfContents() {
    if (this.headings.length === 0) {
      this.elements.tableOfContents.innerHTML = '<p class="toc-empty">No headings found</p>';
      return;
    }

    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';

    this.headings.forEach(heading => {
      const item = document.createElement('li');
      item.className = 'toc-item';

      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = `toc-link level-${heading.depth}`;
      link.textContent = heading.text;

      item.appendChild(link);
      tocList.appendChild(item);
    });

    this.elements.tableOfContents.innerHTML = '';
    this.elements.tableOfContents.appendChild(tocList);
  }

  attachTocLinks() {
    const tocLinks = document.querySelectorAll('.toc-link');
    tocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          const contentArea = document.querySelector('.content-area');
          const offsetTop = targetElement.offsetTop - 80;

          contentArea.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  attachCopyButtons() {
    const copyButtons = document.querySelectorAll('.code-copy-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const encodedCode = btn.getAttribute('data-code');
        
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedCode;
        const code = textarea.value;
        
        try {
          await navigator.clipboard.writeText(code);
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          btn.classList.add('copied');

          setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
          alert('Failed to copy to clipboard');
        }
      });
    });
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Switch highlight.js theme
    const lightTheme = document.getElementById('hljs-light');
    const darkTheme = document.getElementById('hljs-dark');
    
    if (lightTheme && darkTheme) {
      if (theme === 'dark') {
        lightTheme.disabled = true;
        darkTheme.disabled = false;
      } else {
        lightTheme.disabled = false;
        darkTheme.disabled = true;
      }
    }
  }
}

// Initialize the app when ready
new MarkdownRenderer();