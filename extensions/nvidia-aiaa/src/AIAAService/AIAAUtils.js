import axios from 'axios';

export default class AIAAUtils {
  static api_get(url) {
    console.log('AIAAUtils - GET:: ' + url);
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
    console.log('AIAAUtils - POST:: ' + url);
    let formData = new FormData();

    if (Array.isArray(file)) {
      for (let i = 0; i < file.length; i++) {
        formData.append('image' + i, file[i].data, file[i].name);
      }
    } else {
      formData.append('image', file.data, file.name);
    }
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
