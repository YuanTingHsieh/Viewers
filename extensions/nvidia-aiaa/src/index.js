import toolbarModule from './toolbarModule';
import panelModule from './panelModule.js';
import sopClassHandlerModule from './OHIFDicomSegSopClassHandler';

export default {
  id: 'com.ohif.nvidia-aiaa',

  getToolbarModule({ servicesManager }) {
    return toolbarModule;
  },
  getPanelModule({ servicesManager, commandsManager }) {
    return panelModule({ servicesManager, commandsManager });
  },
  getSopClassHandlerModule({ servicesManager }) {
    return sopClassHandlerModule;
  },
};
