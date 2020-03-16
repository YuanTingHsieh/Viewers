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
    this.server_url = new URL(server_url);
    // TODO:: implement dextr3d, deepgrow, mask2polygon, fixpolygon methods
    this.api_version = api_version;
    this.dextr3d_api = 'dextr3d';
    this.deepgrow_api = 'deepgrow';
    this.mask2polygon_api = 'mask2polygon';
    this.fixpolygon_api = 'fixpolygon';

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

  setServerURL(url, use_cookie = true) {
    this.server_url = url;
    console.log('calling set server url');
    if (use_cookie) set_cookie('nvidiaAIAAServerUrl', url);
  }

  getServerURL() {
    return this.server_url.toString();
  }

  getModelsURL() {
    let model_url = new URL('/v1/models', this.server_url);
    return model_url.toString();
  }

  getLogsURL(lines = 100) {
    let log_url = new URL('logs', this.server_url);
    log_url.searchParams.append('lines', lines);
    return log_url.toString();
  }

  // TODO:: rewrite/remove this
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
      return await AIAAUtils.api_get(endpoint);
    } else {
      if (files !== undefined) {
        return await AIAAUtils.api_post_file(endpoint, params, files);
      }
    }
  }

  /**
   * Use either model name or label to query available models in AIAA
   * @param {string} model_name
   * @param {string} label
   */
  async model_list(model_name, label) {
    console.log('AIAA fetching models');
    let model_url = new URL('/v1/models', this.server_url);
    if (model_name !== undefined)
      model_url.searchParams.append('model', model_name);
    else if (label !== undefined) model_url.searchParams.append('label', label);

    let response = await AIAAUtils.api_get(model_url.toString());
    return response;
  }

  /**
   * Calls AIAA segmentation API
   *
   * @param {string} model_name
   * @param {string} image_in
   * @param {string} session_id
   */
  async segmentation(model_name, image_in, session_id) {
    console.log('AIAAClient - calling segmentation');
    let seg_url = new URL('/v1/segmentation', this.server_url);
    seg_url.searchParams.append('model', model_name);

    // TODO:: parse multi-part
    seg_url.searchParams.append('output', 'image');
    if (session_id !== undefined)
      seg_url.searchParams.append('session_id', session_id);

    let params = {};
    let response = await AIAAUtils.api_post_file(
      seg_url.toString(),
      params,
      image_in
    );

    return response;
  }

  // TODO:: rewrite this
  async dextr3d(model_name, params, file) {
    let response = await this.call_server(
      this.dextr3d_api,
      model_name,
      params,
      file
    );

    return response;
  }
}

class AIAAUtils {
  static api_get(url) {
    console.log('AIAAUtils - getting' + url);
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

  static api_post_file(url, params, file) {
    console.log('AIAAUtils - posting' + url);
    let formData = new FormData();
    let fileName = 'data.nii'; // must have extension for AIAA to understand it

    formData.append('datapoint', file, fileName);
    formData.append('params', JSON.stringify(params));

    return axios
      .post(url, formData, {
        responseType: 'arraybuffer', // direct recieve as buffer array

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
}
