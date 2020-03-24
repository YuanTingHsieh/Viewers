import init from './init.js';
import commandsModule from './commandsModule.js';
import panelModule from './panelModule.js';
//import sopClassHandlerModule from '@ohif/extension-dicom-segmentation/src/OHIFDicomSegSopClassHandler';
import sopClassHandlerModule from './OHIFDicomSegSopClassHandler';

export default {
  id: 'com.ohif.nvidia-aiaa',

  getPanelModule({ servicesManager, commandsManager }) {
    return panelModule({ servicesManager, commandsManager });
  },
  getSopClassHandlerModule({ servicesManager }) {
    return sopClassHandlerModule;
  },
};
