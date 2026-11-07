import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { PhonePipe } from '../../../shared/phone/phone.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { PersonFormDialogComponent } from '../components/person-form-dialog.component';
import type { Person } from '../data-access/person.models';
import { PersonService } from '../data-access/person.service';

@Component({
    selector: 'app-people-page',
    imports: [Button, TableModule, Tooltip, PhonePipe, PageHeaderComponent, PersonFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './people-page.component.html',
})
export class PeoplePageComponent implements OnInit {
    private readonly personService = inject(PersonService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly people = signal<Person[]>([]);
    protected readonly loading = signal(true);
    protected readonly dialogVisible = signal(false);
    protected readonly editing = signal<Person | null>(null);

    public ngOnInit(): void {
        this.load();
    }

    protected load(): void {
        this.loading.set(true);

        this.personService.findAll().subscribe({
            next: (people) => {
                this.people.set(people);
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

    protected openEdit(person: Person): void {
        this.editing.set(person);
        this.dialogVisible.set(true);
    }

    protected async deactivate(person: Person): Promise<void> {
        const confirmed = await this.confirm.danger({
            header: 'Desativar pessoa',
            message:
                `Desativar "${person.name}"? Ela sai da lista e não poderá ser escolhida em novas despesas. ` +
                'As despesas já lançadas continuam ligadas a ela.',
            acceptLabel: 'Desativar',
        });

        if (!confirmed) {
            return;
        }

        this.personService.update(person.id, { active: false }).subscribe({
            next: () => {
                this.notifications.success(`"${person.name}" foi desativada.`);
                this.load();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}
