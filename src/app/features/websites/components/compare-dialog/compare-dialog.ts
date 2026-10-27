import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CompareData, ConfigDifference } from '../editor-toolbar/editor-toolbar';

@Component({
  selector: 'app-compare-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compare-dialog.html',
  styleUrl: './compare-dialog.css'
})
export class CompareDialog {
  readonly data = input.required<CompareData | null>();
  readonly close = output<void>();

  protected readonly hasDifferences = computed(() => {
    const d = this.data();
    return d && d.differences.length > 0;
  });

  protected readonly differenceCount = computed(() => this.data()?.differences.length ?? 0);

  protected readonly groupedDifferences = computed(() => {
    const d = this.data();
    if (!d) return {};

    const groups: Record<string, ConfigDifference[]> = {};
    for (const diff of d.differences) {
      const section = diff.path.split('.')[0] || 'root';
      if (!groups[section]) groups[section] = [];
      groups[section].push(diff);
    }
    return groups;
  });

  protected readonly sections = computed(() => Object.keys(this.groupedDifferences()));

  protected closeDialog(): void {
    this.close.emit();
  }

  protected getDiffIcon(type: ConfigDifference['type']): string {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '−';
      case 'changed': return '≠';
    }
  }

  protected getDiffClass(type: ConfigDifference['type']): string {
    return `diff-${type}`;
  }

  protected formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value.length > 100 ? value.slice(0, 100) + '…' : value;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  protected formatSectionName(section: string): string {
    return section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, ' ');
  }
}