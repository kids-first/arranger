import React from 'react';
import sortBy from 'lodash/sortBy';
import get from 'lodash/get';
import './FilterContainerStyle.css';
import { FilterContainer } from './common';
import {
  getOperationAtPath,
  setSqonAtPath,
  FIELD_OP_DISPLAY_NAME,
  TERM_OPS,
  IN_OP,
  AND_OP,
  ActionContext,
} from '../utils';
import TermAgg from '../../Aggs/TermAgg';
import TextFilter from '../../TextFilter';
import { inCurrentSQON } from '../../SQONView/utils';
import defaultApi from '../../utils/api';
import { PROJECT_ID } from '../../utils/config';
import Query from '../../Query';

const AggsWrapper = ({ children }) => (
  <div className="aggregation-card">{children}</div>
);

const filterStringsCaseInsensitive = (values, searchString, path = null) =>
  values.filter(val => {
    const valText = path ? get(val, path) : val;
    return -1 !== valText.search(new RegExp(searchString, 'i'));
  });

export class TermFilterUI extends React.Component {
  static defaultProps = {
    initialSqon: null,
    onSubmit: () => {},
    onCancel: () => {},
    ContainerComponent: FilterContainer,
    InputComponent: TextFilter,
    sqonPath: [],
    fieldDisplayNameMap: {},
    opDisplayNameMap: FIELD_OP_DISPLAY_NAME,
  };

  state = {
    searchString: '',
    localSqon: this.props.initialSqon,
  };

  generateInitialFieldSqon = () => {
    const { sqonPath, initialSqon, field } = this.props;
    return (
      getOperationAtPath(sqonPath)(initialSqon) || {
        op: IN_OP,
        content: { value: [], field },
      }
    );
  };

  onSearchChange = e => {
    this.setState({ searchString: e.value });
  };

  isFilterActive = d =>
    inCurrentSQON({
      value: d.value,
      dotField: d.field,
      currentSQON: getOperationAtPath(this.props.sqonPath)(
        this.state.localSqon,
      ),
    });

  getCurrentFieldOp = () =>
    getOperationAtPath(this.props.sqonPath)(this.state.localSqon);

  onSqonSubmit = () => this.props.onSubmit(this.state.localSqon);

  computeBuckets = buckets => {
    const { initialSqon, sqonPath } = this.props;
    return sortBy(
      filterStringsCaseInsensitive(buckets, this.state.searchString, 'key'),
      bucket =>
        !inCurrentSQON({
          value: bucket.key,
          dotField: this.generateInitialFieldSqon().content.field,
          currentSQON: getOperationAtPath(sqonPath)(initialSqon),
        }),
    );
  };

  onOptionTypeChange = e => {
    const currentFieldSqon = this.getCurrentFieldOp();
    this.setState({
      localSqon: setSqonAtPath(this.props.sqonPath, {
        ...currentFieldSqon,
        op: e.target.value,
      })(this.state.localSqon),
    });
  };

  onSelectAllClick = () => {
    const { sqonPath, buckets } = this.props;
    const currentFieldSqon = this.getCurrentFieldOp();

    this.setState({
      localSqon: setSqonAtPath(sqonPath, {
        ...currentFieldSqon,
        content: {
          ...currentFieldSqon.content,
          value: filterStringsCaseInsensitive(
            buckets.map(({ key }) => key),
            this.state.searchString,
          ),
        },
      })(this.state.localSqon),
    });
  };

  onClearClick = () => {
    const currentFieldSqon = this.getCurrentFieldOp();
    this.setState({
      localSqon: setSqonAtPath(this.props.sqonPath, {
        ...currentFieldSqon,
        content: {
          ...currentFieldSqon.content,
          value: [],
        },
      })(this.state.localSqon),
    });
  };

  onFilterClick = ({ generateNextSQON }) => {
    const deltaSqon = generateNextSQON();
    const deltaFiterObjContentValue = deltaSqon.content[0].content.value;
    // we're only interested in the new field operation's content value
    const currentFieldSqon = this.getCurrentFieldOp();
    const existingValue = (currentFieldSqon.content.value || []).find(v =>
      deltaFiterObjContentValue.includes(v),
    );
    const newFieldSqon = {
      ...currentFieldSqon,
      content: {
        ...currentFieldSqon.content,
        value: [
          ...(currentFieldSqon.content.value || []).filter(
            v => v !== existingValue,
          ),
          ...(existingValue ? [] : deltaFiterObjContentValue),
        ],
      },
    };
    this.setState({
      localSqon: setSqonAtPath(
        this.props.sqonPath,
        newFieldSqon,
      )(this.state.localSqon),
    });
  };

  render() {
    const {
      onCancel,
      ContainerComponent,
      InputComponent,
      buckets,
      fieldDisplayNameMap,
      opDisplayNameMap,
    } = this.props;

    const computedBuckets = this.computeBuckets(buckets);
    const noResults = computedBuckets.length === 0;
    const field = this.generateInitialFieldSqon().content.field;
    const fieldDisplayName = fieldDisplayNameMap[field] || field;

    if (noResults) {
      return (
        <ContainerComponent onCancel={onCancel}>
          <AggsWrapper>
            <div className="contentSection noResults">{`No ${fieldDisplayName} available for the current query`}</div>
          </AggsWrapper>
        </ContainerComponent>
      );
    }

    return (
      <ContainerComponent onSubmit={this.onSqonSubmit} onCancel={onCancel}>
        <div className="contentSection">
          <span>{fieldDisplayName}</span> is{' '}
          <span className="select">
            <select
              onChange={this.onOptionTypeChange}
              value={this.getCurrentFieldOp().op}
            >
              {TERM_OPS.map(option => (
                <option key={option} value={option}>
                  {opDisplayNameMap[option]}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="contentSection searchInputContainer">
          <InputComponent
            value={this.state.searchString}
            onChange={this.onSearchChange}
          />
        </div>
        <div className="contentSection termFilterActionContainer">
          <div className="actionsContainer left">
            <span
              className={`aggsFilterAction selectAll`}
              onClick={this.onSelectAllClick}
            >
              Select All
            </span>
            <span
              className={`aggsFilterAction clear`}
              onClick={this.onClearClick}
            >
              Clear
            </span>
          </div>
          <div className="actionsContainer right">
            <ActionContext.Consumer>
              {actions => {
                if (actions.TermFilter?.extraFilterActions?.isVisible(field)) {
                  return actions.TermFilter.extraFilterActions.component;
                }
              }}
            </ActionContext.Consumer>
          </div>
        </div>
        <div className="contentSection termAggContainer">
          <TermAgg
            WrapperComponent={AggsWrapper}
            field={this.generateInitialFieldSqon().content.field}
            displayName="Disease Type"
            buckets={computedBuckets}
            handleValueClick={this.onFilterClick}
            isActive={this.isFilterActive}
            maxTerms={5}
          />
        </div>
      </ContainerComponent>
    );
  }
}

export default props => {
  const {
    field,
    arrangerProjectId = PROJECT_ID,
    arrangerProjectIndex,
    api = defaultApi,
    executableSqon = {
      op: AND_OP,
      content: [],
    },
    initialSqon = null,
    onSubmit = sqon => {},
    onCancel = () => {},
    ContainerComponent = FilterContainer,
    InputComponent = TextFilter,
    sqonPath = [],
    fieldDisplayNameMap = {},
    opDisplayNameMap = FIELD_OP_DISPLAY_NAME,
  } = props;

  const gqlField = field.split('.').join('__');
  const query = `query($sqon: JSON){
    ${arrangerProjectIndex} {
      aggregations(filters: $sqon) {
        ${gqlField} {
          buckets {
            key
            doc_count
          }
        }
      }
    }
  }`;
  return (
    <Query
      variables={{ sqon: executableSqon }}
      projectId={arrangerProjectId}
      api={api}
      query={query}
      render={({ data, loading, error }) => (
        <TermFilterUI
          ContainerComponent={({ children, ...props }) => (
            <ContainerComponent {...props} loading={loading}>
              {children}
            </ContainerComponent>
          )}
          field={field}
          initialSqon={initialSqon}
          onSubmit={onSubmit}
          onCancel={onCancel}
          InputComponent={InputComponent}
          sqonPath={sqonPath}
          fieldDisplayNameMap={fieldDisplayNameMap}
          opDisplayNameMap={opDisplayNameMap}
          buckets={
            data
              ? get(
                  data,
                  `${arrangerProjectIndex}.aggregations.${gqlField}.buckets`,
                )
              : []
          }
        />
      )}
    />
  );
};
