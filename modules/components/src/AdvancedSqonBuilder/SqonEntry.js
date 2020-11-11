import React, { Component } from 'react';
import FaRegClone from 'react-icons/lib/fa/clone';
import FaTrashAlt from 'react-icons/lib/fa/trash';
import get from 'lodash/get';
import BooleanOp from './sqonPieces/BooleanOp';
import {
  isBooleanOp,
  removeSqonPath,
  setSqonAtPath,
  isEmptySqon,
} from './utils';
import { PROJECT_ID } from '../utils/config';
import defaultApi from '../utils/api';
import Query from '../Query';
import { resolveSyntheticSqon } from './utils';

const participantQuery = `
  query($sqon: JSON) {
    participant {
      hits(filters: $sqon) {
        total
      }
    }
  }`;

export default class SqonEntry extends Component {
  static defaultProps = {
    onSqonChange: sqon => {},
  };

  onFieldOpRemove = removedPath => {
    const { syntheticSqon, onSqonChange } = this.props;
    return onSqonChange(removeSqonPath(removedPath)(syntheticSqon));
  };

  onLogicalOpChanged = (changedPath, newSqon) => {
    const { syntheticSqon, onSqonChange } = this.props;
    return onSqonChange(setSqonAtPath(changedPath, newSqon)(syntheticSqon));
  };

  render() {
    const {
      arrangerProjectId = PROJECT_ID,
      arrangerProjectIndex,
      syntheticSqon,
      syntheticSqons,
      getActiveExecutableSqon,
      SqonActionComponent = ({ sqonIndex, isActive, isSelected }) => null,
      isActiveSqon = false,
      isSelected = false,
      index = 0,
      FieldOpModifierContainer = undefined,
      api = defaultApi,
      disabled = false,
      getColorForReference = index => '',
      isReferenced = false,
      isIndexReferenced = index => false,
      isDeleting = false,
      dependentIndices = [],
      onSqonCheckedChange = () => {},
      onSqonDuplicate = () => {},
      onSqonRemove = () => {},
      onActivate = () => {},
      onDeleteConfirmed = () => {},
      onDeleteCanceled = () => {},
      emptyEntryMessage = null,
      ResultCountIcon = () => {},
      resultCountIconProps = {},
      forceFetch,
      sqonDictionary = [],
      customQuery,
    } = this.props;

    const referenceColor = getColorForReference(index);

    const executableSqon = resolveSyntheticSqon(syntheticSqons)(syntheticSqon);

    return (
      <Query
        api={api}
        forceFetch={forceFetch}
        projectId={arrangerProjectId}
        query={participantQuery}
        variables={{ sqon: executableSqon }}
        name={'SQON_PARTICIPANTS_COUNT'}
        render={({ data, loading, error }) => (
          <div
            className={`sqonEntry ${isActiveSqon ? 'active' : ''}`}
            onClick={onActivate}
          >
            <div
              className={`activeStateIndicator`}
              style={
                !isReferenced
                  ? {}
                  : {
                      background: referenceColor,
                    }
              }
            />
            <div className={`selectionContainer`} onClick={onSqonCheckedChange}>
              <input
                readOnly
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
              />{' '}
              #{index + 1}
            </div>
            <div className="sqonViewContainer">
              <div>
                <div className={`sqonView`}>
                  {isEmptySqon(syntheticSqon)
                    ? emptyEntryMessage
                    : isBooleanOp(syntheticSqon) && (
                        <BooleanOp
                          arrangerProjectId={arrangerProjectId}
                          arrangerProjectIndex={arrangerProjectIndex}
                          index={0}
                          onFieldOpRemove={this.onFieldOpRemove}
                          onChange={this.onLogicalOpChanged}
                          sqon={syntheticSqon}
                          FieldOpModifierContainer={FieldOpModifierContainer}
                          api={api}
                          getActiveExecutableSqon={getActiveExecutableSqon}
                          getColorForReference={getColorForReference}
                          isIndexReferenced={isIndexReferenced}
                          referencesShouldHighlight={isActiveSqon}
                          sqonDictionary={sqonDictionary}
                          customQuery={customQuery}
                        />
                      )}
                </div>
              </div>
            </div>
            <div
              className={`participantsCountContainer ${
                isActiveSqon ? 'active' : ''
              } ${loading ? 'loading' : ''}`}
            >
              <ResultCountIcon
                className="resultCountIcon"
                {...resultCountIconProps}
              />
              {loading ? '...' : get(data, 'participant.hits.total', 0)}
            </div>
            <div className="actionButtonsContainer">
              <button
                className={`sqonListActionButton`}
                disabled={disabled}
                onClick={onSqonDuplicate}
              >
                <FaRegClone />
              </button>
              <button className={`sqonListActionButton`} onClick={onSqonRemove}>
                <FaTrashAlt />
              </button>
            </div>
            {isDeleting && (
              <div className={'actionButtonsContainer deleteConfirmation'}>
                <div>
                  {!!dependentIndices.length && (
                    <div>Dependent queries will be deleted.</div>
                  )}
                  <div>Are you sure you want to delete?</div>
                </div>
                <button className={`button cancel`} onClick={onDeleteCanceled}>
                  CANCEL
                </button>
                <button className={`button delete`} onClick={onDeleteConfirmed}>
                  DELETE
                </button>
              </div>
            )}
            <SqonActionComponent
              sqonIndex={index}
              isActive={isActiveSqon}
              isSelected={isSelected}
            />
          </div>
        )}
      />
    );
  }
}
