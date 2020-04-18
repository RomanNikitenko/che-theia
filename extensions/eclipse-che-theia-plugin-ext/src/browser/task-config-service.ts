/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { WidgetOpenMode } from '@theia/core/lib/browser';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TaskInfo, TaskOutputPresentation } from '@theia/task/lib/common';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';

export class TaskConfigurationsService extends TaskService {

    async attach(terminalId: number, taskId: number): Promise<void> {
        console.log('************************** CHE TASK service *** ATTACH ', terminalId, ' /// ', taskId);
        const runningTasks = await this.getRunningTasks();
        const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        if (!taskInfo) {
            this.messageService.warn('Can not attach to a terminal, task is not running');
            return;
        }

        const terminalWidget = this.terminalService.getByTerminalId(terminalId);
        if (terminalWidget) {
            return this.terminalService.open(terminalWidget, { mode: 'activate' });
        }

        const widget = await this.taskTerminalWidgetManager.open(this.getFactoryOptions(taskInfo), this.getOpenerOptions(taskInfo));
        widget.start(terminalId);
    }

    protected getFactoryOptions(taskInfo: TaskInfo): TerminalWidgetFactoryOptions {
        return {
            created: new Date().toString(),
            id: this.getTerminalWidgetId(taskInfo.terminalId!),
            title: `Task: ${taskInfo.config.label}`,
            destroyTermOnClose: true,
            attributes: {
                'remote': 'false'
            }
        };
    }

    protected getOpenerOptions(taskInfo: TaskInfo): TaskTerminalWidgetOpenerOptions {
        let terminalOpenMode: WidgetOpenMode = 'open';
        if (TaskOutputPresentation.shouldAlwaysRevealTerminal(taskInfo.config)) {
            if (TaskOutputPresentation.shouldSetFocusToTerminal(taskInfo.config)) {
                terminalOpenMode = 'activate';
            } else {
                terminalOpenMode = 'reveal';
            }
        }

        return {
            taskId: taskInfo.taskId,
            widgetOptions: { area: 'bottom' },
            mode: terminalOpenMode,
            taskConfig: taskInfo.config
        };
    }
}
