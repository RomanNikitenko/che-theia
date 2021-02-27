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
const UPDATE_WORKSPACE_FOLDER_TIMEOUT = 5000;

export class WorkspaceFolderUpdater {
  private pendingFolders: string[] = [];
  private addingWorkspaceFolderPromise: Promise<void> | undefined;

  async addWorkspaceFolder(path: string): Promise<void> {
    console.info('111111111111111111111');
    const workspaceFolderPath = this.toValidWorkspaceFolderPath(path);
    if (this.pendingFolders.includes(workspaceFolderPath)) {
      return Promise.resolve();
    }

    if (this.addingWorkspaceFolderPromise) {
      this.pendingFolders.push(workspaceFolderPath);
    } else {
      try {
        this.addingWorkspaceFolderPromise = this.addFolder(workspaceFolderPath);
        await this.addingWorkspaceFolderPromise;
      } catch (error) {
        console.error(error);
      } finally {
        this.addingWorkspaceFolderPromise = undefined;
      }

      const next = this.pendingFolders.shift();
      if (next) {
        this.addWorkspaceFolder(next);
      }
    }
    return Promise.resolve();
  }

  protected addFolder(projectPath: string): Promise<void> {
    const isProjectFolder = (folder: theia.WorkspaceFolder) => folder.uri.path === projectPath;
    const workspaceFolders: theia.WorkspaceFolder[] = theia.workspace.workspaceFolders || [];
    if (workspaceFolders.some(isProjectFolder)) {
      return Promise.resolve(undefined);
    }

    return new Promise<void>((resolve, reject) => {
      console.info('==== WORSPACE UPDATER === before onDidChangeWorkspaceFolders ', projectPath);
      const disposable = theia.workspace.onDidChangeWorkspaceFolders(event => {
        console.info('==== WORSPACE UPDATER === !!!!!!!! onDidChangeWorkspaceFolders !!!!! ');
        console.dir(event.added[0]);
        const existingWorkspaceFolders = theia.workspace.workspaceFolders || [];
        if (event.added.some(isProjectFolder) || existingWorkspaceFolders.some(isProjectFolder)) {
          clearTimeout(addFolderTimeout);

          disposable.dispose();

          resolve();
        }
      });

      const addFolderTimeout = setTimeout(() => {
        disposable.dispose();

        reject(
          new Error(
            `Adding workspace folder ${projectPath} was cancelled by timeout ${UPDATE_WORKSPACE_FOLDER_TIMEOUT} ms`
          )
        );
      }, UPDATE_WORKSPACE_FOLDER_TIMEOUT);

      console.info('==== WORSPACE UPDATER === before add ', projectPath);
      theia.workspace.updateWorkspaceFolders(workspaceFolders ? workspaceFolders.length : 0, undefined, {
        uri: theia.Uri.file(projectPath),
      });
    });
  }

  protected toValidWorkspaceFolderPath(path: string): string {
    if (path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }
}
