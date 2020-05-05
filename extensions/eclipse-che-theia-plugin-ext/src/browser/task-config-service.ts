/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { WidgetOpenMode, WidgetOpenerOptions } from '@theia/core/lib/browser';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TaskInfo, TaskOutputPresentation, TaskConfiguration, RunTaskOption } from '@theia/task/lib/common';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';

export class TaskConfigurationsService extends TaskService {

    protected async runResolvedTask(resolvedTask: TaskConfiguration, option?: RunTaskOption): Promise<TaskInfo | undefined> {
        const source = resolvedTask._source;
        const taskLabel = resolvedTask.label;
        try {

            const startResolve = new Date().valueOf();
            console.info('!!!!!  CHE TASK service !!! run 9 ', startResolve);
            ////////
            const factoryOptions = {
                id: undefined,
                title: `Task: ${resolvedTask.label}`,
                created: new Date().toString(),
                kind: 'task',
                destroyTermOnClose: true,
                attributes: {
                    'remote': this.isRemoteTask(resolvedTask) ? 'true' : 'false',
                    'closeWidgetExitOrError': 'false'
                }
            };

            const openOpt: WidgetOpenerOptions = {
                widgetOptions: { area: 'bottom' },
                mode: 'activate'
            };

            const startTerminal = new Date().valueOf();
            console.info('!!!!!  CHE TASK service !!! run 9-1 ', startTerminal);

            const newTerminalPromise = this.terminalService.newTerminal({ ...factoryOptions, kind: 'task' });

            const runningTaskPromise = Promise.all([newTerminalPromise, this.runTaskOnServer(resolvedTask, option)]);
            const widget = await newTerminalPromise;

            const finishTerminal = new Date().valueOf();
            console.info('!!!!!  CHE TASK service !!! after terminal 9-1 ', finishTerminal);
            console.error('!!!!!  CHE TASK service !!! creating terminal 9-1 ', (finishTerminal - startTerminal) / 1000);

            this.terminalService.open(widget, openOpt);

            const responses = await runningTaskPromise;
            const taskInfo = responses[1];

            console.info('!!!!!  CHE TASK service !!! after run taskInfo', JSON.stringify(taskInfo));
            widget.start(taskInfo.terminalId);
            ///////
            const finishResolve = new Date().valueOf();
            console.info('!!!!!  CHE TASK service !!! after run 10 ', finishResolve);
            console.error('!!!!!  CHE TASK service !!! run 9-10 ', (finishResolve - startResolve) / 1000);

            this.lastTask = { source, taskLabel, scope: resolvedTask._scope };
            this.logger.debug(`Task created. Task id: ${taskInfo.taskId}`);

            /**
             * open terminal widget if the task is based on a terminal process (type: 'shell' or 'process')
             *
             * @todo Use a different mechanism to determine if the task should be attached?
             *       Reason: Maybe a new task type wants to also be displayed in a terminal.
             */
            // if (typeof taskInfo.terminalId === 'number') {
            //     this.attach(taskInfo.terminalId, taskInfo.taskId);
            // }
            return taskInfo;
        } catch (error) {
            const errorStr = `Error launching task '${taskLabel}': ${error.message}`;
            this.logger.error(errorStr);
            this.messageService.error(errorStr);
        }
    }

    async runTaskOnServer(resolvedTask: TaskConfiguration, option?: RunTaskOption): Promise<TaskInfo> {
        console.error('!!!!!  CHE TASK service !!! run task on server 9-2 ', new Date().valueOf());
        return this.taskServer.run(resolvedTask, this.getContext(), option);
    }

    async attach(terminalId: number, taskId: number): Promise<void> {
        console.error('!!!!!  CHE TASK service !!! run 11 ', new Date().valueOf());
        const runningTasks = await this.getRunningTasks();
        console.error('!!!!!  CHE TASK service !!! run 12 ', new Date().valueOf());
        const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        if (taskInfo) {
            const terminalWidget = this.terminalService.getByTerminalId(terminalId);
            if (terminalWidget) { // Task is already running in terminal
                return this.terminalService.open(terminalWidget, { mode: 'activate' });
            }
        }

        const widget = await this.taskTerminalWidgetManager.open(
            this.getFactoryOptions(taskId, terminalId, taskInfo),
            this.getOpenerOptions(taskId, taskInfo));

        widget.start(terminalId);
    }

    protected getFactoryOptions(taskId: number, terminalId: number, taskInfo?: TaskInfo): TerminalWidgetFactoryOptions {
        return {
            id: this.getTerminalWidgetId(terminalId),
            title: taskInfo
                ? `Task: ${taskInfo.config.label}`
                : `Task: #${taskId}`,
            created: new Date().toString(),
            destroyTermOnClose: true,
            attributes: {
                'remote': taskInfo && this.isRemoteTask(taskInfo.config) ? 'true' : 'false'
            }
        };
    }

    protected getOpenerOptions(taskId: number, taskInfo?: TaskInfo): TaskTerminalWidgetOpenerOptions {
        return {
            taskId,
            widgetOptions: { area: 'bottom' },
            mode: this.getWidgetOpenMode(taskInfo),
            taskInfo
        };
    }

    protected getWidgetOpenMode(taskInfo?: TaskInfo): WidgetOpenMode {
        if (!taskInfo || !TaskOutputPresentation.shouldAlwaysRevealTerminal(taskInfo.config)) {
            return 'open';
        }

        if (TaskOutputPresentation.shouldSetFocusToTerminal(taskInfo.config)) {
            return 'activate';
        }
        return 'reveal';
    }

    protected isRemoteTask(task: TaskConfiguration): boolean {
        return task.target && task.target.containerName;
    }
}
