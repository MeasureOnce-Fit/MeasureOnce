# MeasureOnce UX Contract

Visual direction and tokens live in [DESIGN.md](DESIGN.md). This file owns repeated product behavior.

## Identity states

- **Guest:** Fit calculations may run in the current session. No durable Fit Profile write is attempted.
- **Retailer signed-out:** The retailer owns sign-in. MeasureOnce offers no shopper credential form and guest fit remains available.
- **Retailer signed-in, no Fit Passport:** Offer an optional, unchecked Fit Passport setup after the signed retailer session is verified.
- **Retailer signed-in, returning:** Resolve the retailer-scoped opaque subject on the server, load the saved profiles, and show the active profile in the fit control.
- **Unconfigured integration:** Explain that the fictional retailer identity bridge is unavailable in this environment. Guest fit remains available.
- **Expired, invalid, or switched retailer session:** Protected requests return 401; the UI clears private state and returns control to the retailer's sign-in/account surface.

## Profile operations

- Creating an owner profile returns to that profile's overview.
- Creating an additional member requires a nickname and an unchecked permission confirmation.
- Editing uses optimistic version checks. A conflict preserves entered values, reloads server data on request, and explains the conflict inline.
- The selected profile is explicit. Measurements, anchors, and preferences never copy between profiles automatically.
- Profile deletion uses an app-owned confirmation dialog, identifies the profile, removes it immediately on success, selects another allowed profile, and announces the result.

## Consent

- Saving fit evidence requires an explicit unchecked control and a versioned consent event.
- Withdrawing consent blocks later durable fit writes until consent is granted again. It does not silently delete existing data.
- Guest and declined-save states remain usable for session-only recommendations.

## Account rights

- Export downloads deterministic JSON for the authenticated owner's allowed data only.
- Fit Passport deletion uses a separate danger area and explicit confirmation. It removes only retailer-scoped MeasureOnce data and the identity link; it never deletes or signs the shopper out of the retailer account. Partial server failure is reported as pending, and the interface never claims deletion completed when it did not.
- No browser-native `alert`, `confirm`, or `prompt` is used.

## Feedback and recovery

- Every asynchronous action has idle, pending, success, validation-error, authorization-error, conflict, and unavailable states.
- Buttons keep stable dimensions while pending and prevent duplicate submissions.
- Inline errors identify the affected field or operation and describe the next action. Status messages use `role="status"`; blocking failures use `role="alert"`.
- Network failure preserves unsaved form values and offers retry.

## Canonical UI ownership

| Capability | Owner | Variant | Verification |
| --- | --- | --- | --- |
| Forms | Native fields + shared validation adapter | create / edit | identity unit tests + browser journey |
| Select/Listbox | Native `select` until product requirements exceed it | profile selector | keyboard + mobile popup |
| Dialog | `src/components/ui/confirm-dialog.tsx` | profile delete / account delete | focus, Escape, restoration |
| Status | `src/components/ui/status-message.tsx` | status / alert | live-region browser check |
| CRUD | Identity service + account route handlers | profiles / consent / rights | unit + direct API isolation |
| Scrollbar | `src/app/globals.css` | global baseline | computed style + forced colors |

## Accessibility

- Target WCAG 2.2 AA.
- All actions use native buttons or links and have visible focus.
- The active profile is conveyed by text and state, not color alone.
- Minimum target size is 24×24px, with 44px preferred for primary controls.
- Motion is removed under `prefers-reduced-motion: reduce` without hiding content.
- WebGL features added in later milestones require equivalent text controls and results.
