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

import { Disposable } from '@theia/core/lib/common/disposable';
import { injectable, inject } from 'inversify';
import { RemoteTaskType, RemoteTaskServer } from '../common/che-protocol';

@injectable()
export class RemoteTaskRegistry {

    protected remoteTaskTypes = new Map<string, RemoteTaskType>();

    registerTaskType(type: RemoteTaskType): Disposable {
        this.remoteTaskTypes.set(type.taskType, type);
        return {
            dispose: () => this.remoteTaskTypes.delete(type.taskType)
        };
    }

    getRemoteTaskTypes(): RemoteTaskType[] {
        return [...this.remoteTaskTypes.values()];
    }
}

@injectable()
export class RemoteTaskServerImpl implements RemoteTaskServer {

    @inject(RemoteTaskRegistry)
    protected readonly remoteTaskRegistry: RemoteTaskRegistry;

    async registerRemoteTaskType(type: RemoteTaskType): Promise<void> {
        this.remoteTaskRegistry.registerTaskType(type);
    }

    async getRegisteredRemoteTaskTypes(): Promise<RemoteTaskType[]> {
        return this.remoteTaskRegistry.getRemoteTaskTypes();
    }
}
