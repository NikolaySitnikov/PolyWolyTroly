/**
 * New Whale Icon Component
 *
 * Classic whale fluke (tail) silhouette with sparkle for "new".
 * Used in: KPI cards (24px)
 */

import { IconWrapper, type IconProps } from './Icon';

export function NewWhaleIcon(props: IconProps) {
    return (
        <IconWrapper {...props} viewBox="0 0 24 24">
            {/*
             * Classic whale fluke shape - the iconic "W" tail
             * Looks like: \_    _/
             *               \__/
             */}
            <path
                d="M3 8 C5 6, 7 7, 9 10 C10 12, 11 14, 12 15 C13 14, 14 12, 15 10 C17 7, 19 6, 21 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
            />

            {/* Water surface line */}
            <path
                d="M2 18 Q6 16, 12 18 Q18 20, 22 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
            />

            {/* Sparkle for "new" */}
            <path
                d="M19 3 L19 5 M18 4 L20 4"
                stroke="var(--cyan)"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </IconWrapper>
    );
}
