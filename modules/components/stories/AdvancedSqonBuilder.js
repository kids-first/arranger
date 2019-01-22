import React from 'react';
import Component from 'react-component-component';
//$FlowIgnore
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { themeDecorator } from './decorators';
import AdvancedSqonBuilder from '../src/AdvancedSqonBuilder';

const DemoSqonActionComponent = ({
  sqonIndex,
  isActive,
  isSelected,
  isHoverring,
}) =>
  !(isHoverring || isActive) && (
    <div
      style={{
        position: 'absolute',
        right: 0,
        height: '100%',
      }}
    >
      <div>sqonIndex: {String(sqonIndex)}</div>
      <div>isActive: {String(isActive)}</div>
      <div>isSelected: {String(isSelected)}</div>
      <div>isHoverring: {String(isHoverring)}</div>
    </div>
  );

const DemoModal = ({ onOk = () => {}, onCancel = () => {} }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <div style={{ background: 'white' }}>
      Will remove stuff!
      <button onClick={onOk}>ok</button>
      <button onClick={onCancel}>cancel</button>
    </div>
  </div>
);

storiesOf('AdvancedSqonBuilder', module)
  .addDecorator(themeDecorator)
  .add('Builder', () => {
    const initialState = {
      activeSqonIndex: 0,
      ModalComponent: null,
      syntheticSqons: [
        {
          op: 'and',
          content: [
            { op: 'in', content: { field: 'kf_id', value: ['GF_9V1MT6CM'] } },
          ],
        },
        {
          op: 'or',
          content: [
            {
              op: 'in',
              content: {
                field: 'participants.diagnoses.diagnosis_category',
                value: ['Cancer'],
              },
            },
            {
              op: 'in',
              content: {
                field: 'participants.phenotype.hpo_phenotype_observed_text',
                value: [
                  'Abnormality of nervous system physiology (HP:0012638)',
                ],
              },
            },
            {
              op: 'in',
              content: {
                field: 'participants.study.short_name',
                value: [
                  'Ewing Sarcoma: Genetic Risk',
                  'Pediatric Brain Tumors: CBTTC',
                ],
              },
            },
          ],
        },
      ],
    };
    const fieldDisplayNameMap = {
      'participants.diagnoses.diagnosis_category': 'Diagnosis Category',
      'participants.phenotype.hpo_phenotype_observed_text': 'Observed Text',
      'participants.study.short_name': 'Study Short Name',
      kf_id: 'File ID',
    };
    const onChange = s => ({ newSyntheticSqons, sqonValues }) => {
      action('sqons change')({ newSyntheticSqons, sqonValues });
      s.setState({ syntheticSqons: newSyntheticSqons });
    };
    const onActiveSqonSelect = s => ({ index, sqonValue }) => {
      action('active sqon select')({ index, sqonValue });
      s.setState({ activeSqonIndex: index });
    };
    const setModal = s => ModalComponent =>
      s.setState({
        ModalComponent,
      });
    return (
      <Component initialState={initialState}>
        {s => (
          <div style={{ position: 'relative', height: '100%' }}>
            <AdvancedSqonBuilder
              syntheticSqons={s.state.syntheticSqons}
              activeSqonIndex={s.state.activeSqonIndex}
              fieldDisplayNameMap={fieldDisplayNameMap}
              onChange={onChange(s)}
              onActiveSqonSelect={onActiveSqonSelect(s)}
              getSqonDeleteConfirmation={({
                indexToRemove,
                dependentIndices,
              }) =>
                new Promise((resolve, reject) => {
                  setModal(s)(() => (
                    <DemoModal
                      onOk={() => {
                        setModal(s)(null);
                        resolve();
                      }}
                      onCancel={() => {
                        setModal(s)(null);
                        reject();
                      }}
                    />
                  ));
                })
              }
              SqonActionComponent={DemoSqonActionComponent}
            />
            {s.state.ModalComponent ? s.state.ModalComponent() : null}
          </div>
        )}
      </Component>
    );
  });
