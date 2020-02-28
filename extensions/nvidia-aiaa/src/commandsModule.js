import { createDataVol_byAllPromise } from './io.js';

const commandsModule = ({ servicesManager, commandsManager }) => {
  const actions = {
    segmentation: ({ studies, viewports }) => {
      console.log('Running Nvidia AIAA segmentation API.');

      // var { dataArg, databuf } = createDataVol_byAllPromise(studies, viewports);
    },
    dextr3d: () => {
      console.log('Running Nvidia AIAA dextr3d API.');
    },
    deepgrow: () => {
      console.log('Running Nvidia AIAA deepgrow API.');
    },
  };

  const definitions = {
    segmentation: {
      commandFn: actions.segmentation,
      storeContexts: ['studies', 'viewports'],
      options: {},
    },
    dextr3d: {
      commandFn: actions.dextr3d,
      storeContexts: ['viewports'],
      options: {},
    },
    deepgrow: {
      commandFn: actions.deepgrow,
      storeContexts: ['viewports'],
      options: {},
    },
  };

  return {
    definitions,
    defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
  };
};

export default commandsModule;
