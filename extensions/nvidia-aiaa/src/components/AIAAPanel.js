import './AIAAPanel.styl';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';

export default class AIAAPanel extends Component {
  static propTypes = {
    client: PropTypes.object,
  };

  static defaultProps = {
    client: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      aiaaServerURL: props.client.getServerURL(),
      segModels: props.client.cachedSegModels,
      annModels: props.client.cachedAnnModels,
      deepgrowModels: props.client.cachedDeepgrowModels,
      currSegModel: '',
      currAnnModel: '',
      currDeepGrowModel: '',
      currSegLabels: [],
      currAnnLabels: [],
    };
  }

  handleFetch = () => {
    this.props.client
      .model_list()
      .then(response => {
        console.log(response);
      })
      .then(() => {
        this.setState({
          segModels: this.props.client.cachedSegModels,
          annModels: this.props.client.cachedAnnModels,
          deepgrowModels: this.props.client.cachedDeepgrowModels,
        });
      })
      .catch(error => {
        console.log(error);
      });
  };

  onBlurSeverURL = evt => {
    let value = evt.target.value;
    this.setState({ aiaaServerURL: value });
    this.props.client.setServerURL(value);
  };

  onChangeSegModel = evt => {
    this.setState({
      currSegModel: evt.target.value,
      currSegLabels: evt.target.selectedOptions[0]
        .getAttribute('aiaalabel')
        .split(',', 20),
    });
  };

  onChangeAnnModel = evt => {
    this.setState({
      currAnnModel: evt.target.value,
      currAnnLabels: evt.target.selectedOptions[0]
        .getAttribute('aiaalabel')
        .split(',', 20),
    });
  };

  render() {
    return (
      <div className="aiaaPanel">
        {/* ############################################## */}

        <h3> NVIDIA Clara AIAA Panel</h3>

        <div className="fetchModel">
          AIAA server URL :
          <input
            name="aiaaServerURL"
            type="text"
            defaultValue={this.state.aiaaServerURL}
            onBlur={this.onBlurSeverURL}
          />
          <button className="aiaaButton" onClick={this.handleFetch}>
            <Icon name="reset" width="14px" height="14px" />
          </button>
        </div>

        <p>
          <a
            href={this.props.client.getModelsURL()}
            target="_blank"
            rel="noopener noreferrer"
          >
            All models
          </a>

          <b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</b>

          <a
            href={this.props.client.getLogsURL()}
            target="_blank"
            rel="noopener noreferrer"
          >
            AIAA Logs
          </a>
        </p>

        <label> Segmentaion Models: </label>

        <select
          className="aiaaDropDown"
          onChange={this.onChangeSegModel}
          value={this.state.currSegModel}
        >
          <option key="default" value="default" aiaalabel=""></option>
          {this.state.segModels.map(model => (
            <option
              key={model.name}
              value={model.name}
              aiaalabel={model.labels}
            >{`${model.name} `}</option>
          ))}
        </select>

        <label> Annotation (DExtr3D) Models: &nbsp;&nbsp;&nbsp;</label>

        <select
          className="aiaaDropDown"
          onChange={this.onChangeAnnModel}
          value={this.state.currAnnModel}
        >
          <option key="default" value="default" aiaalabel=""></option>
          {this.state.annModels.map(model => (
            <option
              key={model.name}
              value={model.name}
              aiaalabel={model.labels}
            >{`${model.name} `}</option>
          ))}
        </select>
      </div>
    );
  }
}
