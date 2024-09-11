/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of, ReplaySubject, take, map, Observable, switchMap } from 'rxjs';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  HttpStart,
} from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { Space } from '@kbn/spaces-plugin/public';
import type { SolutionNavigationDefinition } from '@kbn/core-chrome-browser';
import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { PanelContentProvider } from '@kbn/shared-ux-chrome-navigation';
import type {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  AddSolutionNavigationArg,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';
import { SideNavComponent } from './side_navigation';
import { registerNavigationEventTypes } from './analytics';

export class NavigationPublicPlugin
  implements
    Plugin<
      NavigationPublicSetup,
      NavigationPublicStart,
      NavigationPublicSetupDependencies,
      NavigationPublicStartDependencies
    >
{
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry =
    new TopNavMenuExtensionsRegistry();
  private readonly stop$ = new ReplaySubject<void>(1);
  private coreStart?: CoreStart;
  private depsStart?: NavigationPublicStartDependencies;
  private isSolutionNavEnabled = false;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): NavigationPublicSetup {
    registerNavigationEventTypes(core);

    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(
    core: CoreStart,
    depsStart: NavigationPublicStartDependencies
  ): NavigationPublicStart {
    this.coreStart = core;
    this.depsStart = depsStart;

    const { unifiedSearch, cloud, spaces } = depsStart;
    const extensions = this.topNavMenuExtensionsRegistry.getAll();
    const chrome = core.chrome as InternalChromeStart;
    const activeSpace$: Observable<Space | undefined> = spaces?.getActiveSpace$() ?? of(undefined);
    const onCloud = cloud !== undefined; // The new side nav will initially only be available to cloud users
    const isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';

    this.isSolutionNavEnabled = onCloud && !isServerless;

    /*
     *
     *  This helps clients of navigation to create
     *  a TopNav Search Bar which does not uses global unifiedSearch/data/query service
     *
     *  Useful in creating multiple stateful SearchBar in the same app without affecting
     *  global filters
     *
     * */
    const createCustomTopNav = (
      /*
       * Custom instance of unified search if it needs to be overridden
       *
       * */
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => {
      return createTopNav(customUnifiedSearch ?? unifiedSearch, customExtensions ?? extensions);
    };

    const initSolutionNavigation = (activeSpace?: Space) => {
      this.initiateChromeStyleAndSideNav(chrome, {
        isServerless,
        activeSpace,
      });

      if (!this.isSolutionNavEnabled) return;

      chrome.project.setCloudUrls(cloud!);
    };

    if (this.getIsUnauthenticated(core.http)) {
      // Don't fetch the active space if the user is not authenticated
      initSolutionNavigation();
    } else {
      activeSpace$.pipe(take(1)).subscribe(initSolutionNavigation);
    }

    return {
      ui: {
        TopNavMenu: createTopNav(unifiedSearch, extensions),
        AggregateQueryTopNavMenu: createTopNav(unifiedSearch, extensions),
        createTopNavWithCustomContext: createCustomTopNav,
      },
      addSolutionNavigation: (solutionNavigation) => {
        if (!this.isSolutionNavEnabled) return;
        this.addSolutionNavigation(solutionNavigation);
      },
      isSolutionNavEnabled$: of(this.getIsUnauthenticated(core.http)).pipe(
        switchMap((isUnauthenticated) => {
          if (isUnauthenticated) return of(false);
          return activeSpace$.pipe(
            map((activeSpace) => {
              return this.isSolutionNavEnabled && getIsProjectNav(activeSpace?.solution);
            })
          );
        })
      ),
    };
  }

  public stop() {
    this.stop$.next();
  }

  private getSideNavComponent({
    dataTestSubj,
    panelContentProvider,
  }: {
    panelContentProvider?: PanelContentProvider;
    dataTestSubj?: string;
  } = {}): SolutionNavigationDefinition['sideNavComponent'] {
    if (!this.coreStart) throw new Error('coreStart is not available');
    if (!this.depsStart) throw new Error('depsStart is not available');

    const core = this.coreStart;
    const { project } = core.chrome as InternalChromeStart;
    const activeNavigationNodes$ = project.getActiveNavigationNodes$();
    const navigationTreeUi$ = project.getNavigationTreeUi$();

    return () => (
      <SideNavComponent
        navProps={{ navigationTree$: navigationTreeUi$, dataTestSubj, panelContentProvider }}
        deps={{ core, activeNodes$: activeNavigationNodes$ }}
      />
    );
  }

  private addSolutionNavigation(solutionNavigation: AddSolutionNavigationArg) {
    if (!this.coreStart) throw new Error('coreStart is not available');
    const { dataTestSubj, panelContentProvider, ...rest } = solutionNavigation;
    const sideNavComponent = this.getSideNavComponent({ dataTestSubj, panelContentProvider });
    const { project } = this.coreStart.chrome as InternalChromeStart;
    project.updateSolutionNavigations({
      [solutionNavigation.id]: { ...rest, sideNavComponent },
    });
  }

  private initiateChromeStyleAndSideNav(
    chrome: InternalChromeStart,
    { isServerless, activeSpace }: { isServerless: boolean; activeSpace?: Space }
  ) {
    const solutionView = activeSpace?.solution;
    const isProjectNav = this.isSolutionNavEnabled && getIsProjectNav(solutionView);

    // On serverless the chrome style is already set by the serverless plugin
    if (!isServerless) {
      chrome.setChromeStyle(isProjectNav ? 'project' : 'classic');
    }

    if (isProjectNav) {
      chrome.project.changeActiveSolutionNavigation(solutionView!);
    }
  }

  private getIsUnauthenticated(http: HttpStart) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }
}

function getIsProjectNav(solutionView?: string) {
  return Boolean(solutionView) && isKnownSolutionView(solutionView);
}

function isKnownSolutionView(solution?: string) {
  return Boolean(solution) && ['oblt', 'es', 'security'].includes(solution!);
}
