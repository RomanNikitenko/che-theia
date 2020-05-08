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
import { TaskResolver } from '@theia/task/lib/browser';
import { TaskConfiguration } from '@theia/task/lib/common';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { inject, injectable, postConstruct } from 'inversify';
import { CheApiService } from '../common/che-protocol';

export const COMPONENT_ATTRIBUTE: string = 'component';

@injectable()
export class CheTaskResolver implements TaskResolver {

    @inject(CheApiService)
    protected readonly cheApi: CheApiService;

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    private workspaceId: string | undefined;
    private containers: { [key: string]: cheApi.workspace.Machine };

    @postConstruct()
    protected init(): void {
        this.getWorkspaceId();
        this.getContainers();
    }

    async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
        const startResolve = new Date().valueOf();
        console.error('!!!!!!!!!!!!!!!!!!! NEW RESOLVE CHE  ', startResolve);

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

            // const context = new URI(this.taskDefinitionRegistry.getDefinition(taskConfig) ? taskConfig.scope : taskConfig._source).withScheme('file');
            // const variableResolverOptions = {
            //     context, configurationSection: 'tasks'
            // };

            resultTarget.workingDir = await this.variableResolverService.resolve(target.workingDir);

            const finishWorkDir = new Date().valueOf();
            console.error('!!! RESOLVE Work DIR ', (finishWorkDir - startWorkDir) / 1000);
        }

        const command = taskConfig.command;
        let commandLine = undefined;
        if (command) {
            const startCommand = new Date().valueOf();

            commandLine = await this.variableResolverService.resolve(command);

            const finishCommand = new Date().valueOf();
            console.error('!!! RESOLVE Command  ', (finishCommand - startCommand) / 1000);
        }

        const finishResolve = new Date().valueOf();
        console.error('!!!!!!!!!!!!!!!!!!! RETURN RESOLVE CHE  ', finishResolve);
        console.error('!!! RESOLVE CHE  ', (finishResolve - startResolve) / 1000);
        return {
            type: taskConfig.type,
            target: resultTarget,
            // previewUrl: cheTaskDefinition.previewUrl,
            label: taskConfig.label,
            source: taskConfig.source,
            _scope: taskConfig._scope,
            command: commandLine
        };
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

    private async getContainers(): Promise<{ [attrName: string]: cheApi.workspace.Machine }> {
        if (this.containers) {
            console.info('!!! resolve get containers !!! return existed  ');
            return this.containers;
        }

        this.containers = await this.cheApi.getCurrentWorkspacesContainers();
        console.info('!!! resolve get containers !!! NOT existed  ');
        return this.containers;
    }

    private async getContainerName(target?: { containerName?: string, component?: string }): Promise<string> {
        // if (!target) {
        //     return this.machinePicker.pick();
        // }

        const startMachines = new Date().valueOf();

        const containers = await this.getContainers();

        const finishMachines = new Date().valueOf();
        console.error('!!! RESOLVE MACHINES  ', (finishMachines - startMachines) / 1000);

        const containerName = target && target.containerName;
        if (containerName && containers.hasOwnProperty(containerName)) {
            return containerName;
        }

        return await this.getContainerNameByComponent(target && target.component, containers) || '';
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

        // if (names.length > 1) {
        //     return this.machinePicker.pick(names);
        // }
        return undefined;
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
