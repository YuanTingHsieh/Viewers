import React from 'react';
import PropTypes from 'prop-types';
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

import { getElementFromFirstImageId } from '../utils/genericUtils';

export default class AnnotationBar extends React.Component {
  static propTypes = {
    toolName: PropTypes.string,
    eventHandler: PropTypes.func,
    addEventListeners: PropTypes.func,
    removeEventListeners: PropTypes.func,
    firstImageId: PropTypes.any,
    resetPoints: PropTypes.func,
    usage: PropTypes.any,
  };

  constructor(props) {
    super(props);
  }

  onClickClearPoints = () => {
    console.info('Clear Points ' + this.props.toolName);
    this.props.resetPoints(this.props.toolName);

    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      cornerstoneTools.clearToolState(enabledElement, this.props.toolName);
    });

    const element = getElementFromFirstImageId(this.props.firstImageId);
    cornerstone.updateImage(element);
  };

  onStartStopAnnotation = e => {
    console.info('value of checkbox : ', e.target.checked);
    console.info(e);
    let { toolName, eventHandler, addEventListeners, removeEventListeners } = this.props;
    let eventName = 'nvidia_aiaa_event_' + toolName;
    if (e.target.checked) {
      addEventListeners(eventName, eventHandler);
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
      console.debug('Activated the tool...');
      this.onClickClearPoints();
    } else {
      removeEventListeners(eventName, eventHandler);
    }
  };

  render() {
    return (
      <div>
        <div className="pretty p-switch p-fill p-toggle">
          <input type="checkbox" onChange={this.onStartStopAnnotation}/>
          <div className="state p-on">
            <label>Stop Annotation</label>
          </div>
          <div className="state p-off">
            <label>Start Annotation</label>
          </div>
        </div>
        | &nbsp;&nbsp;
        <a href="#" onClick={this.onClickClearPoints}>Clear Points</a>;
        {this.props.usage}
      </div>
    );

  }
}
