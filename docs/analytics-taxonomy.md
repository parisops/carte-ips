# Umami tracking v4 — English taxonomy

All newly emitted custom events use English snake_case. The old events remain available historically in Umami but are no longer emitted.

| Funnel | Events |
|---|---|
| App | `app_opened`, `app_ready`, `onboarding_opened`, `onboarding_completed` |
| Search | `search_focused`, `search_started`, `search_submitted`, `search_no_suggestions`, `search_result_selected`, `search_list_school_selected` |
| Filters | `filters_opened`, `filter_changed`, `filters_reset` |
| Map | `map_interacted` |
| Schools | `school_opened`, `school_details_loaded`, `school_section_opened` |
| Comparison | `comparison_offered`, `comparison_started`, `comparison_pair_ready`, `comparison_dialog_opened`, `comparison_completed`, `comparison_school_removed` |
| Support | `support_button_viewed`, `support_opened`, `support_dialog_viewed`, `support_outbound`, `support_closed` |
| Legal | `legal_opened` |

Inactive components contain English event names for future reuse: `premium_viewed`, `premium_opened`, `premium_form_started`, `premium_signup_completed`, `premium_signup_failed`, `feedback_opened`, `feedback_submitted`. Premium is not displayed for high schools.

## Event properties

Canonical keys are `school_type`, `school_count`, `source`, `result_type`, `filter_name`, `action`, `surface`, `ordinal_bucket`, `rule`, `result`. Legacy internal keys `type_etablissement`, `nombre`, `contexte` are normalized at the sending boundary.

`school_type`: `primary`, `middle`, `high`. Search result types: `city` or `school`. No free-text query, school identifier, email or user identifier should be transmitted.

## Recommended product analysis

Keep the deployment date as a reporting boundary. Sum each historical event count with its corresponding filtered opening count after deployment. For visit rates, take the union of matching visit IDs before dividing by all visits. Keep grouping by device, source and school type as before.

| Historical event | Equivalent after deployment |
|---|---|
| `school_opened` | All `school_opened` events, including repeats |
| `school_distinct_opened` | Openings with an `ordinal_bucket` of `first`, `second` or `third_or_more` (per level in the current page instance) |
| `first_school_opened` | Openings with `first_school=true` |
| `exploration_qualified` | Openings with `exploration_qualified=true` |
| `school_level_qualified` | Openings with `level_qualified=true`, segmented by `school_type` |

The three flags retain the previous tab-level storage keys. Reopening a school retains its opening and source but does not count as a new distinct school. Reloading resets the in-memory distinct list as before. Existing funnels that refer to retired event names need property filters or a calculation from the export. The comparison funnel and search and filter events retain their definitions.

## Catalogue loading

Each completed catalogue attempt emits one `app_ready` with `attempt` (initial/retry), `result` and elapsed `duration_ms`. Errors include `stage` (request/http/body/prepare), a bounded `error_kind`, online status when available and HTTP status for HTTP failures. The body stage includes reading and decoding JSON. Exception text and URLs are excluded. Previously this event was deduplicated per tab across outcomes.

For the initial failure rate, count distinct visits with an initial error divided by distinct visits with any initial result. Segment by OS, browser and device. For recovery, count failed visits followed by a successful retry in that visit. Also monitor visits with a page view and no loading result separately: closing the tab, analytics blocking and a process termination can leave no diagnostic.

## QA

Use live Umami debug inspection on both mobile and desktop. Verify each user action causes the expected one event rather than several aliases, and check `school_type` and `result_type` values. Confirm blocking Umami does not break the app. Historical dashboards must be updated to the new event names; data before deployment will not be renamed.
