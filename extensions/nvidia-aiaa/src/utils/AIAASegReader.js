import nifti from 'nifti-reader-js';
import nrrd from 'nrrd-js';
import pako from 'pako';
import readImageArrayBuffer from 'itk/readImageArrayBuffer';
import writeArrayBuffer from 'itk/writeArrayBuffer';
import config from 'itk/itkConfig';

const pkgJSON = require('../../package.json');
const itkVersion = pkgJSON.dependencies.itk.substring(1);
config.itkModulesPath = 'https://unpkg.com/itk@' + itkVersion; // HACK to use ITK from CDN

export default class AIAASegReader {
  static parseNiftiData(data) {
    if (nifti.isCompressed(data)) {
      data = nifti.decompress(data);
    }
    if (!nifti.isNIFTI(data)) {
      throw Error('Invalid NIFTI Data');
    }

    const header = nifti.readHeader(data);
    const image = nifti.readImage(niftiHeader, data);
    console.debug(header.toFormattedString());

    return {
      header,
      image,
    };
  }

  static parseNrrdData(data) {
    var nrrdfile = nrrd.parse(data);

    // Currently gzip is not supported in nrrd.js
    if (nrrdfile.encoding === 'gzip') {
      const buffer = pako.inflate(nrrdfile.buffer).buffer;

      nrrdfile.encoding = 'raw';
      nrrdfile.data = new Uint16Array(buffer);
      nrrdfile.buffer = buffer;
    }

    const image = nrrdfile.buffer;
    const header = nrrdfile;
    delete header.data;
    delete header.buffer;

    return {
      header,
      image,
    };
  }

  static saveFile(blob, filename) {
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      const a = document.createElement('a');
      document.body.appendChild(a);

      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 0);
    }
  };

  // https://insightsoftwareconsortium.github.io/itk-js/api/browser_io.html
  static serializeNrrdToNii(header, image, filename) {
    const nrrdBuffer = AIAASegReader.serializeNrrd(header, image);

    const reader = readImageArrayBuffer(null, nrrdBuffer, 'temp.nrrd');
    reader.then(function(response) {
      const writer = writeArrayBuffer(response.webWorker, true, response.image, filename);
      writer.then(function(response) {
        AIAASegReader.saveFile(new Blob([response.arrayBuffer]), filename);
        console.info('File downloaded: ' + filename);
      });
    });
  }

  // GZIP write not supported by nrrd-js (so use ITK save with compressed = true)
  static serializeNrrdCompressed(header, image, filename) {
    const nrrdBuffer = AIAASegReader.serializeNrrd(header, image);

    const reader = readImageArrayBuffer(null, nrrdBuffer, 'temp.nrrd');
    reader.then(function(response) {
      const writer = writeArrayBuffer(response.webWorker, true, response.image, filename);
      writer.then(function(response) {
        AIAASegReader.saveFile(new Blob([response.arrayBuffer]), filename);
        console.info('File downloaded: ' + filename);
      });
    });
  }

  static serializeNrrd(header, image, filename) {
    let nrrdOrg = Object.assign({}, header);
    nrrdOrg.buffer = image;
    nrrdOrg.data = new Uint16Array(image);

    const nrrdBuffer = nrrd.serialize(nrrdOrg);
    if (filename) {
      AIAASegReader.saveFile(new Blob([nrrdBuffer]), filename);
      console.info('File downloaded: ' + filename);
    }
    return nrrdBuffer;
  }
}
