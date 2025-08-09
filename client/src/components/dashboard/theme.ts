export const dashboardPalette = {
  gradientBlue: 'linear-gradient(135deg,#2563eb 0%,#3b82f6 40%,#60a5fa 100%)',
  gradientTeal: 'linear-gradient(135deg,#0d9488 0%,#14b8a6 50%,#2dd4bf 100%)',
  gradientOrange: 'linear-gradient(135deg,#ea580c 0%,#f97316 50%,#fb923c 100%)',
  gradientRed: 'linear-gradient(135deg,#dc2626 0%,#ef4444 50%,#f87171 100%)',
  gradientPurple: 'linear-gradient(135deg,#6d28d9 0%,#7e22ce 50%,#9333ea 100%)',
  gradientGray: 'linear-gradient(135deg,#64748b 0%,#94a3b8 60%,#cbd5e1 100%)'
};

export const kpiColor = (type: string) => {
  switch (type) {
    case 'users': return dashboardPalette.gradientBlue;
    case 'coaches': return dashboardPalette.gradientPurple;
    case 'risk': return dashboardPalette.gradientOrange;
    case 'lost': return dashboardPalette.gradientRed;
    case 'surveys': return dashboardPalette.gradientTeal;
    default: return dashboardPalette.gradientGray;
  }
};
