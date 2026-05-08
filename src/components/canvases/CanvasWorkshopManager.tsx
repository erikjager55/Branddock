import React from 'react';
import { CanvasWorkshopManager as IntegratedManager } from './CanvasWorkshopManager_INTEGRATED';

export function CanvasWorkshopManager(props: React.ComponentProps<typeof IntegratedManager>) {
  return <IntegratedManager {...props} />;
}

export default CanvasWorkshopManager;
