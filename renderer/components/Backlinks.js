class BacklinksPanel {
  constructor(container, onLinkClick) {
    this.container = container;
    this.onLinkClick = onLinkClick;
  }

  async render(filePath) {
    if (!filePath || !window.bkitAPI) {
      this.container.innerHTML = '<p class="empty-state">No backlinks</p>';
      return;
    }

    const backlinks = await window.bkitAPI.link.getBacklinks(filePath);

    if (backlinks.length === 0) {
      this.container.innerHTML = '<p class="empty-state">No files link to this document</p>';
      return;
    }

    const html = `
      <div class="backlinks-list">
        ${backlinks.map(link => `
          <div class="backlink-item" data-path="${link.sourcePath}">
            <div class="backlink-source">${link.sourceName}</div>
            ${link.context ? `<div class="backlink-context">${this.escapeHtml(link.context)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.container.innerHTML = html;

    this.container.querySelectorAll('.backlink-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.getAttribute('data-path');
        if (path) this.onLinkClick(path);
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  clear() {
    this.container.innerHTML = '';
  }
}