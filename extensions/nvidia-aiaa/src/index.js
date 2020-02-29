import React from 'react';

import init from './init.js';
import commandsModule from './commandsModule.js';
import toolbarModule from './toolbarModule.js';
import AIAAPanel from './components/AIAAPanel.js';

export default {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id: 'nvidia-aiaa',
  /**
   *
   *
   * @param {object} [configuration={}]
   */
  preRegistration({ servicesManager, configuration = {} }) {
    configuration = {
      server_url: 'http://0.0.0.0:5000',
      api_version: 'v1',
    };
    init({ servicesManager, configuration });
  },
  getToolbarModule() {
    return toolbarModule;
  },
  getCommandsModule({ servicesManager, commandsManager }) {
    return commandsModule({ servicesManager, commandsManager });
  },
  /**
   * @param {object} params
   * @param {ServicesManager} params.servicesManager
   * @param {CommandsManager} params.commandsManager
   */
  getPanelModule({ servicesManager }) {
    const { AIAAService } = servicesManager.services;
    const ConnectedAIAAPanel = () => <AIAAPanel client={AIAAService.client} />;
    return {
      menuOptions: [
        {
          // A suggested icon
          // Available icons determined by consuming app
          icon: 'list',
          // A suggested label
          label: 'NVIDIA AIAA',
          // 'right' or 'left'
          from: 'right',
          // The target component to toggle open/close
          target: 'nvidia-aiaa-panel',
        },
      ],
      components: [
        {
          id: 'nvidia-aiaa-panel',
          component: ConnectedAIAAPanel,
        },
      ],
      defaultContext: ['VIEWER'],
    };
  },
};
