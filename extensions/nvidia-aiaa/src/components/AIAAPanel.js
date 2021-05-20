import React, { Component } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'md5.js';

import { Icon } from '@ohif/ui';
import cornerstoneTools from 'cornerstone-tools';

import { UINotificationService, utils } from '@ohif/core';

import './AIAAPanel.styl';
import { AIAAClient, AIAAUtils, AIAAVolume } from '../AIAAService';
import AIAATable from './AIAATable';
import axios from 'axios';
import cornerstone from 'cornerstone-core';
import loadDicomSeg from '../loadDicomSeg';
import {
  getElementFromFirstImageId,
  getImageIdsForDisplaySet,
  getNextLabelmapIndex,
  getSegmentList,
} from '../utils/genericUtils';
import NIFTIReader from '../utils/NIFTIReader';
import nrrd from 'nrrd-js';

const segmentationUtils = cornerstoneTools.importInternal('util/segmentationUtils');
const { drawBrushPixels, getCircle } = segmentationUtils;

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

class Collapsible extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
    };
    this.togglePanel = this.togglePanel.bind(this);
  }

  togglePanel(e) {
    this.setState({ open: !this.state.open });
  }

  componentDidUpdate() {
  }

  render() {
    return (
      <div>
        <button
          onClick={e => this.togglePanel(e)}
          className={this.state.open ? 'settings_active' : 'settings_header'}
        >
          {this.props.title}
        </button>
        {this.state.open ? (
          <div className="settings_content">{this.props.children}</div>
        ) : null}
      </div>
    );
  }
}


const DICOM_SERVER_INFO = {
  server_address: '10.110.46.111',
  server_port: 11112,
  ae_title: 'DCM4CHEE',
  query_level: 'PATIENT',
  patient_id: 'unknown (not provided)',
  study_uid: null,
  series_uid: null,
};

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
    this.notification = UINotificationService.create({});

    console.debug(props);
    const { viewports, activeIndex, studies } = props;
    console.debug('activeIndex = ' + activeIndex);

    const viewport = viewports[activeIndex];
    console.debug(viewport);

    const { PatientID } = studies[activeIndex];
    console.debug('PatientID = ' + PatientID);

    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      displaySetInstanceUID,
    } = viewport;

    console.debug('StudyInstanceUID = ' + StudyInstanceUID);
    console.debug('SeriesInstanceUID = ' + SeriesInstanceUID);
    console.debug('displaySetInstanceUID = ' + displaySetInstanceUID);

    const studyMetadata = utils.studyMetadataManager.get(StudyInstanceUID);
    console.debug(studyMetadata);

    const firstImageId = studyMetadata.getFirstImageId(displaySetInstanceUID);
    console.debug(firstImageId);

    const imageIds = getImageIdsForDisplaySet(studies, StudyInstanceUID, SeriesInstanceUID);
    const imageIdsToIndex = new Map();
    for (var i = 0; i < imageIds.length; i++) {
      imageIdsToIndex.set(imageIds[i], i);
    }
    console.debug(imageIdsToIndex);

    const aiaaServerURL = AIAAUtils.getAIAACookie('NVIDIA_AIAA_SERVER_URL');
    console.debug(aiaaServerURL);

    let segments = [];
    let activeSegmentIndex = 1;
    let labelmap3D;
    if (firstImageId) {
      const segmentList = getSegmentList(firstImageId);
      segments = segmentList.segments;
      activeSegmentIndex = segmentList.activeSegmentIndex;
      labelmap3D = segmentList.labelmap3D;
    }
    console.debug('segments:' + segments);
    console.debug('activeSegmentIndex:' + activeSegmentIndex);
    console.debug('labelmap3D:' + labelmap3D);

    this.state = {
      // DICOM
      PatientID: PatientID,
      StudyInstanceUID: StudyInstanceUID,
      SeriesInstanceUID: SeriesInstanceUID,
      displaySetInstanceUID: displaySetInstanceUID,
      firstImageId: firstImageId,
      segments: segments,
      activeSegmentIndex: activeSegmentIndex,
      labelmap3D: labelmap3D,
      imageIdsToIndex: imageIdsToIndex,
      // AIAA
      aiaaServerURL: aiaaServerURL !== null ? aiaaServerURL : 'http://0.0.0.0:5678/',
      segModels: [],
      annModels: [],
      deepgrowModels: [],
      currentSegModel: null,
      currentAnnModel: null,
      currentDeepgrowModel: null,
      foregroundPoints: [],
      backgroundPoints: [],
      extremePoints: [],
    };

    this.onClickModels();
  }

  onBlurSeverURL = evt => {
    let value = evt.target.value;
    this.setState({ aiaaServerURL: value });
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_SERVER_URL', value);
  };

  onClickModels = async () => {
    let segModels = [];
    let annModels = [];
    let deepgrowModels = [];

    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);
    let response = await aiaaClient.model_list();
    if (response.status !== 200) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Failed to Create AIAA Session...\nReason: ' + response.data,
        type: 'error',
        duration: 5000,
      });
      return;
    }

    for (let i = 0; i < response.data.length; ++i) {
      if (response.data[i].type === 'annotation') {
        annModels.push(response.data[i]);
      } else if (response.data[i].type === 'segmentation') {
        segModels.push(response.data[i]);
      } else if (response.data[i].type === 'deepgrow') {
        deepgrowModels.push(response.data[i]);
      } else {
        console.warn(response.data[i].name + ' has unsupported types for this plugin');
      }
    }

    const currentSegModel = segModels.length > 0 ? segModels[0] : null;
    const currentAnnModel = annModels.length > 0 ? annModels[0] : null;
    const currentDeepgrowModel = deepgrowModels.length > 0 ? deepgrowModels[0] : null;
    this.setState({
      segModels: segModels,
      annModels: annModels,
      deepgrowModels: deepgrowModels,
      currentSegModel: currentSegModel,
      currentAnnModel: currentAnnModel,
      currentDeepgrowModel: currentDeepgrowModel,
    });

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'Fetched AIAA models complete!',
      type: 'success',
      duration: 2000,
    });
  };

  getAIAASessionCookieID() {
    const { PatientID, StudyInstanceUID, SeriesInstanceUID } = this.state;
    const cookiePostfix = new MD5().update(PatientID + StudyInstanceUID + SeriesInstanceUID).digest('hex');
    return 'NVIDIA_AIAA_SESSION_ID_' + cookiePostfix;
  }

  onCreateOrGetAiaaSession = async (prefetch) => {
    const { studies } = this.props;
    const { PatientID, StudyInstanceUID, SeriesInstanceUID } = this.state;

    const cookieId = this.getAIAASessionCookieID();
    console.debug('Using cookieId: ' + cookieId);

    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);
    var c_session_id = AIAAUtils.getAIAACookie(cookieId);
    console.debug('Session ID from COOKIE: ' + c_session_id);

    if (c_session_id) {
      const response = await aiaaClient.getSession(c_session_id);
      console.debug('Is session valid (200 OK)?? => ' + response.status);
      if (response.status === 200) {
        return c_session_id;
      }

      console.debug('Invalidate session (as it might have got expired)');
    }

    // Method 1
    let response = null;
    if (!prefetch) {
      DICOM_SERVER_INFO.patient_id = PatientID;
      DICOM_SERVER_INFO.series_uid = SeriesInstanceUID;
      DICOM_SERVER_INFO.study_uid = StudyInstanceUID;
      DICOM_SERVER_INFO.query_level = 'SERIES';

      response = await aiaaClient.createSession(null, DICOM_SERVER_INFO);
    } else {
      let aiaaVolume = new AIAAVolume();
      let volumes = await aiaaVolume.createDicomData(
        studies,
        StudyInstanceUID,
        SeriesInstanceUID,
      );
      console.debug('data preparation complete');

      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'AIAA Data preparation complete!',
        type: 'success',
      });
      response = await aiaaClient.createSession(volumes, null);
    }

    if (response.status !== 200) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Failed to Create AIAA Session...\nReason: ' + response.data,
        type: 'error',
        duration: 5000,
      });
      return null;
    }

    const { session_id } = response.data;
    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'AIAA Session create success!',
      type: 'success',
    });

    console.debug('Finishing creating session');
    AIAAUtils.setAIAACookie(cookieId, session_id);
    return session_id;
  };

  onClickSegBtn = async model_name => {
    console.debug('On Click Segmentation: ' + model_name);

    if (!model_name) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Model is NOT selected',
        type: 'info',
      });
      throw Error('Model is not selected');
    }

    const { studies } = this.props;
    const { firstImageId, StudyInstanceUID, SeriesInstanceUID } = this.state;
    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);

    // Wait for AIAA session
    // TODO:: Disable the button (avoid double click)
    const session_id = await this.onCreateOrGetAiaaSession(true);
    console.debug('Using AIAA Session: ' + session_id);
    if (!session_id) {
      return;
    }

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'Running AIAA Auto-Segmentation...',
      type: 'info',
      duration: 10000,
    });

    let response = await aiaaClient.segmentation(
      model_name,
      null,
      session_id,
    );

    if (response.status !== 200) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Failed to Run Auto-Segmentation...\nReason: ' + response.data,
        type: 'error',
        duration: 5000,
      });
      return;
    }

    await loadDicomSeg(
      response.data,
      StudyInstanceUID,
      SeriesInstanceUID,
      studies,
    );

    const segmentList = getSegmentList(firstImageId);
    const segments = segmentList.segments;
    const activeSegmentIndex = segmentList.activeSegmentIndex;
    const labelmap3D = segmentList.labelmap3D;

    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });
    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'AIAA Auto-Segmentation complete!',
      type: 'success',
    });

    const element = getElementFromFirstImageId(firstImageId);
    cornerstone.updateImage(element);
  };

  onClickAnnBtn = () => {
  };

  onSelectSegModel = currentSegModel => {
    this.setState({ currentSegModel });
  };
  onSelectAnnModel = currentAnnModel => {
    this.setState({ currentAnnModel });
  };
  onSelectDeepgrowModel = currentDeepgrowModel => {
    this.setState({ currentDeepgrowModel });
  };

  async runDeepGrow(model_name, foreground, background) {
    console.info('On Click Deepgrow: ' + model_name);

    const { studies } = this.props;
    const { firstImageId, StudyInstanceUID, SeriesInstanceUID } = this.state;
    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);

    // Wait for AIAA session
    const session_id = await this.onCreateOrGetAiaaSession(true);
    console.info('Using AIAA Session: ' + session_id);
    if (!session_id) {
      return;
    }

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'Running AIAA Deepgrow...',
      type: 'info',
      duration: 2000,
    });

    let response = await aiaaClient.deepgrow(
      model_name,
      foreground,
      background,
      null,
      session_id,
    );

    if (response.status !== 200) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Failed to Run Deepgrow...\nReason: ' + response.data,
        type: 'error',
        duration: 5000,
      });
      return;
    }

    await loadDicomSeg(
      response.data,
      StudyInstanceUID,
      SeriesInstanceUID,
      studies,
    );

    const segmentList = getSegmentList(firstImageId);
    const segments = segmentList.segments;
    const activeSegmentIndex = segmentList.activeSegmentIndex;
    const labelmap3D = segmentList.labelmap3D;

    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });

    const element = getElementFromFirstImageId(firstImageId);
    cornerstone.updateImage(element);
  };

  createSegment(name, labelmapBuffer) {
    console.debug('Creating New Segment...');

    let { labelmap3D, firstImageId, SeriesInstanceUID } = this.state;

    // AIAA can update some of the following from the output (DICOM-SEG) of deepgrow/dextr3d
    const newMetadata = {
      SegmentedPropertyCategoryCodeSequence: {
        CodeValue: 'T-D000A',
        CodingSchemeDesignator: 'SRT',
        CodeMeaning: 'Anatomical Structure',
      },
      SegmentNumber: 1,
      SegmentLabel: name,
      SegmentDescription: '',
      SegmentAlgorithmType: 'AUTOMATIC',
      SegmentAlgorithmName: 'CNN',
    };

    console.debug('newMetadata.....');
    console.debug(newMetadata);

    if (labelmap3D) {
      console.debug('Label Map is NOT NULL');
      const { metadata } = labelmap3D;

      let ids = [0];
      for (let i = 1; i < labelmap3D.metadata.data.length; i++) {
        ids.push(labelmap3D.metadata.data[i].SegmentNumber);
      }
      let maxSegmentId = Math.max.apply(Math, ids);
      console.debug('Current Segments: ' + ids);
      console.debug('Max Segment: ' + maxSegmentId);

      newMetadata.SegmentNumber = maxSegmentId + 1;
      newMetadata.SegmentLabel = 'label_' + newMetadata.SegmentNumber;
      metadata.data.push(newMetadata);

      labelmap3D.activeSegmentIndex = metadata.data.length - 1;
    } else {
      console.debug('Label Map is NULL');
      const element = getElementFromFirstImageId(firstImageId);
      const segmentationModule = cornerstoneTools.getModule('segmentation');
      const labelmapData = segmentationModule.getters.labelmap2D(element);

      labelmap3D = labelmapData.labelmap3D;
      const { metadata } = labelmap3D;

      metadata.seriesInstanceUid = SeriesInstanceUID;
      metadata.data = [undefined, newMetadata]; // always 1st one is empty
      labelmap3D.activeSegmentIndex = 1;
    }

    if (labelmapBuffer) {
      const { studies } = this.props;
      const { StudyInstanceUID, SeriesInstanceUID } = this.state;

      const imageIds = getImageIdsForDisplaySet(studies, StudyInstanceUID, SeriesInstanceUID);
      const labelmapIndex = getNextLabelmapIndex(imageIds[0]);
      const { metadata } = labelmap3D;

      const { setters } = cornerstoneTools.getModule('segmentation');
      setters.labelmap3DByFirstImageId(
        imageIds[0],
        labelmapBuffer,
        labelmapIndex,
        metadata,
        imageIds.length,
      );

      const element = getElementFromFirstImageId(firstImageId);
      cornerstone.updateImage(element);
    }

    return labelmap3D;
  }

  updateSegement(name, labelmapBuffer) {
    // TODO:: Challenging task.. update the name, labelmapBuffer etc...
  }

  onClickAddSegment = () => {
    const labelmap3D = this.createSegment('label-1');
    const { segments, activeSegmentIndex } = getSegmentList(this.state.firstImageId);

    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });
  };

  onClickSelectSegment = () => {
    let segItems = [];
    let checkboxes = document.querySelectorAll('input[name=segitem]:checked');
    for (let i = 0; i < checkboxes.length; i++) {
      segItems.push(checkboxes[i].value);
    }
    document.getElementById('segDeleteBtn').disabled = segItems.length
      ? false
      : true;
  };

  onClickDeleteSegments = () => {
    console.debug('Deleting Segment(s)...');
    // TODO:: Erase LabelMap for this segment... hmmm... another challenging task..
    //   (explore: drawBrushPixels kind of utils from SegmentationUtils)
    //   https://github.com/cornerstonejs/cornerstoneTools/tree/master/src/util/segmentation

    let segItems = [];
    let checkboxes = document.querySelectorAll('input[name=segitem]:checked');
    for (let i = 0; i < checkboxes.length; i++) {
      segItems.push(parseInt(checkboxes[i].value));
    }
    console.debug('Delete segments: ' + segItems);
    if (!segItems.length) {
      console.debug('no items selected...');
      return;
    }

    let { firstImageId, labelmap3D } = this.state;
    if (!labelmap3D) {
      console.debug('Label Map is NULL');
      return;
    }

    const { metadata } = labelmap3D;
    let newData = [undefined];
    for (let i = 1; i < labelmap3D.metadata.data.length; i++) {
      const meta = labelmap3D.metadata.data[i];
      if (!segItems.includes(meta.SegmentNumber)) {
        console.debug('Keeping segment: ' + meta.SegmentNumber);
        newData.push(meta);
      } else {
        console.debug('Removing segment: ' + meta.SegmentNumber);
      }
    }

    metadata.data = newData;
    labelmap3D.activeSegmentIndex = metadata.data.length > 0 ? 1 : 0;
    this.refreshSegTable();
  };

  refreshSegTable(updateImage = true) {
    const segmentList = getSegmentList(this.state.firstImageId);
    const { segments, activeSegmentIndex, labelmap3D } = segmentList;
    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });

    if (updateImage) {
      const element = getElementFromFirstImageId(this.state.firstImageId);
      cornerstone.updateImage(element);
    }
  }

  loadNrrdData = async () => {
    console.debug('Reload Segments (NRRD)....');
    let url = 'http://10.110.46.111:8002/spleen_Liver1.nrrd';
    var response = await axios.get(url, { responseType: 'arraybuffer' });

    var data = nrrd.parse(response.data);
    console.log(data);
    return data.buffer;
  };

  loadNiftiData = async () => {
    console.debug('Reload Segments....');
    let url = 'http://10.110.46.111:8002/tf_segmentation_ct_spleen_Liver1.nii';
    var response = await axios.get(url, { responseType: 'arraybuffer' });

    const niftiReader = new NIFTIReader();
    const { pixelData } = niftiReader.read(response.data);
    return pixelData;
  };

  onClickReloadSegments = async () => {
    const pixelData = await this.loadNiftiData();

    console.debug('Trying to create a segment with image input...');
    this.createSegment('label-1', pixelData);

    console.debug('Finished create a segment with image input...');
    this.refreshSegTable();
  };

  onClickClearDeepgrowPoints = () => {
    console.info('Clear Deepgrow Points');
    this.setState({ foregroundPoints: [], backgroundPoints: [] });

    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      cornerstoneTools.clearToolState(enabledElement, 'AIAAProbe');
    });

    const element = getElementFromFirstImageId(this.state.firstImageId);
    cornerstone.updateImage(element);
  };

  onStartStopDeepGrowAnnotation = (e) => {
    console.info('value of checkbox : ', e.target.checked);
    console.info(e);
    if (e.target.checked) {
      this.addEventListeners();

      const toolName = 'AIAAProbe';
      //const apiTool = cornerstoneTools[`${toolName}Tool`];
      //cornerstoneTools.addTool(apiTool);
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
      console.debug('Activated the tool...');

      // TODO:: Is it good idea to clear previous state when enable?
      this.onClickClearDeepgrowPoints();
    } else {
      this.removeEventListeners();
    }
  };

  addEventListeners() {
    this.removeEventListeners();

    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      enabledElement.addEventListener(
        'nvidiaaiaaprobeevent',
        this.deepgrowClickEventHandler.bind(this),
      );
    });
  }

  removeEventListeners() {
    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      enabledElement.removeEventListener(
        'nvidiaaiaaprobeevent',
        this.deepgrowClickEventHandler,
      );
    });
  }

  deepgrowClickEventHandler(evt) {
    const eventData = evt.detail;
    console.debug(eventData);

    const { x, y } = eventData.currentPoints.image;
    const { imageId } = eventData.image;
    const z = this.state.imageIdsToIndex.get(imageId);

    console.debug('ImageId: ' + imageId);
    console.info('X: ' + x + '; Y: ' + y + '; Z: ' + z);

    console.info(this.state);

    const model_name = 'deepgrow_2d';
    let foregroundPoints = this.state.foregroundPoints;
    let backgroundPoints = this.state.backgroundPoints;
    if (eventData.event.ctrlKey) {
      backgroundPoints.push([x, y, z]);
    } else {
      foregroundPoints.push([x, y, z]);
    }

    this.setState({ foregroundPoints, backgroundPoints });
    this.runDeepGrow(model_name, foregroundPoints, backgroundPoints);

    /*
    console.info('Trying to paint the segmentation pixels...');
    const segmentationModule = cornerstoneTools.getModule('segmentation');

    const labelmapData = segmentationModule.getters.labelmap2D(element);
    const labelmap3D = labelmapData.labelmap3D;
    const labelmap2D = labelmapData.labelmap2D;

    const pointerArray = getCircle(100, rows, columns, x, y);
    console.info('Draw Some Brush Pixels ...... ');

    // TODO:: Get PixelArray for current slice from nifti result and paste it here.. should be easy
    const shouldErase = false;
    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase,
    );

    cornerstone.updateImage(element);*/
  }


  render() {
    console.debug('Into render......');
    console.debug(this.state);

    const {
      aiaaServerURL,
      firstImageId,
      labelmap3D,
      segments,
      segModels,
      annModels,
      deepgrowModels,
    } = this.state;

    console.debug(aiaaServerURL);
    console.debug(firstImageId);
    console.debug('Total Segments: ' + segments.length);

    // TODO:: Access more settings values into AIAAPanel...

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
              <button
                className="segButton"
                onClick={this.onClickAddSegment}
                title="Add Segment"
              >
                <Icon name="plus" width="12px" height="12px"/>
                Add
              </button>
              &nbsp;
              <button
                className="segButton"
                onClick={this.onClickDeleteSegments}
                id="segDeleteBtn"
                title="Delete Selected Segment"
              >
                <Icon name="trash" width="12px" height="12px"/>
                Remove
              </button>
            </td>
            <td align="right">
              <button
                className="segButton"
                onClick={this.onClickReloadSegments}
                title={'Reload Segments'}
              >
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
                  <input
                    type="checkbox"
                    name="segitem"
                    value={seg.index}
                    onClick={this.onClickSelectSegment}
                  />
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

        <br/>
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
                href={aiaaServerURL + 'v1/models'}
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

        <Collapsible title="More Settings...">
          <div>
            <table>
              <tbody className="aiaaTable">
              <tr>
                <td width="70%">Enable AIAA Session:</td>
                <td width="2%">&nbsp;</td>
                <td width="28%"><input type="checkbox" defaultChecked/></td>
              </tr>
              <tr>
                <td width="70%">Prefetch Images:</td>
                <td width="2%">&nbsp;</td>
                <td width="28%"><input type="checkbox"/></td>
              </tr>
              </tbody>
            </table>
          </div>
        </Collapsible>

        <div className="tabs">
          <div className="tab">
            <input
              type="radio"
              name="css-tabs"
              id="tab-1"
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
                select_call={this.onSelectSegModel}
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
                select_call={this.onSelectAnnModel}
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
              defaultChecked
            />
            <label htmlFor="tab-3" className="tab-label">
              DeepGrow
            </label>

            <div className="tab-content">
              <AIAATable
                title="DeepGrow Models:"
                models={deepgrowModels}
                select_call={this.onSelectDeepgrowModel}
                usage={
                  <div>
                    <p>
                      You can use deepgrow model to annotate <b>any organ</b>.
                    </p>
                    <div className="pretty p-switch p-fill p-toggle">
                      <input type="checkbox" onChange={this.onStartStopDeepGrowAnnotation}/>
                      <div className="state p-on">
                        <label>Stop Annotation</label>
                      </div>
                      <div className="state p-off">
                        <label>Start Annotation</label>
                      </div>
                    </div>
                    | &nbsp;&nbsp;<a href="#" onClick={this.onClickClearDeepgrowPoints.bind(this)}>Clear Points</a>
                    <div>
                      <ul className="simple-notes">
                        <li><b>Click</b> to add <b><i>foreground</i></b> points</li>
                        <li><b>Ctrl + Click</b> to add <b><i>background</i></b> points</li>
                      </ul>
                    </div>
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
