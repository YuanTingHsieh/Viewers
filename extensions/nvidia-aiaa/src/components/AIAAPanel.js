import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';
import cornerstoneTools, { getToolState } from 'cornerstone-tools';
import { UINotificationService, utils } from '@ohif/core';

import './AIAAPanel.styl';
import AIAAClient from '../AIAAService/AIAAClient';
import AIAAVolume from '../AIAAService/AIAAVolume';
import AIAATable from './AIAATable';
import axios from 'axios';
import cornerstone from 'cornerstone-core';
import loadDicomSeg from '../loadDicomSeg';
import MaskImporter from '../utils/MaskImporter';

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
    studies: PropTypes.any,
    viewports: PropTypes.any,
    activeIndex: PropTypes.any,
  };

  static defaultProps = {
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

    let segments = [];
    let activeSegmentIndex = 1;
    let labelmap3D;
    if (firstImageId) {
      const segmentList = AIAAPanel.getSegmentList(firstImageId);
      segments = segmentList.segments;
      activeSegmentIndex = segmentList.activeSegmentIndex;
      labelmap3D = segmentList.labelmap3D;
    }
    console.info('segments:' + segments);
    console.info('activeSegmentIndex:' + activeSegmentIndex);
    console.info('labelmap3D:' + labelmap3D);

    this.state = {
      aiaaServerURL: aiaaServerURL !== null ? aiaaServerURL : 'http://0.0.0.0:5678/',
      StudyInstanceUID: StudyInstanceUID,
      SeriesInstanceUID: SeriesInstanceUID,
      displaySetInstanceUID: displaySetInstanceUID,
      firstImageId: firstImageId,
      segments: segments,
      activeSegmentIndex: activeSegmentIndex,
      labelmap3D: labelmap3D,
      segModels: [],
      annModels: [],
      deepgrowModels: [],
    };
  }

  static getSegmentList(firstImageId) {
    console.info('Into getSegmentList');
    let activeSegmentIndex = 0;
    let segments = [];

    /* CornerstoneTools */
    const segmentationModule = cornerstoneTools.getModule('segmentation');
    const brushStackState = segmentationModule.state.series[firstImageId];
    const labelmap3D = brushStackState ? brushStackState.labelmaps3D[brushStackState.activeLabelmapIndex] : null;

    if (!labelmap3D) {
      console.info('LabelMap3D is empty.. so zero segments');
      return { segments, activeSegmentIndex, labelmap3D };
    }

    console.info('labelmap3D....');
    console.info(labelmap3D);
    if (!labelmap3D.metadata || !labelmap3D.metadata.data) {
      console.info('Missing Meta Data for Label; so ignore');
      return { segments, activeSegmentIndex, labelmap3D };
    }

    activeSegmentIndex = labelmap3D.activeSegmentIndex;
    console.info('activeSegmentIndex: ' + activeSegmentIndex);

    const colorLutTable = segmentationModule.state.colorLutTables[labelmap3D.colorLUTIndex];
    console.info('Length of colorLutTable: ' + colorLutTable.length);
    for (let i = 1; i < labelmap3D.metadata.data.length; i++) {
      const meta = labelmap3D.metadata.data[i];
      const index = meta.SegmentNumber;
      const color = colorLutTable[index]; // TODO:: Should not be this way to define the color

      const segmentItem = {
        index: index,
        color: color,
        meta: meta,
      };
      segments.push(segmentItem);
    }

    console.info('segments....');
    console.info(segments);
    return { segments, activeSegmentIndex, labelmap3D };
  }

  static getElementFromFirstImageId(firstImageId) {
    const enabledElements = cornerstone.getEnabledElements();
    for (let i = 0; i < enabledElements.length; i++) {
      const enabledElement = enabledElements[0];
      const { element } = enabledElement;
      const stackState = getToolState(element, 'stack');
      const stackData = stackState.data[0];
      const firstImageIdOfEnabledElement = stackData.imageIds[0];

      if (firstImageIdOfEnabledElement === firstImageId) {
        return element;
      }
    }
  }

  onBlurSeverURL = evt => {
    let value = evt.target.value;
    this.setState({ aiaaServerURL: value });
  };

  onClickModels = () => {
    let segModels = [];
    let annModels = [];
    let deepgrowModels = [];

    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);
    let notification = UINotificationService.create({});
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
        notification.show({
          title: 'AIAA logs',
          message: 'Fetched AIAA models complete!',
          type: 'success',
        });
      })
      .catch(error => {
        notification.show({
          title: 'AIAA logs',
          message: 'Fetched AIAA models failed!' + error,
          type: 'error',
        });
      });
  };

  onClickSegBtn = (model_name) => {
    console.info('On Click Segmentation: ' + model_name);

    let notification = UINotificationService.create({});
    if (!model_name) {
      notification.show({
        title: 'AIAA logs',
        message: 'Model is NOT selected',
        type: 'info',
      });
      return;
    }

    const { studies, viewports } = this.props;
    const { firstImageId, StudyInstanceUID, SeriesInstanceUID } = this.state;

    let aiaaVolume = new AIAAVolume();
    aiaaVolume.createDataVol(viewports).then(volume => {
      let niiBuffer = aiaaVolume.buffer2NiiArr(volume);
      var image_in = new Blob([niiBuffer], {type: "application/octet-stream"});

      notification.show({
        title: 'AIAA logs',
        message: 'AIAA Data preparation complete!',
        type: 'success',
      });

      let aiaaClient = new AIAAClient(this.state.aiaaServerURL);
      aiaaClient
        .segmentation(model_name, image_in)
        .then(response => {
          console.log(response.data);
          console.log(response.status);
          console.log(response.statusText);

          const maskImporter = new MaskImporter(SeriesInstanceUID);
          maskImporter.importNIFTI(response.data);
          //loadDicomSeg(response.data, StudyInstanceUID, SeriesInstanceUID, studies);

          const segmentList = AIAAPanel.getSegmentList(firstImageId);
          const segments = segmentList.segments;
          const activeSegmentIndex = segmentList.activeSegmentIndex;
          const labelmap3D = segmentList.labelmap3D;

          this.setState({
            segments,
            activeSegmentIndex,
            labelmap3D
          });
        })
        .then(() => {
          notification.show({
            title: 'AIAA logs',
            message: 'AIAA Auto-Segmentation complete!',
            type: 'success',
          });
        })
        .catch(error => {
          console.error(error);
          notification.show({
            title: 'AIAA logs',
            message: 'AIAA Auto-Segmentation failed!' + error,
            type: 'error',
          });
        });
    });
  };

  onClickAnnBtn = () => {
  };

  onClickDeepgrowBtn = () => {
  };

  onClickAddSegment = () => {
    console.info('Creating New Segment...');

    let { labelmap3D, firstImageId, SeriesInstanceUID } = this.state;

    // AIAA can update some of the following from the output (DICOM-SEG) of deepgrow/dextr3d
    const newMetadata = {
      SegmentedPropertyCategoryCodeSequence: {
        CodeValue: 'T-D000A',
        CodingSchemeDesignator: 'SRT',
        CodeMeaning: 'Anatomical Structure',
      },
      SegmentNumber: 1,
      SegmentLabel: 'label-1',
      SegmentDescription: '',
      SegmentAlgorithmType: 'AUTOMATIC',
      SegmentAlgorithmName: 'CNN',
    };

    console.info('newMetadata.....');
    console.info(newMetadata);

    if (labelmap3D) {
      console.info('Label Map is NOT NULL');
      const { metadata } = labelmap3D;

      var ids = [0];
      for (let i = 1; i < labelmap3D.metadata.data.length; i++) {
        ids.push(labelmap3D.metadata.data[i].SegmentNumber);
      }
      let maxSegmentId = Math.max.apply(Math, ids);
      console.info('Current Segments: ' + ids);
      console.info('Max Segment: ' + maxSegmentId);

      newMetadata.SegmentNumber = maxSegmentId + 1;
      newMetadata.SegmentLabel = 'label_' + newMetadata.SegmentNumber;
      metadata.data.push(newMetadata);

      labelmap3D.activeSegmentIndex = metadata.data.length - 1;
    } else {
      console.info('Label Map is NULL');
      const element = AIAAPanel.getElementFromFirstImageId(firstImageId);
      const segmentationModule = cornerstoneTools.getModule('segmentation');
      const labelmapData = segmentationModule.getters.labelmap2D(element);

      labelmap3D = labelmapData.labelmap3D;
      const { metadata } = labelmap3D;

      metadata.seriesInstanceUid = SeriesInstanceUID;
      metadata.data = [undefined, newMetadata]; // always 1st one is empty
      labelmap3D.activeSegmentIndex = 1;
    }

    const segmentList = AIAAPanel.getSegmentList(firstImageId);
    const segments = segmentList.segments;
    const activeSegmentIndex = segmentList.activeSegmentIndex;

    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });
  };

  onClickSelectSegment = () => {
    var segItems = [];
    var checkboxes = document.querySelectorAll('input[name=segitem]:checked');
    for (var i = 0; i < checkboxes.length; i++) {
      segItems.push(checkboxes[i].value);
    }
    document.getElementById('segDeleteBtn').disabled = segItems.length ? false : true;
  };

  onClickDeleteSegments = () => {
    console.info('Deleting Segment(s)...');

    var segItems = [];
    var checkboxes = document.querySelectorAll('input[name=segitem]:checked');
    for (var i = 0; i < checkboxes.length; i++) {
      segItems.push(parseInt(checkboxes[i].value));
    }
    console.info('Delete segments: ' + segItems);
    if (!segItems.length) {
      console.info('no items selected...');
      return;
    }

    let { firstImageId, labelmap3D } = this.state;
    if (!labelmap3D) {
      console.info('Label Map is NULL');
      return;
    }

    const { metadata } = labelmap3D;
    var newData = [undefined];
    for (let i = 1; i < labelmap3D.metadata.data.length; i++) {
      const meta = labelmap3D.metadata.data[i];
      if (!segItems.includes(meta.SegmentNumber)) {
        console.info('Keeping segment: ' + meta.SegmentNumber);
        newData.push(meta);
      } else {
        console.info('Removing segment: ' + meta.SegmentNumber);
      }
    }

    metadata.data = newData;
    labelmap3D.activeSegmentIndex = metadata.data.length > 0 ? 1 : 0;

    const segmentList = AIAAPanel.getSegmentList(firstImageId);
    const segments = segmentList.segments;
    const activeSegmentIndex = segmentList.activeSegmentIndex;

    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });
  };

  onClickReloadSegments = () => {
    console.info('Reload Segments....');
    //var url = 'http://10.110.46.111:8002/DICOM/DDE0450D/093970D7/1E223919';
    var url = 'http://10.110.46.111:8002/liver.dcm';
    var url = 'http://10.110.46.111:8002/spleen_dicom_output.nii';
    axios.get(url, { responseType: 'arraybuffer' })
      .then((response) => {
        console.log(response.data);
        console.log(response.status);
        console.log(response.statusText);

        const { firstImageId, StudyInstanceUID, SeriesInstanceUID } = this.state;
        const { studies } = this.props;

        //loadDicomSeg(response.data, StudyInstanceUID, SeriesInstanceUID, studies);
        const maskImporter = new MaskImporter(StudyInstanceUID, SeriesInstanceUID, studies);
        maskImporter.importNIFTI(response.data);

        const segmentList = AIAAPanel.getSegmentList(firstImageId);
        const segments = segmentList.segments;
        const activeSegmentIndex = segmentList.activeSegmentIndex;
        const labelmap3D = segmentList.labelmap3D;

        this.setState({
          segments,
          activeSegmentIndex,
          labelmap3D
        });

        // TODO:: How to refresh ViewPort here.. Currently, you have to sroll to differnt slice to see the mask..
      });
  };

  render() {
    console.info('Into render......');
    console.info(this.state);

    const {
      aiaaServerURL,
      firstImageId,
      labelmap3D,
      segments,
      segModels,
      annModels,
      deepgrowModels,
    } = this.state;

    console.info(aiaaServerURL);
    console.info(firstImageId);
    console.info('Total Segments: ' + segments.length);

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
              <button className="segButton" onClick={this.onClickAddSegment}>
                <Icon name="plus" width="12px" height="12px"/>
                Add
              </button>
              &nbsp;
              <button className="segButton" onClick={this.onClickDeleteSegments} id="segDeleteBtn">
                <Icon name="trash" width="12px" height="12px"/>
                Remove
              </button>
            </td>
            <td align="right">
              <button className="segButton" onClick={this.onClickReloadSegments}>
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
            {segments.map(seg => (
              <tr key={seg.index}>
                <td>
                  <input type="checkbox" name="segitem" value={seg.index} onClick={this.onClickSelectSegment}/>
                </td>
                <td>
                  <ColoredCircle color={seg.color}/>
                </td>
                <td
                  className="segEdit"
                  contentEditable="true"
                  suppressContentEditableWarning="true"
                >
                  {seg.meta.SegmentLabel}
                </td>
                <td
                  contentEditable="true"
                  suppressContentEditableWarning="true"
                >
                  {seg.meta.SegmentDescription}
                </td>
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
                defaultValue={aiaaServerURL}
                onBlur={this.onBlurSeverURL}
              />
            </td>
            <td width="2%">&nbsp;</td>
            <td width="18%">
              <button className="aiaaButton" onClick={this.onClickModels}>
                <Icon name="reset" width="16px" height="16px"/>
              </button>
            </td>
          </tr>
          <tr>
            <td colSpan="3">
              <a
                href={aiaaServerURL + 'models'}
                target="_blank"
                rel="noopener noreferrer"
              >
                All models
              </a>

              <b>&nbsp;&nbsp;|&nbsp;&nbsp;</b>

              <a
                href={aiaaServerURL + 'logs?lines=100'}
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
                models={segModels}
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
                models={annModels}
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
                models={deepgrowModels}
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
