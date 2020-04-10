import nifti from 'nifti-reader-js';

export default class NIFTIReader {
  constructor() {
  }

  read(data) {
    if (nifti.isCompressed(data)) {
      data = nifti.decompress(data);
    }
    if (!nifti.isNIFTI(data)) {
      throw Error('Invalid NIFTI Data');
    }

    const niftiHeader = nifti.readHeader(data);
    const niftiImage = nifti.readImage(niftiHeader, data);

    console.info('NIFTI Header');
    console.info(niftiHeader.toFormattedString());

    console.info('NIFTI Image');
    console.info(niftiImage);

    const pixelData = NIFTIReader.getPixelData(niftiHeader, niftiImage);
    console.info('Pixel Data');
    console.info(pixelData);

    return {
      niftiHeader,
      niftiImage,
      pixelData,
    };
  }

  static getPixelData(niftiHeader, niftiImage) {
    var typedData = niftiImage;

    console.info('NIFTI HEADER => datatypeCode: ' + niftiHeader.datatypeCode);
    if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
      typedData = new Uint8Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
      typedData = niftiImage; // Same as Expected;  No need to convert...
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
      typedData = new Int32Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
      typedData = new Float32Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
      typedData = new Float64Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
      typedData = new Int8Array(niftiImage);
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
      typedData = niftiImage; // Same as Expected;  No need to convert...
    } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
      typedData = new Uint32Array(niftiImage);
    }
    return typedData;
  }
}
