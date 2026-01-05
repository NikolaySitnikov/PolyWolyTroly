/**
 * SwipeableCard Component Tests
 *
 * Testing swipe gestures for mobile whale cards.
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md: Swipe right to follow, swipe left to hide
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableCard } from './SwipeableCard';

describe('SwipeableCard', () => {
  it('renders children', () => {
    render(
      <SwipeableCard onSwipeLeft={() => {}} onSwipeRight={() => {}}>
        <div>Card content</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('calls onSwipeRight when swiped right beyond threshold', () => {
    const onSwipeRight = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={() => {}} onSwipeRight={onSwipeRight}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Simulate touch start
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Simulate touch move (swipe right)
    fireEvent.touchMove(card, {
      touches: [{ clientX: 200, clientY: 100 }],
    });

    // Simulate touch end
    fireEvent.touchEnd(card);

    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('calls onSwipeLeft when swiped left beyond threshold', () => {
    const onSwipeLeft = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={onSwipeLeft} onSwipeRight={() => {}}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Simulate touch start
    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 100 }],
    });

    // Simulate touch move (swipe left)
    fireEvent.touchMove(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Simulate touch end
    fireEvent.touchEnd(card);

    expect(onSwipeLeft).toHaveBeenCalled();
  });

  it('does not trigger swipe if movement is below threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Simulate small touch movement (below threshold)
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(card, {
      touches: [{ clientX: 120, clientY: 100 }], // Only 20px movement
    });

    fireEvent.touchEnd(card);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not trigger swipe for vertical movement', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Simulate vertical touch movement
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(card, {
      touches: [{ clientX: 100, clientY: 200 }], // Vertical movement
    });

    fireEvent.touchEnd(card);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('shows swipe hint indicators', () => {
    render(
      <SwipeableCard
        onSwipeLeft={() => {}}
        onSwipeRight={() => {}}
        leftHint="Hide"
        rightHint="Follow"
      >
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Simulate touch start to reveal hints
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Swipe right to show follow hint
    fireEvent.touchMove(card, {
      touches: [{ clientX: 150, clientY: 100 }],
    });

    // The hint should be visible in the DOM (behind the card)
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('resets position after swipe is cancelled', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Start swipe
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Small movement (not enough to trigger)
    fireEvent.touchMove(card, {
      touches: [{ clientX: 120, clientY: 100 }],
    });

    // End touch - should reset without triggering swipe
    fireEvent.touchEnd(card);

    // Neither swipe callback should have been called
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('supports custom swipe threshold', () => {
    const onSwipeRight = vi.fn();
    render(
      <SwipeableCard
        onSwipeLeft={() => {}}
        onSwipeRight={onSwipeRight}
        threshold={150}
      >
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Swipe 100px (below custom 150px threshold)
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(card, {
      touches: [{ clientX: 200, clientY: 100 }],
    });

    fireEvent.touchEnd(card);

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('calls onClick when tapped without swipe', () => {
    const onClick = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={() => {}} onSwipeRight={() => {}} onClick={onClick}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Tap without movement
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchEnd(card);

    expect(onClick).toHaveBeenCalled();
  });

  it('does not call onClick when swiped', () => {
    const onClick = vi.fn();
    const onSwipeRight = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={() => {}} onSwipeRight={onSwipeRight} onClick={onClick}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Swipe
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(card, {
      touches: [{ clientX: 200, clientY: 100 }],
    });

    fireEvent.touchEnd(card);

    expect(onClick).not.toHaveBeenCalled();
    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('does not call onClick when scrolling vertically (prevents accidental card entry during scroll)', () => {
    const onClick = vi.fn();
    render(
      <SwipeableCard onSwipeLeft={() => {}} onSwipeRight={() => {}} onClick={onClick}>
        <div>Card content</div>
      </SwipeableCard>
    );

    const card = screen.getByTestId('swipeable-card');

    // Simulate vertical scroll gesture
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(card, {
      touches: [{ clientX: 100, clientY: 200 }], // 100px vertical movement
    });

    fireEvent.touchEnd(card);

    // onClick should NOT be called because user was scrolling
    expect(onClick).not.toHaveBeenCalled();
  });
});
