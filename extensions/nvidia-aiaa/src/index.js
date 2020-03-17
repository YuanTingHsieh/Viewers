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
    };
    init({ servicesManager, configuration });
  },
  getToolbarModule() {
    return toolbarModule;
  },
  getCommandsModule({ servicesManager }) {
    return commandsModule({ servicesManager });
  },
  /**
   * @param {object} params
   * @param {ServicesManager} params.servicesManager
   * @param {CommandsManager} params.commandsManager
   */
  getPanelModule({ servicesManager, commandsManager }) {
    const { AIAAService, UINotificationService } = servicesManager.services;
    const ConnectedAIAAPanel = () => (
      <AIAAPanel
        client={AIAAService.client}
        onComplete={message => {
          if (UINotificationService) UINotificationService.show(message);
        }}
        onSegmentation={model_name => {
          commandsManager.runCommand('segmentation', {
            model_name: model_name,
          });
        }}
        onAnnotation={model_name => {
          commandsManager.runCommand('dextr3d', {
            model_name: model_name,
          });
        }}
        onDeepgrow={model_name => {
          commandsManager.runCommand('deepgrow', {
            model_name: model_name,
          });
        }}
      />
    );
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
