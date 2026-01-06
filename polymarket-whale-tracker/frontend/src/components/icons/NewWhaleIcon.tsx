/**
 * New Whale Icon Component
 *
 * Whale silhouette with a "plus" indicator for new tracking.
 * Used in: KPI cards (24px)
 */

import { IconWrapper, type IconProps } from './Icon';

export function NewWhaleIcon(props: IconProps) {
    return (
        <IconWrapper {...props} viewBox="0 0 24 24">
            {/* 
        Mini surfacing ASCII Whale 
          .
        /   \
       |  +  |
       */}

            {/* Spout (.) */}
            <circle cx="12" cy="5" r="1" fill="currentColor" />

            {/* Surfacing Body (/ \) */}
            <path
                d="M7,12 L12,7 L17,12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
                fill="none"
            />

            {/* Base (|___|) */}
            <path
                d="M7,12 V17 H17 V12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
                fill="none"
            />

            {/* Tail (v) */}
            <path
                d="M12,17 L12,20 M10,20 L12,20 L14,20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
            />

            {/* "New" Badge (+) - drawn as ASCII plus inside */}
            <path
                d="M12,10 V14 M10,12 H14"
                stroke="var(--cyan)"
                strokeWidth="1.5"
                strokeLinecap="square"
            />
        </IconWrapper>
    );
}
