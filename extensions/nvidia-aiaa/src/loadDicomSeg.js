import * as dcmjs from 'dcmjs';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';

export default async function loadDicomSeg(
  segArrayBuffer,
  StudyInstanceUID,
  SeriesInstanceUID,
  studies,
) {
  const imageIds = _getImageIdsForDisplaySet(
    studies,
    StudyInstanceUID,
    SeriesInstanceUID,
  );

  console.info('Fetching All Images for SEG; Length = ' + imageIds.length);
  //console.info(imageIds);

  const results = _parseSeg(segArrayBuffer, imageIds);
  console.info(results);

  if (!results) {
    throw new Error('Fractional segmentations are not yet supported');
  }

  const { labelmapBuffer, segMetadata, segmentsOnFrame } = results;
  const { setters } = cornerstoneTools.getModule('segmentation');

  // Delete old labelmap
  const firstImageId = imageIds[0];
  console.info(firstImageId);

  const segmentationModule = cornerstoneTools.getModule('segmentation');
  if (segmentationModule.state.series[firstImageId]) {
    console.info('Delete old labelmap');
    delete segmentationModule.state.series[firstImageId];
  }

  // TODO: Could define a color LUT based on colors in the SEG.
  const labelmapIndex = _getNextLabelmapIndex(firstImageId);
  console.info('labelmapIndex = ' + labelmapIndex);
  console.info(segMetadata);

  setters.labelmap3DByFirstImageId(
    firstImageId,
    labelmapBuffer,
    labelmapIndex,
    segMetadata,
    imageIds.length,
    segmentsOnFrame,
  );
}

function _getNextLabelmapIndex(firstImageId) {
  const { state } = cornerstoneTools.getModule('segmentation');
  const brushStackState = state.series[firstImageId];

  let labelmapIndex = 0;

  if (brushStackState) {
    const { labelmaps3D } = brushStackState;
    labelmapIndex = labelmaps3D.length;

    for (let i = 0; i < labelmaps3D.length; i++) {
      if (!labelmaps3D[i]) {
        labelmapIndex = i;
        break;
      }
    }
  }

  return labelmapIndex;
}

function _parseSeg(arrayBuffer, imageIds) {
  return dcmjs.adapters.Cornerstone.Segmentation.generateToolState(
    imageIds,
    arrayBuffer,
    cornerstone.metaData,
  );
}

function _getImageIdsForDisplaySet(
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
    // TODO -> We could make check the instance list and see if any match?
    // Do we split the segmentation into two cornerstoneTools segmentations if there are images in both series?
    // ^ Will that even happen?
  }

  const referencedDisplaySet = displaySets[0];
  return referencedDisplaySet.images.map(image => image.getImageId());
}
