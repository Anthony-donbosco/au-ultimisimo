import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import {
  responsiveWidth as wp,
  responsiveHeight as hp,
} from 'react-native-responsive-dimensions';

interface ResponsiveValues {
  width: number;
  height: number;
  isTablet: boolean;
  isPhone: boolean;
  orientation: 'portrait' | 'landscape';
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
}

export const useResponsive = (): ResponsiveValues => {
  const [dimensions, setDimensions] = useState<ScaledSize>(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isTablet = dimensions.width >= 768;
  const isPhone = dimensions.width < 768;
  const orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';

  return {
    width: dimensions.width,
    height: dimensions.height,
    isTablet,
    isPhone,
    orientation,
    wp,
    hp,
  };
};
