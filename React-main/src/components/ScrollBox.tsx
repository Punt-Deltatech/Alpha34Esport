import { Box, type BoxProps } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { forwardRef } from 'react';

/**
 * Shared scrollbar look, derived from theme tokens (divider / primary.main).
 * Exported so components that can't be swapped for <ScrollBox> directly —
 * e.g. MUI's <DialogContent>, which scrolls itself — can still get the
 * identical scrollbar by spreading this into their own sx.
 *
 * Usage:
 *   <DialogContent sx={(theme) => ({ ...scrollbarStyles(theme), ...otherStyles })}>
 */
export function scrollbarStyles(theme: Theme) {
  return {
    // Firefox — scrollbarColor isn't part of MUI's theme-aware sx keys,
    // so pull the real hex values straight off the theme here.
    scrollbarWidth: 'thin' as const,
    scrollbarColor: `${theme.palette.divider} transparent`,
    // Chrome / Safari / Edge
    '&::-webkit-scrollbar': {
      width: 6,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.divider,
      borderRadius: 3,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  };
}

/**
 * ScrollBox — a Box with a thin scrollbar styled from the app's own theme
 * tokens, instead of the browser's bulky default. Drop-in replacement for
 * `<Box sx={{ overflowY: 'auto', ... }}>` on any scrollable list/panel —
 * e.g. the member list in SignupConfirmModal, the roster in MyTeam, etc.
 *
 * Usage:
 *   <ScrollBox sx={{ maxHeight: 280 }}>
 *     ...list items...
 *   </ScrollBox>
 */
const ScrollBox = forwardRef<HTMLDivElement, BoxProps>(function ScrollBox(
  { sx, children, ...rest },
  ref
) {
  return (
    <Box
      ref={ref}
      sx={[
        (theme) => ({
          overflowY: 'auto',
          ...scrollbarStyles(theme),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
});

export default ScrollBox;