/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TaskService } from '@theia/task/lib/browser';
import { TaskInfo, TaskOutputPresentation } from '@theia/task/lib/common';
import { WidgetOpenMode } from '@theia/core/lib/browser';

export class TaskServiceImpl extends TaskService {

    async attach(terminalId: number, taskId: number): Promise<void> {
        console.log('************************** CHE TASK service *** ATTACH ', terminalId, ' /// ', taskId);
        // Get the list of all available running tasks.
        const runningTasks: TaskInfo[] = await this.getRunningTasks();
        // Get the corresponding task information based on task id if available.
        const taskInfo: TaskInfo | undefined = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        let widgetOpenMode: WidgetOpenMode = 'open';
        if (taskInfo) {
            const terminalWidget = this.terminalService.getByTerminalId(terminalId);
            if (terminalWidget) {
                return this.terminalService.open(terminalWidget, { mode: 'activate' });
            }
            if (TaskOutputPresentation.shouldAlwaysRevealTerminal(taskInfo.config)) {
                if (TaskOutputPresentation.shouldSetFocusToTerminal(taskInfo.config)) { // assign focus to the terminal if presentation.focus is true
                    widgetOpenMode = 'activate';
                } else { // show the terminal but not assign focus
                    widgetOpenMode = 'reveal';
                }
            }
        }

        const widget = await this.taskTerminalWidgetManager.open({
            created: new Date().toString(),
            id: this.getTerminalWidgetId(terminalId),
            title: taskInfo
                ? `Task: ${taskInfo.config.label}`
                : `Task: #${taskId}`,
            destroyTermOnClose: true,
            attributes: {
                'remote': 'false'
            }
        }, {
                taskId,
                widgetOptions: { area: 'bottom' },
                mode: widgetOpenMode,
                taskConfig: taskInfo ? taskInfo.config : undefined
            });
        widget.start(terminalId);
    }
}
