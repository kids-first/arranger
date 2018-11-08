import * as React from 'react';
import { Portal } from 'react-portal';
import styled from 'react-emotion';

export const ModalOverlay: React.ComponentType = ({ children }) => {
  const Overlay = styled('div')`
    position: absolute;
    left: 0px;
    right: 0px;
    top: 0px;
    bottom: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
  `;
  return (
    <Portal>
      <Overlay>{children}</Overlay>
    </Portal>
  );
};