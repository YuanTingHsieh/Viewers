import * as dcmjs from 'dcmjs';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import { getImageIdsForDisplaySet, getNextLabelmapIndex } from './utils/genericUtils';


export default async function loadDicomSeg(
  segArrayBuffer,
  StudyInstanceUID,
  SeriesInstanceUID,
  studies,
) {

  const imageIds = getImageIdsForDisplaySet(
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
  const labelmapIndex = getNextLabelmapIndex(firstImageId);
  console.info('labelmapIndex = ' + labelmapIndex);
  console.info(segMetadata);
  console.info(segmentsOnFrame);

  setters.labelmap3DByFirstImageId(
    firstImageId,
    labelmapBuffer,
    labelmapIndex,
    segMetadata,
    imageIds.length,
    segmentsOnFrame,
  );
}

function _parseSeg(arrayBuffer, imageIds) {
  return dcmjs.adapters.Cornerstone.Segmentation.generateToolState(
    imageIds,
    arrayBuffer,
    cornerstone.metaData,
  );
}