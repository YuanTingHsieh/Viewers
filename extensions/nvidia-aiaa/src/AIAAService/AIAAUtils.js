import axios from 'axios';

// TODO:: Expiry params can be much easier.. (instead of YYYYMMDD)
function _setCookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
  let cookie_string = name + '=' + escape(value);
  if (exp_y) {
    let expires = new Date(exp_y, exp_m, exp_d);
    cookie_string += '; expires=' + expires.toGMTString();
  }
  if (path) cookie_string += '; path=' + escape(path);
  if (domain) cookie_string += '; domain=' + escape(domain);
  if (secure) cookie_string += '; secure';
  document.cookie = cookie_string;
}

function _getCookie(cookie_name) {
  let results = document.cookie.match(
    '(^|;) ?' + cookie_name + '=([^;]*)(;|$)',
  );
  if (results) return unescape(results[2]);
  else return null;
}

function constructFormData(params, file) {
  let formData = new FormData();
  if (file) {
    if (Array.isArray(file)) {
      for (let i = 0; i < file.length; i++) {
        formData.append('image' + i, file[i].data, file[i].name);
      }
    } else {
      formData.append('image', file.data, file.name);
    }
  }
  formData.append('params', JSON.stringify(params));
  return formData;
}

function constructFormOrJsonData(params, file) {
  return (file) ? constructFormData(params, file) : params;
}

export default class AIAAUtils {
  static api_get(url) {
    console.info('AIAAUtils - GET:: ' + url);
    return axios
      .get(url)
      .then(function(response) {
        // handle success
        console.info(response);
        return response;
      })
      .catch(function(error) {
        // handle error
        console.error(error);
        return error;
      })
      .finally(function() {
        // always executed
      });
  }

  static api_post_file(url, params, file) {
    console.info('AIAAUtils - POST:: ' + url);
    let formData = constructFormData(params, file);
    return axios
      .post(url, formData, {
        responseType: 'arraybuffer', // direct receive as buffer array

        headers: {
          'Content-Type': ((file) ? 'multipart/form-data' : 'application/json'),
          accept: 'multipart/form-data',
        },
      })
      .then(function(response) {
        // handle success
        console.info(response);
        return response;
      })
      .catch(function(error) {
        // handle error
        console.error(error);
        return error;
      })
      .finally(function() {
        // always executed
      });
  }

  static api_put(url, params, file) {
    console.info('AIAAUtils - PUT:: ' + url);
    let data = constructFormOrJsonData(params, file);
    return axios
      .put(url, data, {
        responseType: 'application/json',
        headers: {
          'Content-Type': ((file) ? 'multipart/form-data' : 'application/json'),
          accept: 'application/json',
        },
      })
      .then(function(response) {
        // handle success
        console.info(response);
        return response;
      })
      .catch(function(error) {
        // handle error
        console.error(error);
        return error;
      });
  }

  static setAIAACookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
    return _setCookie(
      name,
      value,
      exp_y,
      exp_m,
      exp_d,
      path,
      domain,
      secure,
    );
  }

  static getAIAACookie(name) {
    return _getCookie(name);
  }
}
