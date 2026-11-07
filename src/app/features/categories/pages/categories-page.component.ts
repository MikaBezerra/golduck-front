import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CategoryFormDialogComponent } from '../components/category-form-dialog.component';
import type { Category } from '../data-access/category.models';
import { CategoryService } from '../data-access/category.service';

@Component({
    selector: 'app-categories-page',
    imports: [Button, TableModule, Tag, Tooltip, PageHeaderComponent, CategoryFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './categories-page.component.html',
})
export class CategoriesPageComponent implements OnInit {
    private readonly categoryService = inject(CategoryService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly categories = signal<Category[]>([]);
    protected readonly loading = signal(true);
    protected readonly dialogVisible = signal(false);
    protected readonly editing = signal<Category | null>(null);

    public ngOnInit(): void {
        this.load();
    }

    protected load(): void {
        this.loading.set(true);

        this.categoryService.findAll().subscribe({
            next: (categories) => {
                this.categories.set(categories);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.notifications.error(error);
            },
        });
    }

    protected openCreate(): void {
        this.editing.set(null);
        this.dialogVisible.set(true);
    }

    protected openRename(category: Category): void {
        this.editing.set(category);
        this.dialogVisible.set(true);
    }

    protected async deactivate(category: Category): Promise<void> {
        const confirmed = await this.confirm.danger({
            header: 'Desativar categoria',
            message:
                `Desativar "${category.name}"? Ela sai da lista e não poderá ser escolhida em novas despesas. ` +
                'As despesas já lançadas continuam com ela.',
            acceptLabel: 'Desativar',
        });

        if (!confirmed) {
            return;
        }

        this.categoryService.update(category.id, { active: false }).subscribe({
            next: () => {
                this.notifications.success(`Categoria "${category.name}" desativada.`);
                this.load();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}
