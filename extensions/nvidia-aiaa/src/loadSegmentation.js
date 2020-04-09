import OHIF from '@ohif/core';
import * as dcmjs from 'dcmjs';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import { getImageIdsForDisplaySet, getNextLabelmapIndex } from './utils/genericUtils';

const { DicomLoaderService } = OHIF.utils;

export default async function loadSegmentation(
  segDisplaySet,
  referencedDisplaySet,
  studies,
) {
  const { StudyInstanceUID } = referencedDisplaySet;

  // Set here is loading is asynchronous.
  // If this function throws its set back to false.
  segDisplaySet.isLoaded = true;

  console.info('About to load the dicom seg here...');
  const segArrayBuffer = await DicomLoaderService.findDicomDataPromise(
    segDisplaySet,
    studies,
  );

  console.info('Reading DICOM seg done...');
  console.info(segArrayBuffer);

  const dicomData = dcmjs.data.DicomMessage.readFile(segArrayBuffer);
  const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
  dataset._meta = dcmjs.data.DicomMetaDictionary.namifyDataset(dicomData.meta);

  const imageIds = getImageIdsForDisplaySet(
    studies,
    StudyInstanceUID,
    referencedDisplaySet.SeriesInstanceUID,
  );

  console.info('Fetching All Images for SEG');
  console.info(imageIds);

  const results = _parseSeg(segArrayBuffer, imageIds);
  if (!results) {
    throw new Error('Fractional segmentations are not yet supported');
  }

  const { labelmapBuffer, segMetadata, segmentsOnFrame } = results;
  const { setters } = cornerstoneTools.getModule('segmentation');

  // TODO: Could define a color LUT based on colors in the SEG.
  const labelmapIndex = getNextLabelmapIndex(imageIds[0]);

  setters.labelmap3DByFirstImageId(
    imageIds[0],
    labelmapBuffer,
    labelmapIndex,
    segMetadata,
    imageIds.length,
    segmentsOnFrame,
  );

  segDisplaySet.labelmapIndex = labelmapIndex;
}

function _parseSeg(arrayBuffer, imageIds) {
  return dcmjs.adapters.Cornerstone.Segmentation.generateToolState(
    imageIds,
    arrayBuffer,
    cornerstone.metaData,
  );
}
