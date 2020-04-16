import React from 'react';
import PropTypes from 'prop-types';

export default class Collapsible extends React.Component {
  static propTypes = {
    open: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = {
      open: false,
    };
  }

  togglePanel = evt => {
    this.setState({ open: !this.state.open });
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
          <div className="settings_content">{this.props.children}</div>
        ) : null}
      </div>
    );
  }
}
