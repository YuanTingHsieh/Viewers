import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';
import OHIF from '@ohif/core';
import * as dcmjs from 'dcmjs';
import cornerstoneTools from 'cornerstone-tools';

import './AIAAPanel.styl';

const ColoredCircle = ({ color }) => {
  return (
    <span
      className="segColor"
      style={{ backgroundColor: `rgba(${color.join(',')})` }}
    ></span>
  );
};

ColoredCircle.propTypes = {
  color: PropTypes.array.isRequired,
};

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
              response.data[i].name + ' has unsupported types for this plugin',
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

  onFetchSegments = evt => {
    console.info(this.props);
  };


  render() {
    const segmentationModule = cornerstoneTools.getModule('segmentation');
    const colorLutTable = segmentationModule.state.colorLutTables[0];
    //console.info(segmentationModule.state.colorLutTables);

    return (
      <div className="aiaaPanel">
        {/* ############################################## */}

        <h3> NVIDIA Clara AIAA Panel</h3>

        <h4><u>All Segments:</u></h4>
        <table>
          <tbody>
          <tr>
            <td>
              <button className="segButton" onClick={this.onFetchSegments}>
                <Icon name="plus" width="12px" height="12px"/>
                Add
              </button>
              &nbsp;
              <button className="segButton" onClick={this.onFetchSegments}>
                <Icon name="trash" width="12px" height="12px"/>
                Remove
              </button>
            </td>
            <td align="right">
              <button className="segButton" onClick={this.onFetchSegments}>
                <Icon name="reset" width="12px" height="12px"/>
                Reload
              </button>
            </td>
          </tr>
          </tbody>
        </table>

        <div className="segSection">
          <table className="segTable">
            <thead>
            <tr>
              <th width="2%">#</th>
              <th width="8%">Color</th>
              <th width="90%">Name</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td><input type="checkbox"/></td>
              <td><ColoredCircle color={colorLutTable[1]}/></td>
              <td className="segEdit" contentEditable="true" suppressContentEditableWarning="true">Liver</td>
            </tr>
            <tr>
              <td><input type="checkbox"/></td>
              <td><ColoredCircle color={colorLutTable[2]}/></td>
              <td className="segEdit" contentEditable="true" suppressContentEditableWarning="true">Liver Tumor</td>
            </tr>
            <tr>
              <td><input type="checkbox"/></td>
              <td><ColoredCircle color={colorLutTable[3]}/></td>
              <td className="segEdit" contentEditable="true" suppressContentEditableWarning="true">Spleen</td>
            </tr>
            <tr>
              <td><input type="checkbox"/></td>
              <td><ColoredCircle color={colorLutTable[4]}/></td>
              <td className="segEdit" contentEditable="true" suppressContentEditableWarning="true">Pancreas</td>
            </tr>
            </tbody>
          </table>
        </div>

        <p>&nbsp;</p>
        <table className="aiaaTable">
          <tbody>
          <tr>
            <td colSpan="3">AIAA server URL:</td>
          </tr>
          <tr>
            <td width="80%">
              <input
                className="aiaaInput"
                name="aiaaServerURL"
                type="text"
                defaultValue={this.state.aiaaServerURL}
                onBlur={this.onBlurSeverURL}
              />
            </td>
            <td width="2%">&nbsp;</td>
            <td width="18%">
              <button className="aiaaButton" onClick={this.handleFetch}>
                <Icon name="reset" width="16px" height="16px"/>
              </button>
            </td>
          </tr>
          <tr>
            <td colSpan="3">
              <a
                href={this.props.client.getModelsURL()}
                target="_blank"
                rel="noopener noreferrer"
              >
                All models
              </a>

              <b>&nbsp;&nbsp;|&nbsp;&nbsp;</b>

              <a
                href={this.props.client.getLogsURL()}
                target="_blank"
                rel="noopener noreferrer"
              >
                AIAA Logs
              </a>
            </td>
          </tr>
          </tbody>
        </table>

        <div className="tabs">
          <div className="tab">
            <input type="radio" name="css-tabs" id="tab-1" defaultChecked className="tab-switch"/>
            <label htmlFor="tab-1" className="tab-label">Segmentaion</label>

            <div className="tab-content">
              <table className="aiaaTable">
                <tbody>
                <tr>
                  <td colSpan="3">Segmentaion Models:</td>
                </tr>
                <tr>
                  <td width="80%">
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
                  </td>
                  <td width="2%">&nbsp;</td>
                  <td width="18%">
                    <button className="aiaaButton" onClick={this.onClickSegBtn}>
                      <Icon name="cube" width="16px" height="16px"/>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
              <p>Fully automated segmentation <b>without any user input</b>. Just select any <i>segmentation</i> model
                and click to run</p>
            </div>
          </div>

          <div className="tab">
            <input type="radio" name="css-tabs" id="tab-2" className="tab-switch"/>
            <label htmlFor="tab-2" className="tab-label">DExtr3D</label>

            <div className="tab-content">
              <table className="aiaaTable">
                <tbody>
                <tr>
                  <td colSpan="3">Annotation (DExtr3D) Models:</td>
                </tr>
                <tr>
                  <td width="80%">
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
                  </td>
                  <td width="2%">&nbsp;</td>
                  <td width="18%">
                    <button className="aiaaButton" onClick={this.onClickAnnBtn}>
                      <Icon name="palette" width="16px" height="16px"/>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
              <p>Generally <b>more accurate</b> but requires user or segmentation model to <i>select/propose extreme
                points</i> of the organ.</p>
              <p>Select a model and <b>Right click</b> to add/collect extreme points (Min: <b>6 points</b> are
                required)</p>
            </div>
          </div>

          <div className="tab">
            <input type="radio" name="css-tabs" id="tab-3" className="tab-switch"/>
            <label htmlFor="tab-3" className="tab-label">DeepGrow</label>

            <div className="tab-content">
              <table className="aiaaTable">
                <tbody>
                <tr>
                  <td colSpan="3">DeepGrow Models:</td>
                </tr>
                <tr>
                  <td width="80%">
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
                  </td>
                  <td width="2%">&nbsp;</td>
                  <td width="18%">
                    <button className="aiaaButton" onClick={this.onClickDeepgrowBtn}>
                      <Icon name="brain" width="16px" height="16px"/>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
              <p>You can use deepgrow model to annotate <b>any organ</b>.</p>
              <p><b>Right click</b> to add <i>foreground points</i> or <b>Left click</b> to add <i>background
                points</i>.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
