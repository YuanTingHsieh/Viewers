const TOOLBAR_BUTTON_TYPES = {
  COMMAND: 'command',
  SET_TOOL_ACTIVE: 'setToolActive',
  BUILT_IN: 'builtIn',
};

const definitions = [
  {
    id: 'NvidiaAIAA',
    label: 'NVIDIA AIAA',
    icon: 'ellipse-circle',
    buttons: [
      {
        id: 'DExtr3D',
        label: 'DExtr3D',
        icon: 'liver',
        type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
        commandName: 'setToolActive',
        commandOptions: { toolName: 'DExtr3DProbeTool' },
      },
      {
        id: 'Deepgrow',
        label: 'Deepgrow',
        icon: 'dot-circle',
        type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
        commandName: 'setToolActive',
        commandOptions: { toolName: 'DeepgrowProbeTool' },
      },
    ],
  },
];

/*
const definitions = [
  {
    id: 'NvidiaAIAA',
    label: 'NVIDIA AIAA',
    icon: 'dot-circle',
    type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
    commandName: 'setToolActive',
    commandOptions: { toolName: 'AIAAProbe' },
  },
];
*/
export default {
  definitions,
  defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
};
