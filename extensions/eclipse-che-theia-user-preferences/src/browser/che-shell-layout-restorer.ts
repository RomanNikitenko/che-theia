/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { FrontendApplication, ShellLayoutRestorer, StorageService, WidgetManager } from '@theia/core/lib/browser';
import {
  FrontendApplicationState,
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import { inject, injectable } from 'inversify';

import { ILogger } from '@theia/core';

@injectable()
export class CheShellLayoutRestorer extends ShellLayoutRestorer {
  protected previousStoredState: string | undefined;

  constructor(
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
    @inject(ILogger) protected readonly logger: ILogger,
    @inject(StorageService) protected readonly storageService: StorageService,
    @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService
  ) {
    super(widgetManager, logger, storageService);
    stateService.onStateChanged(async (state: FrontendApplicationState) => {
      this.shouldStoreLayout = state !== 'closing_window';
      if (!this.shouldStoreLayout) {
        await logger.info('Disable shell layout persistence. Browser window is in closing state.');
      }
    });
  }

  async storeLayout(app: FrontendApplication) {
    const serializedLayoutData = this.deflate(app.shell.getLayoutData());
    if (this.previousStoredState !== serializedLayoutData) {
      super.storeLayout(app);
      this.previousStoredState = serializedLayoutData;
    }
  }

  async restoreLayout(app: FrontendApplication): Promise<boolean> {
    const restoredLayout = await super.restoreLayout(app);
    if (!restoredLayout) {
      return Promise.resolve(restoredLayout);
    }

    this.previousStoredState = this.deflate(app.shell.getLayoutData());
    return Promise.resolve(true);
  }
}
