import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, MousePointer, Eye, Maximize2, Minimize2 } from 'lucide-react';

interface VncViewerProps {
  vncUrl?: string;
}

export function VncViewer({ vncUrl = 'http://localhost:6080' }: VncViewerProps) {
  const [viewOnly, setViewOnly] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const vncSrc = `${vncUrl}/vnc.html?resize=scale&autoconnect=1&view_only=${viewOnly ? 1 : 0}&reconnect=1&reconnect_delay=2000`;

  const toggleFullscreen = () => {
    const container = document.getElementById('vnc-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div id="vnc-container" className="flex flex-col h-full bg-card border-l border-border">
      {/* Header - same height as main header (h-16) */}
      <div className="shrink-0 h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="font-semibold">Virtual Desktop</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewOnly ? 'outline' : 'default'}
            size="sm"
            onClick={() => setViewOnly(!viewOnly)}
            className="gap-2"
          >
            {viewOnly ? (
              <>
                <Eye className="h-4 w-4" />
                View Only
              </>
            ) : (
              <>
                <MousePointer className="h-4 w-4" />
                Interactive
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* VNC Frame */}
      <div className="flex-1 min-h-0 bg-black">
        <iframe
          src={vncSrc}
          className="w-full h-full border-0"
          allow="fullscreen"
          title="Virtual Desktop"
        />
      </div>
    </div>
  );
}
