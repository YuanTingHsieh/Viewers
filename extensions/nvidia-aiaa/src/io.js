import OHIF from '@ohif/core';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';

export function createDataVol_byAllPromise(studies, viewports) {
  console.log('AEH in createDataVol_byAllPromise this takes some time .......');

  var elements = cornerstone.getEnabledElements();
  const element = elements[0].element;
  const stackState = cornerstoneTools.getToolState(element, 'stack');

  const dataArg = {
    seriesInstanceUid: '',
    nSlices: 0,
    slope: 1,
    intercept: 0,
    rows: 0,
    columns: 0,
    columnPixelSpacing: 0,
    rowPixelSpacing: 0,
    seriesDescription: '',
  };

  console.log(stackState);

  // all of the image ids
  const imageIds = stackState.data[0].imageIds;
  dataArg.nSlices = imageIds.length;

  console.log(imageIds);

  Promise.all(cornerstone.load(imageIds[0])).then(firstImage => {
    dataArg.rowPixelSpacing = firstImage.rowPixelSpacing;
    dataArg.columnPixelSpacing = firstImage.columnPixelSpacing;
    dataArg.imagePositionPatient = firstImage.imagePositionPatient;
  });

  // dataArg.columnCosines = imagePlaneOfFirstImage.columnCosines;

  // dataArg.rowCosines = imagePlaneOfFirstImage.rowCosines;

  // // Only using this to check if numbers are close, default to 1 if not present.

  // dataArg.orderOfSliceThickness =
  //   metadataOfFirstImage.instance.sliceThickness || dataArg.rowPixelSpacing;

  // if (metadataOfFirstImage.instance.sliceThickness == undefined) {
  //   console.log(
  //     'AEH NVIDIA ########### data error there is no slice thickness using xy resolution will cause errors'
  //   );
  // }

  // The current imageIdIndex
  // const currentImageIdIndex = stackData.currentImageIdIndex;

  const loadImagePromises = imageIds.map(cornerstone.loadAndCacheImage);

  Promise.all(loadImagePromises).then(images => {
    console.log(images[0]);
    dataArg.slope = images[0].slope;
    dataArg.intercept = images[0].intercept;
    dataArg.rows = images[0].rows;
    dataArg.columns = images[0].columns;

    const x = dataArg.columns;
    const y = dataArg.rows;
    const z = dataArg.nSlices;

    var dataBuf = new Int16Array(x * y * z);

    // volDim =[z,x,y];

    for (let i = 0; i < z; i++) {
      let slPix = images[i].getPixelData();
      OHIF.NVIDIA.dataVol.push('slPix'); //just a hack to stop sending dbuffer before filling up

      for (let j = 0; j < x * y; j++) {
        dataBuf[i * x * y + j] = slPix[j];
        // a[i*x*y+j]=slPix[x*y-j-1];
      }
    }

    return { dataArg, dataBuf };
  });
}

const arrayBufferConcat = function() {
  var length = 0;
  var buffer = null;
  var i;

  for (i = 0; i < arguments.length; i++) {
    buffer = arguments[i];
    length += buffer.byteLength;
  }

  var joined = new Uint8Array(length);
  var offset = 0;
  for (i = 0; i < arguments.length; i++) {
    buffer = arguments[i];
    joined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return joined.buffer;
};

export function nifti_serialize(
  dst_array,
  resolution,
  imagePositionPatient,
  slope = 1,
  intercept = 0
) {
  let buffer = new ArrayBuffer(352); //header of the nifty file 352 bytes for any nifti
  for (let i = 0; i < buffer.byteLength; ++i) {
    buffer[i] = 0;
  }

  // read https://brainder.org/2012/09/23/the-nifti-file-format/

  let headerLength = new Int32Array(buffer, 0, 1);
  let dim = new Int16Array(buffer, 40, 8);
  let datatype = new Int16Array(buffer, 70, 1);
  let bitpix = new Int16Array(buffer, 72, 1);
  let pixdim = new Float32Array(buffer, 76, 8);
  let voxoffset = new Float32Array(buffer, 108, 1);
  let scl_slope = new Float32Array(buffer, 112, 1);
  let scl_inter = new Float32Array(buffer, 116, 1); //AEH added
  let xyzt_units = new Int8Array(buffer, 123, 1);

  let qform_sform = new Int16Array(buffer, 252, 1);
  let sform_code = new Int16Array(buffer, 254, 1); //AEH added
  let qoffset_x = new Float32Array(buffer, 268, 1); //AEH added
  let qoffset_y = new Float32Array(buffer, 272, 1); //AEH added
  let qoffset_z = new Float32Array(buffer, 276, 1); //AEH added
  let tform = new Float32Array(buffer, 280, 12);
  let magic = new Uint8Array(buffer, 344, 4);

  headerLength[0] = 348;

  dim[0] = 3;
  dim[1] = dst_array.shape[2];
  dim[2] = dst_array.shape[1];
  dim[3] = dst_array.shape[0];
  dim[4] = 1;
  dim[5] = 1;
  dim[6] = 1;
  dim[7] = 1;

  var code_BitPix = [4, 16];
  datatype[0] = code_BitPix[0];
  bitpix[0] = code_BitPix[1];
  pixdim[0] = 1;
  pixdim[1] = resolution[0];
  pixdim[2] = resolution[1];
  pixdim[3] = resolution[2];

  voxoffset[0] = 352; // where real data starts in float format (according to above)

  // scl_slope[0] = 1;

  scl_slope[0] = slope;
  scl_inter[0] = intercept;
  qoffset_x[0] = -imagePositionPatient.x;
  qoffset_y[0] = -imagePositionPatient.y;
  qoffset_z[0] = -imagePositionPatient.z;
  xyzt_units[0] = 10; // as original file

  qform_sform[0] = 0;
  sform_code[0] = 2; //1;

  // discard transform for now

  tform[0] = -1.0 * resolution[0];
  tform[5] = -1.0 * resolution[1];
  tform[10] = -1.0 * resolution[2];
  tform[3] = -imagePositionPatient.x;
  tform[7] = -imagePositionPatient.y;
  tform[11] = imagePositionPatient.z;
  magic[0] = 110;
  magic[1] = 43;
  magic[2] = 49;
  magic[3] = 0;

  // var result = arrayBufferConcat(buffer, dst_array.data.buffer)

  var result = arrayBufferConcat(buffer, dst_array.data);

  // result =pako.deflate(result).buffer;

  return result;
}
