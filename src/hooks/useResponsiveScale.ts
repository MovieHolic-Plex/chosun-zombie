import { useEffect, useState } from 'react';

export const useResponsiveScale = (): number => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return scale;
};
