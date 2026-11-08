import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CategoryFormDialogComponent } from '../components/category-form-dialog.component';
import { type Category, describeMovedPurchases } from '../data-access/category.models';
import { CategoryService } from '../data-access/category.service';

@Component({
    selector: 'app-categories-page',
    imports: [
        FormsModule,
        Button,
        ToggleSwitch,
        TableModule,
        Tag,
        Tooltip,
        PageHeaderComponent,
        CategoryFormDialogComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './categories-page.component.html',
})
export class CategoriesPageComponent implements OnInit {
    private readonly categoryService = inject(CategoryService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly categories = signal<Category[]>([]);
    protected readonly loading = signal(true);
    /** Desativadas ficam escondidas; com isto ligado, aparecem para poder reativar. */
    protected readonly showInactive = signal(false);
    protected readonly dialogVisible = signal(false);
    protected readonly editing = signal<Category | null>(null);

    public ngOnInit(): void {
        this.load();
    }

    protected load(): void {
        this.loading.set(true);

        this.categoryService.findAll(this.showInactive()).subscribe({
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

    protected toggleInactive(show: boolean): void {
        this.showInactive.set(show);
        this.load();
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
                `Desativar "${category.name}"? Ela não poderá ser escolhida em novas compras do cartão; ` +
                'as compras já lançadas continuam com ela. Dá para reativar depois em "Mostrar inativas".',
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

    /** Exclui de vez; as compras do cartão dela vão para a categoria padrão. */
    protected async remove(category: Category): Promise<void> {
        const confirmed = await this.confirm.danger({
            header: 'Excluir categoria',
            message:
                `Excluir "${category.name}"? As compras do cartão que usam essa categoria passam para ` +
                'a categoria padrão ("Outros"). Essa ação não pode ser desfeita; para só tirar das escolhas, desative.',
            acceptLabel: 'Excluir',
        });

        if (!confirmed) {
            return;
        }

        this.categoryService.delete(category.id).subscribe({
            next: (result) => {
                this.notifications.success(`Categoria "${category.name}" excluída. ${describeMovedPurchases(result)}`);
                this.load();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }

    protected reactivate(category: Category): void {
        this.categoryService.update(category.id, { active: true }).subscribe({
            next: () => {
                this.notifications.success(`Categoria "${category.name}" reativada.`);
                this.load();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}
