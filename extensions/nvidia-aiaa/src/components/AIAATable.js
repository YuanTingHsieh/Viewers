import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';

import './AIAAPanel.styl';

export default class AIAATable extends Component {
  static propTypes = {
    title: PropTypes.string,
    api_call: PropTypes.func,
    select_call: PropTypes.func,
    usage: PropTypes.any,
    models: PropTypes.array,
    currentModel: PropTypes.string,
  };

  constructor(props) {
    super(props);

    this.state = {
      api_disabled: false,
    };
  }

  onChangeModel = evt => {
    console.info('Current Selected Model: ' + evt.target.value);
    this.props.select_call(evt.target.value);
  };

  onClickBtn = async () => {
    if (this.state.api_disabled) {
      return;
    }
    this.setState({api_disabled: true});
    await this.props.api_call();
    this.setState({api_disabled: false});
  };

  render() {
    return (
      <div>
        <table className="aiaaTable">
          <tbody>
          <tr>
            <td colSpan="3">{this.props.title}</td>
          </tr>
          <tr>
            <td width="80%">
              <select
                className="aiaaDropDown"
                onChange={this.onChangeModel}
                value={this.props.currentModel}
              >
                {this.props.models.map(model => (
                  <option
                    key={model.name}
                    value={model.name}
                    aiaalabel={model.labels}
                  >
                    {`${model.name} `}
                  </option>
                ))}
              </select>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="18%">
              <button
                className="aiaaButton"
                onClick={this.onClickBtn}
                title="Run Action"
                disabled={this.state.api_disabled}
                style={{display: (this.props.api_call ? 'block' : 'none')}}
              >
                <Icon name="brain" width="16px" height="16px"/>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
        {this.props.usage}
      </div>
    );
  }
}
