import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { redux } from '@ohif/core';

import { TabFooter, useSnackbarContext } from '@ohif/ui';
import { useTranslation } from 'react-i18next';

const { actions } = redux;

import './WindowLevelPreferences.styl';

function WindowLevelPreferences({ onClose }) {
  const dispatch = useDispatch();

  const windowLevelData = useSelector(state => {
    const { preferences = {} } = state;
    const { windowLevelData } = preferences;

    return windowLevelData;
  });

  const [state, setState] = useState({
    values: windowLevelData,
  });

  const { t } = useTranslation('UserPreferencesModal');
  const onResetPreferences = () => {};
  const hasErrors = false;
  const onSave = () => {
    dispatch(actions.setUserPreferences(state.values));

    onClose();

    snackbar.show({
      message: t('SaveMessage'),
      type: 'success',
    });
  };

  const snackbar = useSnackbarContext();

  const handleInputChange = event => {
    const $target = event.target;
    const { key, inputname } = $target.dataset;
    const inputValue = $target.value;

    if (!state.values[key] || !state.values[key][inputname]) {
      return;
    }

    setState(prevState => ({
      ...prevState,
      values: {
        ...prevState.values,
        [key]: {
          ...prevState.values[key],
          [inputname]: inputValue,
        },
      },
    }));
  };

  return (
    <React.Fragment>
      <div className="WindowLevelPreferences">
        <div className="wlColumn">
          <div className="wlRow header">
            <div className="wlColumn preset">Preset</div>
            <div className="wlColumn description">Description</div>
            <div className="wlColumn window">Window</div>
            <div className="wlColumn level">Level</div>
          </div>
          {Object.keys(state.values).map((key, index) => {
            return (
              <div className="wlRow" key={key}>
                <div className="wlColumn preset">{key}</div>
                <div className="wlColumn description">
                  <input
                    type="text"
                    className="preferencesInput"
                    value={state.values[key].description}
                    data-key={key}
                    data-inputname="description"
                    onChange={handleInputChange}
                  />
                </div>
                <div className="wlColumn window">
                  <input
                    type="number"
                    className="preferencesInput"
                    value={state.values[key].window}
                    data-key={key}
                    data-inputname="window"
                    onChange={handleInputChange}
                  />
                </div>
                <div className="wlColumn level">
                  <input
                    type="number"
                    className="preferencesInput"
                    value={state.values[key].level}
                    data-key={key}
                    data-inputname="level"
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TabFooter
        onResetPreferences={onResetPreferences}
        onSave={onSave}
        onCancel={onClose}
        hasErrors={hasErrors}
        t={t}
      />
    </React.Fragment>
  );
}

WindowLevelPreferences.propTypes = {
  onClose: PropTypes.func,
};

export { WindowLevelPreferences };

// import React, { useEffect, useState } from 'react';
// import PropTypes from 'prop-types';

// import './WindowLevelPreferences.styl';
// /**
//  * WindowLevelPreferencesRow
//  * Renders row for window level preference
//  * It stores current state and whenever it changes, component messages parent of new value (through function callback)
//  * @param {object} props component props
//  * @param {string} props.description description for given preset
//  * @param {number} props.window window value
//  * @param {number} props.level level value
//  * @param {string} props.rowName name of given row to identify it
//  * @param {function} props.onSuccessChanged Callback function to communicate parent in case its states changes
//  */
// function WindowLevelPreferencesRow({
//   description,
//   window,
//   level,
//   rowName,
//   onSuccessChanged,
//   // onFailureChanged
// }) {
//   const [rowState, setRowState] = useState({ description, window, level });

//   const onInputChanged = (event, name) => {
//     const newValue = event.target.value;
//     setRowState({ ...rowState, [name]: newValue });
//   };

//   useEffect(() => {
//     onSuccessChanged(rowName, rowState);
//   }, [rowState]);

//   const renderTd = (value, name, type) => {
//     return (
//       <td className="p-r-1">
//         <label className="wrapperLabel">
//           <input
//             value={value}
//             type={type}
//             className="form-control"
//             onChange={event => {
//               onInputChanged(event, name);
//             }}
//           />
//         </label>
//       </td>
//     );
//   };

//   return (
//     <tr key={rowName}>
//       <td className="p-r-1 text-center">{rowName}</td>
//       {renderTd(rowState.description, 'description', 'text')}
//       {renderTd(rowState.window, 'window', 'number')}
//       {renderTd(rowState.level, 'level', 'number')}
//     </tr>
//   );
// }

// WindowLevelPreferencesRow.propTypes = {
//   description: PropTypes.string.isRequired,
//   window: PropTypes.number.isRequired,
//   level: PropTypes.number.isRequired,
//   rowName: PropTypes.string.isRequired,
//   onSuccessChanged: PropTypes.func.isRequired,
//   //onFailureChanged: PropTypes.func.isRequired,
// };

// /**
//  * WindowLevelPreferences tab
//  * It renders all window level presets
//  *
//  * It stores current state and whenever it changes, component messages parent of new value (through function callback)
//  * @param {object} props component props
//  * @param {string} props.name Tab`s name
//  * @param {object} props.windowLevelData Data for initial state
//  * @param {function} props.onTabStateChanged Callback function to communicate parent in case its states changes
//  */
// function WindowLevelPreferences({
//   windowLevelData,
//   name,
//   onTabStateChanged /*onTabErrorChanged*/,
// }) {
//   const [tabState, setTabState] = useState(windowLevelData);
//   // TODO to be used once error handling is implemented
//   //const [tabError, setTabError] = useState(false);

//   const onWindowLevelChanged = (key, state) => {
//     setTabState({ ...tabState, [key]: state });
//   };

//   // tell parent to update its state
//   useEffect(() => {
//     onTabStateChanged(name, { windowLevelData: tabState });
//   }, [tabState]);

//   return (
//     <table className="full-width">
//       <thead>
//         <tr>
//           <th className="p-x-1 text-center presetIndex">Preset</th>
//           <th className="p-x-1">Description</th>
//           <th className="p-x-1">Window</th>
//           <th className="p-x-1">Level</th>
//         </tr>
//       </thead>
//       <tbody>
//         {Object.keys(tabState).map(objKey => (
//           <WindowLevelPreferencesRow
//             onSuccessChanged={onWindowLevelChanged}
//             rowName={objKey}
//             key={objKey}
//             description={tabState[objKey].description}
//             window={tabState[objKey].window}
//             level={tabState[objKey].level}
//           ></WindowLevelPreferencesRow>
//         ))}
//       </tbody>
//     </table>
//   );
// }

// WindowLevelPreferences.propTypes = {
//   windowLevelData: PropTypes.object.isRequired,
//   name: PropTypes.string.isRequired,
//   onTabStateChanged: PropTypes.func.isRequired,
//   //onTabErrorChanged: PropTypes.func.isRequired,
// };

// export { WindowLevelPreferences };
