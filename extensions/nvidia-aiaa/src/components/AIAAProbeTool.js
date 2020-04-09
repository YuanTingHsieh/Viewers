import cornerstoneTools from 'cornerstone-tools';

const { ProbeTool, getToolState, toolColors } = cornerstoneTools;
const triggerEvent = cornerstoneTools.importInternal('util/triggerEvent');
const draw = cornerstoneTools.importInternal('drawing/draw');
const drawHandles = cornerstoneTools.importInternal('drawing/drawHandles');
const getNewContext = cornerstoneTools.importInternal('drawing/getNewContext');

export default class AIAAProbeTool extends ProbeTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'AIAAProbe',
      configuration: {
        drawHandles: true,
        handleRadius: 2,
      },
    };
    const initialProps = Object.assign(defaultProps, props);
    super(initialProps);
  }

  createNewMeasurement(eventData) {
    let res = super.createNewMeasurement(eventData);
    console.info(res);

    if (res) {
      console.log('TRIGGERING AIAA PROB EVENT');
      triggerEvent(eventData.element, 'nvidiaaiaaprobeevent', eventData);
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
        const color = toolColors.getColorIfActive(data);
        drawHandles(context, eventData, data.handles, {
          handleRadius,
          color,
        });
      });
    }
  }
}
