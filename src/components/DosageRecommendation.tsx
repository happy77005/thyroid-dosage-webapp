import React from 'react';
import { DosageRecommendation as DosageRecommendationType } from '../types/medical';

interface DosageRecommendationProps {
  recommendation: DosageRecommendationType;
  condition: string;
}

export const DosageRecommendation: React.FC<DosageRecommendationProps> = ({ 
  recommendation: _recommendation, 
  condition: _condition 
}) => {
  return null;
};