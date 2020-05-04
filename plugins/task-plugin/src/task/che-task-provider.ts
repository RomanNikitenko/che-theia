/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import * as che from '@eclipse-che/plugin';
import { ShellExecution, Task } from '@theia/plugin';
import { inject, injectable, postConstruct } from 'inversify';
import { CheWorkspaceClient } from '../che-workspace-client';
import { COMPONENT_ATTRIBUTE, MachinesPicker } from '../machine/machines-picker';
import { getAttribute } from '../utils';
import { CheTaskDefinition, CHE_TASK_TYPE, Target } from './task-protocol';

/** Reads the commands from the current Che workspace and provides it as Task Configurations. */
@injectable()
export class CheTaskProvider {
    @inject(MachinesPicker)
    protected readonly machinePicker!: MachinesPicker;

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    private workspaceId: string | undefined;
    private containers: { [attrName: string]: cheApi.workspace.Machine } | undefined;

    @postConstruct()
    protected init(): void {
        this.getWorkspaceId();
        this.getContainers();
    }

    async provideTasks(): Promise<Task[]> {
        return [];
    }

    async resolveTask(task: Task): Promise<Task> {
        const startResolve = new Date().valueOf();
        console.error('!!!!!!!!!!!!!!!!!!! RESOLVE CHE  ', startResolve);

        const taskDefinition = task.definition;
        const taskType = taskDefinition.type;
        if (taskType !== CHE_TASK_TYPE) {
            throw new Error(`Unsupported task type: ${taskType}`);
        }

        const cheTaskDefinition = taskDefinition as CheTaskDefinition;
        const target = cheTaskDefinition.target;
        const resultTarget: Target = {};

        if (target && target.workspaceId) {
            console.error('!!! WORKSPACE EXIST  ', target.workspaceId);
            resultTarget.workspaceId = target.workspaceId;
        } else {
            const startWorkspace = new Date().valueOf();
            console.error('!!! get WORKSPACE id ', startWorkspace);

            resultTarget.workspaceId = await this.getWorkspaceId();

            const finishWorkspace = new Date().valueOf();
            console.error('!!! AFTER get WORKSPACE id ', finishWorkspace);
            console.error('!!! RESOLVE Workspace ID  ', (finishWorkspace - startWorkspace) / 1000);
        }

        const startContainer = new Date().valueOf();
        console.error('!!! get CONTAINER ', startContainer);

        resultTarget.containerName = await this.getContainerName(target);

        const finishContainer = new Date().valueOf();
        console.error('!!! AFTER get CONTAINER ', finishContainer);
        console.error('!!! RESOLVE CONTAINER ', (finishContainer - startContainer) / 1000);

        if (target && target.workingDir) {
            const startWorkDir = new Date().valueOf();
            console.error('!!! resolve WORKING DIR ', startWorkDir);

            resultTarget.workingDir = await che.variables.resolve(target.workingDir);

            const finishWorkDir = new Date().valueOf();
            console.error('!!! AFTER resolve WORKING DIR ', finishWorkDir);
            console.error('!!! RESOLVE Work DIR ', (finishWorkDir - startWorkDir) / 1000);
        }

        const execution = task.execution as ShellExecution;
        if (execution && execution.commandLine) {
            const startCommand = new Date().valueOf();
            console.error('!!! resolve COMMAND LINE ', startCommand);

            execution.commandLine = await che.variables.resolve(execution.commandLine);

            const finishCommand = new Date().valueOf();
            console.error('!!! AFTER resolve COMMAND LINE ', finishCommand);
            console.error('!!! RESOLVE Command  ', (finishCommand - startCommand) / 1000);
        }

        const finishResolve = new Date().valueOf();
        console.error('!!!!!!!!!!!!!!!!!!! RETURN RESOLVE CHE  ', finishResolve);
        console.error('!!! RESOLVE CHE  ', (finishResolve - startResolve) / 1000);
        return {
            definition: {
                type: taskType,
                target: resultTarget,
                previewUrl: cheTaskDefinition.previewUrl
            },
            name: task.name,
            source: task.source,
            execution: execution
        };
    }

    private async getWorkspaceId(): Promise<string | undefined> {
        if (this.workspaceId) {
            console.error('!!! resolve get workspace id !!! return existed  ', this.workspaceId);
            return this.workspaceId;
        }

        this.workspaceId = await this.cheWorkspaceClient.getWorkspaceId();
        console.error('!!! resolve get workspace id !!! NOT existed  ', this.workspaceId);
        return this.workspaceId;
    }

    private async getContainers(): Promise<{ [attrName: string]: cheApi.workspace.Machine }> {
        if (this.containers) {
            console.error('!!! resolve get containers !!! return existed  ');
            return this.containers;
        }

        this.containers = await this.cheWorkspaceClient.getMachines();
        console.error('!!! resolve get containers !!! NOT existed  ');
        return this.containers;
    }

    private async getContainerName(target?: Target): Promise<string> {
        if (!target) {
            return this.machinePicker.pick();
        }

        const startMachines = new Date().valueOf();
        console.error('!!! get MACHINES  ', startMachines);

        const containers = await this.getContainers();

        const finishMachines = new Date().valueOf();
        console.error('!!! AFTER get MACHINES  ', finishMachines);
        console.error('!!! RESOLVE MACHINES  ', (finishMachines - startMachines) / 1000);

        const containerName = target.containerName;
        if (containerName && containers.hasOwnProperty(containerName)) {
            return containerName;
        }

        return await this.getContainerNameByComponent(target.component, containers) || this.machinePicker.pick();
    }

    private async getContainerNameByComponent(targetComponent: string | undefined, containers: { [attrName: string]: cheApi.workspace.Machine }): Promise<string | undefined> {
        if (!targetComponent) {
            return undefined;
        }

        const names = [];
        for (const containerName in containers) {
            if (!containers.hasOwnProperty(containerName)) {
                continue;
            }

            const container = containers[containerName];
            const component = getAttribute(COMPONENT_ATTRIBUTE, container.attributes);
            if (component && component === targetComponent) {
                names.push(containerName);
            }
        }

        if (names.length === 1) {
            return names[0];
        }

        if (names.length > 1) {
            return this.machinePicker.pick(names);
        }
        return undefined;
    }
}
