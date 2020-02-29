import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';

export default class AIAAVolume {
  constructor() {
    this.metadata = {
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
    this.volume = null;

    this.getOrCreate = this.getOrCreate.bind(this);
  }

  getOrCreate = async viewports => {
    if (this.volume === null) {
      this.volume = await this._createDataVol_byAllPromise(viewports);
    }
    return this.volume;
  };

  _createDataVol_byAllPromise = async viewports => {
    console.log('createDataVol_byAllPromise this takes some time .......');
    console.log(viewports);
    const { viewportSpecificData, activeViewportIndex } = viewports;
    console.log(viewportSpecificData[activeViewportIndex]);

    var elements = cornerstone.getEnabledElements();
    const element = elements[0].element;
    const stackState = cornerstoneTools.getToolState(element, 'stack');

    console.log(stackState);

    // all of the image ids
    const imageIds = stackState.data[0].imageIds;
    this.metadata.nSlices = imageIds.length;

    const loadImagePromises = imageIds.map(cornerstone.loadAndCacheImage);
    var a;

    try {
      const images = await Promise.all(loadImagePromises);
      let firstImage = images[0];

      this.metadata.slope = firstImage.slope;
      this.metadata.intercept = firstImage.intercept;
      this.metadata.rows = firstImage.rows;
      this.metadata.columns = firstImage.columns;
      this.metadata.rowPixelSpacing = firstImage.rowPixelSpacing;
      this.metadata.columnPixelSpacing = firstImage.columnPixelSpacing;
      this.metadata.imagePositionPatient = firstImage.imagePositionPatient;
      const x = this.metadata.columns;
      const y = this.metadata.rows;
      const z = this.metadata.nSlices;
      a = new Int16Array(x * y * z);
      // volDim =[z,x,y];
      for (let i = 0; i < z; i++) {
        let slPix = images[i].getPixelData();
        //OHIF.NVIDIA.dataVol.push('slPix'); //just a hack to stop sending dbuffer before filling up
        for (let j = 0; j < x * y; j++) {
          a[i * x * y + j] = slPix[j];
          // a[i*x*y+j]=slPix[x*y-j-1];
        }
      }
      console.log('createDataVol_byAllPromise completed .......');
      return a;
    } catch (error) {
      console.log('Error in _createDataVol_byAllPromise ' + error);
    }
  };
}
