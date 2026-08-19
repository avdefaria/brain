# Plan: Content Approval Module Implementation

Implement a professional content approval system within the "Brain" dashboard for Ongo agency. This includes a monthly calendar, social media-style post previews, a multi-step creation modal with media reordering, and a public, isolated link for client approval.

## User Review Required

> [!IMPORTANT]
> The public approval link will be accessible without authentication using a secure unique token. Is there any specific expiration logic you'd like (e.g., links expire after 7 days)?

- **Design Check**: The "Capsule/Pill" design system will be strictly applied to all new UI elements (badges, buttons, modals).

## Proposed Changes

### Backend (Database)
- **Tables**:
    - `content_posts`: Stores post details (caption, scheduled date, status, funnel stage, media URLs).
    - `content_comments`: Stores internal and client feedback.
    - `client_public_access`: Stores secure tokens for anonymous client access.
- **Enums**: `content_status` (Aprovado, Alterações, etc.) and `funnel_stage` (Atração, Educação, Conversão).
- **RLS & Security**:
    - Restricted access for authenticated staff.
    - Token-based read/write access for anonymous clients (isolated by `client_id`).

### Frontend (UI/UX)
- **Navigation**: Add "Aprovação de Conteúdo" submenu under "Projetos" in `AppShell.tsx`.
- **Components**:
    - `ContentCalendar`: Full-screen monthly view using `lucide-react` and Tailwind.
    - `CreatePostModal`: 3-step wizard with file upload (mocked storage integration) and media reordering.
    - `SocialPostCard`: High-fidelity Instagram feed simulation.
    - `ClientFeedPreview`: Sidebar showing the client's current grid and mock metrics.
- **New Routes**:
    - `/_authenticated/projects/content-approval`: Main internal dashboard.
    - `/public/approval/$token`: Public route for client review (bypasses main auth).

## Technical Details

- **Tech Stack**: React 19, TanStack Start, Tailwind CSS, Lucide React, Shadcn/UI.
- **Media Handling**: Support for images and videos (up to 20 per post).
- **Isolation**: Public links will filter data strictly by the client associated with the token.
- **Optimistic UI**: Use TanStack Query for smooth status updates and comment posting.

## Schedule
1. **Phase 1**: Database schema and basic routing.
2. **Phase 2**: Post creation and calendar view.
3. **Phase 3**: Social preview card and public link generation.
4. **Phase 4**: Feedback loop and final Polish.
