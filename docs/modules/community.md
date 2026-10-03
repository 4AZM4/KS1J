# Community (Learn → Community)

A members-only network inside the app, in the spirit of KSIJ Connect: a feed, a directory, a mentorship
circle, an opportunities board, messages that open with consent, and groups. Built in KS1J's own design;
every person in the demo is fictional.

## Who can do what

| Action | Who | Enforced by |
| --- | --- | --- |
| See anything in Community | Verified members (and staff, to moderate) | `is_verified_member()` in every policy |
| Appear to others | Only after making a community profile; *Show me in the directory* hides you from search | `community_profiles` RLS |
| Name on the profile | Always the membership name (no impersonation) | `stamp_community_profile` trigger |
| Phone, address, household | Never stored or shown in Community | Not in the schema |
| Post, appreciate, post an opportunity | Members with a profile, as themselves | `author_id = auth.uid()` |
| Start a conversation | Anyone with a profile sends a request; the other person accepts or declines | `guard_community_connection` |
| Request a call | Only to members who chose to be mentors | `guard_community_connection` |
| Read messages | Only the two people in the conversation. Not staff. | `community_messages` RLS |
| Private group | Posts visible to members only; the owner approves each request; nobody makes themselves owner | `stamp_group_membership`, RLS |
| Remove content | Committee only (verifier, trustee, super admin page: /admin/community). Removed content stays on record | `protect_community_moderation` |
| Report | Any verified member: post, opportunity, profile or group | `community_reports` |

Tables: `community_profiles`, `community_posts` (feed when `group_id` is null), `community_appreciations`,
`community_opportunities`, `community_groups`, `community_group_members`, `community_connections`,
`community_messages`, `community_reports`. Migration `20261003000400_community.sql`.

## Screens

App, Learn tab (the app keeps exactly 4 tabs): Community feed, Directory, Mentorship circle (the directory
filtered to mentors), Opportunities, Messages (with a count of requests waiting), Groups, My community
profile. Website: /admin/community for reports and removing posts.

## Acceptance tests

- [ ] An unverified member sees "Community opens once the Jamaat has verified your membership" and no content.
- [ ] Fatema (no profile) can read the feed but is asked to make a profile before posting.
- [ ] Her profile shows "Fatema (demo)" even if a different name is sent to the API.
- [ ] Abbas finds the trustee by searching "tax"; the Mentorship circle lists only mentors.
- [ ] A call request to a non-mentor is refused; a message before acceptance is refused.
- [ ] The donor accepts Abbas's call request and they can talk; a third member and staff cannot read it.
- [ ] Joining the private Healthcare circle waits for the owner; posts stay hidden until approved.
- [ ] A member cannot remove someone else's post; a verifier can, and it disappears from the feed.
- [ ] All of the above are in `supabase/tests/rules.sql` (test 25).

## Not in this version

Photos and files (text only, by design), push notifications for new requests, and blocking a member
(decline the request, or report them to the committee).
