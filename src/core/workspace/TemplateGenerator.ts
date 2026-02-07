import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceConfig } from '../../types';
import { WorkspaceConfigManager } from './WorkspaceConfig';

export class TemplateGenerator {
  private static TEMPLATES: Record<string, Record<string, string>> = {
    brand: {
      'vision.md': `# Brand Vision

## Our Vision

_What do we aspire to become?_

[Add your vision statement here]

## Long-term Goals

- Goal 1
- Goal 2
- Goal 3

## Impact

_How will we change the world?_
`,
      'mission.md': `# Brand Mission

## Our Mission

_Why do we exist?_

[Add your mission statement here]

## Core Purpose

[Define your core purpose]

## Values

- **Value 1**: Description
- **Value 2**: Description
- **Value 3**: Description
`,
      'voice.md': `# Brand Voice

## Tone

_How do we sound?_

- **Primary tone**: [e.g., Calm, confident, technical]
- **Secondary tone**: [e.g., Approachable, honest]

## Communication Principles

1. **Principle 1**: Description
2. **Principle 2**: Description
3. **Principle 3**: Description

## Avoid

- Avoid this type of language
- Avoid this approach
- Avoid this tone

## Examples

### Good Example
> Example of on-brand communication

### Bad Example
> Example of off-brand communication
`,
      'audience.md': `# Target Audience

## Primary Audience

**Who are they?**
- Demographics
- Psychographics
- Behaviors

**What do they need?**
- Need 1
- Need 2
- Need 3

## Secondary Audience

**Who are they?**
[Define secondary audience]

## User Personas

### Persona 1: [Name]
- **Background**: 
- **Goals**: 
- **Pain points**: 
- **How we help**: 
`
    },
    product: {
      'overview.md': `# Product Overview

## What We Build

[Describe your product/service]

## Core Value Proposition

_Why should someone choose us?_

[Add value proposition]

## Key Differentiators

1. **Differentiator 1**: Explanation
2. **Differentiator 2**: Explanation
3. **Differentiator 3**: Explanation

## Product Principles

- Principle 1
- Principle 2
- Principle 3
`,
      'features.md': `# Product Features

## Core Features

### Feature 1
**Description**: 
**User benefit**: 
**Status**: [Launched / In Development / Planned]

### Feature 2
**Description**: 
**User benefit**: 
**Status**: 

### Feature 3
**Description**: 
**User benefit**: 
**Status**: 

## Roadmap

### Q1 2024
- Feature A
- Feature B

### Q2 2024
- Feature C
- Feature D
`
    },
    marketing: {
      'messaging.md': `# Marketing Messaging

## Primary Message

_The one thing we want people to remember_

[Add primary message]

## Key Messages

### Message 1: [Theme]
**For**: [Audience segment]
**Message**: [The message]
**Support**: [Supporting points]

### Message 2: [Theme]
**For**: [Audience segment]
**Message**: [The message]
**Support**: [Supporting points]

## Elevator Pitch

_30 seconds or less_

[Add elevator pitch]

## Taglines

- Option 1
- Option 2
- Option 3
`,
      'campaigns.md': `# Marketing Campaigns

## Active Campaigns

### Campaign 1: [Name]
**Goal**: 
**Target**: 
**Timeline**: 
**Status**: 
**Key messages**: 
- [[marketing/messaging]]

### Campaign 2: [Name]
**Goal**: 
**Target**: 
**Timeline**: 
**Status**: 

## Planned Campaigns

### Q2 2024
- Campaign idea 1
- Campaign idea 2

## Campaign Archive

[Link to past campaigns]
`
    }
  };

  static async generateWorkspace(workspacePath: string, workspaceName: string): Promise<boolean> {
    try {
      // Create workspace directory if it doesn't exist
      if (!fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true });
      }

      // Create config
      const config = WorkspaceConfigManager.createDefaultConfig(workspacePath, workspaceName);

      // Create directory structure and files
      for (const [folder, files] of Object.entries(this.TEMPLATES)) {
        const folderPath = path.join(workspacePath, folder);
        fs.mkdirSync(folderPath, { recursive: true });

        for (const [filename, content] of Object.entries(files)) {
          const filePath = path.join(folderPath, filename);
          fs.writeFileSync(filePath, content, 'utf-8');
        }
      }

      // Save config
      WorkspaceConfigManager.save(workspacePath, config);

      return true;
    } catch (error) {
      console.error('Failed to generate workspace:', error);
      return false;
    }
  }
}