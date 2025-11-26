import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Globe, AlertCircle, Code2 } from 'lucide-react';
import type { HttpLogEntry } from '@/types';
import { useState } from 'react';

interface HttpLogsProps {
  logs: HttpLogEntry[];
}

export function HttpLogs({ logs }: HttpLogsProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [expandedPayloads, setExpandedPayloads] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const togglePayload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPayloads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatPayload = (body: Record<string, unknown>) => {
    // Create a sanitized copy that truncates large values
    const sanitized = sanitizePayload(body);
    return JSON.stringify(sanitized, null, 2);
  };

  const sanitizePayload = (obj: unknown, depth = 0): unknown => {
    if (depth > 5) return '[nested...]';

    if (Array.isArray(obj)) {
      if (obj.length > 10) {
        return [...obj.slice(0, 10).map(item => sanitizePayload(item, depth + 1)), `... and ${obj.length - 10} more items`];
      }
      return obj.map(item => sanitizePayload(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Truncate base64 images
        if (key === 'data' && typeof value === 'string' && value.length > 100) {
          result[key] = `${value.slice(0, 50)}... [${value.length} chars]`;
        } else if (typeof value === 'string' && value.length > 500) {
          result[key] = `${value.slice(0, 200)}... [${value.length} chars]`;
        } else {
          result[key] = sanitizePayload(value, depth + 1);
        }
      }
      return result;
    }

    return obj;
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'bg-muted text-muted-foreground';
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-500/20 text-green-600';
    if (statusCode >= 400 && statusCode < 500) return 'bg-amber-500/20 text-amber-600';
    if (statusCode >= 500) return 'bg-red-500/20 text-red-600';
    return 'bg-muted text-muted-foreground';
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Globe className="h-12 w-12 mb-4 opacity-50" />
        <p>No HTTP exchanges yet</p>
        <p className="text-sm">API requests will appear here as you chat</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-2 max-w-4xl mx-auto">
        {logs.map((log) => (
          <Collapsible
            key={log.id}
            open={openItems.has(log.id)}
            onOpenChange={() => toggleItem(log.id)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`font-mono text-xs ${getStatusColor(log.response?.status_code)}`}
                >
                  {log.response?.status_code || 'N/A'}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {log.request.method}
                </Badge>
                <span className="text-sm font-mono truncate max-w-md">
                  {new URL(log.request.url).pathname}
                </span>
                {log.error && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openItems.has(log.id) ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <div className="mt-2 p-3 rounded-md bg-muted/50 font-mono text-sm space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Request
                  </div>
                  <div className="text-primary">
                    {log.request.method} {log.request.url}
                  </div>
                </div>

                {/* Expandable Payload Section */}
                {log.request.body && (
                  <div className="border-t border-border/50 pt-3">
                    <button
                      onClick={(e) => togglePayload(log.id, e)}
                      className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full text-left"
                    >
                      {expandedPayloads.has(log.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <Code2 className="h-3 w-3" />
                      <span>Request Payload</span>
                      <span className="text-[10px] font-normal normal-case ml-1 opacity-60">
                        ({Object.keys(log.request.body).length} fields)
                      </span>
                    </button>
                    {expandedPayloads.has(log.id) && (
                      <pre className="mt-2 p-3 rounded bg-background/80 border border-border/30 text-xs overflow-x-auto max-h-96 overflow-y-auto">
                        <code className="text-foreground/90">{formatPayload(log.request.body)}</code>
                      </pre>
                    )}
                  </div>
                )}

                {log.response && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Response
                    </div>
                    <div className={getStatusColor(log.response.status_code).replace('bg-', 'text-').replace('/20', '')}>
                      Status: {log.response.status_code}
                    </div>
                  </div>
                )}
                {log.error && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Error
                    </div>
                    <div className="text-destructive">{log.error}</div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );
}
