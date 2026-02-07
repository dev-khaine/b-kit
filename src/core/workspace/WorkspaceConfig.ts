import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceConfig } from '../../types';

export class WorkspaceConfigManager {
  private static CONFIG_FILE = 'workspace.json';

  static createDefaultConfig(workspacePath: string, name: string): WorkspaceConfig {
    return {
      version: '1.0.0',
      name,
      created: new Date().toISOString(),
      structure: {
        brand: ['vision.md', 'mission.md', 'voice.md', 'audience.md'],
        product: ['overview.md', 'features.md'],
        marketing: ['messaging.md', 'campaigns.md']
      }
    };
  }

  static load(workspacePath: string): WorkspaceConfig | null {
    try {
      const configPath = path.join(workspacePath, this.CONFIG_FILE);
      if (!fs.existsSync(configPath)) {
        return null;
      }
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load workspace config:', error);
      return null;
    }
  }

  static save(workspacePath: string, config: WorkspaceConfig): boolean {
    try {
      const configPath = path.join(workspacePath, this.CONFIG_FILE);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save workspace config:', error);
      return false;
    }
  }

  static exists(workspacePath: string): boolean {
    const configPath = path.join(workspacePath, this.CONFIG_FILE);
    return fs.existsSync(configPath);
  }
}