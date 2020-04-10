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
      // AIAA
      aiaaServerURL: aiaaServerURL !== null ? aiaaServerURL : 'http://0.0.0.0:5678/',
      segModels: [],
      annModels: [],
      deepgrowModels: [],
    };

    //this.onClickModels();
  }

  onBlurSeverURL = evt => {
    let value = evt.target.value;
    this.setState({ aiaaServerURL: value });
    AIAAUtils.setAIAACookie('NVIDIA_AIAA_SERVER_URL', value);
  };

  onClickModels = () => {
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
        this.notification.show({
          title: 'NVIDIA AIAA',
          message: 'Fetched AIAA models complete!',
          type: 'success',
          duration: 2000,
        });

        // TODO:: Check + Create AIAA Session if required
        // this.setState({sessionId: sessionId})
      })
      .catch(error => {
        this.notification.show({
          title: 'NVIDIA AIAA',
          message: 'Fetched AIAA models failed!' + error,
          type: 'error',
        });
      });
  };

  onCreateOrGetAiaaSession = async (prefetch) => {
    const { studies } = this.props;
    const { PatientID, StudyInstanceUID, SeriesInstanceUID } = this.state;

    const cookiePostfix = new MD5().update(PatientID + StudyInstanceUID + SeriesInstanceUID).digest('hex');
    const cookieId = 'NVIDIA_AIAA_SESSION_ID_' + cookiePostfix;
    console.info('Using cookieId: ' + cookieId);

    let aiaaClient = new AIAAClient(this.state.aiaaServerURL);
    var c_session_id = AIAAUtils.getAIAACookie(cookieId);
    console.info('Session ID from COOKIE: ' + c_session_id);

    if (c_session_id) {
      const response = await aiaaClient.getSession(c_session_id);
      console.info('Is session valid (200 OK)?? => ' + response.status);
      if (response.status === 200) {
        return c_session_id;
      }

      console.info('Invalidate session (as it might have got expired)');
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
      console.log('data preparation complete');

      this.notification.show({
        title: 'NVIDIA AIAA',
        message: 'AIAA Data preparation complete!',
        type: 'success',
      });

      response = await aiaaClient.createSession(volumes, null);
    }

    console.info(response);
    const { session_id } = response.data;
    console.info('Session ID: ' + session_id + '; Response Session ID: ' + response.data.session_id);

    this.notification.show({
      title: 'NVIDIA AIAA',
      message: 'AIAA Session create success!',
      type: 'success',
    });

    console.log('Finishing creating session');
    AIAAUtils.setAIAACookie(cookieId, session_id);
    return session_id;
  };

  onClickSegBtn = async model_name => {
    console.info('On Click Segmentation: ' + model_name);

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
    console.info('Using AIAA Session: ' + session_id);

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

    console.log(response.data);
    console.log(response.status);
    console.log(response.statusText);

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

  onClickDeepgrowBtn = () => {
  };

  createSegment(name, labelmapBuffer) {
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
      SegmentLabel: name,
      SegmentDescription: '',
      SegmentAlgorithmType: 'AUTOMATIC',
      SegmentAlgorithmName: 'CNN',
    };

    console.info('newMetadata.....');
    console.info(newMetadata);

    if (labelmap3D) {
      console.info('Label Map is NOT NULL');
      const { metadata } = labelmap3D;

      let ids = [0];
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
    console.info('Deleting Segment(s)...');

    let segItems = [];
    let checkboxes = document.querySelectorAll('input[name=segitem]:checked');
    for (let i = 0; i < checkboxes.length; i++) {
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
    let newData = [undefined];
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
    console.info('Reload Segments (NRRD)....');
    let url = 'http://10.110.46.111:8002/spleen_Liver1.nrrd';
    var response = await axios.get(url, { responseType: 'arraybuffer' });

    var data = nrrd.parse(response.data);
    console.log(data);
    return data.buffer;
  };

  loadNiftiData = async () => {
    console.info('Reload Segments....');
    let url = 'http://10.110.46.111:8002/tf_segmentation_ct_spleen_Liver1.nii';
    var response = await axios.get(url, { responseType: 'arraybuffer' });

    const niftiReader = new NIFTIReader();
    const { pixelData } = niftiReader.read(response.data);
    return pixelData;
  };

  onClickReloadSegments = async () => {
    const pixelData = await this.loadNiftiData();

    console.info('Trying to create a segment with image input...');
    this.createSegment('label-1', pixelData);

    console.info('Finished create a segment with image input...');
    this.refreshSegTable();
  };

  onClickAddForeGround = (e) => {
    console.info('value of checkbox : ', e.target.checked);
    if (e.target.checked) {
      this.addEventListeners();

      const toolName = 'AIAAProbe';
      //const apiTool = cornerstoneTools[`${toolName}Tool`];
      //cornerstoneTools.addTool(apiTool);
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
      console.info('Activated the tool...');
    } else {
      this.removeEventListeners();
    }
  };

  addEventListeners() {
    this.removeEventListeners();

    cornerstoneTools.store.state.enabledElements.forEach(enabledElement => {
      enabledElement.addEventListener(
        'nvidiaaiaaprobeevent',
        this.deepgrowClickEventHandler,
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
    console.info('I suppose do something here on every probe...');
    const eventData = evt.detail;
    console.info(eventData);

    const { x, y } = eventData.currentPoints.image;
    console.info('X: ' + x + '; Y: ' + y);

    const element = eventData.element;
    console.info(element);

    const { imageId, rows, columns } = eventData.image;
    console.info('ImageId: ' + imageId);
    console.info('rows: ' + rows + '; columns: ' + columns);

    console.info('Trying to paint the segmentation pixels...');
    const segmentationModule = cornerstoneTools.getModule('segmentation');

    const labelmapData = segmentationModule.getters.labelmap2D(element);
    const labelmap3D = labelmapData.labelmap3D;
    const labelmap2D = labelmapData.labelmap2D;

    const pointerArray = getCircle(100, rows, columns, x, y);
    console.info('Draw Some Brush Pixels ...... ');

    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      false,
    );

    cornerstone.updateImage(element);
  }


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
              defaultChecked
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
                      <label>
                        <input id='btnAddForeGround' type="checkbox" onChange={this.onClickAddForeGround}/>
                        add <i>foreground points</i>
                      </label>
                    </p>
                    <p>
                      <label>
                        <input id='btnAddBackGround' type="checkbox" onChange={this.onClickAddForeGround}/>
                        add <i>background points</i>
                      </label>
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
