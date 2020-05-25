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
import { QuickPickItem, WidgetOpenMode } from '@theia/core/lib/browser';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { RunTaskOption, TaskConfiguration, TaskInfo, TaskOutputPresentation } from '@theia/task/lib/common';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { inject, injectable, postConstruct } from 'inversify';
import { RemoteTaskServer } from '../common/che-protocol';
import { CheTaskResolver } from './che-task-resolver';
import { CHE_TASK_TYPE, REMOTE_TASK_KIND, TASK_KIND } from './che-task-terminal-widget-manager';
import { ContainerPicker } from './container-picker';

@injectable()
export class TaskConfigurationsService extends TaskService {

    protected readonly onDidStartTaskFailureEmitter = new Emitter<TaskInfo>();
    readonly onDidStartTaskFailure: Event<TaskInfo> = this.onDidStartTaskFailureEmitter.event;

    @inject(CheTaskResolver)
    protected readonly cheTaskResolver: CheTaskResolver;

    @inject(RemoteTaskServer)
    protected readonly remoteTaskServer: RemoteTaskServer;

    @inject(ContainerPicker)
    protected readonly containerPicker: ContainerPicker;

    @postConstruct()
    protected async init(): Promise<void> {
        super.init();
        this.detectAndRegisterRemoteTypes();
        this.taskDefinitionRegistry.onDidRegisterTaskDefinition(async () => {
            const definitions = this.taskDefinitionRegistry.getAll();
            const components = await this.containerPicker.getWorkspaceComponents();
            components.forEach(component => {
                const definition = definitions.find(def => def.taskType === component);
                console.error('!!! component ', component);
                console.error('!!! tastype ', definition);
                if (definition) {
                    console.error('!!! register !!! tastype ', definition);
                    this.remoteTaskServer.registerRemoteTaskType({ taskType: definition.taskType, component });
                }
            });
        });
    }

    async configureRemoteRunner(): Promise<void> {
        console.error('+++++++++++++ ');
        const registeredTaskTypes = await this.getRegisteredTaskTypes();
        registeredTaskTypes.forEach(element => {
            console.error('+++++++++++++ ', element);
        });

        const remoteTaskTypes = await this.remoteTaskServer.getRegisteredRemoteTaskTypes();
        const filteredTaskTypes = registeredTaskTypes.filter(type => !remoteTaskTypes.find(item => item.taskType === type));

        const taskTypeItems: QuickPickItem<string>[] = filteredTaskTypes.map(element => ({ label: element, value: element }));
        const remoteTaskTypeItems: QuickPickItem<string>[] = remoteTaskTypes.map(element => {
            const type = element.taskType;
            const label = `${type} (type) - ${element.component} (component)`;
            return { label, value: type };
        });
        console.log('///////// ', remoteTaskTypeItems);

        const items: QuickPickItem<string>[] = [
            { type: 'separator', label: 'configured remote types' }, ...remoteTaskTypeItems,
            { type: 'separator', label: 'registered task types' }, ...taskTypeItems];

        const taskType = await this.quickPick.show(items, {
            placeholder: 'Select task type for remote runner'
        });
        console.error('!!!!!!!!!!!!!!!!! ', taskType);

        if (!taskType) {
            console.error('!!!!!!!!!!!!!!!!! NOT provided task type ', taskType);
            return;
        }

        const container = await this.containerPicker.pickComponent();
        if (container) {
            console.error('!!!!!!!!!!!!!!!!! container ', container);
            this.remoteTaskServer.registerRemoteTaskType({ taskType: taskType, component: container });
        }
    }

    protected async runResolvedTask(resolvedTask: TaskConfiguration, option?: RunTaskOption): Promise<TaskInfo | undefined> {
        const source = resolvedTask._source;
        const taskLabel = resolvedTask.label;
        console.error('+++++++ resolved ', resolvedTask);
        const remoteTask = await this.cheTaskResolver.resolveTask(resolvedTask);
        console.error('+++++++ remote ', remoteTask);

        const terminal = await this.taskTerminalWidgetManager.open(this.getFactoryOptions(remoteTask), this.getOpenerOptions(remoteTask));
        if (remoteTask.target && remoteTask.target.containerName) {
            const containerMessage = `Task '${taskLabel}' is running in '${remoteTask.target.containerName}' container`;
            const didOpenListener = terminal.onDidOpen(async () => {
                terminal.writeLine(`\x1b[32m ${containerMessage} \x1b[0m\n`);
            });
            terminal.onDidDispose(() => {
                didOpenListener.dispose();
            });
        }

        try {
            const taskInfo = await this.taskServer.run(remoteTask, this.getContext(), option);
            terminal.start(taskInfo.terminalId);

            this.lastTask = { source, taskLabel, scope: remoteTask._scope };

            this.logger.debug(`Task created. Task id: ${taskInfo.taskId}`);

            return taskInfo;
        } catch (error) {
            this.onDidStartTaskFailureEmitter.fire({ config: remoteTask, kind: terminal.kind, terminalId: terminal.terminalId, taskId: -1, });

            const errorMessage = `Error launching task '${taskLabel}': ${error.message}`;
            terminal.writeLine(`\x1b[31m ${errorMessage} \x1b[0m\n`);

            console.error(errorMessage, error);
            this.messageService.error(errorMessage);

            return undefined;
        }
    }

    async attach(terminalId: number, taskId: number): Promise<void> {
        const runningTasks = await this.getRunningTasks();

        const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        if (taskInfo) {
            const kind = this.isRemoteTask(taskInfo.config) ? REMOTE_TASK_KIND : TASK_KIND;
            const terminalWidget = this.terminalService.all.find(terminal => terminal.kind === kind && terminal.terminalId === terminalId);
            if (terminalWidget) { // Task is already running in terminal
                return this.terminalService.open(terminalWidget, { mode: 'activate' });
            }
        }

        const taskConfig = taskInfo ? taskInfo.config : undefined;
        const widget = await this.taskTerminalWidgetManager.open(
            this.getFactoryOptions(taskConfig),
            this.getOpenerOptions(taskConfig));

        widget.start(terminalId);
    }

    protected getFactoryOptions(config?: TaskConfiguration): TerminalWidgetFactoryOptions {
        const isRemote = config ? this.isRemoteTask(config) : false;

        return {
            kind: isRemote ? REMOTE_TASK_KIND : TASK_KIND,
            title: isRemote && config ? config.label : config ? `Task: ${config.label}` : 'Task',
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

    protected getOpenerOptions(taskConfig?: TaskConfiguration): TaskTerminalWidgetOpenerOptions {
        return {
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
        const target = task.target;
        return target && target.containerName || (target && target.component) || task.type === CHE_TASK_TYPE; // unresolved task doesn't have 'containerName'
    }

    private async detectAndRegisterRemoteTypes(): Promise<void> {
        console.error('!!!!!!!!!!!!!!!!!!!! detectAndRegisterRemoteTypes ');
        const registeredTaskTypes = await this.getRegisteredTaskTypes();
        console.error('!!! RegisterTypes ', registeredTaskTypes);
        const components = await this.containerPicker.getWorkspaceComponents();
        console.error('!!! components ', components);

        components.forEach(component => {
            const taskType = registeredTaskTypes.find(type => type === component);
            console.error('!!! component ', component);
            console.error('!!! tastype ', taskType);
            if (taskType) {
                console.error('!!! register !!! tastype ', taskType);
                this.remoteTaskServer.registerRemoteTaskType({ taskType, component });
            }
        });
    }
}
