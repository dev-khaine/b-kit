class SearchPanel {
  constructor(container, onResultClick) {
    this.container = container;
    this.onResultClick = onResultClick;
    this.debounceTimer = null;
  }

  initialize() {
    this.container.innerHTML = `
      <div class="search-panel">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input type="text" class="search-input" placeholder="Search workspace..." />
        </div>
        <div class="search-results"></div>
      </div>
    `;

    const input = this.container.querySelector('.search-input');
    input.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
  }

  handleSearch(query) {
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      if (query.trim().length < 2) {
        this.renderResults([]);
        return;
      }

      if (!window.bkitAPI) return;

      const results = await window.bkitAPI.search.query(query, 15);
      this.renderResults(results);
    }, 300);
  }

  renderResults(results) {
    const resultsContainer = this.container.querySelector('.search-results');

    if (results.length === 0) {
      resultsContainer.innerHTML = '<p class="empty-state">No results found</p>';
      return;
    }

    const html = results.map(result => `
      <div class="search-result" data-path="${result.path}">
        <div class="search-result-header">
          <span class="search-result-type">${result.type}</span>
          <span class="search-result-name">${result.name}</span>
        </div>
        <div class="search-result-match">${this.highlightMatch(result.match)}</div>
        ${result.context ? `<div class="search-result-context">${this.escapeHtml(result.context)}</div>` : ''}
      </div>
    `).join('');

    resultsContainer.innerHTML = html;

    resultsContainer.querySelectorAll('.search-result').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.getAttribute('data-path');
        if (path) this.onResultClick(path);
      });
    });
  }

  highlightMatch(text) {
    return this.escapeHtml(text);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  show() {
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }
}