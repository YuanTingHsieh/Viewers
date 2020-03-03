const TOOLBAR_BUTTON_TYPES = {
  COMMAND: 'command',
  SET_TOOL_ACTIVE: 'setToolActive',
};

const definitions = [
  {
    id: 'Nvidia AIAA',
    label: 'Nvidia AIAA',
    icon: 'ellipse-circle',
    buttons: [
      {
        id: 'segmentation',
        label: 'Segmentation',
        icon: 'cube',
        type: TOOLBAR_BUTTON_TYPES.COMMAND,
        commandName: 'segmentation',
        commandOptions: {},
      },
      {
        id: 'dextr3d',
        label: 'DExtr3D',
        icon: 'palette',
        type: TOOLBAR_BUTTON_TYPES.COMMAND,
        commandName: 'dextr3d',
        commandOptions: {},
      },
      {
        id: 'deepgrow',
        label: 'DeepGrow',
        icon: 'brain',
        type: TOOLBAR_BUTTON_TYPES.COMMAND,
        commandName: 'deepgrow',
        commandOptions: {},
      },
    ],
  },
];

export default {
  definitions,
  defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
};
