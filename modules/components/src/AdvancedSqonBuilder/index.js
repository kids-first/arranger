import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash/cloneDeep';
import { PROJECT_ID } from '../utils/config';
import SqonEntry from './SqonEntry';
import {
  resolveSyntheticSqon,
  removeSqonAtIndex,
  isIndexReferencedInSqon,
  getDependentIndices,
  DisplayNameMapContext,
  isEmptySqon,
  AND_OP,
  OR_OP,
} from './utils';
import './style.css';
import defaultApi from '../utils/api';
import FaRegClone from 'react-icons/lib/fa/clone';
import FaPlusCircle from 'react-icons/lib/fa/plus-circle';

const newEmptySqon = () => ({
  op: AND_OP,
  content: [],
});

const generateSqonKey = sqon => {
  const flattenValues = sqon.content.map(o => o.content?.value || null).flat();
  return flattenValues
    .filter(x => x)
    .join('-')
    .replace(/\s/g, '');
};

class AdvancedSqonBuilder extends Component {
  static propTypes = {
    arrangerProjectId: PropTypes.string,
    arrangerProjectIndex: PropTypes.string.isRequired,
    syntheticSqons: PropTypes.arrayOf(PropTypes.object),
    activeSqonIndex: PropTypes.number,
    FieldOpModifierContainer: PropTypes.any,
    SqonActionComponent: PropTypes.any,
    onChange: PropTypes.func,
    onActiveSqonSelect: PropTypes.func,
    fieldDisplayNameMap: PropTypes.objectOf(PropTypes.string),
    ButtonComponent: PropTypes.any,
    getSqonDeleteConfirmation: PropTypes.func,
    api: PropTypes.func,
    referenceColors: PropTypes.arrayOf(PropTypes.string),
    emptyEntryMessage: PropTypes.node,
  };

  static defaultProps = {
    arrangerProjectId: PROJECT_ID,
    syntheticSqons: [],
    FieldOpModifierContainer: undefined,
    SqonActionComponent: () => null,
    onChange: () => {},
    onActiveSqonSelect: () => {},
    fieldDisplayNameMap: {},
    api: defaultApi,
    referenceColors: [
      '#cbeefb',
      '#fce8d3',
      '#eed5e9',
      '#cbebf1',
      '#f9d3d4',
      '#d5d7e9',
      '#fad9ea',
      '#f3ebd0',
    ],
    emptyEntryMessage: null,
    ResultCountIcon: () => null,
    resultCountIconProps: {},
  };

  state = {
    selectedSqonIndices: [],
    // the followings are to support defaultSqonDeletionHandler
    deletingIndex: null,
    onSqonDeleteConfirmed: null,
    onSqonDeleteCancel: null,
  };

  clearSqonDeletion = () => {
    this.setState({
      deletingIndex: null,
      onSqonDeleteConfirmed: null,
      onSqonDeleteCancel: null,
    });
  };

  dispatchSqonListChange = () => ({ eventKey, newSqonList, eventDetails }) => {
    const { onChange } = this.props;
    this.clearSqonDeletion();
    // wraps in promise to delay to allow delaying to next frame
    return Promise.resolve(
      onChange({
        eventKey,
        eventDetails,
        newSyntheticSqons: newSqonList,
      }),
    );
  };

  onSelectedSqonIndicesChange = index => () => {
    const { syntheticSqons } = this.props;
    if (
      !this.state.selectedSqonIndices.includes(index) &&
      !isEmptySqon(syntheticSqons[index])
    ) {
      this.setState({
        selectedSqonIndices: [...this.state.selectedSqonIndices, index].sort(),
      });
    } else {
      this.setState({
        selectedSqonIndices: this.state.selectedSqonIndices.filter(
          i => i !== index,
        ),
      });
    }
  };

  removeSqon = indexToRemove => {
    const { onActiveSqonSelect, syntheticSqons } = this.props;
    onActiveSqonSelect({
      index: Math.max(Math.min(syntheticSqons.length - 2, indexToRemove), 0),
    });
    const sqonListWithIndexRemoved = removeSqonAtIndex(
      indexToRemove,
      syntheticSqons,
    );
    return this.dispatchSqonListChange()({
      eventKey: 'SQON_REMOVED',
      eventDetails: {
        removedIndex: indexToRemove,
      },
      newSqonList: sqonListWithIndexRemoved.length
        ? sqonListWithIndexRemoved
        : [newEmptySqon()],
    });
  };

  defaultSqonDeletionHandler = ({ indexToRemove }) =>
    new Promise((resolve, reject) => {
      this.setState({
        deletingIndex: indexToRemove,
        onSqonDeleteConfirmed: () => {
          this.setState({
            deletingIndex: null,
            onSqonDeleteConfirmed: null,
          });
          resolve();
        },
        onSqonDeleteCancel: () => {
          this.setState({
            deletingIndex: null,
            onSqonDeleteConfirmed: null,
          });
          reject();
        },
      });
    });

  onSqonRemove = indexToRemove => () => {
    const {
      syntheticSqons,
      getSqonDeleteConfirmation = this.defaultSqonDeletionHandler,
    } = this.props;
    return getSqonDeleteConfirmation({
      internalStateContainer: this.state,
      indexToRemove,
      dependentIndices: getDependentIndices(syntheticSqons)(indexToRemove),
    })
      .then(() => this.removeSqon(indexToRemove))
      .catch(() => {});
  };

  onSqonDuplicate = indexToDuplicate => () => {
    const { syntheticSqons, onActiveSqonSelect } = this.props;
    this.dispatchSqonListChange()({
      eventKey: 'SQON_DUPLICATED',
      eventDetails: {
        duplicatedIndex: indexToDuplicate,
      },
      newSqonList: [
        ...syntheticSqons,
        cloneDeep(syntheticSqons[indexToDuplicate]),
      ],
    }).then(() => onActiveSqonSelect({ index: syntheticSqons.length }));
  };

  createUnionSqon = () => {
    const { syntheticSqons, onActiveSqonSelect } = this.props;
    this.dispatchSqonListChange()({
      eventKey: 'NEW_UNION_COMBINATION',
      eventDetails: {
        referencedIndices: this.state.selectedSqonIndices,
      },
      newSqonList: [
        ...syntheticSqons,
        {
          op: OR_OP,
          content: this.state.selectedSqonIndices,
        },
      ],
    })
      .then(() => onActiveSqonSelect({ index: syntheticSqons.length }))
      .then(() => {
        this.setState({
          selectedSqonIndices: [],
        });
        this.clearSqonDeletion();
      });
  };

  createIntersectSqon = () => {
    const { syntheticSqons, onActiveSqonSelect } = this.props;
    this.dispatchSqonListChange()({
      eventKey: 'NEW_INTERSECTION_COMBINATION',
      eventDetails: {
        referencedIndices: this.state.selectedSqonIndices,
      },
      newSqonList: [
        ...syntheticSqons,
        {
          op: AND_OP,
          content: this.state.selectedSqonIndices,
        },
      ],
    })
      .then(() => onActiveSqonSelect({ index: syntheticSqons.length }))
      .then(() => {
        this.setState({
          selectedSqonIndices: [],
        });
        this.clearSqonDeletion();
      });
  };

  onClearAllClick = () => {
    const { onActiveSqonSelect } = this.props;
    this.dispatchSqonListChange()({
      eventKey: 'CLEAR_ALL',
      eventDetails: {},
      newSqonList: [newEmptySqon()],
    });
    this.setState({ selectedSqonIndices: [] });
    this.clearSqonDeletion();
    onActiveSqonSelect({ index: 0 });
  };

  onSqonChange = sqonIndex => newSqon => {
    const { syntheticSqons } = this.props;
    this.dispatchSqonListChange()({
      eventKey: 'SQON_CHANGE',
      eventDetails: {
        updatedIndex: sqonIndex,
      },
      newSqonList: syntheticSqons.map((sq, i) =>
        i === sqonIndex ? newSqon : sq,
      ),
    });
    if (!newSqon.content.length) {
      this.removeSqon(sqonIndex);
    }
  };

  render() {
    const {
      arrangerProjectId,
      arrangerProjectIndex,
      syntheticSqons,
      activeSqonIndex: currentActiveSqonIndex = 0,
      FieldOpModifierContainer,
      SqonActionComponent,
      onActiveSqonSelect,
      fieldDisplayNameMap,
      ButtonComponent = ({ className, ...rest }) => (
        <button className={`button ${className}`} {...rest} />
      ),
      api,
      referenceColors,
      emptyEntryMessage,
      ResultCountIcon,
      resultCountIconProps,
    } = this.props;

    const selectedSyntheticSqon = syntheticSqons[currentActiveSqonIndex];
    const allowsNewSqon = !syntheticSqons.some(isEmptySqon);

    const getColorForReference = referenceIndex =>
      referenceColors[referenceIndex % referenceColors.length];
    const isSqonReferenced = sqonIndex =>
      isIndexReferencedInSqon(selectedSyntheticSqon)(sqonIndex);

    const getActiveExecutableSqon = () =>
      resolveSyntheticSqon(syntheticSqons)(selectedSyntheticSqon);

    const onSqonEntryActivate = nextActiveSqonIndex => () => {
      if (nextActiveSqonIndex !== currentActiveSqonIndex) {
        onActiveSqonSelect({
          index: nextActiveSqonIndex,
        });
      }
    };

    return (
      <DisplayNameMapContext.Provider value={fieldDisplayNameMap}>
        <div className={`sqonBuilder`}>
          <div className={`actionHeaderContainer`}>
            <div>
              <span>Combine Queries: </span>
              <span>
                <ButtonComponent
                  className={`and`}
                  disabled={!this.state.selectedSqonIndices.length}
                  onClick={this.createIntersectSqon}
                >
                  and
                </ButtonComponent>
                <ButtonComponent
                  className={`or`}
                  disabled={!this.state.selectedSqonIndices.length}
                  onClick={this.createUnionSqon}
                >
                  or
                </ButtonComponent>
              </span>
            </div>
            <div>
              <ButtonComponent onClick={this.onClearAllClick}>
                CLEAR ALL
              </ButtonComponent>
            </div>
          </div>
          {syntheticSqons.map((sq, i) => (
            <SqonEntry
              key={`${i}-${generateSqonKey(sq)}`}
              index={i}
              api={api}
              arrangerProjectId={arrangerProjectId}
              arrangerProjectIndex={arrangerProjectIndex}
              syntheticSqon={sq}
              isActiveSqon={i === currentActiveSqonIndex}
              isSelected={this.state.selectedSqonIndices.includes(i)}
              isReferenced={isSqonReferenced(i)}
              isIndexReferenced={isIndexReferencedInSqon(selectedSyntheticSqon)}
              isDeleting={this.state.deletingIndex === i}
              disabled={isEmptySqon(sq)}
              SqonActionComponent={SqonActionComponent}
              FieldOpModifierContainer={FieldOpModifierContainer}
              getActiveExecutableSqon={getActiveExecutableSqon}
              getColorForReference={getColorForReference}
              dependentIndices={getDependentIndices(syntheticSqons)(i)}
              onSqonChange={this.onSqonChange(i)}
              onSqonCheckedChange={this.onSelectedSqonIndicesChange(i)}
              onSqonDuplicate={this.onSqonDuplicate(i)}
              onSqonRemove={this.onSqonRemove(i)}
              onActivate={onSqonEntryActivate(i)}
              onDeleteConfirmed={this.state.onSqonDeleteConfirmed || (() => {})}
              onDeleteCanceled={this.state.onSqonDeleteCancel || (() => {})}
              emptyEntryMessage={emptyEntryMessage}
              syntheticSqons={syntheticSqons}
              ResultCountIcon={ResultCountIcon}
              resultCountIconProps={resultCountIconProps}
            />
          ))}
          <div>
            <button
              className={`sqonListActionButton removeButton`}
              disabled={!allowsNewSqon}
              onClick={() => {
                if (allowsNewSqon) {
                  this.dispatchSqonListChange()({
                    eventKey: 'NEW_SQON',
                    eventDetails: {},
                    newSqonList: [...syntheticSqons, newEmptySqon()],
                  })
                    .then(() =>
                      onActiveSqonSelect({ index: syntheticSqons.length }),
                    )
                    .then(() => {
                      this.setState({
                        selectedSqonIndices: [],
                      });
                      this.clearSqonDeletion();
                    });
                }
              }}
            >
              <FaPlusCircle />
              {` `}Start new query
            </button>
            <button
              className={`sqonListActionButton duplicateButton`}
              disabled={
                selectedSyntheticSqon
                  ? !selectedSyntheticSqon.content.length
                  : false
              }
              onClick={this.onSqonDuplicate(currentActiveSqonIndex)}
            >
              <FaRegClone />
              {` `}Duplicate Query
            </button>
          </div>
        </div>
      </DisplayNameMapContext.Provider>
    );
  }
}

export default AdvancedSqonBuilder;
export {
  resolveSyntheticSqon,
  removeSqonAtIndex,
  duplicateSqonAtIndex,
  isReference,
  isValueObj,
  isBooleanOp,
  isFieldOp,
  isIndexReferencedInSqon,
  getDependentIndices,
} from './utils';
export { default as FieldOpModifier } from './filterComponents/index';
