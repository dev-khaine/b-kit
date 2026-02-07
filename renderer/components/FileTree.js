class FileTree {
  constructor(container, onFileSelect) {
    this.container = container;
    this.onFileSelect = onFileSelect;
    this.currentPath = null;
  }

  render(treeData) {
    if (!treeData) {
      this.container.innerHTML = '<p class="empty-state">No workspace open</p>';
      return;
    }

    this.container.innerHTML = '';
    this.renderNode(treeData, this.container, 0);
  }

  renderNode(node, parent, depth) {
    if (node.type === 'directory') {
      const folderEl = document.createElement('div');
      folderEl.className = 'tree-folder';
      folderEl.style.paddingLeft = `${depth * 12}px`;

      const header = document.createElement('div');
      header.className = 'tree-folder-header';
      header.innerHTML = `
        <svg class="tree-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H6.5C6.89782 2 7.27936 2.15804 7.56066 2.43934L8.5 3.37868C8.78130 3.65998 9.16284 3.81802 9.56066 3.81802H12.5C13.3284 3.81802 14 4.48959 14 5.31802V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5Z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span class="tree-label">${node.name}</span>
      `;

      const children = document.createElement('div');
      children.className = 'tree-folder-children';

      header.addEventListener('click', () => {
        folderEl.classList.toggle('collapsed');
      });

      folderEl.appendChild(header);
      folderEl.appendChild(children);
      parent.appendChild(folderEl);

      if (node.children) {
        node.children.forEach(child => {
          this.renderNode(child, children, depth + 1);
        });
      }
    } else {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file';
      if (node.path === this.currentPath) {
        fileEl.classList.add('active');
      }
      fileEl.style.paddingLeft = `${depth * 12 + 20}px`;
      fileEl.innerHTML = `
        <svg class="tree-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M9 1H3.5C2.67157 1 2 1.67157 2 2.5V13.5C2 14.3284 2.67157 15 3.5 15H12.5C13.3284 15 14 14.3284 14 13.5V5M9 1L14 5M9 1V4.5C9 4.77614 9.22386 5 9.5 5H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="tree-label">${node.name}</span>
      `;

      fileEl.addEventListener('click', () => {
        this.setActive(node.path);
        this.onFileSelect(node.path);
      });

      parent.appendChild(fileEl);
    }
  }

  setActive(filePath) {
    this.currentPath = filePath;
    this.container.querySelectorAll('.tree-file').forEach(el => {
      el.classList.remove('active');
    });
    const activeFile = Array.from(this.container.querySelectorAll('.tree-file'))
      .find(el => el.querySelector('.tree-label')?.textContent === filePath.split('/').pop());
    if (activeFile) {
      activeFile.classList.add('active');
    }
  }
}