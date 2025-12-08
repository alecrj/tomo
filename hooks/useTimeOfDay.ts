import { useState, useEffect } from 'react';
import { getTimeOfDay, TimeOfDay } from '../constants/theme';

export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() =>
    getTimeOfDay(new Date().getHours())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay(new Date().getHours()));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return timeOfDay;
}

export default useTimeOfDay;
