# Umami tracking v3 — English taxonomy

All newly emitted custom events use English snake_case. The old events remain available historically in Umami but are no longer emitted.

| Funnel | Events |
|---|---|
| App | `app_opened`, `app_ready`, `onboarding_opened`, `onboarding_completed` |
| Search | `search_focused`, `search_started`, `search_submitted`, `search_no_suggestions`, `search_result_selected`, `search_list_school_selected` |
| Filters | `filters_opened`, `filter_changed`, `filters_reset` |
| Map | `map_interacted` |
| Schools | `school_opened`, `first_school_opened`, `school_distinct_opened`, `school_level_qualified`, `exploration_qualified`, `school_details_loaded`, `school_section_opened` |
| Comparison | `comparison_offered`, `comparison_started`, `comparison_pair_ready`, `comparison_dialog_opened`, `comparison_completed`, `comparison_school_removed` |
| Support | `support_button_viewed`, `support_opened`, `support_dialog_viewed`, `support_outbound`, `support_closed` |
| Legal | `legal_opened` |

Inactive components contain English event names for future reuse: `premium_viewed`, `premium_opened`, `premium_form_started`, `premium_signup_completed`, `premium_signup_failed`, `feedback_opened`, `feedback_submitted`. Premium is not displayed for high schools.

## Event properties

Canonical keys are `school_type`, `school_count`, `source`, `result_type`, `filter_name`, `action`, `surface`, `ordinal_bucket`, `rule`, `result`. Legacy internal keys `type_etablissement`, `nombre`, `contexte` are normalized at the sending boundary.

`school_type`: `primary`, `middle`, `high`. Search result types: `city` or `school`. No free-text query, school identifier, email or user identifier should be transmitted.

## Recommended product analysis

1. Arrivals → school openings: `app_ready` → `first_school_opened`.
2. Search activation: `search_started` → `search_result_selected` → `school_opened`.
3. Qualified exploration by school level: `school_level_qualified`, segmented by `school_type`.
4. Comparison: `comparison_started` → `comparison_pair_ready` → `comparison_completed`.
5. Mobile vs desktop: use Umami device dimensions.
6. `school_distinct_opened` with `ordinal_bucket` to compare depth of exploration.

Session milestones use browser sessionStorage and do not exactly correspond to Umami sessions. Counting unique schools currently relies on client application state, so reloading can reset the distinct-school list. These measurements are directional, not durable user retention.

## QA

Use live Umami debug inspection on both mobile and desktop. Verify each user action causes the expected one event rather than several aliases, and check `school_type` and `result_type` values. Confirm blocking Umami does not break the app. Historical dashboards must be updated to the new event names; data before deployment will not be renamed.
