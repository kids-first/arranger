import React from 'react';
import Component from 'react-component-component';
import FaChevronDown from 'react-icons/lib/fa/chevron-down';
import FaChevronUp from 'react-icons/lib/fa/chevron-up';
import {
  DisplayNameMapContext,
  getOperationAtPath,
  FIELD_OP_DISPLAY_NAME,
  RANGE_OPS,
  TERM_OPS,
  SOME_NOT_IN_OP,
  NOT_IN_OP,
} from '../utils';
import FieldOpModifier from '../filterComponents/index';
import ClickAwayListener from '../../utils/ClickAwayListener.js';
import { PillRemoveButton } from './common';
import { PROJECT_ID } from '../../utils/config';
import defaultApi from '../../utils/api';
import 'react-tippy/dist/tippy.css';
import { Tooltip } from 'react-tippy';
import isEqual from 'lodash/isEqual';
import internalTranslateSQONValue from '../../utils/translateSQONValue';

const translateIfSet = (value, dictionary) => {
  if (typeof value !== 'string' || !value.startsWith('set_id:')) {
    return value;
  }

  const foundInDict = dictionary.find(
    s => s.setId === value.replace('set_id:', ''),
  );

  return foundInDict ? foundInDict.tag : value;
};

const formatDisplayValue = (raw, dictionary = []) => {
  if (Array.isArray(raw)) {
    return raw
      .map(v => {
        return internalTranslateSQONValue(translateIfSet(v, dictionary));
      })
      .join(',');
  }

  return internalTranslateSQONValue(translateIfSet(raw, dictionary));
};

export default props => {
  const {
    onSqonChange = fullSqon => {},
    onContentRemove = () => {},
    fullSyntheticSqon,
    sqonPath = [],
    opDisplayNameMap = FIELD_OP_DISPLAY_NAME,
    arrangerProjectId = PROJECT_ID,
    arrangerProjectIndex,
    FieldOpModifierContainer = undefined,
    api = defaultApi,
    getActiveExecutableSqon,
    sqonDictionary,
    customQuery,
    nestedArrayFields,
  } = props;

  const fieldOpObj = getOperationAtPath(sqonPath)(fullSyntheticSqon);
  const {
    op,
    content: { field, value },
  } = fieldOpObj;
  const initialState = { isOpen: false };
  const onClickAway = s => () => {
    s.setState({ isOpen: false });
  };
  const toggleDropdown = s => () => s.setState({ isOpen: !s.state.isOpen });
  const onRemoveClick = () => {
    onContentRemove(fieldOpObj);
  };
  const onNewSqonSubmitted = s => newSqon => {
    onSqonChange(newSqon);
    toggleDropdown(s)();
  };

  const formattedValue = formatDisplayValue(value, sqonDictionary);

  const getOpDisplayName = (field, op) =>
    nestedArrayFields.includes(field) && op === SOME_NOT_IN_OP
      ? opDisplayNameMap[NOT_IN_OP]
      : opDisplayNameMap[op];

  return (
    <Component initialState={initialState}>
      {s => {
        const { isOpen } = s.state;
        return (
          <DisplayNameMapContext.Consumer>
            {(fieldDisplayNameMap = {}) => (
              <span className={`fieldOp pill`}>
                <span className={'opContainer'}>
                  <span className={`fieldName`}>
                    {fieldDisplayNameMap[field] || field}{' '}
                  </span>
                  <span className={`opName`}>
                    {` is ${
                      (RANGE_OPS.includes(op) || TERM_OPS.includes(op)) &&
                      !(isEqual(value, ['true']) || isEqual(value, ['false']))
                        ? getOpDisplayName(field, op)
                        : ''
                    } `}
                  </span>
                </span>
                <ClickAwayListener
                  className={'selectionContainer'}
                  handler={onClickAway(s)}
                >
                  <span className={'valueDisplay'} onClick={toggleDropdown(s)}>
                    <Tooltip position="bottom" html={formattedValue}>
                      {formattedValue}{' '}
                    </Tooltip>
                  </span>
                  <span onClick={toggleDropdown(s)}>
                    <span style={{ pointerEvents: 'none' }}>
                      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  </span>

                  {isOpen && (
                    <div className={`fieldFilterContainer`}>
                      <FieldOpModifier
                        arrangerProjectId={arrangerProjectId}
                        arrangerProjectIndex={arrangerProjectIndex}
                        field={field}
                        sqonPath={sqonPath}
                        initialSqon={fullSyntheticSqon}
                        onSubmit={onNewSqonSubmitted(s)}
                        onCancel={toggleDropdown(s)}
                        fieldDisplayNameMap={fieldDisplayNameMap}
                        opDisplayNameMap={opDisplayNameMap}
                        ContainerComponent={FieldOpModifierContainer}
                        getExecutableSqon={getActiveExecutableSqon}
                        api={api}
                        sqonDictionary={sqonDictionary}
                        customQuery={customQuery}
                        nestedArrayFields={nestedArrayFields}
                      />
                    </div>
                  )}
                </ClickAwayListener>
                <PillRemoveButton onClick={onRemoveClick} />
              </span>
            )}
          </DisplayNameMapContext.Consumer>
        );
      }}
    </Component>
  );
};
