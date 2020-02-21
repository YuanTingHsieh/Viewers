import commandsModule from './commandsModule.js';
import toolbarModule from './toolbarModule.js';

export default {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id: 'nvidia-aiaa',
  getToolbarModule() {
    return toolbarModule;
  },
  getCommandsModule({ commandsManager }) {
    return commandsModule({ commandsManager });
  },
};
