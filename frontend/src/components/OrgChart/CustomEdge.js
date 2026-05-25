import React, { memo, useCallback } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

const EDGE_LABEL_COLORS = {
  'Reports To':     '#22d3ee',
  'Advises':        '#a78bfa',
  'Board Seat':     '#f59e0b',
  'Workflow Owner': '#10b981',
  'Delegate':       '#f97316',
  'Collaborates':   '#6b7280',
};

const CustomEdge = memo(({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected, markerEnd, style
}) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const label     = data?.label || '';
  const labelColor = EDGE_LABEL_COLORS[label] || 'rgba(255,255,255,0.5)';
  const isLabeled  = !!label;
  const isAnimated = data?.animated || false;

  const deleteEdge = useCallback((e) => {
    e.stopPropagation();
    if (data?.onDeleteEdge) data.onDeleteEdge(id);
    else setEdges(eds => eds.filter(edge => edge.id !== id));
  }, [id, data, setEdges]);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isLabeled ? labelColor : 'rgba(34,211,238,0.35)',
          strokeWidth: selected ? 2.5 : isLabeled ? 2 : 1.5,
          strokeDasharray: isAnimated ? '6 3' : 'none',
          ...style,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-all"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {/* Label pill */}
          {isLabeled && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{
                background: labelColor + '20',
                color: labelColor,
                border: `1px solid ${labelColor}35`,
                backdropFilter: 'blur(8px)',
              }}
            >
              {label}
            </span>
          )}

          {/* Delete button — only when selected */}
          {selected && (
            <button
              onClick={deleteEdge}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#ef4444',
              }}
            >
              <X size={9}/>
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;
export { EDGE_LABEL_COLORS };
