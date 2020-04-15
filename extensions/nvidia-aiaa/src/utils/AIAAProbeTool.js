import cornerstoneTools from 'cornerstone-tools';

const { ProbeTool, getToolState } = cornerstoneTools;
const triggerEvent = cornerstoneTools.importInternal('util/triggerEvent');
const draw = cornerstoneTools.importInternal('drawing/draw');
const drawHandles = cornerstoneTools.importInternal('drawing/drawHandles');
const getNewContext = cornerstoneTools.importInternal('drawing/getNewContext');

export default class AIAAProbeTool extends ProbeTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'AIAAProbe',
      supportedInteractionTypes: ['Mouse'],
      configuration: {
        drawHandles: true,
        handleRadius: 2,
        eventName: 'nvidiaaiaaprobeevent',
        color: ['red', 'blue'],
        activeColor: 'red',
      },
    };

    const initialProps = Object.assign(defaultProps, props);
    super(initialProps);
  }

  createNewMeasurement(eventData) {
    console.debug(eventData);
    let res = super.createNewMeasurement(eventData);
    if (res) {
      res.color = this.configuration.color[eventData.event.ctrlKey ? 1 : 0];
      res.ctrlKey = eventData.event.ctrlKey;

      console.info('TRIGGERING AIAA PROB EVENT: ' + this.configuration.eventName);
      console.info(res);
      triggerEvent(eventData.element, this.configuration.eventName, eventData);
    }
    return res;
  }

  renderToolData(evt) {
    const eventData = evt.detail;
    const { handleRadius } = this.configuration;

    const toolData = getToolState(evt.currentTarget, this.name);
    if (!toolData) {
      return;
    }

    const context = getNewContext(eventData.canvasContext.canvas);
    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];
      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        const color = data.color;
        drawHandles(context, eventData, data.handles, {
          handleRadius,
          color,
        });
      });
    }
  }
}
