import * as path from 'path';
import * as fs from 'fs';
import { LinkMatch } from '../../types';

export class LinkResolver {
  private static LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

  static extractLinks(content: string): LinkMatch[] {
    const links: LinkMatch[] = [];
    let match: RegExpExecArray | null;

    const regex = new RegExp(this.LINK_PATTERN);
    
    while ((match = regex.exec(content)) !== null) {
      links.push({
        raw: match[0],
        target: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return links;
  }

  static resolveLink(linkTarget: string, workspacePath: string): string | null {
    try {
      // Handle different link formats:
      // [[file]] -> file.md in workspace
      // [[folder/file]] -> folder/file.md
      // [[file.md]] -> exact file
      
      let targetPath = linkTarget;
      
      // Add .md extension if not present
      if (!targetPath.endsWith('.md') && !targetPath.endsWith('.markdown')) {
        targetPath += '.md';
      }

      // Resolve relative to workspace
      const fullPath = path.join(workspacePath, targetPath);

      // Check if file exists
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }

      // Try common locations
      const commonPaths = [
        path.join(workspacePath, 'brand', targetPath),
        path.join(workspacePath, 'product', targetPath),
        path.join(workspacePath, 'marketing', targetPath)
      ];

      for (const commonPath of commonPaths) {
        if (fs.existsSync(commonPath)) {
          return commonPath;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to resolve link:', error);
      return null;
    }
  }

  static renderLinksInHTML(html: string, workspacePath: string): string {
    return html.replace(this.LINK_PATTERN, (match, target) => {
      const trimmedTarget = target.trim();
      const resolvedPath = this.resolveLink(trimmedTarget, workspacePath);
      
      if (resolvedPath) {
        const displayName = trimmedTarget.split('/').pop()?.replace('.md', '') || trimmedTarget;
        return `<a href="#" class="internal-link" data-path="${resolvedPath}">${displayName}</a>`;
      }
      
      return `<span class="broken-link" title="Link target not found">[[${trimmedTarget}]]</span>`;
    });
  }
}