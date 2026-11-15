# PROMO GEST — Algerian Real-Estate Legal & Commercial Domain Baseline

**Reviewed:** 15 November 2026  
**Purpose:** translate verified legal boundaries into domain and software design constraints for an Algerian real-estate promotion ERP.  
**Important:** This is an engineering reference, not legal, tax or accounting advice. It does not certify a contract template, tax treatment or a promoter's compliance. Before production use, contract clauses and tax/accounting rules must be reviewed by qualified Algerian professionals against the consolidated laws and the specific transaction.

## 1. Primary sources

1. **Law No. 11-04 of 17 February 2011**, governing real-estate promotion activity, Official Journal No. 14 (6 March 2011), especially Articles 25–39:  
   https://www.joradp.dz/FTP/jo-francais/2011/F2011014.pdf
2. **Executive Decree No. 13-431 of 18 December 2013**, defining standard reservation and sale-on-plan contract models, payment limits for VSP and late-delivery penalties:  
   https://e-agrement-pi.mhuv.gov.dz/Documents/reglementation/decrets/Dcretexcutifn_13_431.pdf
3. **FGCMPI official FAQ**, including the distinction between reservation and VSP and the stated reservation-advance cap:  
   https://www.fgcmpi.org.dz/Faq
4. **Law No. 24-08 of 24 November 2024 — Finance Law 2025**, Official Journal No. 84 (26 December 2024), Article 59 amending Article 14 of the CTCA:  
   https://www.joradp.dz/FTP/JO-FRANCAIS/2024/F2024084.pdf
5. **Law No. 25-17 of 14 December 2025 — Finance Law 2026**, Official Journal No. 88 (31 December 2025), Article 53 amending Article 23 of the CTCA:  
   https://www.joradp.dz/FTP/jo-arabe/2025/A2025088.pdf
6. **Direction Générale des Impôts — VAT guidance**, current published normal and reduced rates and taxable-event explanation:  
   https://www.mfdgi.gov.dz/fr/professionnels/services-pro/regime-reel/la-taxe-sur-la-valeur-ajoutee

The legal text and its subsequent amendments prevail over summaries, implementation notes and this design document. The official fund FAQ is cited for the operational explanation of the reservation advance; it does not replace the law or the regulatory model contract.

## 2. Do not conflate three different commercial records

### 2.1 Internal unit hold

The current PROMO GEST M5a reservation entity is a project-scoped operational hold: it links an available unit to a project customer, blocks a second active hold on the same unit, and supports reasoned cancellation/expiry.

It is **not by itself** proof that the statutory reservation contract under Law 11-04 has been concluded. The current application record must not be labelled or represented as an executed legal reservation contract.

### 2.2 Statutory reservation contract

Law 11-04:
- Article 27 defines the reservation contract and says the advance is held in an account opened in the reserver's name with the guarantee organization.
- Article 31 states that transfer of ownership of property subject to reservation takes place upon payment of the final price and that the sale deed is established before a notary.
- Article 32 specifies cancellation paths. Among them, when the reserver requests termination, the promoter retains 15% of the advance paid; promoter termination for buyer non-performance requires two formal notices served by a judicial officer, each for a one-month period, with no response.
- Article 33 requires the sale deed before a notary no later than three months after provisional acceptance of all or part of the building, against full payment.

The FGCMPI official FAQ describes the reservation advance as not exceeding 20% of the sale price, held in an account at the Fund in the reserver's name and released at delivery against payment of the remainder.

**Software boundary:** record the statutory contract, its notarized document reference, the escrow account/reference, the advance amount, notices, termination grounds and release evidence as distinct facts. Do not treat the escrowed advance as unrestricted promoter cash. The precise tax and accounting treatment of an escrowed sum before release must be confirmed by the accountant/tax adviser; do not assume that the escrow deposit and promoter cash receipt are identical events.

### 2.3 Sale-on-plan (VSP) contract

Law 11-04 Article 28 defines VSP as a contract for a building or fraction under construction that transfers rights over the land and ownership of constructions as they are realized, with the purchaser paying the price as works progress.

Other relevant provisions include:
- Article 25: sale of built or to-be-built/in-progress property by a promoter is to be in an authentic form under applicable law.
- Article 29: reservation and VSP contracts are reserved to a promoter satisfying the referenced statutory conditions.
- Article 30: reservation and VSP contracts must include land origin, land-title number where applicable, subdivision permit, development/viability certificate, and building-permit date/number.
- Article 34: VSP is in authentic form and subject to registration/publicity formalities; a contradictory possession/delivery minute is established at the same notary office.
- Article 35: except for the statutory reservation contract, an agreement transferring ownership in residential or professional property and requiring instalments/deposits before construction completion must take VSP form, otherwise it is null.
- Article 36: a VSP contract may not be concluded where the promoter has declared loans intended to finance construction. This is a statutory eligibility restriction that needs qualified legal interpretation for the actual financing structure; the ERP must not simplify it into a generic rule that every bank relationship prohibits VSP.
- Article 37: VSP must state the price composition and an instalment schedule linked to works progress.
- Article 38: the contract must state whether the price is revisable and, if so, the revision method. The formula must be based on changes in cost components and official price indices for materials, equipment and labour. The text sets a maximum 20% revision against the initial planned price, subject to the stated exceptional/unforeseeable circumstances affecting project economic balance. Any application requires review against the current consolidated text and the specific contract.
- Article 39: possession under a VSP is not permitted before the required certificate of conformity is issued.

The application must keep an internal hold, a statutory reservation contract, a VSP contract and a completed/built-property sale deed as distinct document and lifecycle types.

## 3. VSP payment schedule and construction triggers

Executive Decree 13-431, Article 3, sets the VSP price schedule by progress of works:

| Trigger | Share of agreed sale price |
|---|---:|
| Contract signature | 20% |
| Completion of foundations | 15% |
| Completion of major works, including waterproofing and external/internal partitions | 35% |
| Completion of all trades, including road/network connections and external arrangements | 25% |
| Possession minute | 5% |
| **Total** | **100%** |

This is not an arbitrary calendar-only instalment plan. Contractual due events must be connected to the defined construction stages and their evidence. A contract-specific payment schedule must be stored as a versioned, immutable schedule.

### Required domain capabilities

- Contract price and price composition are versioned.
- Before a VSP is signed, the applicable promotion guarantee/insurance must already be subscribed as required by Law 11-04 Article 42 read with Articles 54–55. Keep the guarantee issuer, reference, coverage, validity period and evidence as controlled contract prerequisites; do not enable signature based only on a free-text checkbox.
- A VSP payment must not be requested or accepted before the contract is signed or before the relevant receivable is due, in line with Article 42. Keep this VSP rule distinct from the statutory reservation advance path and its Fund account.
- The VSP eligibility review must capture whether the promoter has declared loans intended to finance construction; Article 36 requires legal review before the system treats the VSP route as available.
- Each scheduled tranche identifies its legal/contractual basis, percentage or amount, trigger, due rule and contract version.
- A construction milestone moves through explicit states such as Draft, Submitted, UnderReview, Accepted or Rejected; it is not accepted merely because a user changes a progress percentage.
- The milestone record stores its project/building scope, completion date, reviewer, evidence document references, decision timestamp and rejection/rework reason.
- Milestone acceptance creates an auditable contractual due event. It does not itself create a cash receipt.
- The resulting receivable, actual payment, payment allocation, tax event and accounting posting are separate records.
- Under Law 11-04 Articles 54–55, a promoter undertaking a project for sale before completion is subject to promotion-guarantee obligations and approved promoters must be affiliated with the Guarantee Fund. The project/contract record should retain applicable guarantee evidence and validity, not just a boolean "insured" flag.
- Under Article 42, no VSP collection should be enabled before contract signature or before the relevant amount is due. Statutory reservation advances remain a separate path.
- Price amendments or contract addenda must not silently recalculate already executed or paid tranches. Use an explicit amendment and approved recalculation policy.
- Percentage rounding and the final residual must reconcile exactly to the contractual price; no floating-point arithmetic for money.

The law/decree specifies construction-stage triggers but the software must not invent a universal professional sign-off rule. The required evidence issuer, acceptance form and any engineer/architect certificate must follow the contract, applicable regulations and qualified legal/technical review.

## 4. Late delivery, price revision and reservation cancellation

Executive Decree 13-431:
- Article 4 requires the VSP contract to contain the formula for calculating a late-delivery penalty.
- Article 5 says delay in effective delivery is to be established by a judicial officer under applicable procedures.
- Article 6 provides, except in force majeure cases, for a penalty based on days of delay, deducted from the sale price when the balance is paid; the penalty cannot exceed 10% of the agreed sale price.
- Article 7 requires any price-revision procedure/rules to be established in the contract in accordance with Law 11-04 Article 38.

Law 11-04 Article 32 sets distinct statutory reservation-cancellation conditions, including the 15% retention from the advance when the reserver requests termination and formal notice requirements for promoter-initiated termination.

**Software boundary:** store the contract's actual penalty/revision clauses and verified calculation inputs. Do not hard-code a generic legal penalty formula, a blanket cancellation fee or an assumed force-majeure decision. A legal operator must record the required judicial-officer evidence and the approved decision. All amendments, notices, disputes and financial corrections are append-only business events.

## 5. Unit and contract lifecycle separation

The property unit must not have one overloaded status that tries to represent construction, availability, legal contract and title transfer simultaneously.

At a minimum, keep distinct state dimensions:
- physical/building progress and handover readiness;
- commercial availability and temporary internal holds;
- statutory reservation contract state;
- VSP contract execution and contractual rights;
- installment/receivable/payment state;
- possession and delivery evidence;
- built-property sale deed/registration/publicity and ownership-transfer evidence where applicable.

A reservation or draft contract does not mean the unit is sold. A VSP contract must be represented distinctly from a completed-property sale and from final possession/transfer events. The exact state transitions are subject to notarial/legal review.

## 6. Contract and notary workflow

A practical contract record needs:
- contract type and applicable legal model/version;
- parties in their legally relevant roles, linked to canonical Party IDs;
- project and property-unit reference;
- land/title and permit references required by the relevant model;
- contract number, version, price composition and payment schedule;
- draft/review/approval history;
- final notarized act metadata (notary office, deed date/reference and registration/publicity references where available);
- signed/executed document stored locally with integrity metadata;
- addenda, amendments, notices, cancellation/termination, dispute and handover evidence.

PROMO GEST is a management and record-keeping system. It does not replace the notary, produce a self-authenticating deed or determine that a contract is legally valid merely because a user selected “Executed”. The executed state must require approved evidence and the appropriate professional workflow.

## 7. Tax event and VAT rate are separate decisions

### 7.1 Taxable event (fait générateur)

Article 59 of Law 24-08 (Finance Law 2025) amended Article 14 of the CTCA. For sales of residential, commercial or professional properties made by real-estate promoters in their activity, and sales of industrial premises, the VAT taxable event is partial or total collection of the property price.

This is a timing rule. It does not by itself decide the VAT rate, exemption, tax base or the treatment of an amount still held in an escrow account. The specific treatment of statutory reservation advances before their release requires documented advice from an Algerian tax practitioner.

### 7.2 VAT rate

Article 53 of Law 25-17 (Finance Law 2026), published in Official Journal No. 88 on 31 December 2025, amended Article 23 of the CTCA. The 9% reduced rate includes operations contributing to construction of new housing and related servicing, sale of those homes, and rehabilitation/servicing of old residential properties. The DGI publishes a 19% normal rate and a 9% reduced rate.

Do not implement “all property = 9%” or “all commercial property = 19%” as an unqualified rule without checking the exact transaction, statutory category, exemptions and current consolidated text. In particular:
- determine the applicable rate independently from the taxable event;
- retain the legal basis and effective date used for each tax determination;
- keep taxable base, VAT rate, VAT amount and collection date explicit;
- recalculate only through an auditable adjustment if the law or transaction facts change;
- require accountant review and test cases before automatic tax calculation or posting.

## 8. Separation of business money events

Do not collapse the following into one “payment” field:
1. scheduled contractual instalment;
2. accepted milestone / contractual due event;
3. invoice or payment notice, where applicable;
4. cash/bank receipt by the promoter;
5. amount held by FGCMPI or another third party;
6. payment allocation to one or more instalments;
7. refund, cancellation retention or reversal;
8. VAT taxable event;
9. approved accounting journal.

The Finance module must consume approved, traceable business events through an accounting contract. No automatic SCF journal should be generated from a draft contract, operational hold, unverified milestone or escrow balance.

## 9. Construction, contractor and procurement integration

The VSP schedule makes construction progress a commercial/financial dependency. The construction domain should own milestones, work packages, evidence and acceptance history. Sales/Contracts consumes accepted milestone events; it must not keep a duplicate progress percentage.

Contractor payment situations, service orders (ODS), subcontracting agreements, guarantee retentions and delay penalties require a separate legal/commercial/accounting rule review. Do not hard-code a universal 5% or 10% retention for all private-sector contracts based on a rule that may belong to a different procurement regime.

## 10. Implementation sequence

1. Complete Gate C Party identity and project-role foundations.
2. Define the construction workstream/milestone catalogue and evidence/approval ownership.
3. Define statutory reservation and VSP as separate aggregates and contract states.
4. Define payment schedules, escrow custody, receivables, receipts, allocations, refunds and reversals.
5. Have Algerian legal/notarial and tax/accounting reviewers validate the resulting workflows and rule matrix.
6. Implement contracts and VSP schedules with PostgreSQL integration tests and immutable history.
7. Integrate VAT and SCF only after an accountant-approved posting specification.
8. Run acceptance with fictitious customer/project data on the local ASP.NET Core + PostgreSQL runtime.

## 11. Open professional-review items

The following are deliberately not encoded as universal rules in this baseline:
- whether a specific reservation advance held by the Fund creates a VAT event before release to the promoter;
- exact tax-base and invoice treatment for different VSP/reservation payment flows;
- detailed notarial document, registration and publicity checklists for each contract type;
- application of price revision, force majeure and delay penalties to particular clauses/facts;
- detailed application of Law 11-04 Article 36 to a promoter's disclosed construction-finance facilities;
- project-specific guarantee coverage, certificate references and renewal/continuity rules under Articles 54–55;
- treatment of buyer-requested modifications (TMA), assignment/cession, contract novation, rescission and damages;
- treatment of bank financing and construction finance restrictions under the current consolidated law;
- stamp duty and cash-payment rules for each payment channel;
- subcontractor retention, ODS and works-situation treatment for private contracts.

Each reviewed rule must record the reviewer, source provision, effective date, transaction category, test cases and next review date.

