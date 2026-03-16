/**
 * V2 Pipeline Type Definitions
 * ─────────────────────────────────────────────────────────────────────────────
 * These types define the data flowing between each pass of the V2 pipeline.
 * The final output is a standard ResumePlan (same as V1) so downstream
 * DOCX/PDF generation is shared.
 */

/**
 * ── Pass 1 output ────────────────────────────────────────────────────────────
 * @typedef {Object} CareerIdentity
 * @property {string} careerTrajectory
 *   E.g. "IC → Senior IC → Tech Lead", "Generalist → Backend Specialist"
 * @property {string} primaryDomain
 *   The industry/domain the user has spent the most time in.
 *   E.g. "fintech", "developer tools", "healthcare", "e-commerce"
 * @property {string[]} secondaryDomains
 *   Adjacent domains they've touched.
 * @property {string[]} signatureStrengths
 *   3-5 recurring themes across roles.
 *   E.g. ["system design", "shipping under pressure", "cross-team leadership"]
 * @property {Object} technicalIdentity
 * @property {string[]} technicalIdentity.core
 *   Technologies used across 2+ roles (their real stack).
 * @property {string[]} technicalIdentity.familiar
 *   Technologies used in exactly 1 role or mentioned peripherally.
 * @property {string} senioritySignal
 *   How experienced this person reads as, in their own career context.
 *   E.g. "strong senior", "early lead", "mid-level with upward trajectory"
 * @property {string} careerNarrative
 *   1-2 sentence natural summary of their career arc.
 *   Written in the user's own domain language, NOT tailored to any JD.
 */

/**
 * ── Pass 2 output ────────────────────────────────────────────────────────────
 * @typedef {Object} JdDeepAnalysis
 * @property {string} roleTitle
 * @property {string} seniority
 * @property {string[]} tableStakes
 *   Non-negotiable skills — instant reject if missing. Usually repeated or in
 *   "required" sections of JD.
 * @property {string[]} differentiators
 *   Skills that would make a candidate stand out. "Preferred", "bonus", "nice
 *   to have" sections.
 * @property {string[]} domainKeywords
 *   Industry/domain terms from the JD.
 * @property {string[]} responsibilities
 *   Key duties and expectations.
 * @property {string[]} implicitNeeds
 *   What pain points is this role solving? Inferred from context.
 *   E.g. ["scaling bottlenecks", "legacy migration", "team growth"]
 * @property {string} hiringManagerMentalModel
 *   What would make a hiring manager say "this person gets it"?
 *   1-2 sentences describing the ideal candidate archetype.
 * @property {string[]} culturalSignals
 *   Tone indicators from JD language.
 *   E.g. ["move fast", "rigorous testing", "collaborative", "ownership"]
 * @property {string} seniorityExpectation
 *   What this level means based on JD language. E.g. "Expected to own systems
 *   end-to-end and mentor junior engineers"
 */

/**
 * ── Pass 3 output ────────────────────────────────────────────────────────────
 * @typedef {Object} ResumeStrategy
 * @property {string} positioningAngle
 *   One sentence framing the candidate. E.g. "Senior engineer with deep
 *   distributed systems expertise bringing startup velocity to enterprise
 *   problems."
 * @property {string} narrativeThread
 *   The "why this person for this role" story arc.
 * @property {ExperienceDirective[]} experienceDirectives
 *   Per-role instructions on what to emphasize/de-emphasize.
 * @property {SkillGapBridge[]} skillGapBridges
 *   How to handle JD skills the user doesn't literally have.
 * @property {CoveragePlanEntry[]} coveragePlan
 *   Per-skill classification: must_include, bridge, or omit_rare.
 *   Drives Pass 4a prompt injection and Pass 4d verification.
 * @property {string} toneDirective
 *   Writing tone guidance based on cultural signals + user's domain.
 * @property {KeywordPlan} keywordPlan
 *   Which JD terms to use directly vs. translate to user's vocabulary.
 */

/**
 * @typedef {Object} ExperienceDirective
 * @property {string} company
 * @property {string} title
 * @property {string} emphasis
 *   What to spotlight from this role. E.g. "Lead the scaling narrative —
 *   this role had the most distributed-systems work."
 * @property {string[]} relevantJdSkills
 *   JD skills that naturally map to this role.
 * @property {string} deEmphasis
 *   What to mention briefly or omit. E.g. "Don't spotlight the front-end
 *   work — it dilutes the backend positioning."
 * @property {number} bulletCount
 *   Recommended number of bullets (4-7, based on relevance).
 * @property {number} priority
 *   1 = most important role for this JD, 2 = supporting, 3 = brief mention.
 */

/**
 * @typedef {Object} SkillGapBridge
 * @property {string} jdSkill
 *   The JD skill the user doesn't literally have.
 * @property {string} userEquivalent
 *   The closest real skill the user has. E.g. JD says "Kafka" but user has
 *   "RabbitMQ" — both are message queues.
 * @property {string} framingAdvice
 *   How to present this. E.g. "Mention RabbitMQ experience and frame as
 *   'event-driven architecture' expertise."
 */

/**
 * @typedef {Object} CoveragePlanEntry
 * @property {string} skill - Exact JD skill name
 * @property {"tableStake"|"differentiator"} source
 * @property {"must_include"|"bridge"|"omit_rare"} action
 * @property {string} targetRole - Company name where this skill should appear
 * @property {string} reason - Brief justification for the action
 */

/**
 * @typedef {Object} KeywordPlan
 * @property {string[]} useDirectly
 *   JD terms that match user's real skills — use the JD's exact phrasing.
 * @property {Object[]} translate
 *   JD terms where the user has the skill but calls it something else.
 * @property {string} translate[].jdTerm
 * @property {string} translate[].userTerm
 * @property {string[]} omit
 *   JD terms the user genuinely doesn't have — don't fabricate these.
 */

/**
 * ── Pass 5 output ────────────────────────────────────────────────────────────
 * @typedef {Object} AuthenticityReview
 * @property {number} overallScore - 1-10 quality/authenticity rating
 * @property {ReviewFlag[]} flags
 * @property {Object} revisedPlan - The corrected ResumePlan (same shape as V1)
 */

/**
 * @typedef {Object} ReviewFlag
 * @property {"over_tailored"|"fabricated"|"monotonous"|"weak_bullet"|"inconsistent_voice"} type
 * @property {string} location - Which section / bullet
 * @property {string} issue - What's wrong
 * @property {string} suggestion - How to fix it
 */

module.exports = {};
