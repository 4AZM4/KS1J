import type { ComponentType } from 'react';
import { ICONS, type IconName } from '@ks1j/shared';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

const SHAPES = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon, ellipse: Ellipse };

/** A Tabler outline icon (see packages/shared/src/icons.ts). Decorative: the text next to it carries the meaning. */
export function Icon({ name, size = 24, color, strokeWidth = 1.8 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {ICONS[name].map(([tag, attrs], i) => {
        const Shape = SHAPES[tag] as unknown as ComponentType<Record<string, string>>;
        return <Shape key={String(i)} {...attrs} />;
      })}
    </Svg>
  );
}
