import AIAAUtils from './AIAAUtils';

function set_cookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
  console.log('Nvidia AIAA ---------------set cookie', name, ' value=', value);

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
    '(^|;) ?' + cookie_name + '=([^;]*)(;|$)',
  );

  if (results) return unescape(results[2]);
  else return null;
}

export default class AIAAClient {
  constructor(server_url) {
    this.server_url = new URL(server_url);
  }

  static getCookieURL() {
    return get_cookie('nvidiaAIAAServerUrl');
  }

  setServerURL(url, use_cookie = true) {
    this.server_url = url;
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

    const params = {};
    let response = await AIAAUtils.api_post_file(
      seg_url.toString(),
      params,
      image_in,
    );

    return response;
  }

  // TODO:: rewrite this
  async dextr3d(model_name, params, file) {
    return undefined;
  }
}
