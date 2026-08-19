# Brain System UI & Analytics Refinement Plan

Refine the "Clients Overview" dashboard and establish global UI standards for charts and cards to achieve a premium product aesthetic.

## 1. Global UI Standards

### Chart Standards (Recharts)
- **Colors**:
  - Indigo (#3D4FE8): Base volume (Active/New Clients).
  - Green (#22C55E): Positive metrics (LTV).
  - Amber (#F5A524): Attention/Cost (CAC).
  - Red (#EF4444): Negative (Churn).
- **Styling**:
  - `monotone` curves, 2px stroke.
  - Linear gradients for Area charts (12% to 0% opacity).
  - Hidden dots except on hover.
  - Horizontal-only dashed grid lines (#E4E6F0).
  - No axis lines, small grey labels (#8A8FA3).
- **Formatting**:
  - Integers for counts.
  - Abbreviated currency (R$ 4,2 mil).
  - 12-month baseline for X-Axis.
- **Tooltip**: Custom component with white background, soft shadow, and vertical reference line.

### Card Standards
- Rounded-xl corners, white background, #E4E6F0 border, very soft shadow.
- **Icon Header**: Rounded square background (#3D4FE8 @ 8% opacity) with icon inside, left-aligned.
- **Typography**: Sora SemiBold for titles, Plus Jakarta Sans for body/subtitles.
- Generous internal padding.

## 2. "Clients Overview" Fixes

### Data Layer (`src/lib/clients.functions.ts`)
- Ensure `topChannels` and `topCities` return empty states/placeholders if no data exists.
- Add city/state aggregation logic to correctly feed the ranking lists.
- Fix LTV/CAC calculation to avoid hardcoded mock values where possible.

### Brazil Map Correction
- Use `public/brazil.json` with `react-simple-maps`.
- Implement intensity-based fill (Indigo shades) for states with clients.
- Add zoom/reset controls.
- Add interactive tooltips showing "N client(s)" per state.
- Implement legend (Poucos / Médio / Muitos).

### Analytics Dashboard (`src/routes/_authenticated.clients.index.tsx`)
- Apply new card header pattern to all dashboard cards.
- Implement the 5-KPI strip with correct icons and tooltips.
- Add the 6 specific charts (Area/Line/Pie/Bar) following the new graphic standards.
- Reconstruct "Contas por líder" and "Health score por squad" cards.
- Refine "Clientes prioritários" table with capsule badges and time-based alerts.

## Technical Details

- **Components**: Create `CustomChartTooltip` and `ChartGradient` utilities.
- **Formatting**: Add a utility for Brazilian currency abbreviation (mil/mi).
- **Map**: Use `d3-scale` to map client counts to color intensity.
- **Empty States**: Ensure every section handles zero-data scenarios with clear messaging and icons.
