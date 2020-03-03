import axios from 'axios';

function set_cookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
  console.log('AEH -------------------set cookie', name, ' value=', value);

  var cookie_string = name + '=' + escape(value);

  if (exp_y) {
    var expires = new Date(exp_y, exp_m, exp_d);

    cookie_string += '; expires=' + expires.toGMTString();
  }

  if (path) cookie_string += '; path=' + escape(path);

  if (domain) cookie_string += '; domain=' + escape(domain);

  if (secure) cookie_string += '; secure';

  document.cookie = cookie_string;
}

function get_cookie(cookie_name) {
  var results = document.cookie.match(
    '(^|;) ?' + cookie_name + '=([^;]*)(;|$)'
  );

  if (results) return unescape(results[2]);
  else return null;
}

export default class AIAAClient {
  constructor(server_url, api_version = 'v1') {
    this.server_url = server_url;
    this.api_version = api_version;
    this.logs_api = 'logs?lines=100';
    this.model_api = 'models';
    this.dextr3d_api = 'dextr3d';
    this.deepgrow_api = 'deepgrow';
    this.segmentation_api = 'segmentation';
    this.mask2polygon_api = 'mask2polygon';
    this.fixpolygon_api = 'fixpolygon';
    this.cachedSegModels = [];
    this.cachedAnnModels = [];
    this.cachedDeepgrowModels = [];

    // TODO: where to put the invoke logic
    //   in ToolBar or Panel???
    this.currSegModel = '';
    this.currAnnModel = '';
    this.currDeepgrowModel = '';
    this._checkServer();
  }

  static getCookieURL() {
    return get_cookie('nvidiaAIAAServerUrl');
  }

  _checkServer() {
    this.model_list()
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.log(error);
      });
  }

  setServerURL(url) {
    this.server_url = url;
    console.log('calling set server url');
    set_cookie('nvidiaAIAAServerUrl', url);
  }

  getServerURL() {
    return this.server_url;
  }

  getModelsURL() {
    return this.server_url + '/' + this.api_version + '/' + this.model_api;
  }

  getLogsURL() {
    return this.server_url + '/' + this.logs_api;
  }

  async call_server(
    api,
    query = undefined,
    params = undefined,
    files = undefined
  ) {
    let endpoint = this.server_url + '/' + this.api_version + '/' + api;

    if (query !== undefined) {
      endpoint = endpoint + '?' + query;
    }

    console.log('Connecting to: ' + endpoint);

    if (params === undefined) {
      return await this.api_get(endpoint);
    } else {
      if (files !== undefined) {
        return await this.api_post_file(endpoint, params, files);
      } else {
        return await this.api_post_smpl(endpoint, params);
      }
    }
  }

  api_get(url) {
    return axios
      .get(url)
      .then(function(response) {
        // handle success
        console.log(response);
        return response;
      })
      .catch(function(error) {
        // handle error
        console.log(error);
        return error;
      })
      .finally(function() {
        // always executed
      });
  }

  api_post_file(url, params, file) {
    var formData = new FormData();
    var fileName = 'test123.nii'; //AEH must have extension for AIAA to understand it

    formData.append('datapoint', file, fileName);
    formData.append('params', JSON.stringify(params));

    return axios
      .post(url, formData, {
        responseType: 'arraybuffer', //AEH direct recieve as buffer array

        headers: {
          'Content-Type': 'multipart/form-data',

          accept: 'multipart/form-data',
        },
      })
      .then(function(response) {
        // handle success
        console.log(response);
        return response;
      })

      .catch(function(error) {
        // handle error
        console.log(error);
        window.alert(error);
        return error;
      })

      .finally(function() {
        // always executed
      });
  }

  async model_list() {
    let response = await this.call_server(this.model_api);
    let models = [];
    this.cachedSegModels = [];
    this.cachedAnnModels = [];
    this.cachedDeepgrowModels = [];

    for (let i = 0; i < response.data.length; ++i) {
      models.push(response.data[i]);

      if (response.data[i].type === 'annotation') {
        this.cachedAnnModels.push(response.data[i]);
      } else if (response.data[i].type === 'segmentation') {
        this.cachedSegModels.push(response.data[i]);
      } else if (response.data[i].type === 'deepgrow') {
        this.cachedDeepgrowModels.push(response.data[i]);
      } else {
        console.log(response.data[i].name + ' has unsupported types');
      }
    }

    return models;
  }

  async dextr3d(model_name, params, file) {
    let response = await this.call_server(
      this.dextr3d_api,
      model_name,
      params,
      file
    );

    return response;
  }

  async segment(model_name, params, file) {
    let response = await this.call_server(
      this.segmentation_api,
      model_name,
      params,
      file
    );

    return response;
  }
}
