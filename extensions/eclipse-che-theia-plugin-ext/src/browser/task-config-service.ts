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
import { TaskInfo, TaskOutputPresentation, TaskConfiguration } from '@theia/task/lib/common';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';

export class TaskConfigurationsService extends TaskService {
    // async run(source: string, taskLabel: string, scope?: string): Promise<TaskInfo | undefined> {
    //     const task: TaskConfiguration = { label: 'build', _scope: '/projects', type: 'che' };
    //     const isRemote = this.isRemoteTask(task);
    //     const factoryOptions = {
    //         title: 'Task: 1111111',
    //         created: new Date().toString(),
    //         destroyTermOnClose: true,
    //         kind: isRemote ? 'remote-task' : 'task',
    //         attributes: {
    //             'remote': this.isRemoteTask(task) ? 'true' : 'false',
    //             'closeWidgetExitOrError': 'false'
    //         }
    //     };
    //     const widget = await this.terminalService.newTerminal(factoryOptions);
    //     console.error('1111111111111111111111111  ');
    //     this.terminalService.open(widget, { mode: 'reveal' });
    //     return super.run(source, taskLabel, scope);
    // }

    // async runTask(task: TaskConfiguration, option?: RunTaskOption): Promise<TaskInfo | undefined> {
    //     const isRemote = this.isRemoteTask(task);
    //     const factoryOptions1 = {
    //         title: 'Task: 22222222',
    //         created: new Date().toString(),
    //         destroyTermOnClose: true,
    //         kind: isRemote ? 'remote-task' : 'task',
    //         attributes: {
    //             'remote': this.isRemoteTask(task) ? 'true' : 'false',
    //             'closeWidgetExitOrError': 'false'
    //         }
    //     };
    //     const widget1 = await this.terminalService.newTerminal(factoryOptions1);
    //     console.error('1111111111111111111111111  ');
    //     this.terminalService.open(widget1, { mode: 'reveal' });

    //     const runningTasksInfo: TaskInfo[] = await this.getRunningTasks();

    //     const matchedRunningTaskInfo = runningTasksInfo.find(taskInfo => {
    //         const taskConfig = taskInfo.config;
    //         return this.taskDefinitionRegistry.compareTasks(taskConfig, task);
    //     });

    //     if (!matchedRunningTaskInfo) {
    //         const factoryOptions = {
    //             title: 'Task: 333333',
    //             created: new Date().toString(),
    //             destroyTermOnClose: true,
    //             kind: isRemote ? 'remote-task' : 'task',
    //             attributes: {
    //                 'remote': this.isRemoteTask(task) ? 'true' : 'false',
    //                 'closeWidgetExitOrError': 'false'
    //             }
    //         };
    //         if (isRemote) {
    //             console.error('777777777777777777777 REMOTE ', JSON.stringify(task));
    //             const widget = await this.terminalService.newTerminal(factoryOptions);
    //             console.error('777 REMOTE 777 widget ', widget);
    //             task.widgetId = widget.id;
    //             console.error('777 REMOTE 777 widget ID ', widget.id);
    //             console.error('777 REMOTE 777 widget ID task', task.widgetId);
    //             this.terminalService.open(widget, { mode: 'reveal' });
    //             return this.doRunTask(task, option);
    //         } else {
    //             console.error('777777777777777777777 NOT REMOTE ', JSON.stringify(task));
    //         }

    //         const mode: WidgetOpenMode = 'open';
    //         const widgetOptions: ApplicationShell.WidgetOptions = { area: 'bottom' };
    //         const openerOptions = {
    //             taskId: 0,
    //             widgetOptions,
    //             mode
    //         };

    //         this.taskTerminalWidgetManager.open(factoryOptions, openerOptions);
    //         return this.doRunTask(task, option);
    //     }

    //     const taskName = this.taskNameResolver.resolve(task);
    //     const terminalId = matchedRunningTaskInfo.terminalId;
    //     if (terminalId) {
    //         console.error('9999999999999999999999 NOT match ', JSON.stringify(task));
    //         const terminal = this.terminalService.getByTerminalId(terminalId);
    //         if (terminal) {
    //             if (TaskOutputPresentation.shouldSetFocusToTerminal(task)) {
    //                 this.terminalService.open(terminal, { mode: 'activate' });
    //             } else if (TaskOutputPresentation.shouldAlwaysRevealTerminal(task)) {
    //                 this.terminalService.open(terminal, { mode: 'reveal' });
    //             }
    //         }
    //     }
    //     const selectedAction = await this.messageService.info(`The task '${taskName}' is already active`, 'Terminate Task', 'Restart Task');
    //     if (selectedAction === 'Terminate Task') {
    //         await this.terminateTask(matchedRunningTaskInfo);
    //     } else if (selectedAction === 'Restart Task') {
    //         return this.restartTask(matchedRunningTaskInfo, option);
    //     }
    // }

    async attach(terminalId: number, taskId: number): Promise<void> {
        console.error('++++++++++++++++++++++ attach ' + terminalId);
        console.error('!!!!!  TASK service !!! run 11 ', new Date().valueOf());
        const runningTasks = await this.getRunningTasks();
        console.error('!!!!!  TASK service !!! run 12 ', new Date().valueOf());

        const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        if (taskInfo) {
            console.error('+++ attach +++ taskInfo found ', JSON.stringify(taskInfo));
            const task = taskInfo.config;
            const isRemote = this.isRemoteTask(task);
            const factoryOptions = {
                title: 'Task: 333333',
                created: new Date().toString(),
                destroyTermOnClose: true,
                kind: isRemote ? 'remote-task' : 'task',
                attributes: {
                    'remote': this.isRemoteTask(task) ? 'true' : 'false',
                    'closeWidgetExitOrError': 'false'
                }
            };

            if (isRemote) {
                console.error('!!!!!  TASK service !!! run 13 ', new Date().valueOf());
                const widget = await this.terminalService.newTerminal(factoryOptions);
                console.error('!!!!!  TASK service !!! run 14 ', new Date().valueOf());
                this.terminalService.open(widget, { mode: 'reveal' });
                console.error('!!!!!  TASK service !!! run 15 ', new Date().valueOf());
                widget.start(terminalId);
                return;
            }

            // const terminalWidget = this.terminalService.getByTerminalId(terminalId);
            // if (terminalWidget) { // Task is already running in terminal
            //     console.error('+++ attach +++ terminalWidget found ', JSON.stringify(taskInfo));

            //     return this.terminalService.open(terminalWidget, { mode: 'activate' });
            // } else {
            //     console.error('+++ attach +++ terminalWidget NOT found by terminal Id ', JSON.stringify(taskInfo.config));
            //     const ttt = this.terminalService.getById(taskInfo.config.widgetId);
            //     if (ttt) {
            //         console.error('+++ attach +++ terminalWidget found by widget Id');
            //         ttt.start(terminalId);
            //         return;
            //     } else {
            //         console.error('+++ attach +++ terminalWidget NOT found by widget Id');
            //         const zzz = this.terminalService.getById(taskInfo.widgetId);
            //         if (zzz) {
            //             console.error('+++ attach +++ terminalWidget found by widget Id from taskInfo');
            //             zzz.start(terminalId);
            //             return;
            //         }
            //     }
            // }
        } else {
            console.error('+++ attach +++ taskInfo NOT found ');
        }

        // const factoryOptions = this.getFactoryOptions(taskId, terminalId, taskInfo);
        // console.error('+++ attach +++ factoryOptions ', factoryOptions);
        // const widget = await this.taskTerminalWidgetManager.open(factoryOptions, this.getOpenerOptions(taskId, taskInfo));

        // widget.start(terminalId);
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
        return task.target && (task.target.containerName || task.target.component);
    }
}
