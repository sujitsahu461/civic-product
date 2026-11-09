import React from 'react';

/**
 * Icon — Material Symbols Outlined wrapper
 * Usage: <Icon name="account_balance" fill size={24} />
 */
export interface IconProps {
  name: string;
  fill?: boolean;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({
  name,
  fill = false,
  size = 24,
  className = '',
  style = {},
}) => {
  return (
    <span
      className={`material-symbols-outlined${fill ? ' icon-fill' : ''} ${className}`}
      style={{
        fontFamily: "'Material Symbols Outlined', sans-serif",
        fontSize: size,
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        verticalAlign: 'middle',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        direction: 'ltr',
        fontFeatureSettings: "'liga'",
        WebkitFontFeatureSettings: "'liga'",
        ...style,
      }}
    >
      {name}
    </span>
  );
};

export default Icon;
