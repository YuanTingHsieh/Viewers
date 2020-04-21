import React, { Component } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'md5.js';
import axios from 'axios';

import { Icon } from '@ohif/ui';
import { UINotificationService, utils } from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

import './AIAAPanel.styl';
import AIAATable from './AIAATable';
import Collapsible from './Collapsible';
import AnnotationBar from './AnnotationBar';

import { AIAAClient, AIAAUtils, AIAAVolume } from '../AIAAService';
import {
  getElementFromFirstImageId,
  getImageIdsForDisplaySet,
  getNextLabelmapIndex,
  getSegmentList,
} from '../utils/genericUtils';
import NIFTIReader from '../utils/NIFTIReader';

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
    const { viewports, studies, activeIndex } = props;
    console.debug('activeIndex = ' + activeIndex);

    this.viewConstants = this.getViewConstants(viewports, studies, activeIndex);

    const aiaaSettings = this.getAIAASettings();
    const segmentList = getSegmentList(this.viewConstants.firstImageId);
    const segments = segmentList.segments;
    const activeSegmentIndex = segmentList.activeSegmentIndex;
    const labelmap3D = segmentList.labelmap3D;

    this.state = {
      aiaaSettings: aiaaSettings,
      // segments
      segments: segments,
      activeSegmentIndex: activeSegmentIndex,
      labelmap3D: labelmap3D,
      //
      segModels: [],
      annModels: [],
      deepgrowModels: [],
      currentSegModel: null,
      currentAnnModel: null,
      currentDeepgrowModel: null,
      extremePoints: new Map(),
      deepgrowPoints: new Map(),
    };
  }

  async componentDidMount() {
    await this.onClickModels();
  }

  getAIAASettings = () => {
    const url = AIAAUtils.getAIAACookie('NVIDIA_AIAA_SERVER_URL', 'http://0.0.0.0:5678/');
    const prefetch = AIAAUtils.getAIAACookieBool('NVIDIA_AIAA_DICOM_PREFETCH', false);
    const server_address = AIAAUtils.getAIAACookie('NVIDIA_AIAA_DICOM_SERVER_ADDRESS', '0.0.0.0');
    const server_port = AIAAUtils.getAIAACookieNumber('NVIDIA_AIAA_DICOM_SERVER_PORT', 11112);
    const ae_title = AIAAUtils.getAIAACookie('NVIDIA_AIAA_DICOM_AE_TITLE', 'DCM4CHEE');

    return {
      url: url,
      dicom: {
        prefetch: prefetch,
        server_address: server_address,
        server_port: server_port,
        ae_title: ae_title,
      },
    };
  };

  saveAIAASettings = () => {
    const { aiaaSettings } = this.state;
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_SERVER_URL', aiaaSettings.url);
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_DICOM_PREFETCH', aiaaSettings.dicom.prefetch);
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_DICOM_SERVER_ADDRESS', aiaaSettings.dicom.server_address);
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_DICOM_SERVER_PORT', aiaaSettings.dicom.server_port);
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_DICOM_AE_TITLE', aiaaSettings.dicom.ae_title);
  };

  getViewConstants = (viewports, studies, activeIndex) => {
    const viewport = viewports[activeIndex];
    const { PatientID } = studies[activeIndex];

    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      displaySetInstanceUID,
    } = viewport;

    const studyMetadata = utils.studyMetadataManager.get(StudyInstanceUID);
    const firstImageId = studyMetadata.getFirstImageId(displaySetInstanceUID);

    const imageIds = getImageIdsForDisplaySet(studies, StudyInstanceUID, SeriesInstanceUID);
    const imageIdsToIndex = new Map();
    for (let i = 0; i < imageIds.length; i++) {
      imageIdsToIndex.set(imageIds[i], i);
    }

    const element = getElementFromFirstImageId(firstImageId);
    const cookiePostfix = new MD5().update(PatientID + StudyInstanceUID + SeriesInstanceUID).digest('hex');

    return {
      PatientID: PatientID,
      StudyInstanceUID: StudyInstanceUID,
      SeriesInstanceUID: SeriesInstanceUID,
      displaySetInstanceUID: displaySetInstanceUID,
      firstImageId: firstImageId,
      imageIdsToIndex: imageIdsToIndex,
      element: element,
      cookiePostfix: cookiePostfix,
    };
  };

  onBlurSeverURL = evt => {
    let value = evt.target.value;
    const aiaaSettings = this.state.aiaaSettings;
    aiaaSettings.url = value;

    this.setState({ aiaaSettings });
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_SERVER_URL', value);
  };

  setModels = (response) => {
    let segModels = [];
    let annModels = [];
    let deepgrowModels = [];

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
  };

  onClickModels = async () => {
    let aiaaClient = new AIAAClient(this.state.aiaaSettings.url);
    let response = await aiaaClient.model_list();
    if (response.status !== 200) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Failed to fetch AIAA models...\nReason: ' + response.data,
        type: 'error',
        duration: 5000,
      });
      return;
    }
    this.setModels(response);

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'Fetched AIAA models complete!',
      type: 'success',
      duration: 2000,
    });
  };

  onCreateOrGetAiaaSession = async () => {
    const { studies } = this.props;
    const { PatientID, StudyInstanceUID, SeriesInstanceUID } = this.viewConstants;

    const cookieId = 'NVIDIA_AIAA_SESSION_ID_' + this.viewConstants.cookiePostfix;
    console.debug('Using cookieId: ' + cookieId);

    let aiaaClient = new AIAAClient(this.state.aiaaSettings.url);
    let c_session_id = AIAAUtils.getAIAACookie(cookieId);
    console.debug('Session ID from COOKIE: ' + c_session_id);

    if (c_session_id) {
      const response = await aiaaClient.getSession(c_session_id);
      console.debug('Is session valid (200 OK)?? => ' + response.status);
      if (response.status === 200) {
        return c_session_id;
      }

      console.debug('Invalidate session (as it might have got expired)');
    }

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'Please wait while creating new AIAA Session!',
      type: 'info',
      duration: 10000,
    });

    // Method 1
    let response = null;
    const prefetch = false;
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

  onSelectSegModel = name => {
    const currentSegModel = this.state.segModels.find(x => x.name === name);
    console.info(currentSegModel);
    this.setState({ currentSegModel });
  };
  onSelectAnnModel = name => {
    const currentAnnModel = this.state.annModels.find(x => x.name === name);
    console.info(currentAnnModel);
    this.setState({ currentAnnModel });
  };
  onSelectDeepgrowModel = name => {
    const currentDeepgrowModel = this.state.deepgrowModels.find(x => x.name === name);
    console.info(currentDeepgrowModel);
    this.setState({ currentDeepgrowModel });
  };

  onClickSegBtn = async () => {
    const model_name = this.state.currentSegModel ? this.state.currentSegModel.name : null;
    console.info('On Click Segmentation: ' + model_name);
    console.info(this.state.currentSegModel);

    if (!model_name) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Model is NOT selected',
        type: 'info',
      });
      throw Error('Model is not selected');
    }

    let aiaaClient = new AIAAClient(this.state.aiaaSettings.url);
    const labels = this.state.currentSegModel.labels;

    // Wait for AIAA session
    // TODO:: Disable the button (avoid double click)
    const session_id = await this.onCreateOrGetAiaaSession();
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

    await this.updateView(response, labels);

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'AIAA Auto-Segmentation complete!',
      type: 'success',
    });
  };

  onDextr3D = async () => {
    const model_name = this.state.currentAnnModel ? this.state.currentAnnModel.name : null;
    console.info('On DExtr3D: ' + model_name);
    console.info(this.state.currentAnnModel);

    if (!model_name) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Model is NOT selected',
        type: 'info',
      });
      throw Error('Model is not selected');
    }

    let aiaaClient = new AIAAClient(this.state.aiaaSettings.url);
    const session_id = await this.onCreateOrGetAiaaSession();
    console.info('Using AIAA Session: ' + session_id);
    if (!session_id) {
      return;
    }

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'Running AIAA DExtr3D...',
      type: 'info',
      duration: 2000,
    });

    const points = this.state.extremePoints.get(this.state.activeSegmentIndex);
    const pts = points.map(p => [p.x, p.y, p.z]);
    let response = await aiaaClient.dextr3d(
      model_name,
      pts,
      null,
      session_id,
    );

    if (response.status !== 200) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Failed to Run DExtr3D...\nReason: ' + response.data,
        type: 'error',
        duration: 5000,
      });
      return;
    }

    await this.updateView(response);
  };

  onDeepgrow = async (sliceIndex) => {
    const model_name = this.state.currentDeepgrowModel ? this.state.currentDeepgrowModel.name : null;
    console.info('Calling Deepgrow: ' + model_name);
    console.info(this.state.currentDeepgrowModel);

    if (!model_name) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Model is NOT selected',
        type: 'info',
      });
      throw Error('Model is not selected');
    }

    let aiaaClient = new AIAAClient(this.state.aiaaSettings.url);
    const session_id = await this.onCreateOrGetAiaaSession();
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

    const points = this.state.deepgrowPoints.get(this.state.activeSegmentIndex);
    const fg = points.filter(p => p.z === sliceIndex && !p.data.ctrlKey).map(p => [p.x, p.y, p.z]);
    const bg = points.filter(p => p.z === sliceIndex && p.data.ctrlKey).map(p => [p.x, p.y, p.z]);

    let response = await aiaaClient.deepgrow(
      model_name,
      fg,
      bg,
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

    await this.updateView(response);
  };

  updateView = async (response, labels) => {
    const niftiReader = new NIFTIReader();
    const { pixelData } = niftiReader.read(response.data);

    if (labels) {
      for (var i = 0; i < labels.length; i++) {
        this.createSegment(labels[i], (i === 0 ? pixelData : null));
      }
      return;
    }

    const { firstImageId } = this.viewConstants;
    const { labelmap3D } = getSegmentList(firstImageId);
    const element = getElementFromFirstImageId(firstImageId);
    this.updateSegment(pixelData, labelmap3D, element);
  };

  createSegment(name, labelmapBuffer) {
    console.debug('Creating New Segment...');

    let { labelmap3D } = this.state;
    const { firstImageId, SeriesInstanceUID } = this.viewConstants;

    // AIAA can update some of the following from the output (DICOM-SEG) of deepgrow/dextr3d
    const newMetadata = {
      SegmentedPropertyCategoryCodeSequence: {
        CodeValue: 'T-D000A',
        CodingSchemeDesignator: 'SRT',
        CodeMeaning: 'Anatomical Structure',
      },
      SegmentNumber: 1,
      SegmentLabel: (name ? name : 'label-1'),
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
      newMetadata.SegmentLabel = (name ? name : ('label_' + newMetadata.SegmentNumber));
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

    const { setters } = cornerstoneTools.getModule('segmentation');
    const element = getElementFromFirstImageId(firstImageId);
    setters.activeSegmentIndex(element, labelmap3D.activeSegmentIndex);

    if (labelmapBuffer) {
      this.updateSegment(labelmapBuffer, labelmap3D, element);
    }

    // Update State...
    const { segments, activeSegmentIndex } = getSegmentList(this.viewConstants.firstImageId);
    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });
  }

  updateSegment(labelmapBuffer, labelmap3D, element) {
    const { studies } = this.props;
    const { StudyInstanceUID, SeriesInstanceUID } = this.viewConstants;

    const imageIds = getImageIdsForDisplaySet(studies, StudyInstanceUID, SeriesInstanceUID);

    // TODO:: Something is wrong.. override is possibily adding as a next labelMapIndex (segment color becomes stronger for every dextr3d click)
    //        For deepgrow it's fine if we use labelmapIndex = 1
    const labelmapIndex = getNextLabelmapIndex(imageIds[0]);
    const { metadata } = labelmap3D;

    const segmentOffset = labelmap3D.activeSegmentIndex - 1;
    console.info('labelmapIndex: ' + labelmapIndex + '; segmentOffset: ' + segmentOffset);

    if (segmentOffset > 0) {
      var z = new Uint16Array(labelmapBuffer);
      for (var i = 0; i < z.length; i++) {
        if (z[i] > 0) {
          z[i] = z[i] + segmentOffset;
        }
      }
    }

    const { setters } = cornerstoneTools.getModule('segmentation');
    setters.labelmap3DByFirstImageId(
      imageIds[0],
      labelmapBuffer,
      labelmapIndex,
      metadata,
      imageIds.length,
    );

    cornerstone.updateImage(element);
  }

  onClickAddSegment = () => {
    this.createSegment();
    this.refreshSegTable();
  };

  onClickSelectSegment = evt => {
    const activeSegmentIndex = parseInt(evt.currentTarget.value);
    console.info('Set activeSegmentIndex: ' + activeSegmentIndex);

    const labelmap3D = this.state.labelmap3D;
    if (labelmap3D) {
      labelmap3D.activeSegmentIndex = activeSegmentIndex;
    }

    const { setters } = cornerstoneTools.getModule('segmentation');
    setters.activeSegmentIndex(this.viewConstants.element, activeSegmentIndex);

    //TODO:: this is immediate... setState is async
    this.state.activeSegmentIndex = activeSegmentIndex;
    this.initPointsAll();
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

    let { labelmap3D } = this.state;
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
    const { firstImageId } = this.viewConstants;
    const segmentList = getSegmentList(firstImageId);
    const { segments, activeSegmentIndex, labelmap3D } = segmentList;
    this.setState({
      segments,
      activeSegmentIndex,
      labelmap3D,
    });

    this.state.activeSegmentIndex = activeSegmentIndex;
    this.initPointsAll();
  }

  loadNiftiData = async (url) => {
    console.debug('Fetch Segments (NIFTI)....');
    var response = await axios.get(url, { responseType: 'arraybuffer' });

    const niftiReader = new NIFTIReader();
    const { pixelData } = niftiReader.read(response.data);
    return pixelData;
  };

  onClickSaveSegments = async () => {
    let url = 'http://10.110.46.111:8002/tf_segmentation_ct_liver_and_tumor_Liver1.nii';
    const pixelData = await this.loadNiftiData(url);

    console.debug('Trying to create a segment with image input...');
    this.createSegment('liver', pixelData);
    this.createSegment('liver tumor');

    let url2 = 'http://10.110.46.111:8002/tf_segmentation_ct_spleen_Liver1.nii';
    const pixelData2 = await this.loadNiftiData(url2);

    console.debug('Trying to create a segment with image input...');
    this.createSegment('spleen', pixelData2);

    console.debug('Finished create a segment with image input...');
    this.refreshSegTable();
  };

  initPointsAll = () => {
    this.initPoints('DExtr3DProbe');
    this.initPoints('DeepgrowProbe');
  };

  initPoints = (toolName) => {
    const { activeSegmentIndex } = this.state;
    const pointsAll = (toolName === 'DExtr3DProbe') ? this.state.extremePoints : this.state.deepgrowPoints;

    console.info('Init Points for: ' + toolName + '; ActiveSegment: ' + activeSegmentIndex);

    // Clear
    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      cornerstoneTools.clearToolState(enabledElement, toolName);
    });

    // Add Points
    const points = pointsAll.get(activeSegmentIndex);
    console.info(points);
    if (points) {
      cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
        for (var i = 0; i < points.length; i++) {
          cornerstoneTools.addToolState(enabledElement, toolName, points[i].data);
        }
      });
    }

    // Refresh
    cornerstone.updateImage(this.viewConstants.element);
  };

  resetPoints = (toolName) => {
    console.info('resetPoints... for: ' + toolName);
    const { activeSegmentIndex } = this.state;
    const pointsAll = (toolName === 'DExtr3DProbe') ? this.state.extremePoints : this.state.deepgrowPoints;

    const points = pointsAll.get(activeSegmentIndex);
    if (points) {
      pointsAll.delete(activeSegmentIndex);
    }

    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      cornerstoneTools.clearToolState(enabledElement, toolName);
    });
    cornerstone.updateImage(this.viewConstants.element);
  };

  getPointData = (evt) => {
    console.debug(evt);

    const { x, y, imageId } = evt.detail;
    const z = this.viewConstants.imageIdsToIndex.get(imageId);

    console.debug('ImageId: ' + imageId);
    console.info('X: ' + x + '; Y: ' + y + '; Z: ' + z);
    return { x, y, z, data: evt.detail };
  };

  dextr3DClickEventHandler = async (data) => {
    const { activeSegmentIndex } = this.state;
    if (!activeSegmentIndex) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Please create/select a label first',
        type: 'warning',
      });
      throw Error('Label is not selected');
    }

    let points = this.state.extremePoints.get(this.state.activeSegmentIndex);
    if (!points) {
      points = [];
      this.state.extremePoints.set(activeSegmentIndex, points);
    }

    points.push(this.getPointData(data));

    console.info(this.state.extremePoints);
    if (points.length === 1) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Keep Adding more extreme points (Min Required: 6)',
        type: 'info',
      });

      // TODO:: Have to avoid multiple requests when user adds 6 points very quickly..
      // this.onCreateOrGetAiaaSession();
    } else if (points.length >= 6) {
      await this.onDextr3D();
    }
  };

  deepgrowClickEventHandler = async (data) => {
    const { activeSegmentIndex } = this.state;
    if (!activeSegmentIndex) {
      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'Please create/select a label first',
        type: 'warning',
      });
      throw Error('Label is not selected');
    }

    let points = this.state.deepgrowPoints.get(activeSegmentIndex);
    if (!points) {
      points = [];
      this.state.deepgrowPoints.set(activeSegmentIndex, points);
    }

    const pointData = this.getPointData(data);
    points.push(pointData);

    console.info(this.state.deepgrowPoints);
    await this.onDeepgrow(pointData.z);
  };


  render() {
    console.debug('Into render......');
    console.debug(this.state);

    // TODO:: Remove AnnotationBar from panel and move it to ToolBar
    //        By default they handle should be received..
    //        Check if cornerstonetoolsmeasurementadded event is good enough to handle instead of custom event name..


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
                onClick={this.onClickSaveSegments}
                title={'Save Segments'}
              >
                <Icon name="reset" width="12px" height="12px"/>
                Save
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
            {this.state.segments.map(seg => (
              <tr key={seg.index}>
                <td>
                  <input
                    type="radio"
                    name="segitem"
                    value={seg.index}
                    onClick={this.onClickSelectSegment}
                    defaultChecked={this.state.activeSegmentIndex === seg.index}
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
                defaultValue={this.state.aiaaSettings.url}
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
                href={this.state.aiaaSettings.url + 'v1/models'}
                target="_blank"
                rel="noopener noreferrer"
              >
                All models
              </a>

              <b>&nbsp;&nbsp;|&nbsp;&nbsp;</b>

              <a
                href={this.state.aiaaSettings.url + 'logs?lines=100'}
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
                <td width="28%"><input type="checkbox" defaultChecked={this.state.aiaaSettings.dicom.prefetch}/></td>
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
                models={this.state.segModels}
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
              defaultChecked
            />
            <label htmlFor="tab-2" className="tab-label">
              DExtr3D
            </label>

            <div className="tab-content">
              <AIAATable
                title="Annotation (DExtr3D) Models:"
                models={this.state.annModels}
                select_call={this.onSelectAnnModel}
                usage={
                  <div>
                    <p>
                      Generally <b>more accurate</b> but requires user or
                      segmentation model to <i>select/propose extreme points</i>{' '}
                      of the organ.
                    </p>
                  </div>
                }
              />
              <AnnotationBar
                toolName="DExtr3DProbe"
                eventHandler={this.dextr3DClickEventHandler}
                firstImageId={this.viewConstants.firstImageId}
                resetPoints={this.resetPoints}
                usage={
                  <div>
                    <ul className="simple-notes">
                      <li><b>Click</b> to add <b><i>extreme</i></b> points</li>
                      <li>Min <b>6 points</b> are required</li>
                    </ul>
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
                select_call={this.onSelectDeepgrowModel}
                usage={
                  <div>
                    <p>
                      You can use deepgrow model to annotate <b>any organ</b>.
                    </p>
                  </div>
                }
              />
              <AnnotationBar
                toolName="DeepgrowProbe"
                eventHandler={this.deepgrowClickEventHandler}
                firstImageId={this.viewConstants.firstImageId}
                resetPoints={this.resetPoints}
                usage={
                  <div>
                    <ul className="simple-notes">
                      <li><b>Click</b> to add <b><i>foreground</i></b> points</li>
                      <li><b>Ctrl + Click</b> to add <b><i>background</i></b> points</li>
                    </ul>
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
