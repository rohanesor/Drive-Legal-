import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setMode } from '../store/appModeSlice';

export const useAppMode = () => {
  const dispatch = useDispatch();
  
  const mode = useSelector((state: RootState) => state.appMode.mode);
  const isCar = mode === 'car';
  const isMobile = mode === 'mobile';
  
  const isDriving = useSelector((state: RootState) => state.appMode.isDriving);
  const isCarDocked = useSelector((state: RootState) => state.appMode.isCarDocked);
  const preferences = useSelector((state: RootState) => state.appMode.carModePreferences);
  
  const switchMode = (newMode: 'mobile' | 'car', method: 'auto' | 'manual' = 'manual') => {
    dispatch(setMode({ mode: newMode, method }));
  };

  /**
   * Helper that returns a value depending on the current active mode.
   * Useful for styling or minor layout differences without duplicating screens.
   */
  const adaptiveValue = <T>(mobileVal: T, carVal: T): T => {
    return isCar ? carVal : mobileVal;
  };

  /**
   * Helper to check if a specific feature component is allowed in current mode
   */
  const shouldRender = (allowedModes: ('mobile' | 'car')[]): boolean => {
    return allowedModes.includes(mode);
  };

  return {
    mode,
    isCar,
    isMobile,
    isDriving,
    isCarDocked,
    preferences,
    switchMode,
    adaptiveValue,
    shouldRender,
  };
};
export default useAppMode;
