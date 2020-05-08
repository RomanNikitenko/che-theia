/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { TaskStatusOptions, TerminalWidgetIdentifier } from '@eclipse-che/plugin';
import { Widget, WidgetManager } from '@theia/core/lib/browser';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidget } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { inject, injectable, postConstruct } from 'inversify';
import { RemoteTaskTerminalWidget } from './che-task-terminal-widget-manager';

export enum Status {
    Success = 'SUCCESS',
    Error = 'ERROR',
    InProgress = 'IN_PROGRESS',
    Unknown = 'UNKNOWN'
}

const StatusIcon = {
    SUCCESS: 'fa fa-check',
    ERROR: 'fa fa-times-circle',
    IN_PROGRESS: 'task-status-in-progress',
    UNKNOWN: 'fa-question'
};

@injectable()
export class TaskStatusHandler {

    @inject(WidgetManager)
    private readonly widgetManager: WidgetManager;

    @inject(TaskService)
    protected readonly taskService: TaskService;

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @postConstruct()
    protected init(): void {
        console.error('77777777777777777777777777777777777  INIT ');

        this.terminalService.onDidCreateTerminal(async (terminal: TerminalWidget) => {
            console.error('7777777777777777777  onDidCreateTerminal ', terminal);
            if (this.isTaskTerminal(terminal)) {
                console.error('7777  onDidCreateTerminal 777 TaskTerminalWidget.is ' + terminal.id);
                // terminal.title.iconClass = StatusIcon.IN_PROGRESS;
                // this.subscribeOnTaskTerminalEvents(terminal);
            } else {
                console.error('7777  onDidCreateTerminal 777 NOT TaskTerminalWidget.is ' + terminal.id);
            }
        });

        const terminals = this.terminalService.all;
        for (const terminal of terminals) {
            if (this.isTaskTerminal(terminal)) {
                this.subscribeOnTaskTerminalEvents(terminal);
            }
        }

        this.handleRunningTasks();
    }

    async setTaskStatus(options: TaskStatusOptions): Promise<void> {
        const terminal = await this.getTerminalWidget(options.terminalIdentifier);
        if (terminal) {
            terminal.title.iconClass = StatusIcon[options.status];
        } else {
            console.log('Failed to set task status: the corresponding terminal is not found');
        }
    }

    async setTaskStatusFor(terminal: TerminalWidget, status: Status): Promise<void> {
        terminal.title.iconClass = StatusIcon[status];
    }

    protected async getTerminalWidget(terminalIdentifier: TerminalWidgetIdentifier): Promise<TerminalWidget | undefined> {
        const widgets = this.widgetManager.getWidgets(terminalIdentifier.factoryId);
        
        const widgetId = terminalIdentifier.widgetId;
        if (widgetId) {
            return this.getTerminalByWidgetId(widgetId, widgets);
        }

        const terminalId = terminalIdentifier.terminalId;
        if (typeof terminalId === 'number') {
            return this.getByTerminalId(terminalId, widgets);
        }

        const processId = terminalIdentifier.processId;
        if (typeof processId === 'number') {
            return this.getTerminalByProcessId(processId, widgets);
        }
    }

    private async getTerminalByWidgetId(id: string, widgets: Widget[]): Promise<TerminalWidget | undefined> {
        const terminalWidget = widgets.find(widget => id === widget.id);
        if (terminalWidget instanceof TerminalWidget) {
            return terminalWidget;
        }
    }

    private getByTerminalId(id: number, widgets: Widget[]): TerminalWidget | undefined {
        for (const widget of widgets) {
            if (!(widget instanceof TerminalWidget)) {
                continue;
            }

            if (id === widget.terminalId) {
                return widget;
            }
        }
    }

    private async getTerminalByProcessId(id: number, widgets: Widget[]): Promise<TerminalWidget | undefined> {
        for (const widget of widgets) {
            if (!(widget instanceof TerminalWidget)) {
                continue;
            }

            try {
                const processId = await widget.processId;
                if (id === processId) {
                    return widget;
                }
            } catch (error) {
                // an error is thrown if a terminal is not started, we are trying to get a process ID for started terminals
            }
        }
    }

    private async handleRunningTasks(): Promise<void> {
        const runningTasks = await this.taskService.getRunningTasks();
        console.error('!!!!!!!!!!!!!!!!!! AFTER INIT running tasks ', runningTasks);
        for (const taskInfo of runningTasks) {
            console.error('!!! AFTER INIT for terminalId ', taskInfo.terminalId);
            console.error('!!! AFTER INIT for execId ', taskInfo.execId);

            let terminalWidget: TerminalWidget | undefined;
            const terminalId = taskInfo.terminalId;

            if (terminalId) {
                terminalWidget = this.terminalService.getByTerminalId(terminalId);
            } else if (taskInfo.execId) {
                terminalWidget = await this.getTerminalByProcessId(taskInfo.execId, this.terminalService.all);
            }

            console.error('!!! AFTER INIT !!! widget ', terminalWidget);
            if (terminalWidget && this.isTaskTerminal(terminalWidget)) {
                console.error('!!! AFTER INIT set status ');
                terminalWidget.title.iconClass = StatusIcon.IN_PROGRESS;
            }
        }
    }

    private subscribeOnTaskTerminalEvents(terminal: TerminalWidget): void {
        const didOpenListener = terminal.onDidOpen(async () => {
            console.error('777  onDidCreateTerminal 777 DID open ');
            terminal.title.iconClass = StatusIcon.IN_PROGRESS;
        });

        const didOpenFailureListener = terminal.onDidOpenFailure(async () => {
            console.error('222222222222 onDidOpenFailure ', terminal.id);
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
