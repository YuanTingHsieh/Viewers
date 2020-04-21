import React from 'react';
import PropTypes from 'prop-types';
import cornerstoneTools from 'cornerstone-tools';

export default class AnnotationBar extends React.Component {
  static propTypes = {
    toolName: PropTypes.string,
    eventHandler: PropTypes.func,
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
  };

  onStartStopAnnotation = e => {
    console.debug('value of checkbox : ', e.target.checked);
    console.debug(e);
    let { toolName, eventHandler } = this.props;
    let eventName = 'nvidia_aiaa_event_' + toolName;

    if (e.target.checked) {
      this.addEventListeners(eventName, eventHandler);
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });

      //console.debug('Activated the tool...');
      //this.onClickClearPoints();
    } else {
      this.removeEventListeners(eventName, eventHandler);
    }
  };

  addEventListeners = (eventName, handler) => {
    this.removeEventListeners();

    // TODO:: Do we have to do for every enabled Elements or just elemnt??
    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      enabledElement.addEventListener(
        eventName,
        handler,
      );
    });
  };

  removeEventListeners = (eventName, handler) => {
    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      enabledElement.removeEventListener(
        eventName,
        handler,
      );
    });
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
        <a href="#" onClick={this.onClickClearPoints}>Clear Points</a>
        {this.props.usage}
      </div>
    );

  }
}
