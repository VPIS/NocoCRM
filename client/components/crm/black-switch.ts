// A switch black when on, as the buttons that commit are (the button's
// `contrast` variant), rather than the primary purple: the Auto follow-up
// page's and the General settings' switches. The thumb takes the ground's
// colour so it still shows in dark mode.
export const BLACK_SWITCH =
  'data-checked:bg-foreground dark:**:data-[slot=switch-thumb]:data-checked:bg-background';
