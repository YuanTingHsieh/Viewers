const commandsModule = ({ commandsManager }) => {
  const actions = {
    segmentation: () => {
      console.log('Running Nvidia AIAA segmentation API.');
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
      options: {},
    },
    dextr3d: {
      commandFn: actions.dextr3d,
      options: {},
    },
    deepgrow: {
      commandFn: actions.deepgrow,
      options: {},
    },
  };

  return {
    definitions,
    defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
  };
};

export default commandsModule;
