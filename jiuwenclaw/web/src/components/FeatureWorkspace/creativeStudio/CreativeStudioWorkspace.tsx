import { useMemo } from 'react';
import CreativeEditor from '@cesdk/cesdk-js/react';
import { initAdvancedVideoEditor } from './initAdvancedVideoEditor';
import './CreativeStudioWorkspace.css';

type CreativeStudioWorkspaceProps = {
  onExit: () => void;
};

export function CreativeStudioWorkspace({ onExit: _onExit }: CreativeStudioWorkspaceProps) {
  const config = useMemo(() => {
    return {
      license: import.meta.env.VITE_CESDK_LICENSE || 'evaluation-license',
      userId: 'deep-canvas-creative-studio',
      baseURL: '/assets/',
    };
  }, []);

  return (
    <section className="creative-studio animate-rise">
      <CreativeEditor
        className="creative-studio__editor"
        config={config}
        init={initAdvancedVideoEditor}
        width="100%"
        height="100%"
      />
    </section>
  );
}