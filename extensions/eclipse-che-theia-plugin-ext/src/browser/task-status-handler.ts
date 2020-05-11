/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { TaskStatusOptions } from '@eclipse-che/plugin';
import { TaskTerminalWidget } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { inject, injectable, postConstruct } from 'inversify';
import { RemoteTaskTerminalWidget } from './che-task-terminal-widget-manager';
import { TaskConfigurationsService } from './task-config-service';

const StatusIcon = {
    SUCCESS: 'fa fa-check',
    ERROR: 'fa fa-times-circle',
    IN_PROGRESS: 'task-status-in-progress',
    UNKNOWN: 'fa-question'
};

enum TaskStatus {
    Success = 'SUCCESS',
    Error = 'ERROR',
    InProgress = 'IN_PROGRESS',
    Unknown = 'UNKNOWN'
}

@injectable()
export class TaskStatusHandler {

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @inject(TaskConfigurationsService)
    protected readonly taskService: TaskConfigurationsService;

    @postConstruct()
    protected init(): void {
        console.error('77777777777777777777777777777777777  INIT ');

        this.terminalService.onDidCreateTerminal(async (terminal: TerminalWidget) => {
            const startTerminal = new Date().valueOf();
            console.error('7777777777777777777  onDidCreateTerminal ', startTerminal);

            if (this.isTaskTerminal(terminal)) {
                console.error('7777  onDidCreateTerminal 777 TaskTerminalWidget.is ' + terminal.id);
                console.error('7777  onDidCreateTerminal 777 ' + new Date().valueOf());

                this.setStatus(TaskStatus.InProgress, terminal);

                this.subscribeOnTaskTerminalEvents(terminal);
            } else {
                console.error('7777  onDidCreateTerminal 777 NOT TaskTerminalWidget.is ' + terminal.id);
            }
        });

        this.taskService.onDidStartTaskFailure(taskInfo => {
            const kind = taskInfo.kind;
            const terminalId = taskInfo.terminalId;

            if (kind && terminalId) {
                const status = TaskStatus.Error;
                const terminalIdentifier = { kind, terminalId };

                this.setTaskStatus({ status, terminalIdentifier });
            }
        });

        this.handleOpenTerminals();
    }

    async setTaskStatus(options: TaskStatusOptions): Promise<void> {
        const terminalIdentifier = options.terminalIdentifier;
        const kind = terminalIdentifier.kind;
        const terminalId = terminalIdentifier.terminalId;

        const terminalWidget = this.terminalService.all.find(terminal => kind === terminal.kind && terminalId === terminal.terminalId);
        this.setStatus(options.status, terminalWidget);
    }

    setStatus(status: TaskStatus, terminal?: TerminalWidget): void {
        if (!terminal) {
            console.log('Failed to set task status: the corresponding terminal is not found');
            return;
        }

        const newStatusIcon = StatusIcon[status];
        const currentIcon = terminal.title.iconClass;
        if (currentIcon !== newStatusIcon) {
            console.error('!!!!!!!!!!!!!!!!!! SET STATUS !!!  UPDATE');
            terminal.title.iconClass = newStatusIcon;
        } else {
            console.error('!!!!!!!!!!!!!!!!!! SET STATUS !!! NOT update');
        }
    }

    private async handleOpenTerminals(): Promise<void> {
        const taskTerminals = this.terminalService.all.filter(terminal => this.isTaskTerminal(terminal));

        console.error('!!!!!!!!!!!!!!!!!! AFTER INIT !!! OPEN TERMINALS ', taskTerminals);
        for (const terminal of taskTerminals) {
            console.error('!!! AFTER INIT !!! terminal ', terminal.title);

            try {
                const processId = await terminal.processId;
                if (processId) {
                    console.error('!!! AFTER INIT !!! terminal PROCESS', processId);

                    this.setStatus(TaskStatus.InProgress, terminal);
                }
            } catch (error) {
                console.log('!!!! AFTER INIT get by process ID ERROR ', terminal.title, error);
                // an error is thrown if a terminal is not started, we are trying to get a process ID for started terminals
            }
        }
    }

    private subscribeOnTaskTerminalEvents(terminal: TerminalWidget): void {
        const didOpenListener = terminal.onDidOpen(async () => {
            console.error('777  onDidCreateTerminal 777 DID open ');
            this.setStatus(TaskStatus.InProgress, terminal);
        });

        const didOpenFailureListener = terminal.onDidOpenFailure(async () => {
            console.error('222222222222 onDidOpenFailure ', terminal.id);
            this.setStatus(TaskStatus.Error, terminal);
        });

        terminal.onDidDispose(() => {
            console.error('3333333333333333333333333 dispose ', terminal.id);
            didOpenListener.dispose();
            didOpenFailureListener.dispose();
        });
    }

    private isTaskTerminal(terminal: TerminalWidget): boolean {
        return TaskTerminalWidget.is(terminal) || RemoteTaskTerminalWidget.is(terminal);
    }
}
