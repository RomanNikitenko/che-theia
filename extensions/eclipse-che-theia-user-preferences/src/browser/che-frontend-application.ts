/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import {
  ApplicationShell,
  FrontendApplication,
  FrontendApplicationContribution,
  KeybindingRegistry,
  ShellLayoutRestorer,
} from '@theia/core/lib/browser';
import { CommandRegistry, ContributionProvider, MenuModelRegistry } from '@theia/core';
import { inject, injectable, named } from 'inversify';

import { CheShellLayoutRestorer } from './che-shell-layout-restorer';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { StorageServicePreferences } from './che-storage-preferences';

@injectable()
export class CheFrontendApplication extends FrontendApplication {
  protected layoutPersistenceTimer: number | undefined;

  constructor(
    @inject(CommandRegistry) protected readonly commands: CommandRegistry,
    @inject(MenuModelRegistry) protected readonly menus: MenuModelRegistry,
    @inject(KeybindingRegistry) protected readonly keybindings: KeybindingRegistry,
    @inject(CheShellLayoutRestorer) protected readonly layoutRestorer: ShellLayoutRestorer,
    @inject(ContributionProvider)
    @named(FrontendApplicationContribution)
    protected readonly contributions: ContributionProvider<FrontendApplicationContribution>,
    @inject(ApplicationShell) protected readonly _shell: ApplicationShell,
    @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService,
    @inject(StorageServicePreferences) protected readonly storagePreferences: StorageServicePreferences
  ) {
    super(commands, menus, keybindings, layoutRestorer, contributions, _shell, stateService);
  }

  protected registerEventListeners() {
    super.registerEventListeners();

    window.addEventListener('resize', () => this.scheduleLayoutPersistence());
    document.addEventListener('keydown', () => this.scheduleLayoutPersistence());
    document.addEventListener('mousedown', () => this.scheduleLayoutPersistence());
    document.addEventListener('mousemove', () => this.scheduleLayoutPersistence());
  }

  protected scheduleLayoutPersistence() {
    if (this.layoutPersistenceTimer) {
      this.clearTimeout(this.layoutPersistenceTimer);
    }

    this.layoutPersistenceTimer = this.setTimeout(() => {
      this.layoutRestorer.storeLayout(this);
    }, this.storagePreferences['workbench.layout.saveTimeout']);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected setTimeout(handler: (...args: any[]) => void, timeout: number): number {
    return window.setTimeout(handler, timeout);
  }

  protected clearTimeout(handle: number): void {
    window.clearTimeout(handle);
  }
}
