import toolbarModule from './toolbarModule';
import panelModule from './panelModule.js';
import sopClassHandlerModule from './OHIFDicomSegSopClassHandler';
import init from './init';
import AIAAProbeTool from './utils/AIAAProbeTool';

export { AIAAProbeTool };

export default {
  id: 'com.ohif.nvidia-aiaa',

  preRegistration({ servicesManager, configuration = {} }) {
    init({ servicesManager, configuration });
  },
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
