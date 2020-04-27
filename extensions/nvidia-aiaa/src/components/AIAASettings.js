import React from 'react';
import PropTypes from 'prop-types';

export default class AIAASettings extends React.Component {
  static propTypes = {
    open: PropTypes.bool,
    settings: PropTypes.any,
    onUpdate: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      open: false,
      settings: props.settings,
      prefetch: props.settings.dicom.prefetch,
    };
  }

  togglePanel = evt => {
    this.setState({ open: !this.state.open });
  };

  onChangePrefetch = evt => {
    this.setState({ prefetch: !this.state.prefetch });
  };

  // TODO:: Remove explicit "save" click.. any prooperty change should do auto-save
  saveSettings = evt => {
    const { settings } = this.state;

    settings.multi_label = document.getElementById('aiaa.overlapping').checked ? false : true;
    settings.dextr3d.auto_run = document.getElementById('aiaa.dextr3d.autorun').checked;
    settings.dicom.prefetch = document.getElementById('aiaa.dicom.prefetch').checked;
    if (settings.dicom.prefetch) {
      let server = document.getElementById('aiaa.dicom.server').innerHTML.split(':');
      settings.dicom.server_address = server[0];
      settings.dicom.server_port = server[1];
      settings.dicom.ae_title = document.getElementById('aiaa.dicom.ae').innerHTML;
    }

    this.setState({ settings: settings });
    this.props.onUpdate(this.state.settings);
  };

  render() {
    return (
      <div>
        <button
          onClick={e => this.togglePanel(e)}
          className={this.state.open ? 'settings_active' : 'settings_header'}
        >
          {this.props.title}
        </button>
        {this.state.open ? (
          <div className="settings_content">
            <div>
              <table width="100%">
                <tbody className="aiaaTable">
                <tr>
                  <td width="52%">AIAA Session:</td>
                  <td><input id="aiaa.session" type="checkbox" defaultChecked disabled/></td>
                </tr>
                <tr>
                  <td>Overlapping Segments:</td>
                  <td><input id="aiaa.overlapping" type="checkbox" defaultChecked={!this.state.settings.multi_label}/>
                  </td>
                </tr>
                <tr>
                  <td>Auto Run DExtr3D:</td>
                  <td>
                    <input id="aiaa.dextr3d.autorun" type="checkbox"
                           defaultChecked={this.state.settings.dextr3d.auto_run}/>
                  </td>
                </tr>
                <tr>
                  <td>Prefetch Images:</td>
                  <td><input id="aiaa.dicom.prefetch" type="checkbox"
                             defaultChecked={this.state.prefetch}
                             onClick={this.onChangePrefetch}/></td>
                </tr>
                <tr style={{ filter: (this.state.prefetch ? 'brightness(0.5)' : 'brightness(1)') }}>
                  <td>DICOM Server:</td>
                  <td id="aiaa.dicom.server" contentEditable="true" suppressContentEditableWarning="true">
                    {this.state.settings.dicom.server_address}:{this.state.settings.dicom.server_port}
                  </td>
                </tr>
                <tr style={{ filter: (this.state.prefetch ? 'brightness(0.5)' : 'brightness(1)') }}>
                  <td>DICOM AE Title:</td>
                  <td id="aiaa.dicom.ae" contentEditable="true" suppressContentEditableWarning="true">
                    {this.state.settings.dicom.ae_title}
                  </td>
                </tr>
                <tr>
                  <td colSpan="2" align="right"><input type="button" value="save" onClick={this.saveSettings}/></td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

    );
  }
}
