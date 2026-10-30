import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

@Component({
  selector: 'app-menu-pagination',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-pagination.html',
  styleUrl: './menu-pagination.css'
})
export class MenuPagination {
  readonly page = input<number>(1);
  readonly pageSize = input<number>(20);
  readonly totalCount = input<number>(0);
  readonly totalPages = input<number>(1);
  readonly loading = input<boolean>(false);

  readonly pageChange = output<number>();

  protected readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const delta = 2;
    const pages: (number | string)[] = [];
    const push = (v: number | string) => {
      if (pages.length === 0 || pages[pages.length - 1] !== v) pages.push(v);
    };

    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);

    if (start > 1) { push(1); if (start > 2) push('...'); }
    for (let i = start; i <= end; i++) push(i);
    if (end < total) { if (end < total - 1) push('...'); push(total); }

    return pages;
  });

  protected goTo(page: number | string): void {
    if (typeof page !== 'number' || page === this.page() || this.loading()) return;
    this.pageChange.emit(page);
  }
}
