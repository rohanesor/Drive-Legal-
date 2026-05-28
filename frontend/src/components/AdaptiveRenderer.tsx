import React from 'react';
import { useAppMode } from '../hooks/useAppMode';

interface AdaptiveRendererProps {
  mobile: React.ReactNode;
  car: React.ReactNode;
}

export const AdaptiveRenderer: React.FC<AdaptiveRendererProps> = ({ mobile, car }) => {
  const { isCar } = useAppMode();
  return isCar ? <>{car}</> : <>{mobile}</>;
};

export default AdaptiveRenderer;
