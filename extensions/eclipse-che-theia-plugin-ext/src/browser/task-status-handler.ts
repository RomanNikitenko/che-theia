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
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { inject, injectable, postConstruct } from 'inversify';
import { TaskTerminalWidget } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TaskService } from '@theia/task/lib/browser';

const StatusIcon = {
    SUCCESS: 'fa fa-check task-status-success',
    ERROR: 'fa fa-times-circle task-status-error',
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
        this.terminalService.onDidCreateTerminal(async (terminal: TerminalWidget) => {
            console.log('7777777777777777777  onDidCreateTerminal ' + terminal.id);
            if (!TaskTerminalWidget.is(terminal)) {
                console.log('777  onDidCreateTerminal 777 NOT task RETURN ');
                return;
            }

            const didOpenListener = terminal.onDidOpen(async () => {
                console.log('777  onDidCreateTerminal 777 DID open ');
                const runningTasks = await this.taskService.getRunningTasks();
                const taskInfo = runningTasks.find(info => info.terminalId === terminal.terminalId);
                console.log('+++++++++++++++ ' + terminal.id);
                if (taskInfo) {
                    console.log('777  onDidCreateTerminal 777 DID open 777 found terminal ');
                    terminal.title.iconClass = StatusIcon.IN_PROGRESS;
                } else {
                    console.log('777  onDidCreateTerminal 777 DID open 777 NOT found terminal ');
                }
            });
            const didOpenFailureListener = terminal.onDidOpenFailure(async () => {
                console.log('777  onDidCreateTerminal 777 DID open 777 onDidOpenFailure ', terminal.id);
            });

            terminal.onDidDispose(() => {
                console.log('3333333333333333333333333 dispose ', terminal.id);
                didOpenListener.dispose();
                didOpenFailureListener.dispose();
            });
        });
    }

    async setTaskStatus(options: TaskStatusOptions): Promise<void> {
        const terminal = await this.getTerminalWidget(options.terminalIdentifier);
        if (terminal) {
            terminal.title.iconClass = StatusIcon[options.status];
        } else {
            console.log('Failed to set task status: the corresponding terminal is not found');
        }
    }

    protected async getTerminalWidget(terminalIdentifier: TerminalWidgetIdentifier): Promise<TerminalWidget | undefined> {
        const widgets = this.widgetManager.getWidgets(terminalIdentifier.factoryId);

        const terminalId = terminalIdentifier.terminalId;
        if (typeof terminalId === 'number') {
            return this.getByTerminalId(terminalId, widgets);
        }

        const processId = terminalIdentifier.processId;
        if (typeof processId === 'number') {
            return this.getTerminalByProcessId(processId, widgets);
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

            const processId = await widget.processId;
            if (id === processId) {
                return widget;
            }
        }
    }
}
