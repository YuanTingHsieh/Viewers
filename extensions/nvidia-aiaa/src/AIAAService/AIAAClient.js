import AIAAUtils from './AIAAUtils';

export default class AIAAClient {
  constructor(server_url) {
    this.server_url = new URL(server_url);
  }

  setServerURL(url) {
    this.server_url = url;
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
  async model_list(model_name = undefined, label = undefined) {
    console.log('AIAA fetching models');
    let model_url = new URL('/v1/models', this.server_url);
    if (model_name !== undefined)
      model_url.searchParams.append('model', model_name);
    else if (label !== undefined) model_url.searchParams.append('label', label);

    return await AIAAUtils.api_get(model_url.toString());
  }

  /**
   * Calls AIAA segmentation API
   *
   * @param {string} model_name
   * @param {file|Array} image_in
   * @param {string} session_id
   */
  async segmentation(model_name, image_in, session_id = undefined) {
    console.log('AIAAClient - calling segmentation');
    let seg_url = new URL('/v1/segmentation', this.server_url);
    seg_url.searchParams.append('model', model_name);

    // TODO:: parse multi-part
    seg_url.searchParams.append('output', 'image');
    if (session_id !== undefined)
      seg_url.searchParams.append('session_id', session_id);

    const params = {};
    return await AIAAUtils.api_post_file(seg_url.toString(), params, image_in);
  }

  /**
   * Calls AIAA create session API
   *
   * @param image_in
   * @param params
   * @param {int} expiry: expiry in seconds.
   *
   * @return {string} session_id
   *
   */
  async createSession(image_in, params, expiry = 0) {
    // TODO:: make this work
    console.log('AIAAClient - create session');
    let session_url = new URL('/session/', this.server_url);
    session_url.searchParams.append('expiry', expiry);
    return await AIAAUtils.api_put(session_url.toString(), params, image_in);
  }

  // TODO:: rewrite this
  async dextr3d(model_name, params, file) {
    return undefined;
  }
}
