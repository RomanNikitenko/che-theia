/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ChePluginRegistry, ChePluginServiceClient } from '../../common/che-plugin-protocol';
import { Emitter, Event } from '@theia/core/lib/common';

import { injectable } from 'inversify';

@injectable()
export class ChePluginServiceClientImpl implements ChePluginServiceClient {
  /********************************************************************************
   * Changing cache size
   ********************************************************************************/

  protected readonly pluginCacheSizeChangedEvent = new Emitter<number>();

  get onPluginCacheSizeChanged(): Event<number> {
    return this.pluginCacheSizeChangedEvent.event;
  }

  /**
   * Called by Plugins Service when cache of the plugins has been changed.
   */
  async notifyPluginCacheSizeChanged(plugins: number): Promise<void> {
    this.pluginCacheSizeChangedEvent.fire(plugins);
  }

  /********************************************************************************
   * Plugin cached
   ********************************************************************************/

  protected readonly pluginCachedEvent = new Emitter<number>();
  protected readonly onInvalidRegistryFoundEmitter = new Emitter<ChePluginRegistry>();
  readonly onInvalidRegistryFound = this.onInvalidRegistryFoundEmitter.event;

  get onPluginCached(): Event<number> {
    return this.pluginCachedEvent.event;
  }

  /**
   * Called by Plugin Service when new plugin has been added to the cache.
   */
  async notifyPluginCached(plugins: number): Promise<void> {
    this.pluginCachedEvent.fire(plugins);
  }

  /********************************************************************************
   * Caching of plugins is done
   ********************************************************************************/

  protected readonly cachingCompleteEvent = new Emitter<void>();

  get onCachingComplete(): Event<void> {
    return this.cachingCompleteEvent.event;
  }

  /**
   * Called by Plugin Service when caching of the plugins has been finished.
   */
  async notifyCachingComplete(): Promise<void> {
    this.cachingCompleteEvent.fire();
  }

  /********************************************************************************
   * Error handling
   * Will be imlemented soon
   ********************************************************************************/

  async invalidRegistryFound(registry: ChePluginRegistry): Promise<void> {
    this.onInvalidRegistryFoundEmitter.fire(registry);
    console.log('Unable to read plugin registry', registry.uri);
  }

  async invalidPluginFound(pluginYaml: string): Promise<void> {
    console.log('Unable to read plugin meta.yaml', pluginYaml);
  }
}
