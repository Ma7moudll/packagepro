# SPEC-021: Marketing Automation (Email Sequences)

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P2 — Growth  
> **Dependencies:** SPEC-014 (Email), SPEC-003 (Orders)

---

## 1. What

Automated email sequences triggered by user actions:

**Sequences:**
- **Welcome Series**: On signup → 3 emails (platform intro, design tips, first order incentive)
- **Abandoned Cart**: 24h after incomplete order → 2 emails (reminder + 10% discount)
- **Post-Purchase**: 3 days after delivery → review request + reorder incentive
- **Re-engagement**: 30 days inactive → 2 emails (what's new + special offer)
- **Review Request**: 7 days after delivery → review request with direct link
- **Onboarding**: For new vendors → 5 emails (portal guide, best practices, support)

**Features:**
- Trigger-based: user action or time delay
- Personalization: dynamic content (name, order history, preferences)
- A/B testing: subject lines, send times, content variants
- Performance metrics: open rate, click rate, conversion rate
- Opt-out management: preference center

---

## 2. Why

Manual marketing is inconsistent and time-consuming. Automation increases customer lifetime value by 25%, reduces churn by 30%, and improves conversion rates.

**Business Impact:**
- Increase LTV: +25%
- Reduce churn: -30%
- Improve conversion: +15% abandoned cart recovery
- Reduce manual work: -90% on routine emails

---

## 3. Who

| Role | Access |
|------|--------|
| **Marketing Team** | Create sequences, A/B test, view metrics |
| **Admin** | View campaign performance, approve sequences |
| **Customer** | Receive personalized, timely emails |

---

## 4. Success Criteria

### Functional
- [ ] 6 automated sequences with configurable triggers
- [ ] Personalization: name, order history, product preferences
- [ ] A/B testing: subject lines, send times, content (auto-select winner after 100 opens)
- [ ] Performance: open rate, click rate, conversion rate, unsubscribe rate
- [ ] Opt-out: one-click unsubscribe, preference center for frequency
- [ ] Bilingual: Arabic and English for all sequences
- [ ] Delay configuration: customizable delays between emails
- [ ] Exit conditions: user action stops sequence (e.g., completed order stops abandoned cart)

### Non-Functional
- [ ] Sequence execution: <1m delay from trigger
- [ ] Email delivery: 99%+ rate
- [ ] A/B test significance: auto-calculate, auto-select winner

---

## 5. Out of Scope

- SMS marketing sequences
- Social media automation
- Affiliate/referral program
- Push notification sequences
- Dynamic content based on AI predictions

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/marketing/marketing.controller.ts` | Marketing API (admin) |
| `backend/src/modules/marketing/marketing.service.ts` | Sequence logic |
| `backend/src/modules/marketing/sequences/welcome.sequence.ts` | Welcome sequence |
| `backend/src/modules/marketing/sequences/abandoned-cart.sequence.ts` | Abandoned cart |
| `backend/src/modules/marketing/sequences/post-purchase.sequence.ts` | Post-purchase |
| `backend/src/workers/marketing.worker.ts` | Background sequence execution |
| `backend/prisma/schema.prisma` | MarketingSequence, SequenceEmail, EmailLog tables |
| `frontend/app/(admin)/marketing/page.tsx` | Marketing dashboard |
| `frontend/components/marketing/SequenceBuilder.tsx` | Sequence builder UI |
| `frontend/components/marketing/ABTestConfig.tsx` | A/B test configuration |
| `frontend/components/marketing/CampaignMetrics.tsx` | Metrics display |
