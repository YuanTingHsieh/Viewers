import AIAAClient from './AIAAClient.js';
import AIAAVolume from './AIAAVolume.js';

class AIAAService {
  constructor(server_url) {
    this.client = new AIAAClient(server_url);
    this.volume = new AIAAVolume();
  }
}

export default {
  name: 'AIAAService',
  create: ({ configuration = {} }) => {
    let { server_url } = configuration;
    let cookie_url = AIAAClient.getCookieURL();
    if (cookie_url !== null) server_url = cookie_url;
    return new AIAAService(server_url);
  },
};
