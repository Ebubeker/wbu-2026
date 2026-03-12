import * as React from 'react'

interface KitPreviewProps {
  primaryColor: string
  secondaryColor: string
  pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
  number?: number
  size?: number
  className?: string
}

export function KitPreview({
  primaryColor,
  secondaryColor,
  pattern,
  number,
  size = 120,
  className,
}: KitPreviewProps) {
  const id = React.useId()
  const patternId = `kit-pattern-${id}`
  const gradientId = `kit-gradient-${id}`

  function renderPattern() {
    switch (pattern) {
      case 'STRIPES':
        return (
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="12" height="12">
              <rect width="6" height="12" fill={primaryColor} />
              <rect x="6" width="6" height="12" fill={secondaryColor} />
            </pattern>
          </defs>
        )
      case 'CHECKERED':
        return (
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="16" height="16">
              <rect width="8" height="8" fill={primaryColor} />
              <rect x="8" width="8" height="8" fill={secondaryColor} />
              <rect y="8" width="8" height="8" fill={secondaryColor} />
              <rect x="8" y="8" width="8" height="8" fill={primaryColor} />
            </pattern>
          </defs>
        )
      case 'GRADIENT':
        return (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
        )
      default:
        return null
    }
  }

  function getFill() {
    switch (pattern) {
      case 'STRIPES':
      case 'CHECKERED':
        return `url(#${patternId})`
      case 'GRADIENT':
        return `url(#${gradientId})`
      default:
        return primaryColor
    }
  }

  function getNumberColor() {
    return pattern === 'GRADIENT' ? primaryColor : secondaryColor
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderPattern()}
      <path
        d="M30 20 L20 25 L10 35 L15 40 L22 35 L22 85 L78 85 L78 35 L85 40 L90 35 L80 25 L70 20 L60 25 Q50 30 40 25 Z"
        fill={getFill()}
        stroke={secondaryColor}
        strokeWidth="1.5"
      />
      <path
        d="M40 20 Q50 28 60 20"
        fill="none"
        stroke={secondaryColor}
        strokeWidth="1.5"
      />
      {number !== undefined && (
        <text
          x="50"
          y="62"
          textAnchor="middle"
          dominantBaseline="central"
          fill={getNumberColor()}
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {number}
        </text>
      )}
    </svg>
  )
}
