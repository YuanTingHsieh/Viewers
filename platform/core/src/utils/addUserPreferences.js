import redux from './../redux';

const addUserPreferences = store => {
  store.dispatch(redux.actions.setUserPreferences());
};

export default addUserPreferences;
