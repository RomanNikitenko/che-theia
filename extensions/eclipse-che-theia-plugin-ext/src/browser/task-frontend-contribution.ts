/********************************************************************************
 * Copyright (C) 2017 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { TerminalMenus } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { inject, injectable } from 'inversify';
import { TaskConfigurationsService } from './task-config-service';

export const CONFIGURE_REMOTE_RUNNER: Command = {
    id: 'task:configure:remote:runner',
    category: 'Task',
    label: 'Configure Remote Task Runner'
};

@injectable()
export class CheTaskFrontendContribution implements CommandContribution, MenuContribution {

    @inject(TaskConfigurationsService)
    protected readonly taskConfigurationsService: TaskConfigurationsService;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(
            CONFIGURE_REMOTE_RUNNER,
            {
                isEnabled: () => true,
                execute: async () => {
                    this.taskConfigurationsService.configureRemoteRunner();
                }
            }
        );
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(TerminalMenus.TERMINAL_TASKS_CONFIG, {
            commandId: CONFIGURE_REMOTE_RUNNER.id,
            order: '1'
        });
    }
}
