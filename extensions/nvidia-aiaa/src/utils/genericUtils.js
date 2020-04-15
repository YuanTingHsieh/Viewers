import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

function getImageIdsForDisplaySet(
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
    console.warn(
      'More than one display set with the same SeriesInstanceUID. This is not supported yet...',
    );
    // TODO -> We could make check the instance list and see if any match?
    // Do we split the segmentation into two cornerstoneTools segmentations if there are images in both series?
    // ^ Will that even happen?
  }

  const referencedDisplaySet = displaySets[0];
  return referencedDisplaySet.images.map(image => image.getImageId());
}

function getNextLabelmapIndex(firstImageId) {
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

function getSegmentList(firstImageId) {
  console.debug('Into getSegmentList');
  let activeSegmentIndex = 0;
  let segments = [];

  /* CornerstoneTools */
  const segmentationModule = cornerstoneTools.getModule('segmentation');
  const brushStackState = segmentationModule.state.series[firstImageId];
  const labelmap3D = brushStackState ? brushStackState.labelmaps3D[brushStackState.activeLabelmapIndex] : null;

  if (!labelmap3D) {
    console.debug('LabelMap3D is empty.. so zero segments');
    return { segments, activeSegmentIndex, labelmap3D };
  }

  console.debug('labelmap3D....');
  console.debug(labelmap3D);
  if (!labelmap3D.metadata || !labelmap3D.metadata.data) {
    console.debug('Missing Meta Data for Label; so ignore');
    return { segments, activeSegmentIndex, labelmap3D };
  }

  activeSegmentIndex = labelmap3D.activeSegmentIndex;
  console.debug('activeSegmentIndex: ' + activeSegmentIndex);

  const colorLutTable = segmentationModule.state.colorLutTables[labelmap3D.colorLUTIndex];
  console.debug('Length of colorLutTable: ' + colorLutTable.length);

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

  console.debug('segments....');
  console.debug(segments);
  return { segments, activeSegmentIndex, labelmap3D };
}

function getElementFromFirstImageId(firstImageId) {
  const enabledElements = cornerstone.getEnabledElements();
  for (let i = 0; i < enabledElements.length; i++) {
    const enabledElement = enabledElements[0];
    const { element } = enabledElement;
    const stackState = cornerstoneTools.getToolState(element, 'stack');
    const stackData = stackState.data[0];
    const firstImageIdOfEnabledElement = stackData.imageIds[0];

    if (firstImageIdOfEnabledElement === firstImageId) {
      return element;
    }
  }
}


export {
  getImageIdsForDisplaySet,
  getNextLabelmapIndex,
  getSegmentList,
  getElementFromFirstImageId,
};
