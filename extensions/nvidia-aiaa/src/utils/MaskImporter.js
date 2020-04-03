import NIFTIReader from './NIFTIReader.js';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import { OHIF } from '@ohif/core';

const globalToolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

export default class MaskImporter {
  constructor(StudyInstanceUID, SeriesInstanceUID, studies) {
    const imageIds = this._getImageIds(studies, StudyInstanceUID, SeriesInstanceUID);

    console.info(imageIds[0]);
    const { rows, columns } = cornerstone.metaData.get(
      'imagePlaneModule',
      imageIds[0],
    );

    const dimensions = {
      rows,
      columns,
      slices: imageIds.length,
    };
    console.info(dimensions);

    dimensions.sliceLength = dimensions.rows * dimensions.columns;
    dimensions.cube = dimensions.sliceLength * dimensions.slices;
    console.info(dimensions);

    this._seriesInstanceUid = SeriesInstanceUID;
    this._imageIds = imageIds;
    this._dimensions = dimensions;
    this._numberOfColors = 2;
  }

  _getImageIds(
    studies,
    StudyInstanceUID,
    SeriesInstanceUID,
  ) {
    const study = studies.find(
      study => study.StudyInstanceUID === StudyInstanceUID,
    );

    const displaySets = study.displaySets.filter(displaySet => {
      return displaySet.SeriesInstanceUID === SeriesInstanceUID;
    });

    if (displaySets.length > 1) {
      console.warn('More than one display set with the same SeriesInstanceUID. This is not supported yet...');
    }

    const referencedDisplaySet = displaySets[0];
    return referencedDisplaySet.images.map(image => image.getImageId());
  }

  importNIFTI(niftyArrayBuffer) {
    const niftiReader = new NIFTIReader(this._seriesInstanceUid);
    const masks = niftiReader.read(
      niftyArrayBuffer,
      this._imageIds,
      this._dimensions,
    );

    console.log(masks);
    this._addNIFTIMasksToCornerstone(masks);
  }

  _addNIFTIMasksToCornerstone(masks) {
    const dimensions = this._dimensions;
    const sliceLength = dimensions.sliceLength;

    const imageIds = this._imageIds;
    const toolState = globalToolStateManager.saveToolState();

    this._initialiseBrushStateNifti(toolState, imageIds);

    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i];

      for (let j = 0; j < dimensions.slices; j++) {
        const pixelData = new Uint8ClampedArray(sliceLength);
        for (let k = 0; k < pixelData.length; k++) {
          pixelData[k] = mask[j * sliceLength + k] ? 1 : 0;
        }

        const imageId = imageIds[j];
        toolState[imageId].brush.data[i] = {
          pixelData,
          invalidated: true,
        };
      }
    }

    globalToolStateManager.restoreToolState(toolState);

    const activeEnabledElement = OHIF.viewerbase.viewportUtils.getEnabledElementForActiveElement();
    const element = activeEnabledElement.element;

    cornerstone.updateImage(element);
  }

  _initialiseBrushStateNifti(toolState, imageIds) {
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];

      if (!toolState[imageId]) {
        toolState[imageId] = {};
        toolState[imageId].brush = {};
      } else if (!toolState[imageId].brush) {
        toolState[imageId].brush = {};
      }

      toolState[imageId].brush.data = [];
      const brushData = toolState[imageId].brush.data;

      for (let j = 0; j < this._numberOfColors; j++) {
        brushData.push({});
      }
    }
  }
}
