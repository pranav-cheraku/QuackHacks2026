import { createContext, useContext } from 'react';
import type { CSSProperties } from 'react';
import type { LayoutNode, BrandTokens, ContentBlock, TextBlockStyle, ShapeBlockStyle } from '@/lib/ir';
import { gridToCSS } from '@/lib/grid';

// ---------------------------------------------------------------------------
// Brand context — avoids prop drilling through deeply nested trees.
// ---------------------------------------------------------------------------

const DEFAULT_BRAND: BrandTokens = {
  palette: ['#ffffff', '#f8fafc', '#e2e8f0', 'oklch(0.24 0.009 185)', 'oklch(0.54 0.105 192)'],
  fontHeading: 'Inter, system-ui, sans-serif',
  fontBody:    'Inter, system-ui, sans-serif',
  spacingScale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  gridColumns: 12,
};

const BrandCtx = createContext<BrandTokens>(DEFAULT_BRAND);

// ---------------------------------------------------------------------------
// ContentBlock renderer — renders the visual content inside a leaf.
// Leaf positioning is handled by NodeRenderer via gridToCSS.
// ---------------------------------------------------------------------------

function Block({ block }: { block: ContentBlock }) {
  const brand = useContext(BrandCtx);

  // ── User-authored blocks ──────────────────────────────────────────────────

  if (block.role === 'text') {
    const s = block.style as TextBlockStyle;
    return (
      <div
        style={{
          width: '100%', height: '100%', padding: '4px',
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          fontStyle: s.fontStyle,
          textDecoration: s.textDecoration,
          textAlign: s.textAlign,
          color: s.color,
          lineHeight: s.lineHeight ?? 1.4,
          letterSpacing: s.letterSpacing,
          fontFamily:
            s.fontFamily === 'mono' ? 'var(--font-mono, monospace)' :
            s.fontFamily === 'serif' ? 'var(--font-serif, serif)' :
            'inherit',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
        }}
      >
        {block.text}
      </div>
    );
  }

  if (block.role === 'shape') {
    const s = block.style as ShapeBlockStyle;
    return (
      <div
        style={{
          width: '100%', height: '100%',
          background: s.fill,
          borderRadius: s.borderRadius,
          border: s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.stroke}` : undefined,
        }}
      />
    );
  }

  if (block.role === 'image') {
    return block.src ? (
      <img
        src={block.src}
        style={{ width: '100%', height: '100%', objectFit: block.style?.objectFit ?? 'cover' }}
      />
    ) : (
      <div style={{
        width: '100%', height: '100%',
        background: 'oklch(0.94 0.015 192 / 0.3)',
        border: '2px dashed oklch(0.54 0.105 192 / 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
          <path d="M1 11l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  // ── Agent-semantic blocks ─────────────────────────────────────────────────

  const base: CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: brand.fontBody,
  };

  if (block.role === 'claim') {
    return (
      <div style={{ ...base, justifyContent: 'center' }}>
        <p style={{
          margin: 0,
          fontFamily: brand.fontHeading,
          fontSize: '7.75cqw',
          fontWeight: 800,
          lineHeight: 0.95,
          color: 'oklch(0.24 0.009 185)',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}>{block.text}</p>
      </div>
    );
  }

  if (block.role === 'evidence') {
    return (
      <div style={{ ...base, justifyContent: 'center' }}>
        <p style={{
          margin: 0,
          fontSize: '1.94cqw',
          fontWeight: 400,
          lineHeight: 1.4,
          color: 'oklch(0.53 0.011 185)',
          overflowWrap: 'break-word',
        }}>{block.text}</p>
      </div>
    );
  }

  if (block.role === 'aside') {
    return (
      <div style={{ ...base, justifyContent: 'center' }}>
        <p style={{
          margin: 0,
          fontSize: '1.3cqw',
          fontWeight: 700,
          letterSpacing: '0.25em',
          color: 'var(--accent-teal)',
          fontFamily: 'var(--font-mono, monospace)',
        }}>{block.text}</p>
      </div>
    );
  }

  if (block.role === 'visual') {
    return (
      <div style={{
        ...base,
        background: 'oklch(0.96 0.01 192 / 0.25)',
        border: '1.5px dashed oklch(0.54 0.105 192 / 0.35)',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        <svg width="28" height="28" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.35 }}>
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="oklch(0.54 0.105 192)" strokeWidth="1.5"/>
          <circle cx="5.5" cy="5.5" r="1.5" fill="oklch(0.54 0.105 192)"/>
          <path d="M1 11l4-4 3 3 3-4 4 5" stroke="oklch(0.54 0.105 192)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {block.caption && (
          <p style={{ margin: 0, fontSize: '1.1cqw', color: '#9ca3af', textAlign: 'center' }}>{block.caption}</p>
        )}
      </div>
    );
  }

  if (block.role === 'data') {
    const rawValues = block.chart.data['values'];
    const values: number[] = Array.isArray(rawValues)
      ? rawValues.filter((v): v is number => typeof v === 'number')
      : [];
    const max = values.length > 0 ? Math.max(...values) : 1;
    return (
      <div style={{ ...base, gap: '0.6cqw' }}>
        {block.chart.title && (
          <p style={{
            margin: 0,
            fontSize: '1.2cqw',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9ca3af',
            fontFamily: 'var(--font-mono, monospace)',
          }}>{block.chart.title}</p>
        )}
        {values.length > 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '0.5cqw', minHeight: 0 }}>
            {values.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${(v / max) * 100}%`,
                  background: i >= values.length - 3 ? 'oklch(0.54 0.105 192)' : 'oklch(0.85 0.02 192)',
                  borderRadius: '2px 2px 0 0',
                  minHeight: 2,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // figure role
  return (
    <div style={{ ...base, justifyContent: 'center' }}>
      <p style={{ margin: 0, fontSize: '1.2cqw', color: '#9ca3af', fontFamily: 'var(--font-mono, monospace)' }}>
        {block.diagram.kind}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NodeRenderer — recursive, deterministic.
// Stack nodes are transparent grouping containers (no layout authority).
// Leaf nodes are absolutely positioned using gridToCSS(leaf.placement).
// ---------------------------------------------------------------------------

function NodeRenderer({ node }: { node: LayoutNode }) {
  if (node.kind === 'stack') {
    return <>{node.children.map((child) => <NodeRenderer key={child.id} node={child} />)}</>;
  }

  const css = gridToCSS(node.placement);
  return (
    <div
      style={{
        ...css,
        zIndex: node.zIndex ?? 0,
        opacity: node.opacity ?? 1,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <Block block={node.block} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * SlideContent — read-only renderer for a LayoutNode tree.
 * Drop into any sized relative container (thumbnail, preview).
 * Leaves are positioned absolutely via gridToCSS.
 */
export function SlideContent({ node, brand }: { node: LayoutNode; brand?: BrandTokens }) {
  return (
    <BrandCtx.Provider value={brand ?? DEFAULT_BRAND}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <NodeRenderer node={node} />
      </div>
    </BrandCtx.Provider>
  );
}

/**
 * SlideRenderer — alias for SlideContent (kept for backward compat).
 */
export function SlideRenderer({ node, brand }: { node: LayoutNode; brand?: BrandTokens }) {
  return <SlideContent node={node} brand={brand} />;
}

/**
 * Slide — full 16:9 white card with slide chrome.
 * Use for standalone demo / preview at full size.
 */
export function Slide({ node, brand }: { node: LayoutNode; brand?: BrandTokens }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: 960,
      aspectRatio: '16 / 9',
      background: '#ffffff',
      borderRadius: 10,
      boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <SlideContent node={node} brand={brand} />
    </div>
  );
}
