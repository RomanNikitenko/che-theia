/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { WorkspaceFolderUpdater } from '../src/workspace-folder-updater';

const workspaceFolders: string[] = [];

describe('testing async prompt request', () => {
  const workspaceFolderUpdater: WorkspaceFolderUpdater = new WorkspaceFolderUpdater();
  const updateWorkspaceFolders = jest.fn();

  beforeEach(() => {
    theia.workspace.updateWorkspaceFolders = updateWorkspaceFolders;
    updateWorkspaceFolders.mockImplementation(updateWorkspaceFoldersStub);

    console.info('777777777777777777777');
  });

  test('the 333333333 ', async () => {
    console.info('9999999999999');
    // workspaceFolderUpdater.addWorkspaceFolder('6666');
    // workspaceFolderUpdater.addWorkspaceFolder('7777');
    await workspaceFolderUpdater.addWorkspaceFolder('8888');
    expect(workspaceFolders).toStrictEqual(['8888']);
  });
});

function updateWorkspaceFoldersStub(
  start: number,
  deleteCount: number | undefined | null,
  ...workspaceFoldersToAdd: { uri: theia.Uri; name?: string }[]
): string[] {
  console.info('++++++++++++++++ ****** ', workspaceFoldersToAdd[0]);
  workspaceFolders.push(workspaceFoldersToAdd[0].uri.path);
  return workspaceFolders;
}

export function file(path: string): theia.Uri {
  return { path };
}

export function onDidChangeWorkspaceFoldersTestImpl(
  listener: (event: theia.WorkspaceFoldersChangeEvent) => {}
): { dispose(): void } {
  setTimeout(() => {
    console.info('%%%%%%%%%%%%%%%%%%%%%%%%%%%%% ');
    const addWorkspaceFolderEvent: theia.WorkspaceFoldersChangeEvent = {
      added: [
        {
          uri: {
            path: '8888',
          },
        },
      ],
    };
    listener(addWorkspaceFolderEvent);
  }, 1000);
  return dispose;
}
