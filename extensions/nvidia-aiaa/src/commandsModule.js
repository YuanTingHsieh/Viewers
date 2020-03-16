const commandsModule = ({ servicesManager, commandsManager }) => {
  const actions = {
    segmentation: ({ viewports, model_name }) => {
      console.log('Nvidia AIAA - Running segmentation API.');
      const { AIAAService } = servicesManager.services;
      const { volume, client } = AIAAService;
      volume.getOrCreate(viewports).then(dataBuf => {
        const niiArr = volume.buffer2NiiArr(dataBuf);
        const blob = new Blob([niiArr], { type: 'application/octet-stream' });
        client
          .segmentation(model_name, blob)
          .then(response => {
            console.log('Nvidia AIAA - Got response back');

            var niiBufferArr = response.data;
            if (niiBufferArr == undefined) {
              console.log(
                "Nvidia AIAA didn't return data. Check AIAA server logs"
              );
              return;
            }
            //const seriesInstanceUid = OHIF.NVIDIA.dataArg.seriesInstanceUid;
            //const maskImporter = new MaskImporter(seriesInstanceUid);
            //maskImporter.importNIFTI(niiBufferArr);
            console.log('Nvidia AIAA - Segmentation completed');
            window.alert('Nvidia AIAA - Segmentation completed');
          })
          .catch(e => console.log('Nvidia AIAA - Error  ' + e));
      });
    },
    dextr3d: () => {
      console.log('Nvidia AIAA - Running dextr3d API.');
    },
    deepgrow: () => {
      console.log('Nvidia AIAA - Running deepgrow API.');
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
