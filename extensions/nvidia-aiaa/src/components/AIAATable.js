import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Icon } from '@ohif/ui';

import './AIAAPanel.styl';

export default class AIAATable extends Component {
  static propTypes = {
    title: PropTypes.string,
    api_call: PropTypes.func,
    usage: PropTypes.any,
    models: PropTypes.array,
  };

  constructor(props) {
    super(props);

    this.state = {
      currModel: '',
      currLabels: [],
    };
  }

  onChangeModel = evt => {
    this.setState({
      currModel: evt.target.value,
      currLabels: evt.target.selectedOptions[0]
        .getAttribute('aiaalabel')
        .split(',', 20),
    });
  };

  onClickBtn = () => {
    this.props.api_call(this.state.currModel);
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
                  value={this.state.currModel}
                >
                  <option key="default" value="default" aiaalabel=""></option>
                  {this.props.models.map(model => (
                    <option
                      key={model.name}
                      value={model.name}
                      aiaalabel={model.labels}
                    >{`${model.name} `}</option>
                  ))}
                </select>
              </td>
              <td width="2%">&nbsp;</td>
              <td width="18%">
                <button className="aiaaButton" onClick={this.onClickBtn}>
                  <Icon name="brain" width="16px" height="16px" />
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
