import { inject, Injectable } from '@angular/core';
import { WebsiteService } from '../services/website.service';
import type { WebsiteConfig } from '../models/website-config.model';
import { parseWebsiteConfig } from '../utils/website-config.util';
import { serializeWebsiteConfig } from '../utils/website-config.util';
import type { CompareData, ConfigDifference } from '../components/editor-toolbar/editor-toolbar';

@Injectable({
  providedIn: 'root'
})
export class WebsiteCompareService {
  private readonly websiteService = inject(WebsiteService);

  async compareDraftWithPublished(websiteId: string, currentDraft: WebsiteConfig): Promise<CompareData> {
    const draftJson = serializeWebsiteConfig(currentDraft);

    const draftResponse = await this.websiteService.getDraft(websiteId).toPromise();
    let publishedConfig: WebsiteConfig | null = null;

    if (draftResponse?.success && draftResponse.data?.hasDraft && draftResponse.data.configurationJson) {
      const parsed = parseWebsiteConfig(draftResponse.data.configurationJson);
      if (parsed.config) {
        publishedConfig = parsed.config;
      }
    }

    const differences = this.computeDifferences(currentDraft, publishedConfig);

    return {
      draftConfig: currentDraft,
      publishedConfig,
      differences
    };
  }

  private computeDifferences(draft: WebsiteConfig, published: WebsiteConfig | null): ConfigDifference[] {
    const differences: ConfigDifference[] = [];

    if (!published) {
      differences.push({
        path: 'configuration',
        draftValue: draft,
        publishedValue: null,
        type: 'added'
      });
      return differences;
    }

    this.compareObjects('', draft, published, differences);

    return differences;
  }

  private compareObjects(path: string, draft: unknown, published: unknown, differences: ConfigDifference[]): void {
    if (draft === published) return;

    if (draft === null || draft === undefined) {
      differences.push({
        path: path || 'root',
        draftValue: draft,
        publishedValue: published,
        type: 'removed'
      });
      return;
    }

    if (published === null || published === undefined) {
      differences.push({
        path: path || 'root',
        draftValue: draft,
        publishedValue: published,
        type: 'added'
      });
      return;
    }

    if (typeof draft !== 'object' || typeof published !== 'object') {
      differences.push({
        path: path || 'root',
        draftValue: draft,
        publishedValue: published,
        type: 'changed'
      });
      return;
    }

    if (Array.isArray(draft) || Array.isArray(published)) {
      if (!Array.isArray(draft) || !Array.isArray(published)) {
        differences.push({
          path: path || 'root',
          draftValue: draft,
          publishedValue: published,
          type: 'changed'
        });
        return;
      }

      const maxLen = Math.max(draft.length, published.length);
      for (let i = 0; i < maxLen; i++) {
        const newPath = `${path}[${i}]`;
        if (i >= draft.length) {
          differences.push({
            path: newPath,
            draftValue: undefined,
            publishedValue: published[i],
            type: 'removed'
          });
        } else if (i >= published.length) {
          differences.push({
            path: newPath,
            draftValue: draft[i],
            publishedValue: undefined,
            type: 'added'
          });
        } else {
          this.compareObjects(newPath, draft[i], published[i], differences);
        }
      }
      return;
    }

    const draftObj = draft as Record<string, unknown>;
    const publishedObj = published as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(draftObj), ...Object.keys(publishedObj)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in draftObj)) {
        differences.push({
          path: newPath,
          draftValue: undefined,
          publishedValue: publishedObj[key],
          type: 'removed'
        });
      } else if (!(key in publishedObj)) {
        differences.push({
          path: newPath,
          draftValue: draftObj[key],
          publishedValue: undefined,
          type: 'added'
        });
      } else {
        this.compareObjects(newPath, draftObj[key], publishedObj[key], differences);
      }
    }
  }
}