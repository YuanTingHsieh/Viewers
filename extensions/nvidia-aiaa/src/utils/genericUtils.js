import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

//const segmentationUtils = cornerstoneTools.importInternal('util/segmentationUtils');
//const { drawBrushPixels, getCircle } = segmentationUtils;


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

function getLabelmaps3D(element) {
  const stackState = cornerstoneTools.getToolState(element, 'stack');
  const stackData = stackState.data[0];
  const firstImageId = stackData.imageIds[0];

  const { state } = cornerstoneTools.getModule('segmentation');
  const brushStackState = state.series[firstImageId];
  if (!brushStackState) {
    console.info('Bucket State is empty...');
    return { labelmaps3D: null, activeLabelmapIndex: null };
  }

  const { labelmaps3D, activeLabelmapIndex } = brushStackState;
  return { labelmaps3D, activeLabelmapIndex };
}

function getLabelmap3D(element, labelmapIndex) {
  const { labelmaps3D, activeLabelmapIndex } = getLabelmaps3D(element);
  if (!labelmaps3D) {
    console.info('Labelmaps3D is empty...');
    return null;
  }

  labelmapIndex = labelmapIndex === undefined ? activeLabelmapIndex : labelmapIndex;
  return labelmaps3D[labelmapIndex];
}

function getSegmentList(element) {
  let segments = [];
  if (!element) {
    console.info('element is empty... weird...');
    return segments;
  }

  const segmentationModule = cornerstoneTools.getModule('segmentation');
  const { labelmaps3D } = getLabelmaps3D(element);
  if (!labelmaps3D) {
    console.info('LabelMap3D is empty.. so zero segments');
    return segments;
  }

  for (let i = 0; i < labelmaps3D.length; i++) {
    let segs = [];
    const labelmap3D = labelmaps3D[i];

    // TODO:: which one is standard metadata.data[] or metadata[] ???
    const metadata = labelmap3D && labelmap3D.metadata && labelmap3D.metadata.data ? labelmap3D.metadata.data : null;
    const colorLutTable = segmentationModule.state.colorLutTables[labelmap3D.colorLUTIndex];

    if (!metadata) {
      console.warn('Missing Meta Data for Label; so ignore');
    } else {
      for (let j = 1; j < metadata.length; j++) {
        const meta = metadata[j];
        if (!meta) {
          continue;
        }

        const id = i + '+' + meta.SegmentNumber;
        const color = colorLutTable[meta.SegmentNumber];
        const segmentItem = {
          id: id,
          labelmapIndex: i,
          segmentIndex: meta.SegmentNumber,
          color: color,
          meta: meta,
        };
        segs.push(segmentItem);
      }
    }
    segments.push(segs);
  }

  return segments;
}

function createSegment(element, label, newLabelMap = false, labelMeta = null) {
  const { getters, setters } = cornerstoneTools.getModule('segmentation');

  labelMeta = labelMeta ? labelMeta : {
    SegmentedPropertyCategoryCodeSequence: {
      CodeValue: 'T-D000A',
      CodingSchemeDesignator: 'SRT',
      CodeMeaning: 'Anatomical Structure',
    },
    SegmentNumber: 1,
    SegmentLabel: (label ? label : 'label-0-1'),
    SegmentDescription: '',
    SegmentAlgorithmType: 'AUTOMATIC',
    SegmentAlgorithmName: 'CNN',
  };

  if (newLabelMap) {
    const segments = getSegmentList(element);
    let nextLabelmapIndex = segments ? segments.length : 0; // Reuse First Empty LabelMap
    for (let i = 0; i < segments.length; i++) {
      if (!segments[i] || !segments[i].length) {
        nextLabelmapIndex = i;
        break;
      }
    }

    console.info('Next LabelmapIndex: ' + nextLabelmapIndex);
    setters.activeLabelmapIndex(element, nextLabelmapIndex);
  }


  const { labelmap3D, activeLabelmapIndex } = getters.labelmap2D(element);
  console.info('activeLabelmapIndex: ' + activeLabelmapIndex);

  // Add new colorLUT if required for new labelmapIndex
  const { state } = cornerstoneTools.getModule('segmentation');
  if (state.colorLutTables.length <= activeLabelmapIndex) {
    setters.colorLUT(activeLabelmapIndex);
  }
  labelmap3D.colorLUTIndex = activeLabelmapIndex;

  // TODO:: which one is standard metadata.data[] or metadata[] ???
  if (!labelmap3D.metadata || !labelmap3D.metadata.data) {
    labelmap3D.metadata = { data: [undefined] };
  }

  const { metadata } = labelmap3D;
  let nextSegmentId = 1;
  for (let i = 1; i < metadata.data.length; i++) {
    if (nextSegmentId === metadata.data[i].SegmentNumber) {
      nextSegmentId++;
    } else {
      break;
    }
  }
  console.info('Next Segment: ' + nextSegmentId);

  labelMeta.SegmentNumber = nextSegmentId;
  labelMeta.SegmentLabel = (label ? label : ('label_' + activeLabelmapIndex + '-' + nextSegmentId));

  metadata.data.push(labelMeta);
  setters.activeSegmentIndex(element, nextSegmentId);

  return { labelmapIndex: activeLabelmapIndex, segmentIndex: nextSegmentId };
}


function updateSegment(element, labelmapIndex, segmentIndex, buffer, numberOfFrames, operation, slice = -1) {
  const labelmap3D = getLabelmap3D(element, labelmapIndex);
  if (!labelmap3D) {
    console.warn('Missing Label; so ignore');
    return;
  }

  const metadata = labelmap3D.metadata.data ? labelmap3D.metadata.data : labelmap3D.metadata;
  if (!metadata) {
    console.warn('Missing Meta; so ignore');
    return;
  }

  // Segments on LabelMap
  const segmentsOnLabelmap = metadata.filter(x => x && x.SegmentNumber).map(x => x.SegmentNumber);
  segmentsOnLabelmap.unshift(0);
  console.debug(segmentsOnLabelmap);

  const segmentOffset = segmentIndex - 1;
  console.debug('labelmapIndex: ' + labelmapIndex);
  console.debug('segmentIndex: ' + segmentIndex);
  console.debug('segmentOffset: ' + segmentOffset);

  const labelmaps2D = labelmap3D.labelmaps2D;
  const slicelengthInBytes = buffer.byteLength / numberOfFrames;

  if (!labelmaps2D.length || !labelmaps2D[0].segmentsOnLabelmap || !labelmaps2D[0].segmentsOnLabelmap.length) {
    console.info('First time update...');
    operation = undefined;
  }

  // Update Buffer (2D/3D)
  let srcBuffer = labelmap3D.buffer;
  let setSourceBuffer = false;
  for (let i = 0; i < numberOfFrames; i++) {
    if (slice >= 0 && i != slice) { // do only one slice (in case of 3D Volume but 2D result e.g. Deeprow2D)
      continue;
    }

    const sliceOffset = slicelengthInBytes * i;
    const sliceLength = slicelengthInBytes / 2;
    let pixelData = new Uint16Array(buffer, sliceOffset, sliceLength);

    if (operation) {
      let srcPixelData = new Uint16Array(srcBuffer, sliceOffset, sliceLength);
      for (let j = 0; j < srcPixelData.length; j++) {
        if (operation === 'overlap') { // single labelmap => multiple segments
          if (pixelData[j] > 0) {
            srcPixelData[j] = pixelData[j] + segmentOffset;
          }
        } else if (operation === 'override') { // deepgrow case
          // first clean up and add
          if (srcPixelData[j] === segmentIndex) {
            srcPixelData[j] = 0;
          }
          if (pixelData[j] > 0) {
            srcPixelData[j] = pixelData[j] + segmentOffset;
          }
        }
      }

      pixelData = srcPixelData;
      setSourceBuffer = true;
    }

    labelmaps2D[i] = { pixelData, segmentsOnLabelmap };
  }

  labelmap3D.buffer = setSourceBuffer ? srcBuffer : buffer;
  cornerstone.updateImage(element);
}


function deleteSegment(element, labelmapIndex, segmentIndex) {
  if (!element || !segmentIndex) {
    return;
  }

  const labelmap3D = getLabelmap3D(element, labelmapIndex);
  if (!labelmap3D) {
    console.warn('Missing Label; so ignore');
    return;
  }

  // TODO:: which one is standard metadata.data[] or metadata[] ???
  if (labelmap3D.metadata && labelmap3D.metadata.data) {
    let newData = [undefined];
    for (let i = 1; i < labelmap3D.metadata.data.length; i++) {
      const meta = labelmap3D.metadata.data[i];
      if (segmentIndex !== meta.SegmentNumber) {
        newData.push(meta);
      }
    }
    labelmap3D.metadata.data = newData;
  }

  // remove segments mapping
  const labelmaps2D = labelmap3D.labelmaps2D;
  for (let i = 0; i < labelmaps2D.length; i++) {
    const labelmap2D = labelmaps2D[i];
    if (labelmap2D && labelmap2D.segmentsOnLabelmap.includes(segmentIndex)) {
      const indexOfSegment = labelmap2D.segmentsOnLabelmap.indexOf(segmentIndex);
      labelmap2D.segmentsOnLabelmap.splice(indexOfSegment, 1);
    }
  }

  // cleanup buffer
  let z = new Uint16Array(labelmap3D.buffer);
  for (let i = 0; i < z.length; i++) {
    if (z[i] === segmentIndex) {
      z[i] = 0;
    }
  }
  cornerstone.updateImage(element);
}

export {
  getImageIdsForDisplaySet,
  getLabelmaps3D,
  getLabelmap3D,
  getSegmentList,
  createSegment,
  updateSegment,
  deleteSegment,
};
