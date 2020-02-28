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
    };
  }

  handleFetch() {
    this.props.client
      .model_list()
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.log(error);
      });
  }

  onChangeSeverURL(value) {
    this.setState({ aiaaServerURL: value });
    this.props.client.setServerURL(value);
  }

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
            value={this.state.aiaaServerURL}
            onChange={e => this.onChangeSeverURL(e.target.value)}
          />
          <button className="aiaaButton" onClick={() => this.handleFetch()}>
            <Icon name="reset" width="14px" height="14px" />
          </button>
        </div>

        <p>
          <a
            href={this.props.client.getModelsURL()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Check AIAA server for models
          </a>

          <b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</b>

          <a
            href={this.props.client.getLogsURL()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Check AIAA Logs
          </a>
        </p>

        {/* <label> Segmentaion Models: </label>

        <select
          className="aiaaDropDown"
          onChange={this.onNvidiaSegChange}
          value={activeSegModel}
        >
          {OHIF.NVIDIA.aiaaService.cachedSegModels.map(model => (
            <option
              key={model.name}
              value={model.name}
              aiaalabel={model.labels}
            >{`${model.name} `}</option>
          ))}
        </select>

        <br />
        <br />

        <label> Annotation Models: &nbsp;&nbsp;&nbsp;</label>

        <select
          className="aiaaDropDown"
          onChange={this.onNvidiaAnnChange}
          value={activeAnnModel}
        >
          {OHIF.NVIDIA.aiaaService.cachedAnnModels.map(model => (
            <option
              key={model.name}
              value={model.name}
              aiaalabel={model.labels}
            >{`${model.name} `}</option>
          ))}
        </select> */}
      </div>
    );
  }
}
