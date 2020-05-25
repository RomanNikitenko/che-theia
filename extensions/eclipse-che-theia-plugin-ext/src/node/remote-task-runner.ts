/********************************************************************************
 * Copyright (C) 2020 Red Hat, Inc. and others.
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

import { TaskConfiguration } from '@theia/task/lib/common';
import { Task, TaskRunner } from '@theia/task/lib/node';
import { ProcessTaskRunner } from '@theia/task/lib/node/process/process-task-runner';
import { injectable } from 'inversify';

@injectable()
export class RemoteTaskRunner extends ProcessTaskRunner {

    private delegate: TaskRunner;

    /**
     * Runs a task from the given task configuration.
     * @param taskConfig task configuration to run a task from. The provided task configuration must have a shape of `CommandProperties`.
     */
    async run(taskConfig: TaskConfiguration, ctx?: string): Promise<Task> {
        if (!taskConfig.command) {
            throw new Error("Process task config must have 'command' property specified");
        }

        console.error('++++++++++++++++++ remote task runner ', taskConfig);
        const target = taskConfig.target;
        if (!target || !target.containerName) {
            console.error('+++ remote task runner +++ super run', taskConfig.taskType);
            return super.run(taskConfig, ctx);
        }

        console.error('+++ remote task runner +++ redirect to che task runner ');
        return this.delegate.run(taskConfig, ctx);
    }

    setDelegate(taskRunner: TaskRunner): void {
        this.delegate = taskRunner;
    }
}
