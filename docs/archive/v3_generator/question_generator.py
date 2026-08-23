#!/usr/bin/env python3
"""
PROJECT HEAL — Question Generator v3.0
Dynamic Constraint Allocator for Elite Diversity

Fixes over v2.0 (identified in QA review):
  - All 30 v2.0 questions used R1/R2/R3 in identical D1/D2/D3 order → FIXED
  - All 30 v2.0 questions used only G1+G3+G2 → FIXED (G4, G5 now equally represented)
  - All 30 v2.0 questions were Difficulty 4 → FIXED (25%/50%/25% distribution)
  - Topics were all Level-4-only domains → FIXED (10+ diverse domains)

New in v3.0:
  1. 170 diverse academic topics across 10+ domains
  2. Dynamic Assignment Engine:
     - Difficulty: 42×L3 / 86×L4 / 42×L5  (≈ 25/50/25%)
     - Green Types: G1–G5 each appearing ~68-69 times (near-perfectly balanced)
     - Red Types: R1–R7 each appearing ~72-73 times (near-perfectly balanced)
  3. Randomized distractor slot order — no predictable R1→R2→R3 pattern
  4. Per-question constraint validation — retries if model ignores constraints
  5. Constraint matrix saved to CSV before generation begins
  6. Forceful per-question prompt with locked constraint injection

Author: Project HEAL Team
Date: 2026
"""

import anthropic
import json
import csv
import os
import sys
import random
from datetime import datetime
from typing import Optional, List, Dict, Tuple
from collections import defaultdict

# ============================================================================
# CONFIGURATION
# ============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError(
        "ANTHROPIC_API_KEY is not set. "
        "In Replit: use the Secrets panel (lock icon). "
        "On command line: export ANTHROPIC_API_KEY='sk-ant-...'"
    )

API_MODEL        = "claude-opus-4-6"
OUTPUT_CSV       = "generated_questions_v3.csv"
CONSTRAINTS_CSV  = "constraint_matrix_v3.csv"
ERROR_LOG        = "generation_errors_v3.log"
MAX_RETRIES      = 2        # Retries per topic when validation fails
RANDOM_SEED      = 42       # For reproducible constraint matrix; set None for true randomness


# ============================================================================
# 170 DIVERSE ACADEMIC TOPICS  (10 domains)
# ============================================================================

PILOT_TOPICS: List[str] = [

    # ── HISTORY & CIVILIZATION  (25) ──────────────────────────────────────
    "The collapse of the Western Roman Empire and its long-term impact on European political fragmentation",
    "How the Silk Road enabled the exchange of religions, technologies, and artistic traditions between civilizations",
    "The role of the Black Death in reshaping European social hierarchies and the bargaining power of peasant labor",
    "The economic foundations of the Atlantic slave trade and its generational consequences for African societies",
    "How the Ottoman Empire maintained administrative cohesion across its ethnically and religiously diverse territories",
    "The causes and immediate consequences of the French Revolution's dismantling of aristocratic governance",
    "How railroad expansion reshaped settlement geography and commercial activity across 19th-century North America",
    "The role of wartime propaganda in mobilizing civilian populations and shaping public opinion during World War I",
    "How colonial education policies eroded indigenous languages and suppressed traditional knowledge transmission",
    "The economic mismanagement and institutional failures that deepened the severity of the Great Depression",
    "How the Marshall Plan restructured postwar European economies and consolidated Western geopolitical alignments",
    "The causes of Japan's Meiji Restoration and the strategic decisions behind its rapid industrialization",
    "How the Scramble for Africa produced artificial borders that permanently destabilized the continent's political order",
    "The role of merchant guilds in regulating trade, setting standards, and shaping urban economies in medieval Europe",
    "How Mongol conquest routes accelerated the spread of plague and disrupted established Eurasian trade networks",
    "The influence of Enlightenment philosophy on democratic revolutionary movements in the 18th and 19th centuries",
    "How the Columbian Exchange transformed agricultural systems, diets, and disease patterns on multiple continents",
    "Why the invention of the printing press accelerated Protestant Reformation movements and undermined Church authority",
    "How sophisticated water management and irrigation systems enabled the rise of Mesopotamian urban civilizations",
    "The role of advances in maritime navigation in enabling and sustaining European colonial expansion",
    "How excessive taxation in early modern states generated popular resentment and contributed to political instability",
    "The demographic and economic devastation wrought by the Thirty Years' War across Central European populations",
    "How the formal abolition of the trans-Atlantic slave trade reshaped West African coastal economies",
    "The contribution of female textile workers to industrial output and early labor organizing in 19th-century England",
    "How the construction of the Suez Canal redefined global shipping routes and redistributed geopolitical leverage",

    # ── SOCIOLOGY & HUMAN BEHAVIOR  (25) ──────────────────────────────────
    "How social capital theory explains persistent disparities in resource access between neighboring communities",
    "The role of peer pressure in adolescent risk-taking behavior and the negotiation of emerging personal identity",
    "How rapid urbanization disrupts traditional family structures and strains intergenerational support systems",
    "The sociology of institutional trust and the conditions under which public confidence in authorities erodes",
    "How mass media coverage of crime inflates public fear and distorts collective perceptions of actual risk levels",
    "The relationship between income inequality and the effective rate of intergenerational social mobility",
    "How religious institutions foster civic participation, social solidarity, and community cohesion in urban settings",
    "The social and psychological consequences of prolonged unemployment on community identity and collective self-worth",
    "How digital social networks have transformed the organizational dynamics and reach of political movements",
    "The role of status symbols and conspicuous consumption in signaling and reinforcing social hierarchies",
    "How residential segregation in cities simultaneously reflects and reproduces ethnic and economic stratification",
    "The sociology of public scandal and the conditions under which damaged reputations can be rehabilitated over time",
    "How voluntary organizations and civic associations compensate for declining state provision of social services",
    "The impact of workplace automation on working-class occupational identity and the solidarity of local communities",
    "How gated residential communities affect civic engagement and social cohesion in their surrounding neighborhoods",
    "The role of sports fandom in constructing shared group identities at local, regional, and national scales",
    "How the rise of co-working spaces is transforming professional networking norms and the culture of independent work",
    "The social dynamics of organizational whistleblowing and the professional costs borne by those who expose misconduct",
    "How internal migration reshapes cultural norms, linguistic practices, and community character in receiving regions",
    "The role of neighborhood schools in either reinforcing or bridging the socioeconomic divides of urban communities",
    "How the proliferation of public surveillance technology alters individual behavior and erodes trust in civic institutions",
    "The sociology of designed waiting environments and what they communicate about power and service relationships",
    "How divergent generational expectations about work create friction and reduce cohesion in modern organizations",
    "The contrasting roles of shame and guilt across cultural contexts as mechanisms of social regulation and control",
    "How charitable giving patterns are shaped by donors' perceived social proximity to the intended beneficiaries",

    # ── BIOLOGY & NATURAL SCIENCES  (20) ──────────────────────────────────
    "How mutualistic relationships between insect pollinators and flowering plants sustain and drive ecosystem biodiversity",
    "The role of horizontal gene transfer in enabling the rapid spread of antibiotic resistance among bacterial populations",
    "How the composition of the human gut microbiome influences immune system calibration and affects mental health outcomes",
    "The physiological mechanisms underlying mammalian hibernation and the potential medical research implications of metabolic suppression",
    "How invasive species disrupt established food webs and steadily reduce native biodiversity in ecologically isolated environments",
    "The evolutionary trade-offs between sexual and asexual reproduction under varying environmental conditions",
    "How bioluminescence evolved independently across multiple marine lineages and the ecological functions it serves in deep-sea environments",
    "The role of keystone species in stabilizing and maintaining the structural complexity of ecological communities",
    "How forest clearance disrupts regional water cycles and reduces rainfall reliability in tropical watershed areas",
    "The mechanisms by which RNA viruses mutate rapidly and how high mutation rates complicate vaccine development and efficacy",
    "How hydrothermal vent communities sustain complex ecosystems based entirely on chemosynthesis rather than sunlight",
    "The biological basis for altruistic behavior in eusocial animals and competing evolutionary explanations for its persistence",
    "Why migratory corridors are essential for species movement and population viability in fragmented landscapes",
    "The chemical basis of pheromone communication in social insect colonies and its role in coordinating collective behavior",
    "How coastal wetlands function as natural water filtration systems and why their loss increases downstream flood risk",
    "The genetic mechanisms of local adaptation and the challenge rapid environmental change poses to natural selection timelines",
    "How urban wildlife populations have adapted their foraging behavior and circadian rhythms to city environments",
    "The symbiotic relationship between mycorrhizal fungi and tree root systems and its significance for forest nutrient dynamics",
    "How ocean acidification reduces the capacity of calcifying marine organisms to build shells and sustain population growth",
    "The relationship between species richness and the long-term productivity and stability of agricultural ecosystems",

    # ── ARCHITECTURE & URBAN PLANNING  (20) ───────────────────────────────
    "How neighborhood walkability scores correlate with residents' physical health outcomes and daily social interaction",
    "The role of green roof infrastructure in mitigating urban heat island effects and managing stormwater in dense cities",
    "How hospital spatial design influences patient recovery trajectories, infection rates, and clinical staff performance",
    "The relationship between housing density, land use mix, and the cost-effective provision of public transportation",
    "How Brutalist architectural aesthetics embodied the egalitarian social ideals of postwar welfare state governance",
    "The role of informal settlements in absorbing rural-to-urban migrants when formal housing markets are inaccessible",
    "How heritage conservation legislation balances the preservation of historic built fabric against urban development pressure",
    "The psychological benefits of natural daylighting and biophilic design elements in contemporary workplace environments",
    "How transit-oriented development concentrates economic activity and reshapes neighborhood character near transport hubs",
    "The principles and challenges of adaptive reuse in converting decommissioned industrial buildings into residential or cultural spaces",
    "How grid versus organic street layouts affect pedestrian mobility patterns, traffic flow, and neighborhood social life",
    "The design principles behind genuinely inclusive public spaces that accommodate users with diverse mobility limitations",
    "How the location and quality of parks and play spaces affects developmental outcomes for children in dense urban areas",
    "The role of waterfront redevelopment projects in transforming underused industrial land while displacing existing communities",
    "How urban noise mapping informs building envelope design and the spatial logic of residential zoning decisions",
    "The relationship between maximum height regulations, land supply constraints, and urban housing affordability",
    "How climate-adaptive architecture integrates passive cooling strategies and natural ventilation to reduce energy demand",
    "The design of branch libraries as anchoring civic institutions in neighborhoods experiencing economic disinvestment",
    "How modular prefabricated construction techniques affect the quality, speed, and cost of residential delivery",
    "The spatial logic of historic market towns as regional nodes organizing the agricultural and commercial hinterland",

    # ── ECONOMICS & FINANCE  (20) ─────────────────────────────────────────
    "How central bank interest rate decisions transmit through credit markets to affect consumer borrowing and housing prices",
    "The effects of monopolistic market concentration on consumer welfare, product quality, and the pace of innovation",
    "How remittances sent by migrant workers abroad shape the consumption patterns and investment capacity of origin economies",
    "The role of secure and enforceable property rights as a prerequisite for long-term productive investment and development",
    "How minimum wage increases affect employment and hours in labor markets with different degrees of demand elasticity",
    "The economic logic of carbon pricing and how market-based instruments alter industrial energy sourcing decisions",
    "How persistent trade imbalances between countries reflect underlying differences in national savings and investment rates",
    "The role of microfinance institutions in extending productive credit to small entrepreneurs excluded from formal banking",
    "How speculative asset bubbles form in markets with asymmetric information and the conditions that trigger their collapse",
    "The economic vulnerability of small island economies dependent on tourism revenues to external demand shocks",
    "How intellectual property protections create innovation incentives while restricting knowledge access and diffusion",
    "The role of sovereign wealth funds in insulating national economies from commodity price volatility and revenue cycles",
    "How labor union density levels affect real wage growth and income distribution across industrial sectors over time",
    "The fiscal and care-system pressures generated by demographic aging in high-income economies with shrinking workforces",
    "How foreign direct investment transfers management practices and technological capabilities to host country firms",
    "The long-run impact of major natural disasters on local labor markets and regional development trajectories",
    "How tax havens facilitate capital flight and reduce the domestic tax base of higher-tax economies globally",
    "The unintended supply-side consequences of price ceilings and floors when applied to agricultural commodity markets",
    "How auction mechanism design affects the efficiency and revenue outcomes of spectrum and public contract allocation",
    "The economic geography of industry clusters and why competitive advantages concentrate in particular regional locations",

    # ── PSYCHOLOGY  (20) ──────────────────────────────────────────────────
    "How cognitive dissonance theory accounts for the post-hoc rationalization strategies people use after irreversible decisions",
    "The long-term psychological effects of solitary confinement on social functioning and mental health among prison inmates",
    "How early attachment relationships with caregivers shape the emotional regulation patterns of adult romantic partnerships",
    "The role of self-regulatory failure and impulsivity in procrastination behavior among students facing complex academic tasks",
    "How emotional contagion spreads affective states through interpersonal interaction in both small groups and large organizations",
    "The role of personal narrative construction in shaping autobiographical memory and maintaining a coherent sense of identity",
    "How stereotype threat impairs the academic performance of members of groups targeted by negative intellectual stereotypes",
    "The cumulative cognitive and emotional costs of chronic occupational stress on executive function and decision-making quality",
    "Why the bystander effect consistently reduces individual willingness to intervene in public emergencies as group size grows",
    "The role of behavioral incentive design in achieving sustained changes in health-related behaviors such as diet and exercise",
    "How confirmation bias leads people to selectively seek, weight, and recall information that validates existing beliefs",
    "The psychological mechanisms underlying brand loyalty and the emotional bonds consumers form with commercial products",
    "How acute and chronic sleep deprivation impairs working memory, emotional regulation, and consequential decision-making",
    "The role of upward social comparison in driving consumer aspiration, dissatisfaction, and status-oriented spending",
    "How learned helplessness develops through repeated exposure to uncontrollable outcomes and why it generalizes across contexts",
    "The social bonding functions of shared humor and how laughter facilitates group cohesion and trust formation",
    "How specific architectural and environmental cues in workspaces influence users' concentration, creativity, and mood states",
    "The role of teacher expectation effects and the self-fulfilling prophecy in shaping divergent student achievement outcomes",
    "How nostalgia functions as a psychological resource for restoring meaning and self-continuity under existential threat",
    "The cognitive switching costs and emotional fatigue associated with constant digital task-interruption in modern work environments",

    # ── ANTHROPOLOGY & CULTURAL STUDIES  (15) ─────────────────────────────
    "How gift exchange economies in non-market societies create binding social obligations that reinforce community reciprocity",
    "The role of culturally enforced taboo in regulating behavior and maintaining clearly defined social boundaries",
    "How material culture objects reflect and actively reinforce social stratification in both ancient and contemporary societies",
    "The function of rites of passage in publicly marking developmental transitions and redefining an individual's community role",
    "How colonial legal systems dismantled indigenous frameworks of collective land stewardship and common property rights",
    "The role of language maintenance and revitalization efforts in preserving cultural identity within diaspora communities",
    "How sacred landscapes and ancestral sites function as focal points for collective memory and territorial belonging",
    "The anthropology of money and how different cultures attach contrasting moral meanings to wealth accumulation and exchange",
    "How sustained cross-cultural contact historically produced hybrid artistic, culinary, and material traditions",
    "The integrative function of traditional healing rituals that simultaneously address physiological, psychological, and social dimensions of illness",
    "How demographic transformation through sustained migration reshapes local cultural norms and reconfigures public life",
    "The political role of humor, satire, and trickster narratives in challenging hierarchies of power in oral cultures",
    "How different societies construct and negotiate the conceptual boundary between human culture and the natural world",
    "The role of apprenticeship and embodied knowledge transmission in sustaining pre-industrial craft traditions across generations",
    "How globalization simultaneously homogenizes consumer culture and generates new localized forms of cultural resistance and assertion",

    # ── PHILOSOPHY & ETHICS  (10) ─────────────────────────────────────────
    "The philosophical tension between protecting individual rights and maximizing collective welfare in public health emergencies",
    "How utilitarian moral frameworks justify policies that impose costs on minorities to maximize aggregate social benefits",
    "The competing philosophical arguments for retributive, rehabilitative, and deterrence-based approaches to criminal punishment",
    "How structural inequality and determinism complicate moral attributions of individual responsibility for life outcomes",
    "The ethical obligations that arise when employees discover organizational wrongdoing that conflicts with loyalty duties",
    "How trained moral intuitions and reasoned ethical principles interact—and sometimes conflict—in real-world decision-making",
    "The philosophical implications of artificial general intelligence for established concepts of consciousness, agency, and personhood",
    "How egalitarian, libertarian, and utilitarian frameworks reach incompatible conclusions about just distribution of social resources",
    "The ethical challenges posed by germline genetic enhancement for human dignity, equal opportunity, and future autonomy",
    "How just war theory's proportionality and discrimination principles apply to asymmetric conflicts involving non-state actors",

    # ── POLITICAL SCIENCE  (10) ────────────────────────────────────────────
    "How proportional versus majoritarian electoral systems produce systematically different political representation outcomes",
    "The role of civil society and independent media in holding governments accountable within fragile or backsliding democracies",
    "How federal constitutional arrangements distribute authority between central and regional governments in diverse polities",
    "The structural conditions that make authoritarian regimes most vulnerable to elite defection and popular mobilization",
    "How binding international treaty obligations constrain domestic policy choices and limit expressions of national sovereignty",
    "The mechanisms through which partisan gerrymandering of electoral districts distorts representation and entrenches incumbents",
    "How international economic sanctions affect the strategic calculations of targeted regimes versus the welfare of civilian populations",
    "What distinguishes peace agreements that achieve durable stability from those that collapse into renewed armed conflict",
    "How populist political movements exploit anti-expertise sentiment to challenge technocratic governance and policy institutions",
    "The role of constitutional judicial review in protecting minority rights against the tyranny of democratic majoritarian processes",

    # ── ENVIRONMENTAL SCIENCE  (5) ────────────────────────────────────────
    "How industrial monoculture agriculture increases ecosystem vulnerability to pest outbreaks and pathogen-driven crop failure",
    "The economic, social, and ecological trade-offs involved in an energy system transition from coal to renewable sources",
    "How well-enforced marine protected areas support the recovery of overexploited fish populations and coastal livelihoods",
    "The relationship between urban green infrastructure investment and both ecological connectivity and human population well-being",
    "How permafrost degradation in Arctic and sub-Arctic regions accelerates climate feedback loops through methane and CO2 release",
]

assert len(PILOT_TOPICS) == 170, f"Expected 170 topics, got {len(PILOT_TOPICS)}"


# ============================================================================
# FRAMEWORK DEFINITIONS  (G1-G5, R1-R7)
# ============================================================================

GREEN_TYPES: Dict[str, Dict[str, str]] = {
    "G1": {
        "name": "Synonym Substitution",
        "rule": (
            "Replace all major content words (nouns, verbs, adjectives, adverbs) with "
            "precise semantic equivalents. 'Deteriorate'→'decline'; 'compelled'→'forced'; "
            "'profound'→'deep'. Every key term must be substituted — not just one or two."
        ),
        "example": "'facilitated the emergence of early capitalism' → 'enabled proto-capitalist systems to take root'",
    },
    "G2": {
        "name": "Active/Passive Voice Swap",
        "rule": (
            "Reverse grammatical voice throughout the sentence. Active ('Governments enacted policies') "
            "→ Passive ('Policies were enacted by governments'). Or reverse. "
            "The agent becomes a 'by'-phrase or is omitted if inferable."
        ),
        "example": "'Urbanization reshaped family structures' → 'Family structures were reshaped by urbanization'",
    },
    "G3": {
        "name": "Syntactic Restructure",
        "rule": (
            "Completely reorder clause positions. Move the main clause to where a "
            "subordinate clause was and vice versa. If the original states 'Because X, Y happened', "
            "rewrite as 'Y occurred, which is explained by X'. The sentence SKELETON must change — "
            "not just individual words."
        ),
        "example": "'Because demand rose, factories expanded' → 'Factory expansion followed directly from rising demand'",
    },
    "G4": {
        "name": "Reference Swap",
        "rule": (
            "Change the SPECIFICITY LEVEL of at least one reference — either from specific to general, "
            "or from general to specific. 'Newton's second law' → 'the physicist's principle of motion'. "
            "'the 1960s' → 'that decade'. 'Berlin' → 'the German capital'. "
            "This is NOT a synonym swap — it is a genuine change in how specifically the referent is named."
        ),
        "example": "'Darwin's theory' → 'the naturalist's evolutionary framework' (specific person → general descriptor)",
    },
    "G5": {
        "name": "Simplification",
        "rule": (
            "Reduce syntactic complexity while retaining core meaning. Condense a "
            "multi-clause or nominalized structure into a simpler equivalent. "
            "'Despite the multifaceted challenges that organizations face when attempting to implement reforms' "
            "→ 'Despite the difficulties of organizational reform'. "
            "This is NOT merely using shorter words — it must genuinely reduce grammatical complexity."
        ),
        "example": "'the process by which species alter their characteristics across generations' → 'how species evolve over time'",
    },
}

RED_TYPES: Dict[str, Dict[str, str]] = {
    "R1": {
        "name": "Extreme Wording",
        "rule": (
            "Inject universal quantifiers or absolute language NOT present in the original: "
            "'always', 'never', 'every', 'all', 'none', 'invariably', 'guaranteed', 'without exception', "
            "'entirely', 'exclusively'. The original hedges or qualifies; the trap claims absolutes."
        ),
        "example": "Original: 'Policies tend to reduce unemployment' → Trap: 'Policies always guarantee full employment'",
    },
    "R2": {
        "name": "Logical Reversal",
        "rule": (
            "Flip the causal direction: what was the cause becomes the effect, and what was the effect "
            "becomes the cause. 'Because X occurred, Y followed' → 'Because Y occurred, X resulted'. "
            "The trap must reverse the LOGICAL RELATIONSHIP, not just negate it."
        ),
        "example": "Original: 'Trade expansion drove urban growth' → Trap: 'Urban growth drove trade expansion'",
    },
    "R3": {
        "name": "Added Cause",
        "rule": (
            "Fabricate and insert a specific reason, motive, or causal mechanism that does NOT appear "
            "anywhere in the original. The rest of the sentence may be accurate, but an explanatory clause "
            "is invented. 'Societies changed their practices' → 'Societies changed their practices "
            "in order to comply with new international trade agreements' (if no such reason was stated)."
        ),
        "example": "Original: 'Populations moved to cities' → Trap: 'Populations moved to cities due to new government resettlement subsidies'",
    },
    "R4": {
        "name": "Reference Swap",
        "rule": (
            "Wrongly replace a general reference with an incorrectly SPECIFIC one, or replace a "
            "specific one with the WRONG category. If the original says 'European nations', the trap says "
            "'France specifically' (unjustified narrowing). If the original says 'an antibiotic', the trap "
            "says 'specifically penicillin' (inventing a name never given). "
            "The substitution must be WRONG — either too narrow, too broad, or the wrong entity entirely."
        ),
        "example": "Original: 'a major ancient empire' → Trap: 'specifically the Roman Empire' (name not given in original)",
    },
    "R5": {
        "name": "Goal Inversion",
        "rule": (
            "Invert the stated purpose, intended outcome, or goal of an action. "
            "If the original says something was done 'to achieve X', the trap says it was done "
            "'to prevent X' or 'despite X'. If the original says it produced a beneficial outcome, "
            "the trap says it produced the opposite. The DIRECTION of intent or outcome is reversed."
        ),
        "example": "Original: 'Reforms were introduced to reduce inequality' → Trap: 'Reforms were introduced to maintain inequality'",
    },
    "R6": {
        "name": "Subject Swap",
        "rule": (
            "Exchange the grammatical agent (the entity doing the acting) with the recipient "
            "(the entity being acted upon). 'Policies shaped public behavior' → 'Public behavior "
            "determined policy design'. The roles of actor and acted-upon are reversed. "
            "This is distinct from R2 — R6 swaps WHO acts on WHOM, not cause vs. effect."
        ),
        "example": "Original: 'Institutions constrained individual choices' → Trap: 'Individual choices shaped institutional design'",
    },
    "R7": {
        "name": "Temporal Distortion",
        "rule": (
            "Misrepresent the sequence, timing, or duration of events. Claim something happened first "
            "that actually happened second; assert that simultaneous events were sequential; "
            "or claim a process is complete when it was described as ongoing. "
            "'After X, Y occurred' → 'Before X, Y had already occurred'."
        ),
        "example": "Original: 'Economic reforms preceded the political transformation' → Trap: 'The political transformation preceded economic reform'",
    },
}


# ============================================================================
# DYNAMIC CONSTRAINT ALLOCATOR
# ============================================================================

def _build_difficulty_pool(n: int) -> List[int]:
    """
    Build a pool of difficulty levels: ~25% L3, ~50% L4, ~25% L5.
    Exact counts: 42 × L3 + 86 × L4 + 42 × L5 = 170.
    """
    n_l3 = round(n * 0.25)
    n_l5 = round(n * 0.25)
    n_l4 = n - n_l3 - n_l5
    pool = [3] * n_l3 + [4] * n_l4 + [5] * n_l5
    random.shuffle(pool)
    return pool


# All valid Green-type combinations (2-type and 3-type), covering every pair and triple
_ALL_GREEN_COMBOS: List[List[str]] = [
    # 2-type
    ["G1", "G2"], ["G1", "G3"], ["G1", "G4"], ["G1", "G5"],
    ["G2", "G3"], ["G2", "G4"], ["G2", "G5"],
    ["G3", "G4"], ["G3", "G5"], ["G4", "G5"],
    # 3-type
    ["G1", "G2", "G3"], ["G1", "G2", "G4"], ["G1", "G2", "G5"],
    ["G1", "G3", "G4"], ["G1", "G3", "G5"], ["G1", "G4", "G5"],
    ["G2", "G3", "G4"], ["G2", "G3", "G5"], ["G2", "G4", "G5"],
    ["G3", "G4", "G5"],
]


def _build_green_assignments(n: int) -> List[List[str]]:
    """
    Greedy balanced allocation of Green-type combinations.
    Always picks the combination whose member types are most under-represented globally.
    Result: G1-G5 each appear ~68-69 times in 170 questions.
    """
    type_counts: Dict[str, int] = defaultdict(int)
    assignments: List[List[str]] = []

    for _ in range(n):
        # Score = sum of current usage counts for all types in the combo
        # Lower score = better (boosts under-used types)
        best = min(
            _ALL_GREEN_COMBOS,
            key=lambda combo: (sum(type_counts[t] for t in combo), random.random()),
        )
        assignments.append(best[:])
        for t in best:
            type_counts[t] += 1

    return assignments


def _build_red_assignments(n: int) -> List[List[str]]:
    """
    Greedy balanced allocation of Red-type triplets.
    Each question gets 3 distinct Red types.
    Always picks the 3 least-used types globally, then SHUFFLES their order.
    Shuffling randomizes which type goes into D1/D2/D3 → breaks predictable R1→R2→R3 pattern.
    Result: R1-R7 each appear ~72-73 times across 510 total distractor slots.
    """
    all_types = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]
    type_counts: Dict[str, int] = defaultdict(int)
    assignments: List[List[str]] = []

    for _ in range(n):
        # Sort by ascending usage count (break ties randomly)
        sorted_types = sorted(
            all_types,
            key=lambda t: (type_counts[t], random.random()),
        )
        selected = sorted_types[:3]
        random.shuffle(selected)          # ← randomizes D1/D2/D3 slot assignment
        assignments.append(selected[:])
        for t in selected:
            type_counts[t] += 1

    return assignments


def generate_constraint_matrix(topics: List[str], seed: Optional[int] = None) -> List[Dict]:
    """
    Pre-generate all per-question constraints for the full topic list.
    Returns a list of constraint dicts, one per topic, with:
        topic, difficulty, green_types, red_type_d1, red_type_d2, red_type_d3
    """
    if seed is not None:
        random.seed(seed)

    n = len(topics)
    difficulties   = _build_difficulty_pool(n)
    green_assigns  = _build_green_assignments(n)
    red_assigns    = _build_red_assignments(n)

    return [
        {
            "topic":        topics[i],
            "difficulty":   difficulties[i],
            "green_types":  green_assigns[i],
            "red_type_d1":  red_assigns[i][0],
            "red_type_d2":  red_assigns[i][1],
            "red_type_d3":  red_assigns[i][2],
        }
        for i in range(n)
    ]


def print_distribution_report(constraints: List[Dict]) -> None:
    """Print a concise distribution report to verify the balance before generation starts."""
    n = len(constraints)
    diff_c:  Dict[int, int] = defaultdict(int)
    green_c: Dict[str, int] = defaultdict(int)
    red_c:   Dict[str, int] = defaultdict(int)

    for c in constraints:
        diff_c[c["difficulty"]] += 1
        for g in c["green_types"]:
            green_c[g] += 1
        for r in [c["red_type_d1"], c["red_type_d2"], c["red_type_d3"]]:
            red_c[r] += 1

    print("\n" + "=" * 62)
    print("   CONSTRAINT DISTRIBUTION REPORT")
    print("=" * 62)

    print(f"\n  Difficulty  (target 25% / 50% / 25%):")
    for lvl in [3, 4, 5]:
        cnt = diff_c[lvl]
        pct = cnt / n * 100
        bar = "█" * int(pct / 2)
        print(f"    Level {lvl}: {cnt:3d}  ({pct:4.1f}%)  {bar}")

    print(f"\n  Green Types (target ~even, each ≈ {n*2.5/5:.0f} appearances):")
    for g in ["G1", "G2", "G3", "G4", "G5"]:
        cnt = green_c[g]
        print(f"    {g} ({GREEN_TYPES[g]['name']:<25s}): {cnt:3d}")

    print(f"\n  Red Types   (target ~even, each ≈ {n*3/7:.1f} appearances):")
    for r in ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]:
        cnt = red_c[r]
        pct = cnt / (n * 3) * 100
        print(f"    {r} ({RED_TYPES[r]['name']:<22s}): {cnt:3d}  ({pct:.1f}% of distractor slots)")

    print("=" * 62 + "\n")


def save_constraint_matrix(constraints: List[Dict], filepath: str) -> None:
    """Save the full constraint matrix to CSV so it can be inspected or resumed."""
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "topic", "difficulty", "green_types",
            "red_type_d1", "red_type_d2", "red_type_d3",
        ])
        writer.writeheader()
        for c in constraints:
            writer.writerow({**c, "green_types": str(c["green_types"])})


# ============================================================================
# MASTER PROMPT BUILDER  (v3.0 — dynamic constraint injection)
# ============================================================================

_DIFFICULTY_GUIDANCE = {
    3: (
        "DIFFICULTY 3 — MODERATE: "
        "The Green-type transformations in the correct answer should be substantial but detectable "
        "with careful reading. At least one distractor should be fairly plausible to a careless reader. "
        "An attentive advanced reader should be able to identify the correct answer without extreme effort."
    ),
    4: (
        "DIFFICULTY 4 — ADVANCED: "
        "The correct answer must be deeply restructured — almost unrecognizable as a 'clone'. "
        "At least ONE distractor must be highly plausible and require genuine semantic parsing to reject. "
        "Superficial pattern-matching should not be sufficient to select the correct answer."
    ),
    5: (
        "DIFFICULTY 5 — EXPERT: "
        "The correct answer must achieve near-total lexical and structural overhaul of the original. "
        "ALL THREE distractors must be compelling enough to mislead a reader who is not parsing meaning "
        "with extreme precision. This question should challenge even well-prepared C1-level students."
    ),
}


def build_master_prompt(
    topic:        str,
    difficulty:   int,
    green_types:  List[str],
    red_type_d1:  str,
    red_type_d2:  str,
    red_type_d3:  str,
) -> str:
    """
    Build the complete, forceful per-question prompt with locked constraint injection.
    Every constraint is stated multiple times to maximize model compliance.
    """

    # ── Green type block ──────────────────────────────────────────────────
    green_combo_str = " + ".join(green_types)
    green_rules_block = "\n".join(
        f"   ▸ {g} ({GREEN_TYPES[g]['name']})\n"
        f"     Rule: {GREEN_TYPES[g]['rule']}\n"
        f"     Example: {GREEN_TYPES[g]['example']}"
        for g in green_types
    )
    g4_extra = (
        "\n   ⚠ G4 IS ASSIGNED: You MUST change the specificity level of at least one reference. "
        "A synonym swap does NOT count as G4. 'The economist's model' ← 'Keynes's theory' is G4. "
        "'The method' ← 'the approach' is just G1."
    ) if "G4" in green_types else ""

    g5_extra = (
        "\n   ⚠ G5 IS ASSIGNED: You MUST reduce the syntactic complexity of at least one clause. "
        "This means collapsing a multi-clause or nominalized structure, not just using shorter words. "
        "'The rapid expansion of urban centers that lacked adequate infrastructure' "
        "→ 'fast-growing cities with poor infrastructure' is G5."
    ) if "G5" in green_types else ""

    # ── Red type blocks ───────────────────────────────────────────────────
    def red_block(slot: int, r: str) -> str:
        d = RED_TYPES[r]
        return (
            f"DISTRACTOR {slot} — MANDATORY TRAP: {r} ({d['name']})\n"
            f"  Rule: {d['rule']}\n"
            f"  Example: {d['example']}\n"
            f"  Instructions:\n"
            f"    Step 1: Heavily disguise the sentence using G1 synonym substitution "
            f"and structural rearrangement so it does NOT look like a clone of the original.\n"
            f"    Step 2: Inject the {r} ({d['name']}) error precisely.\n"
            f"    Step 3: Verify: is the {r} trap definitively wrong? Could a smart student "
            f"argue it is correct? If yes, make the trap more unambiguous."
        )

    # ── JSON scaffold (uses {{ }} to escape literal braces in f-string) ───
    g_json = json.dumps(green_types)
    json_scaffold = f"""{{
  "original_sentence": "Your complete, natural sentence about the topic. No [BLANK]. 25-45 words.",

  "green_types_assigned": {g_json},
  "correct_answer": "Transformed using {green_combo_str}. Must look STRUCTURALLY AND LEXICALLY DIFFERENT from original. 25-55 words.",
  "explanation_correct_answer": "Map each assigned Green type to specific phrases: [{' | '.join(f'{g}: original phrase → transformed phrase' for g in green_types)}]. All {len(green_types)} must be demonstrated.",

  "distractor_1": "Disguised + {red_type_d1} trap injected. 25-55 words.",
  "trap_type_1": "{red_type_d1}",
  "explanation_trap_1": "Green disguise used: [describe substitutions]. {red_type_d1} trap location: [identify exact phrase and why it is definitively wrong].",

  "distractor_2": "Disguised + {red_type_d2} trap injected. 25-55 words.",
  "trap_type_2": "{red_type_d2}",
  "explanation_trap_2": "Green disguise used: [describe substitutions]. {red_type_d2} trap location: [identify exact phrase and why it is definitively wrong].",

  "distractor_3": "Disguised + {red_type_d3} trap injected. 25-55 words.",
  "trap_type_3": "{red_type_d3}",
  "explanation_trap_3": "Green disguise used: [describe substitutions]. {red_type_d3} trap location: [identify exact phrase and why it is definitively wrong].",

  "explanation_correct": "Full explanation of why the correct answer preserves exact meaning through {green_combo_str}.",
  "difficulty_level": {difficulty},
  "low_surface_similarity_check": "List specific structural and lexical differences proving no option is a word-for-word clone of the original."
}}"""

    # ── Full prompt ───────────────────────────────────────────────────────
    prompt = f"""# PROJECT HEAL v3.0 — ELITE EXAM QUESTION GENERATOR

## ▶ LOCKED CONSTRAINTS FOR THIS QUESTION — READ BEFORE WRITING ANYTHING

| Constraint      | Assigned Value                                      |
|-----------------|-----------------------------------------------------|
| TOPIC           | {topic}                                             |
| DIFFICULTY      | Level {difficulty}                                  |
| GREEN TYPES     | {green_combo_str}                                   |
| DISTRACTOR 1    | {red_type_d1} ({RED_TYPES[red_type_d1]['name']})    |
| DISTRACTOR 2    | {red_type_d2} ({RED_TYPES[red_type_d2]['name']})    |
| DISTRACTOR 3    | {red_type_d3} ({RED_TYPES[red_type_d3]['name']})    |

These constraints are MANDATORY. Deviating from any of them — for example, using R1 instead of the assigned {red_type_d1} in Distractor 1, or using G3 when only {green_combo_str} is assigned — is a critical failure. Do not apply any unlisted Green or Red types.

---

## STEP 1 — WRITE THE ORIGINAL SENTENCE

Topic: **{topic}**

Write ONE original, complete, academic sentence about this topic.

Requirements:
- Completely original (not from any published source)
- Grammatically flawless
- Factually accurate — no hallucinations or invented claims
- NO [BLANK] placeholder — the sentence is complete and natural
- 25–45 words
- C1 academic English register

---

## STEP 2 — WRITE THE CORRECT ANSWER  (Green Types: {green_combo_str})

{_DIFFICULTY_GUIDANCE[difficulty]}

Apply ALL {len(green_types)} assigned Green Type(s) SIMULTANEOUSLY to produce the correct answer.

### Your Assigned Green Types and Their Rules:
{green_rules_block}{g4_extra}{g5_extra}

### Correct Answer Requirements:
- Applies every assigned Green Type: {green_combo_str}
- LOW SURFACE SIMILARITY: the result must look structurally and lexically different from the original
- Nearly all content words (nouns, verbs, adjectives) must be different from the original
- Preserves EXACTLY the same meaning — no information added, removed, or distorted
- Natural, fluent English — not awkward or stilted
- 25–55 words

---

## STEP 3 — WRITE THE THREE DISTRACTORS

Each distractor follows the same two-step process:
  1. DISGUISE: Apply heavy G1 synonym substitution and structural variation so the distractor does NOT look like a clone of the original
  2. INJECT: Insert the assigned Red Type trap precisely — making the sentence definitively wrong in one specific way

{red_block(1, red_type_d1)}

---

{red_block(2, red_type_d2)}

---

{red_block(3, red_type_d3)}

---

## STEP 4 — SELF-CHECK BEFORE OUTPUTTING

Before producing the JSON, verify ALL of the following:

✅ Original sentence: complete, natural, no [BLANK], 25-45 words
✅ Correct answer uses ONLY these Green Types: {green_combo_str}
✅ Distractor 1 uses EXACTLY: {red_type_d1} — confirmed in trap_type_1 field
✅ Distractor 2 uses EXACTLY: {red_type_d2} — confirmed in trap_type_2 field
✅ Distractor 3 uses EXACTLY: {red_type_d3} — confirmed in trap_type_3 field
✅ None of the 4 options looks like a near-clone of the original
✅ No distractor can be argued as correct by a smart student
✅ Difficulty Level {difficulty} calibration is respected
✅ All explanations map Green types to specific phrase transformations

---

## OUTPUT FORMAT

Output ONLY a valid JSON object. No preamble, no explanation, no markdown code fences.

If you cannot generate a valid question, output exactly: {{"error": "Unable to generate for this topic"}}

{json_scaffold}
"""
    return prompt


# ============================================================================
# GENERATION ENGINE
# ============================================================================

def _log_error(message: str) -> None:
    timestamp = datetime.now().isoformat()
    line = f"[{timestamp}] {message}"
    print(f"  ⚠  {message}", file=sys.stderr)
    with open(ERROR_LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _parse_json(text: str) -> Optional[dict]:
    """Attempt to extract a valid JSON object from the model's response."""
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Strip markdown fences
    if "```" in text:
        stripped = "\n".join(
            line for line in text.splitlines()
            if not line.strip().startswith("```")
        )
        try:
            return json.loads(stripped.strip())
        except json.JSONDecodeError:
            pass
    # Find first JSON object by brace matching
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    return None


def _validate(data: dict, constraint: dict) -> Tuple[bool, str]:
    """
    Validate that the model followed its assigned constraints.
    Returns (is_valid, reason_if_invalid).
    """
    required = [
        "original_sentence", "correct_answer", "green_types_assigned",
        "distractor_1", "trap_type_1", "explanation_trap_1",
        "distractor_2", "trap_type_2", "explanation_trap_2",
        "distractor_3", "trap_type_3", "explanation_trap_3",
        "explanation_correct", "difficulty_level",
    ]
    for field in required:
        if not data.get(field):
            return False, f"Missing field: '{field}'"

    # Check Red Type compliance
    for slot, key, expected in [
        (1, "trap_type_1", constraint["red_type_d1"]),
        (2, "trap_type_2", constraint["red_type_d2"]),
        (3, "trap_type_3", constraint["red_type_d3"]),
    ]:
        actual = str(data.get(key, "")).strip().upper()
        if actual != expected:
            return False, f"Distractor {slot}: expected {expected}, got '{actual}'"

    # Check difficulty
    if str(data.get("difficulty_level", "")) != str(constraint["difficulty"]):
        return False, (
            f"Difficulty mismatch: expected {constraint['difficulty']}, "
            f"got {data.get('difficulty_level')}"
        )

    # Check for [BLANK]
    if "[BLANK]" in str(data.get("original_sentence", "")):
        return False, "Original sentence contains [BLANK]"

    return True, "OK"


def generate_single_question(
    constraint:  Dict,
    client:      anthropic.Anthropic,
    attempt:     int = 1,
) -> Optional[dict]:
    """Generate and validate a single question for the given constraint."""
    prompt = build_master_prompt(
        topic       = constraint["topic"],
        difficulty  = constraint["difficulty"],
        green_types = constraint["green_types"],
        red_type_d1 = constraint["red_type_d1"],
        red_type_d2 = constraint["red_type_d2"],
        red_type_d3 = constraint["red_type_d3"],
    )
    try:
        response = client.messages.create(
            model      = API_MODEL,
            max_tokens = 2500,
            messages   = [{"role": "user", "content": prompt}],
        )
        data = _parse_json(response.content[0].text)

        if data is None:
            _log_error(f"[attempt {attempt}] JSON parse failed — topic: '{constraint['topic'][:50]}'")
            return None

        if "error" in data:
            _log_error(f"[attempt {attempt}] Model returned error: {data['error']} — topic: '{constraint['topic'][:50]}'")
            return None

        ok, reason = _validate(data, constraint)
        if not ok:
            _log_error(f"[attempt {attempt}] Validation failed ({reason}) — topic: '{constraint['topic'][:50]}'")
            return None

        # Attach metadata
        data["topic"]          = constraint["topic"]
        data["source_context"] = "synthetic_gen_v3"
        data["generated_at"]   = datetime.now().isoformat()
        return data

    except Exception as exc:
        _log_error(f"[attempt {attempt}] API exception: {exc} — topic: '{constraint['topic'][:50]}'")
        return None


def run_generation(constraints: List[Dict], output_file: str = OUTPUT_CSV) -> None:
    """Main generation loop — generates all questions and saves to CSV."""
    client     = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    results:   List[dict] = []
    success    = 0
    failed     = 0
    n          = len(constraints)

    print(f"  Questions to generate : {n}")
    print(f"  Model                 : {API_MODEL}")
    print(f"  Max retries/question  : {MAX_RETRIES}")
    print(f"  Output CSV            : {output_file}")
    print("─" * 68)

    for idx, c in enumerate(constraints, 1):
        short_topic = c["topic"][:52] + "…" if len(c["topic"]) > 52 else c["topic"]
        g_str = "+".join(c["green_types"])
        r_str = f"{c['red_type_d1']}/{c['red_type_d2']}/{c['red_type_d3']}"

        print(f"\n[{idx:3d}/{n}]  L{c['difficulty']} | {g_str:<14s} | {r_str}")
        print(f"         {short_topic}")

        result = None
        for attempt in range(1, MAX_RETRIES + 1):
            result = generate_single_question(c, client, attempt)
            if result:
                break
            if attempt < MAX_RETRIES:
                print(f"         ↩ retry {attempt + 1}/{MAX_RETRIES}…")

        if result:
            success += 1
            results.append(result)
            print("         ✅ success")
        else:
            failed += 1
            print("         ❌ failed — see error log")

    # ── Write output CSV ─────────────────────────────────────────────────
    if results:
        base_fields = [
            "original_sentence",
            "green_types_assigned",
            "correct_answer",
            "explanation_correct_answer",
            "distractor_1", "trap_type_1", "explanation_trap_1",
            "distractor_2", "trap_type_2", "explanation_trap_2",
            "distractor_3", "trap_type_3", "explanation_trap_3",
            "explanation_correct",
            "difficulty_level",
            "low_surface_similarity_check",
            "topic",
            "source_context",
            "generated_at",
        ]
        extra = [k for k in {key for r in results for key in r} if k not in base_fields]
        fieldnames = base_fields + extra

        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(results)

        print(f"\n{'=' * 68}")
        print(f"  ✅  Generation complete")
        print(f"      Successful : {success} / {n}")
        print(f"      Failed     : {failed} / {n}")
        print(f"      CSV output : {output_file}")
        if failed:
            print(f"      Error log  : {ERROR_LOG}")
        print("=" * 68)
    else:
        print("\n  ❌  No questions generated — check error log.")


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":

    # Clear previous run's error log
    if os.path.exists(ERROR_LOG):
        os.remove(ERROR_LOG)

    print("""
╔══════════════════════════════════════════════════════════════════════╗
║         PROJECT HEAL — Question Generator v3.0                       ║
║         Dynamic Constraint Allocator for Elite Diversity              ║
╠══════════════════════════════════════════════════════════════════════╣
║  New in v3.0                                                          ║
║  ✅  170 topics across 10 academic domains                            ║
║  ✅  Balanced difficulty  :  ~25% L3  /  ~50% L4  /  ~25% L5        ║
║  ✅  Green types G1–G5 distributed evenly (~68 appearances each)     ║
║  ✅  Red types R1–R7 distributed evenly  (~73 appearances each)      ║
║  ✅  Distractor slot order is RANDOMIZED (no predictable R1→R2→R3)  ║
║  ✅  Per-question constraint validation with automatic retry          ║
║  ✅  Constraint matrix saved to CSV before generation starts          ║
╚══════════════════════════════════════════════════════════════════════╝
""")

    # ── 1. Build constraint matrix ────────────────────────────────────────
    print("⚙  Building constraint matrix …")
    constraints = generate_constraint_matrix(PILOT_TOPICS, seed=RANDOM_SEED)

    # ── 2. Print balance report ───────────────────────────────────────────
    print_distribution_report(constraints)

    # ── 3. Save constraint matrix ─────────────────────────────────────────
    save_constraint_matrix(constraints, CONSTRAINTS_CSV)
    print(f"  📋  Constraint matrix saved → {CONSTRAINTS_CSV}\n")

    # ── 4. Generate all questions ─────────────────────────────────────────
    run_generation(constraints, OUTPUT_CSV)