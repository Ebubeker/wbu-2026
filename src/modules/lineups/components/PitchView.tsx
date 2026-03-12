import { FORMATION_POSITIONS } from '@/lib/formations'
import type { Formation } from '@/lib/formations'

interface PitchPlayerMarker {
  name: string
  number: number
  positionSlot: number
}

interface PitchViewProps {
  formation: Formation
  players: PitchPlayerMarker[]
  primaryColor?: string
  secondaryColor?: string
  side?: 'left' | 'right'
  className?: string
  onSlotClick?: (slot: number) => void
  selectedSlot?: number | null
}

export function PitchView({
  formation,
  players,
  primaryColor = '#FFFFFF',
  secondaryColor = '#000000',
  side = 'left',
  className,
  onSlotClick,
  selectedSlot,
}: PitchViewProps) {
  const positions = FORMATION_POSITIONS[formation]

  return (
    <div className={className}>
      <svg viewBox="0 0 200 300" className="w-full h-full">
        {/* Pitch background */}
        <rect width="200" height="300" fill="#2d8a4e" rx="4" />

        {/* Field markings */}
        <rect x="10" y="10" width="180" height="280" fill="none" stroke="#ffffff30" strokeWidth="1" />
        {/* Center line */}
        <line x1="10" y1="150" x2="190" y2="150" stroke="#ffffff30" strokeWidth="1" />
        {/* Center circle */}
        <circle cx="100" cy="150" r="30" fill="none" stroke="#ffffff30" strokeWidth="1" />
        {/* Goal areas */}
        <rect x="60" y="10" width="80" height="40" fill="none" stroke="#ffffff30" strokeWidth="1" />
        <rect x="60" y="250" width="80" height="40" fill="none" stroke="#ffffff30" strokeWidth="1" />
        {/* Penalty arcs */}
        <rect x="75" y="10" width="50" height="20" fill="none" stroke="#ffffff30" strokeWidth="1" />
        <rect x="75" y="270" width="50" height="20" fill="none" stroke="#ffffff30" strokeWidth="1" />

        {/* Players */}
        {positions.map((pos, slotIndex) => {
          const player = players.find((p) => p.positionSlot === slotIndex)
          const px = (pos.x / 100) * 160 + 20
          let py: number
          if (side === 'left') {
            py = 280 - (pos.y / 100) * 140
          } else {
            py = 20 + (pos.y / 100) * 140
          }

          const isSelected = selectedSlot === slotIndex

          return (
            <g
              key={slotIndex}
              onClick={() => onSlotClick?.(slotIndex)}
              style={onSlotClick ? { cursor: 'pointer' } : undefined}
            >
              {/* Player circle */}
              <circle
                cx={px}
                cy={py}
                r="14"
                fill={primaryColor}
                stroke={isSelected ? '#FFD700' : secondaryColor}
                strokeWidth={isSelected ? 3 : 2}
              />
              {/* Number */}
              <text
                x={px}
                y={py}
                textAnchor="middle"
                dominantBaseline="central"
                fill={secondaryColor}
                fontSize="10"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {player?.number ?? '?'}
              </text>
              {/* Name */}
              {player && (
                <text
                  x={px}
                  y={py + 20}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  fontFamily="system-ui"
                >
                  {player.name.length > 10 ? player.name.slice(0, 10) + '\u2026' : player.name}
                </text>
              )}
              {/* Position label if no player */}
              {!player && (
                <text
                  x={px}
                  y={py + 20}
                  textAnchor="middle"
                  fill="#ffffff80"
                  fontSize="7"
                  fontFamily="system-ui"
                >
                  {pos.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
