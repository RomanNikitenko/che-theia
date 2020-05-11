/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { Emitter, Event } from '@theia/core';
import { WidgetOpenMode } from '@theia/core/lib/browser';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { RunTaskOption, TaskConfiguration, TaskInfo, TaskOutputPresentation } from '@theia/task/lib/common';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { inject, injectable, postConstruct } from 'inversify';
import { CheTaskResolver } from './che-task-resolver';
import { CHE_TASK_TYPE, REMOTE_TASK_KIND, TASK_KIND } from './che-task-terminal-widget-manager';

@injectable()
export class TaskConfigurationsService extends TaskService {

    protected readonly onDidStartTaskFailureEmitter = new Emitter<TaskInfo>();
    readonly onDidStartTaskFailure: Event<TaskInfo> = this.onDidStartTaskFailureEmitter.event;

    @inject(CheTaskResolver)
    protected readonly cheTaskResolver: CheTaskResolver;

    @postConstruct()
    protected init(): void {
        super.init();
        console.error('/////////////////// CHE TASK Sertvice /// INIT 111 ');
    }

    protected async runResolvedTask(resolvedTask: TaskConfiguration, option?: RunTaskOption): Promise<TaskInfo | undefined> {
        const source = resolvedTask._source;
        const taskLabel = resolvedTask.label;

        const startResolve = new Date().valueOf();
        console.info('!!!!!  CHE TASK service !!! run 9 ', startResolve);
        ////////
        const startTerminal = new Date().valueOf();
        console.info('!!!!!  CHE TASK service !!! run 9-1 ', startTerminal);

        const terminal = await this.taskTerminalWidgetManager.open(this.getFactoryOptions(resolvedTask), this.getOpenerOptions(resolvedTask));

        const finishTerminal = new Date().valueOf();
        console.info('!!!!!  CHE TASK service !!! after terminal 9-1 ', finishTerminal);
        console.error('!!!!!  CHE TASK service !!! creating terminal 9-1 ', (finishTerminal - startTerminal) / 1000);

        try {
            // const promises = Promise.all([creatingTerminalPromise, runningTaskPromise]);
            const taskInfo = await this.taskServer.run(resolvedTask, this.getContext(), option);

            console.info('!!!!!  CHE TASK service !!! after run taskInfo', JSON.stringify(taskInfo));

            ///////
            const finishResolve = new Date().valueOf();
            console.info('!!!!!  CHE TASK service !!! after run 10 ', finishResolve);
            console.error('!!!!!  CHE TASK service !!! terminal + run 9-10 ', (finishResolve - startResolve) / 1000);

            terminal.start(taskInfo.terminalId);

            this.lastTask = { source, taskLabel, scope: resolvedTask._scope };

            this.logger.debug(`Task created. Task id: ${taskInfo.taskId}`);

            return taskInfo;
        } catch (error) {
            this.onDidStartTaskFailureEmitter.fire({ config: resolvedTask, kind: terminal.kind, terminalId: terminal.terminalId, taskId: -1, });

            const errorMessage = `Error launching task '${taskLabel}': ${error.message}`;
            terminal.writeLine(`\x1b[31m ${errorMessage} \x1b[0m\n`);

            console.error(errorMessage, error);
            this.messageService.error(errorMessage);

            return undefined;
        }
    }

    async attach(terminalId: number, taskId: number): Promise<void> {
        const startGetRunning = new Date().valueOf();
        console.error('************************* CHE TASK service *** ATTACH ', terminalId, ' /// ', taskId);
        // Get the list of all available running tasks.

        console.info('!!!!!  CHE TASK service !!! attach 11 ', startGetRunning);
        const runningTasks = await this.getRunningTasks();

        const finishGetRunning = new Date().valueOf();
        console.info('!!!!!  CHE TASK service !!! attach 12 ', finishGetRunning);
        console.error('!!!!!  CHE TASK service !!! get running 11-12 ', (finishGetRunning - startGetRunning) / 1000);

        const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        if (taskInfo) {
            const terminalWidget = this.terminalService.getByTerminalId(terminalId);
            if (terminalWidget) { // Task is already running in terminal
                console.info('!!!!!  CHE TASK service ATTACH !!! terminalWidget FOUND ', terminalWidget.kind);
                return this.terminalService.open(terminalWidget, { mode: 'activate' });
            }
        }

        console.info('!!!!!  CHE TASK service ATTACH !!! taskInfo ', taskInfo);

        const taskConfig = taskInfo ? taskInfo.config : undefined;
        console.info('!!!!!  CHE TASK service ATTACH !!! taskConfig ', taskConfig);
        const widget = await this.taskTerminalWidgetManager.open(
            this.getFactoryOptions(taskConfig),
            this.getOpenerOptions(taskConfig, taskId));

        widget.start(terminalId);
    }

    protected getFactoryOptions(config?: TaskConfiguration): TerminalWidgetFactoryOptions {
        const isRemote = config ? this.isRemoteTask(config) : false;

        return {
            kind: isRemote ? REMOTE_TASK_KIND : TASK_KIND,
            title: config
                ? `Task: ${config.label}`
                : 'Task',
            created: new Date().toString(),
            destroyTermOnClose: true,
            attributes: {
                'remote': isRemote ? 'true' : 'false',
                'closeWidgetExitOrError': 'false',
                'interruptProcessOnClose': 'true',
                'CHE_MACHINE_NAME': isRemote ? this.getContainerName(config) || '' : ''
            }
        };
    }

    protected getOpenerOptions(taskConfig?: TaskConfiguration, taskId?: number): TaskTerminalWidgetOpenerOptions {
        return {
            taskId,
            widgetOptions: { area: 'bottom' },
            mode: this.getWidgetOpenMode(taskConfig),
            taskConfig
        };
    }

    protected getWidgetOpenMode(config?: TaskConfiguration): WidgetOpenMode {
        if (!config || !TaskOutputPresentation.shouldAlwaysRevealTerminal(config)) {
            return 'open';
        }

        if (TaskOutputPresentation.shouldSetFocusToTerminal(config)) {
            return 'activate';
        }
        return 'reveal';
    }

    protected getContainerName(config?: TaskConfiguration): string | undefined {
        if (config && config.target && config.target.containerName) {
            return config.target.containerName;
        }
        return undefined;
    }

    protected isRemoteTask(task: TaskConfiguration): boolean {
        return task.target && task.target.containerName || task.type === CHE_TASK_TYPE; // it's possible that unresolved task doesn't have 'containerName'
    }
}
