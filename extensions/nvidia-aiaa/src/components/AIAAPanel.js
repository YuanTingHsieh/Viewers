import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';

import './AIAAPanel.styl';

export default class AIAAPanel extends Component {
  static propTypes = {
    client: PropTypes.object,
    onComplete: PropTypes.func,
    onSegmentation: PropTypes.func,
    onAnnotation: PropTypes.func,
    onDeepgrow: PropTypes.func,
  };

  static defaultProps = {
    client: undefined,
    onComplete: undefined,
    onSegmentation: undefined,
    onAnnotation: undefined,
    onDeepgrow: undefined,
  };

  constructor(props) {
    super(props);
    this.state = {
      aiaaServerURL: props.client.getServerURL(),
      segModels: [],
      annModels: [],
      deepgrowModels: [],
      currSegModel: '',
      currAnnModel: '',
      currDeepgrowModel: '',
      currSegLabels: [],
      currAnnLabels: [],
    };
  }

  handleFetch = () => {
    let segModels = [];
    let annModels = [];
    let deepgrowModels = [];
    this.props.client
      .model_list()
      .then(response => {
        console.log(response);

        for (let i = 0; i < response.data.length; ++i) {
          if (response.data[i].type === 'annotation') {
            annModels.push(response.data[i]);
          } else if (response.data[i].type === 'segmentation') {
            segModels.push(response.data[i]);
          } else if (response.data[i].type === 'deepgrow') {
            deepgrowModels.push(response.data[i]);
          } else {
            console.log(
              response.data[i].name + ' has unsupported types for this plugin'
            );
          }
        }
      })
      .then(() => {
        this.setState({
          segModels: segModels,
          annModels: annModels,
          deepgrowModels: deepgrowModels,
        });
        this.props.onComplete({
          title: 'AIAA logs',
          message: 'Fetched AIAA models complete!',
          type: 'success',
        });
      })
      .catch(error => {
        this.props.onComplete({
          title: 'AIAA logs',
          message: 'Fetched AIAA models failed!' + error,
          type: 'error',
        });
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

  onChangeDeepgrowModel = evt => {
    this.setState({
      currDeepgrowModel: evt.target.value,
    });
  };

  onClickSegBtn = () => {
    this.props.onSegmentation(this.state.currSegModel);
  };

  onClickAnnBtn = () => {
    this.props.onAnnotation(this.state.currAnnModel);
  };

  onClickDeepgrowBtn = evt => {
    this.props.onDeepgrow(this.state.currDeepgrowModel);
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
            <Icon name="reset" width="12px" height="12px" />
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

        <div className="segmentation">
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

          <button className="aiaaButton" onClick={this.onClickSegBtn}>
            <Icon name="cube" width="12px" height="12px" />
          </button>
        </div>

        <div className="annotation">
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

          <button className="aiaaButton" onClick={this.onClickAnnBtn}>
            <Icon name="palette" width="12px" height="12px" />
          </button>
        </div>

        <div className="deepgrow">
          <label> DeepGrow Models: </label>
          <select
            className="aiaaDropDown"
            onChange={this.onChangeDeepgrowModel}
            value={this.state.currDeepgrowModel}
          >
            <option key="default" value="default" aiaalabel=""></option>
            {this.state.deepgrowModels.map(model => (
              <option
                key={model.name}
                value={model.name}
                aiaalabel={model.labels}
              >{`${model.name} `}</option>
            ))}
          </select>

          <button className="aiaaButton" onClick={this.onClickDeepgrowBtn}>
            <Icon name="brain" width="12px" height="12px" />
          </button>
        </div>
      </div>
    );
  }
}
