/*
 * Copyright (c) 2020 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

/**
 * Mock of @theia/plugin module
 * @author Valerii Svydenko
 */
import { onDidChangeWorkspaceFoldersTestImpl, file } from '../../tests/workspace-folder-updater.spec';
interface WorkspaceFoldersChangeEvent {
  readonly added: WorkspaceFolder[];
}

interface WorkspaceFolder {
  readonly uri: Uri;
}

export class Uri {
  readonly path: string;
}

const theia: any = {};
theia.workspace = {};

const onDidChangeWorkspaceFolders = jest.fn();
theia.workspace.onDidChangeWorkspaceFolders = onDidChangeWorkspaceFolders;
const dispose = {
  dispose(): void {},
};
onDidChangeWorkspaceFolders.mockImplementation(onDidChangeWorkspaceFoldersTestImpl);

const fileFunc = jest.fn();

module.exports = theia;
theia.Uri = {};
theia.Uri.file = fileFunc;
fileFunc.mockImplementation(file);
