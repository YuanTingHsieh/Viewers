import AIAAService from './AIAAService.js';

export default {
  name: 'AIAAService',
  create: ({ configuration = {} }) => {
    let { server_url, api_version } = configuration;
    let cookie_url = AIAAService.getCookieURL();
    if (cookie_url !== null) server_url = cookie_url;
    console.log('serverurl is ' + server_url);
    return new AIAAService(server_url, api_version);
  },
};
