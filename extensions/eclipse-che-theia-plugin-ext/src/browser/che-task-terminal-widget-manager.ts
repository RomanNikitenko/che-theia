/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TaskTerminalWidget, TaskTerminalWidgetManager, TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TaskConfiguration } from '@theia/task/lib/common';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';

export const CHE_TASK_TYPE: string = 'che';

export class CheTaskTerminalWidgetManager extends TaskTerminalWidgetManager {

    async createNewTaskTerminal(config: TaskConfiguration | undefined, factoryOptions: TerminalWidgetFactoryOptions): Promise<TerminalWidget> {
        console.log('/////////////////// CHE TASK terminal manager /// create NEW Task terminal /// factory ', factoryOptions);
        console.log('/// CHE TASK terminal manager /// create NEW Task terminal /// config ', config);
        const attributes = factoryOptions.attributes || {};
        const isRemote = this.isRemoteTask(config);
        attributes['remote'] = isRemote ? 'true' : 'false';

        return this.terminalService.newTerminal({ ...factoryOptions, kind: 'task', attributes });
    }

    protected async getWidgetToRunTask(
        factoryOptions: TerminalWidgetFactoryOptions,
        openerOptions: TaskTerminalWidgetOpenerOptions): Promise<{ isNew: boolean, widget: TerminalWidget }> {

        console.log('/////////////////// CHE TASK terminal manager === getWidgetToRunTask === factory ', factoryOptions);
        console.log('/// CHE TASK terminal manager === getWidgetToRunTask === opener ', openerOptions);

        let targetWidget: TerminalWidget | undefined;
        if (TaskTerminalWidgetOpenerOptions.isDedicatedTerminal(openerOptions)) {
            console.log('/// CHE TASK terminal manager === getWidgetToRunTask === isDedicatedTerminal ');
            targetWidget = this.getDedicatedTerminal(openerOptions);
        } else if (TaskTerminalWidgetOpenerOptions.isSharedTerminal(openerOptions)) {
            console.log('/// CHE TASK terminal manager === getWidgetToRunTask === isSharedTerminal ');
            targetWidget = this.getSharedTerminal(openerOptions);
        } else {
            console.log('/// CHE TASK terminal manager === getWidgetToRunTask === NOT shared NOT dedicated ');
        }

        return targetWidget ? { isNew: false, widget: targetWidget } : { isNew: true, widget: await this.createNewTaskTerminal(openerOptions.taskConfig, factoryOptions) };
    }

    protected getDedicatedTerminal(openerOptions: TaskTerminalWidgetOpenerOptions): TerminalWidget | undefined {
        for (const widget of this.terminalService.all) {
            if (!this.isDedicatedIdleTaskTerminal(widget)) {
                continue;
            }

            const config = (<TaskTerminalWidget>widget).taskConfig;
            if (config &&
                openerOptions.taskConfig &&
                this.taskDefinitionRegistry.compareTasks(openerOptions.taskConfig, config)) {

                return widget;
            }
        }
    }

    protected getSharedTerminal(openerOptions: TaskTerminalWidgetOpenerOptions): TerminalWidget | undefined {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CHE TASK terminal manager === getSharedTerminal ', openerOptions);
        const isRemote = this.isRemoteTask(openerOptions.taskConfig);
        console.log('/// CHE TASK terminal manager === getSharedTerminal isRemote ', isRemote);

        const lastUsedTerminal = this.terminalService.lastUsedTerminal;
        if (this.isSharedIdleTaskTerminal(lastUsedTerminal)) {
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CHE TASK terminal manager === getSharedTerminal === isSharedIdleTaskTerminal ');
            const config = (<TaskTerminalWidget>lastUsedTerminal).taskConfig;

            const isRemoteTask = this.isRemoteTask(config);
            if ((isRemote && isRemoteTask) || (!isRemote && !isRemoteTask)) {
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CHE TASK terminal manager === getSharedTerminal === RETURN lastUsed ');
                return lastUsedTerminal;
            }
        }

        const availableWidgets: TaskTerminalWidget[] = [];
        for (const widget of this.terminalService.all) {
            if (this.isSharedIdleTaskTerminal(widget)) {
                availableWidgets.push(<TaskTerminalWidget>widget);
            }
        }
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CHE TASK terminal manager === getSharedTerminal === available ', availableWidgets);

        const suitableWidget = this.findSuitableWidget(isRemote, availableWidgets);
        if (suitableWidget) {
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CHE TASK terminal manager === getSharedTerminal === RETURN suitable ');
            return suitableWidget;
        }

        // we don't have suitable widget, so we dispose existed shared task terminal to create another one
        const sharedTaskTerminal = availableWidgets[0];
        if (sharedTaskTerminal) {
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CHE TASK terminal manager === getSharedTerminal === dispose ');
            sharedTaskTerminal.dispose();
        }
    }

    protected findSuitableWidget(isRemote: boolean, availableWidgets: TaskTerminalWidget[]): TaskTerminalWidget | undefined {
        for (const widget of availableWidgets) {
            const isRemoteTask = this.isRemoteTask(widget.taskConfig);
            if ((isRemote && isRemoteTask) || (!isRemote && !isRemoteTask)) {
                return widget;
            }
        }
    }

    protected isRemoteTask(config?: TaskConfiguration): boolean {
        return !!config && !!config.type && config.type === CHE_TASK_TYPE;
    }

    protected isSharedIdleTaskTerminal(terminal?: TerminalWidget): boolean {
        return !!terminal &&
            TaskTerminalWidget.is(terminal) &&
            !terminal.busy &&
            !terminal.dedicated;
    }

    protected isDedicatedIdleTaskTerminal(terminal?: TerminalWidget): boolean {
        return !!terminal &&
            TaskTerminalWidget.is(terminal) &&
            !terminal.busy &&
            !!terminal.dedicated;
    }
}
