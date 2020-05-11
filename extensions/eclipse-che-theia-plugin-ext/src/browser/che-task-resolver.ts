/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { che as cheApi } from '@eclipse-che/api';
import { TaskResolver, TaskResolverRegistry } from '@theia/task/lib/browser';
import { TaskConfiguration } from '@theia/task/lib/common';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { inject, injectable, postConstruct } from 'inversify';
import { CheApiService } from '../common/che-protocol';
import { ContainerPicker } from './container-picker';

const COMPONENT_ATTRIBUTE: string = 'component';

@injectable()
export class CheTaskResolver implements TaskResolver {

    @inject(CheApiService)
    protected readonly cheApi: CheApiService;

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    @inject(ContainerPicker)
    protected readonly containerPicker: ContainerPicker;

    @inject(TaskResolverRegistry)
    protected readonly taskResolverRegistry: TaskResolverRegistry;

    private workspaceId: string | undefined;
    private containers: { name: string, container: cheApi.workspace.Machine }[] = [];

    @postConstruct()
    protected init(): void {
        this.taskResolverRegistry.register('che', this);

        this.getWorkspaceId();
        this.getWorkspaceContainers();
    }

    async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
        const startResolve = new Date().valueOf();
        console.error('!!!!!!!!!!!!!!!!!!! NEW RESOLVE CHE  ', startResolve);
        console.error('!!!! ', taskConfig);

        const taskType = taskConfig.type;
        if (taskType !== 'che') {
            throw new Error(`Unsupported task type: ${taskType}`);
        }

        const target = taskConfig.target;
        const resultTarget: { [key: string]: string | undefined } = {};

        if (target && target.workspaceId) {
            console.error('!!! WORKSPACE EXIST  ', target.workspaceId);
            resultTarget.workspaceId = target.workspaceId;
        } else {
            const startWorkspace = new Date().valueOf();

            resultTarget.workspaceId = await this.getWorkspaceId();

            const finishWorkspace = new Date().valueOf();
            console.error('!!! RESOLVE Workspace ID  ', (finishWorkspace - startWorkspace) / 1000);
        }

        const startContainer = new Date().valueOf();

        resultTarget.containerName = await this.getContainerName(target);

        const finishContainer = new Date().valueOf();
        console.error('!!! RESOLVE CONTAINER ', (finishContainer - startContainer) / 1000);

        if (target && target.workingDir) {
            const startWorkDir = new Date().valueOf();

            resultTarget.workingDir = await this.variableResolverService.resolve(target.workingDir);

            const finishWorkDir = new Date().valueOf();
            console.error('!!! RESOLVE Work DIR ', (finishWorkDir - startWorkDir) / 1000);
        }

        const command = taskConfig.command;
        let commandLine = undefined;
        if (command) {
            const startCommand = new Date().valueOf();

            commandLine = await this.variableResolverService.resolve(command) || command;

            const finishCommand = new Date().valueOf();
            console.error('!!! RESOLVE Command  ', (finishCommand - startCommand) / 1000);
        }

        const finishResolve = new Date().valueOf();
        console.error('!!!!!!!!!!!!!!!!!!! RETURN RESOLVE CHE  ', finishResolve);
        console.error('!!! RESOLVE CHE  ', (finishResolve - startResolve) / 1000);

        const tttt: TaskConfiguration = { ...taskConfig, command: commandLine, target: resultTarget };
        console.error('!!!! ', tttt);

        return tttt;
    }

    private async getWorkspaceId(): Promise<string | undefined> {
        if (this.workspaceId) {
            console.info('!!! resolve get workspace id !!! return existed  ', this.workspaceId);
            return this.workspaceId;
        }

        this.workspaceId = await this.cheApi.getCurrentWorkspaceId();
        console.info('!!! resolve get workspace id !!! NOT existed  ', this.workspaceId);
        return this.workspaceId;
    }

    private async getContainerName(target?: { containerName?: string, component?: string }): Promise<string> {
        if (!target) {
            return this.containerPicker.pick();
        }

        const startMachines = new Date().valueOf();

        const containers = await this.getWorkspaceContainers();

        const finishMachines = new Date().valueOf();
        console.error('!!! RESOLVE MACHINES  ', (finishMachines - startMachines) / 1000);

        const containerName = target && target.containerName;
        if (containerName && containers.find(container => container.name === containerName)) {
            return containerName;
        }

        return await this.getContainerNameByComponent(target && target.component) || this.containerPicker.pick();
    }

    protected async getContainerNameByComponent(targetComponent: string | undefined): Promise<string | undefined> {
        if (!targetComponent) {
            return undefined;
        }

        const containers = await this.getWorkspaceContainers();
        const names = [];
        for (const containerEntity of containers) {
            const container = containerEntity.container;
            const component = getAttribute(COMPONENT_ATTRIBUTE, container.attributes);
            if (component && component === targetComponent) {
                names.push(containerEntity.name);
            }
        }

        if (names.length === 1) {
            return names[0];
        }

        if (names.length > 1) {
            return this.containerPicker.pick(names);
        }
        return undefined;
    }

    protected async getWorkspaceContainers(): Promise<{ name: string, container: cheApi.workspace.Machine }[]> {
        if (this.containers.length > 0) {
            return this.containers;
        }

        this.containers = [];
        try {
            const containersList = await this.cheApi.getCurrentWorkspacesContainers();
            for (const containerName in containersList) {
                if (!containersList.hasOwnProperty(containerName)) {
                    continue;
                }
                const container = { name: containerName, container: containersList[containerName] };
                this.containers.push(container);
            }
        } catch (e) {
            throw new Error('Unable to get list workspace containers. Cause: ' + e);
        }

        return this.containers;
    }
}

export function getAttribute(attributeName: string, attributes?: { [key: string]: string; }): string | undefined {
    if (!attributes) {
        return undefined;
    }

    for (const attribute in attributes) {
        if (attribute === attributeName) {
            return attributes[attribute];
        }
    }
    return undefined;
}
