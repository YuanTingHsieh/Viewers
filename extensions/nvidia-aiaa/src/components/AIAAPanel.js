import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';
import cornerstoneTools from 'cornerstone-tools';
import { utils } from '@ohif/core';

import './AIAAPanel.styl';
import AIAAClient from '../AIAAService/AIAAClient.js';
import AIAATable from './AIAATable';

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

const { studyMetadataManager } = utils;

export default class AIAAPanel extends Component {
  static propTypes = {
    client: PropTypes.object,
    onComplete: PropTypes.func,
    studies: PropTypes.any,
    viewports: PropTypes.any,
    activeIndex: PropTypes.any,
  };

  static defaultProps = {
    client: undefined,
    onComplete: undefined,
    studies: undefined,
    viewports: undefined,
    activeIndex: undefined,
  };

  constructor(props) {
    super(props);

    console.info(props);
    const { viewports, activeIndex } = props;
    console.info('activeIndex = ' + activeIndex);

    const viewport = viewports[activeIndex];
    console.info(viewport);

    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      displaySetInstanceUID,
    } = viewport;

    console.info('StudyInstanceUID = ' + StudyInstanceUID);
    console.info('SeriesInstanceUID = ' + SeriesInstanceUID);
    console.info('displaySetInstanceUID = ' + displaySetInstanceUID);

    const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
    console.info(studyMetadata);

    const firstImageId = studyMetadata.getFirstImageId(displaySetInstanceUID);
    console.info(firstImageId);

    const aiaaServerURL = AIAAClient.getCookieURL();
    console.info(aiaaServerURL);

    this.state = {
      aiaaServerURL:
        aiaaServerURL !== null ? aiaaServerURL : 'http://0.0.0.0:5678/',
      firstImageId: firstImageId,
      segModels: [],
      annModels: [],
      deepgrowModels: [],
    };
  }

  handleFetch = () => {
    let segModels = [];
    let annModels = [];
    let deepgrowModels = [];

    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);
    aiaaClient
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
  };

  onClickSegBtn = () => {
  };

  onClickAnnBtn = () => {
  };

  onClickDeepgrowBtn = evt => {
  };

  onNewSegments = evt => {
    // Refer XNATSegmentationPanel to create new segment (locally)
  };

  onDeleteSegments = evt => {
    // Don't know for now.. but might be possible locally
  };

  onFetchSegments = evt => {
    // Reload segments? Also need to think how to sync local created segments back to DICOM series
  };

  render() {
    console.info('Into render......');
    console.info(this.state);
    console.info(this.state.aiaaServerURL);
    console.info(this.state.firstImageId);

    /* CornerstoneTools */
    const segmentationModule = cornerstoneTools.getModule('segmentation');
    const brushStackState =
      segmentationModule.state.series[this.state.firstImageId];
    const labelmap3D = brushStackState
      ? brushStackState.labelmaps3D[brushStackState.activeLabelmapIndex]
      : null;

    const segmentList = [];
    if (labelmap3D) {
      const uniqueSegmentIndexes = labelmap3D.labelmaps2D
        .reduce((acc, labelmap2D) => {
          if (labelmap2D) {
            const segmentIndexes = labelmap2D.segmentsOnLabelmap;

            for (let i = 0; i < segmentIndexes.length; i++) {
              if (!acc.includes(segmentIndexes[i]) && segmentIndexes[i] !== 0) {
                acc.push(segmentIndexes[i]);
              }
            }
          }
          return acc;
        }, [])
        .sort((a, b) => a - b);

      console.info(uniqueSegmentIndexes);

      const colorLutTable =
        segmentationModule.state.colorLutTables[labelmap3D.colorLUTIndex];
      const hasLabelmapMeta = labelmap3D.metadata && labelmap3D.metadata.data;

      for (let i = 0; i < uniqueSegmentIndexes.length; i++) {
        const segmentIndex = uniqueSegmentIndexes[i];
        const color = colorLutTable[segmentIndex];
        let segmentLabel = '(unlabeled)';
        let segmentDescription = '';
        let segmentNumber = segmentIndex;

        /* Meta */
        if (hasLabelmapMeta) {
          const segmentMeta = labelmap3D.metadata.data[segmentIndex];
          if (segmentMeta) {
            segmentNumber = segmentMeta.SegmentNumber;
            segmentLabel = segmentMeta.SegmentLabel;
            segmentDescription = segmentMeta.SegmentDescription;
          }
        }

        const segmentItem = {
          number: segmentNumber,
          label: segmentLabel,
          index: segmentIndex,
          color: color,
          desc: segmentDescription
        };
        segmentList.push(segmentItem);
      }
    }

    console.info(segmentList);

    return (
      <div className="aiaaPanel">
        <h3> NVIDIA Clara AIAA Panel</h3>
        <h4>
          <u>All Segments:</u>
        </h4>
        <table>
          <tbody>
          <tr>
            <td>
              <button className="segButton" onClick={this.onNewSegments}>
                <Icon name="plus" width="12px" height="12px"/>
                Add
              </button>
              &nbsp;
              <button className="segButton" onClick={this.onDeleteSegments}>
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
              <th width="60%">Name</th>
              <th width="30%">Desc</th>
            </tr>
            </thead>
            <tbody>
            {segmentList.map(seg => (
              <tr key={seg.number}>
                <td>
                  <input type="checkbox"/>
                </td>
                <td>
                  <ColoredCircle color={seg.color}/>
                </td>
                <td
                  className="segEdit"
                  contentEditable="true"
                  suppressContentEditableWarning="true"
                >
                  {seg.label}
                </td>
                <td>{seg.desc}</td>
              </tr>
            ))}
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
                href={this.state.aiaaServerURL + 'models'}
                target="_blank"
                rel="noopener noreferrer"
              >
                All models
              </a>

              <b>&nbsp;&nbsp;|&nbsp;&nbsp;</b>

              <a
                href={this.state.aiaaServerURL + 'logs?lines=100'}
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
            <input
              type="radio"
              name="css-tabs"
              id="tab-1"
              defaultChecked
              className="tab-switch"
            />
            <label htmlFor="tab-1" className="tab-label">
              Segmentation
            </label>

            <div className="tab-content">
              <AIAATable
                title="Segmentation Models:"
                models={this.state.segModels}
                api_call={this.onClickSegBtn}
                usage={
                  <p>
                    Fully automated segmentation <b>without any user input</b>.
                    Just select any <i>segmentation</i> model and click to run
                  </p>
                }
              />
            </div>
          </div>

          <div className="tab">
            <input
              type="radio"
              name="css-tabs"
              id="tab-2"
              className="tab-switch"
            />
            <label htmlFor="tab-2" className="tab-label">
              DExtr3D
            </label>

            <div className="tab-content">
              <AIAATable
                title="Annotation (DExtr3D) Models:"
                models={this.state.annModels}
                api_call={this.onClickAnnBtn}
                usage={
                  <div>
                    <p>
                      Generally <b>more accurate</b> but requires user or
                      segmentation model to <i>select/propose extreme points</i>{' '}
                      of the organ.
                    </p>
                    <p>
                      Select a model and <b>Right click</b> to add/collect
                      extreme points (Min: <b>6 points</b> are required)
                    </p>
                  </div>
                }
              />
            </div>
          </div>

          <div className="tab">
            <input
              type="radio"
              name="css-tabs"
              id="tab-3"
              className="tab-switch"
            />
            <label htmlFor="tab-3" className="tab-label">
              DeepGrow
            </label>

            <div className="tab-content">
              <AIAATable
                title="DeepGrow Models:"
                models={this.state.deepgrowModels}
                api_call={this.onClickDeepgrowBtn}
                usage={
                  <div>
                    <p>
                      You can use deepgrow model to annotate <b>any organ</b>.
                    </p>
                    <p>
                      <b>Right click</b> to add <i>foreground points</i> or{' '}
                      <b>Left click</b> to add <i>background points</i>.
                    </p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
