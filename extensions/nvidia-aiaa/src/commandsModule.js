const commandsModule = ({ servicesManager, commandsManager }) => {
  const actions = {
    segmentation: ({ viewports }) => {
      console.log('Running Nvidia AIAA segmentation API.');
      const { AIAAService } = servicesManager.services;
      AIAAService.volume.getOrCreate(viewports).then(volume => {
        const metadata = AIAAService.volume.metadata;
        const {
          seriesInstanceUid,
          nSlices,
          slope,
          intercept,
          rows,
          columns,
          columnPixelSpacing,
          rowPixelSpacing,
          seriesDescription,
        } = metadata;
        console.log('volume metadata row is ' + rows);
      });
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
      storeContexts: ['viewports'],
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
