const TOOLBAR_BUTTON_TYPES = {
  COMMAND: 'command',
  SET_TOOL_ACTIVE: 'setToolActive',
  BUILT_IN: 'builtIn',
};

const definitions = [
  {
    id: 'NvidiaAIAA',
    label: 'NVIDIA AIAA',
    icon: 'dot-circle',
    type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  },
];

export default {
  definitions,
  defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
};
