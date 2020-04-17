import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import debounce from 'lodash/debounce';
import path from 'path';
import defaultApi from './utils/api';

class Query extends Component {
  static defaultProps = {
    shouldFetch: true,
    forceFetch: false,
  };

  state = { data: null, error: null, loading: this.props.shouldFetch };

  fetch = debounce(
    async ({ projectId, query, variables, name, ...options }) => {
      this.setState({ loading: true });

      const { api = defaultApi } = this.props;
      try {
        let { data, errors } = await api({
          ...options,
          endpoint: path.join(projectId, 'graphql', name || ''),
          body: { query, variables },
        });
        this.setState({
          data,
          error: errors ? { errors } : null,
          loading: false,
        });
      } catch (error) {
        this.setState({ data: null, error: error.message, loading: false });
      }
    },

    this.props.debounceTime || 0,
  );

  componentDidMount() {
    if (this.props.shouldFetch) {
      this.fetch(this.props);
    }
  }

  componentDidUpdate(prevProps) {
    //FIXME : it's pretty similar to 'shouldFetch' but using 'shouldFetch' would break the main condition...risky.
    const isForceFetchRequested =
      this.props.forceFetch && !prevProps.forceFetch;
    if (
      isForceFetchRequested ||
      (this.props.shouldFetch &&
        (!prevProps.shouldFetch ||
          !isEqual(this.props.query, prevProps.query) ||
          !isEqual(this.props.variables, prevProps.variables)))
    ) {
      this.fetch(this.props);
    }
  }

  componentDidCatch(error, info) {
    this.setState({ error });
  }

  render() {
    const { loading, error, data } = this.state;
    const { render, renderError } = this.props;
    return error && renderError ? (
      <pre>{JSON.stringify(error, null, 2)}</pre>
    ) : (
      render({ data, loading, error })
    );
  }
}

export const withQuery = getOptions => Component => props => {
  const options = getOptions(props);

  return (
    <Query
      {...options}
      render={data => <Component {...props} {...{ [options.key]: data }} />}
    />
  );
};

export default Query;
