/**
 * EvidentIS India Legal Rules
 * State and Union Territory rule helpers for Indian legal workflows.
 */

import {
  INDIAN_STATE_CODES,
  INDIAN_STATE_NAMES,
  type IndianStateCode,
} from '@evidentis/shared';

export interface StateRule {
  state: string;
  stateName: string;
  clauseType: string;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  statute?: string;
  authority?: string;
}

export const INDIAN_JURISDICTIONS: ReadonlyArray<{
  code: IndianStateCode;
  name: string;
  region: IndianStateCode;
}> = INDIAN_STATE_CODES.map((code) => ({
  code,
  name: INDIAN_STATE_NAMES[code],
  region: code,
}));

export const DPDP_RULES: StateRule[] = INDIAN_STATE_CODES.map((state) => ({
  state,
  stateName: INDIAN_STATE_NAMES[state],
  clauseType: 'dpdp_privacy',
  rule: 'dpdp_required',
  severity: 'critical',
  description:
    'Explicit consent, purpose limitation, grievance redressal, and erasure rights must be addressed for personal data processing.',
  statute: 'Digital Personal Data Protection Act, 2023',
  authority: 'Central Government',
}));

const RERA_STATE_CODES: ReadonlyArray<IndianStateCode> = [
  'MH',
  'DL',
  'KA',
  'TN',
  'TG',
  'UP',
  'GJ',
  'WB',
  'RJ',
  'MP',
];
const STAMP_DUTY_STATE_CODES: ReadonlyArray<IndianStateCode> = [
  'MH',
  'DL',
  'KA',
  'TN',
  'TG',
  'UP',
  'GJ',
  'RJ',
];

export const RERA_RULES: StateRule[] = RERA_STATE_CODES.map((state) => ({
  state,
  stateName: INDIAN_STATE_NAMES[state],
  clauseType: 'rera_compliance',
  rule: 'state_rera_disclosure',
  severity: 'high',
  description:
    'Real-estate agreements should align with the state RERA authority disclosure, escrow, registration, and timeline requirements.',
  statute: 'Real Estate (Regulation and Development) Act, 2016',
  authority: `${INDIAN_STATE_NAMES[state]} RERA`,
}));

export const STAMP_DUTY_RULES: StateRule[] = STAMP_DUTY_STATE_CODES.map(
  (state) => ({
    state,
    stateName: INDIAN_STATE_NAMES[state],
    clauseType: 'stamp_duty',
    rule: 'state_stamp_duty_check',
    severity: 'high',
    description:
      'Document enforceability may be affected until applicable stamp duty and registration requirements are satisfied.',
    statute: 'Indian Stamp Act, 1899 and state stamp rules',
  }),
);

export const LABOUR_RULES: StateRule[] = INDIAN_STATE_CODES.map((state) => ({
  state,
  stateName: INDIAN_STATE_NAMES[state],
  clauseType: 'labour_code_compliance',
  rule: 'shops_and_establishments_alignment',
  severity: 'medium',
  description:
    'Employment terms should align with labour codes, wage protections, standing orders, and local shops and establishments requirements.',
  statute: 'Labour Codes, 2020',
}));

export const CENTRAL_RULES: StateRule[] = [
  {
    state: 'CENTRAL',
    stateName: 'Central Government',
    clauseType: 'non_compete',
    rule: 'section_27_contract_act',
    severity: 'high',
    description:
      'Post-contract restraints of trade are narrowly enforceable and often vulnerable under Section 27 of the Indian Contract Act.',
    statute: 'Indian Contract Act, 1872 - Section 27',
  },
  {
    state: 'CENTRAL',
    stateName: 'Central Government',
    clauseType: 'arbitration',
    rule: 'seat_and_institution_required',
    severity: 'medium',
    description:
      'Arbitration clauses should specify seat, venue, institution, governing procedural rules, and language to reduce challenge risk.',
    statute: 'Arbitration and Conciliation Act, 1996',
  },
  {
    state: 'CENTRAL',
    stateName: 'Central Government',
    clauseType: 'gst_tax',
    rule: 'gst_clause_required',
    severity: 'medium',
    description:
      'Commercial agreements should define GST responsibility, invoicing, gross-up treatment, and place-of-supply implications.',
    statute: 'CGST Act, 2017',
  },
  {
    state: 'CENTRAL',
    stateName: 'Central Government',
    clauseType: 'consumer_protection',
    rule: 'consumer_forum_risk',
    severity: 'medium',
    description:
      'B2C contracts should avoid unfair terms and should clearly address grievance escalation and refund obligations.',
    statute: 'Consumer Protection Act, 2019',
  },
];

const ALL_RULES = [
  ...DPDP_RULES,
  ...RERA_RULES,
  ...STAMP_DUTY_RULES,
  ...LABOUR_RULES,
  ...CENTRAL_RULES,
];

export function getRulesForState(stateCode: string): StateRule[] {
  const upper = stateCode.toUpperCase();
  return ALL_RULES.filter(
    (rule) => rule.state === upper || rule.state === 'CENTRAL',
  );
}

export function getRulesForClauseType(clauseType: string): StateRule[] {
  return ALL_RULES.filter((rule) => rule.clauseType === clauseType);
}

export function getFederalRules(): StateRule[] {
  return CENTRAL_RULES;
}

export function getApplicableRules(
  stateCode: string,
  clauseTypes: string[],
): StateRule[] {
  const stateRules = getRulesForState(stateCode);
  const clauseRules = clauseTypes.flatMap((clauseType) =>
    getRulesForClauseType(clauseType),
  );
  const unique = new Map<string, StateRule>();

  [...stateRules, ...clauseRules].forEach((rule) => {
    unique.set(`${rule.state}:${rule.clauseType}:${rule.rule}`, rule);
  });

  return [...unique.values()];
}

type ComplianceInput = {
  clauseType: string;
  text: string;
  jurisdiction?: string;
  metadata?: Record<string, unknown>;
};

export function checkClauseCompliance(
  inputOrClauseType: ComplianceInput | string,
  clauseText?: string,
  jurisdiction = 'DL',
) {
  const normalizedInput: ComplianceInput =
    typeof inputOrClauseType === 'string'
      ? { clauseType: inputOrClauseType, text: clauseText ?? '', jurisdiction }
      : inputOrClauseType;

  const state = (normalizedInput.jurisdiction ?? jurisdiction).toUpperCase();
  const text = normalizedInput.text.toLowerCase();
  const issues: Array<{
    severity: StateRule['severity'];
    message: string;
    statute?: string;
  }> = [];
  const stateName =
    state in INDIAN_STATE_NAMES
      ? INDIAN_STATE_NAMES[state as IndianStateCode]
      : state;

  if (normalizedInput.clauseType === 'non_compete') {
    issues.push({
      severity: 'high',
      message:
        'Non-compete restrictions should be reviewed carefully under Section 27 of the Indian Contract Act.',
      statute: 'Indian Contract Act, 1872 - Section 27',
    });
  }

  if (normalizedInput.clauseType === 'dpdp_privacy') {
    if (!text.includes('consent')) {
      issues.push({
        severity: 'critical',
        message: 'DPDP consent language is missing.',
        statute: 'DPDP Act, 2023',
      });
    }
    if (!text.includes('erasure')) {
      issues.push({
        severity: 'high',
        message: 'Data principal erasure rights are not addressed.',
        statute: 'DPDP Act, 2023',
      });
    }
    if (!text.includes('grievance')) {
      issues.push({
        severity: 'medium',
        message: 'Grievance redressal workflow is not described.',
        statute: 'DPDP Act, 2023',
      });
    }
  }

  if (normalizedInput.clauseType === 'stamp_duty' && !text.includes('stamp')) {
    issues.push({
      severity: 'high',
      message: `Stamp duty allocation should be explicit for ${stateName}.`,
      statute: 'Indian Stamp Act, 1899',
    });
  }

  if (normalizedInput.clauseType === 'arbitration') {
    if (!text.includes('seat')) {
      issues.push({
        severity: 'medium',
        message: 'Arbitration seat is not specified.',
        statute: 'Arbitration and Conciliation Act, 1996',
      });
    }
    if (!text.includes('institution') && !text.includes('rules')) {
      issues.push({
        severity: 'low',
        message: 'Consider naming an arbitral institution or procedural rules.',
        statute: 'Arbitration and Conciliation Act, 1996',
      });
    }
  }

  if (
    normalizedInput.clauseType === 'rera_compliance' &&
    !text.includes('registration')
  ) {
    issues.push({
      severity: 'high',
      message:
        'RERA registration and disclosure requirements are not called out.',
      statute: 'RERA, 2016',
    });
  }

  if (
    normalizedInput.clauseType === 'labour_code_compliance' &&
    !text.includes('wages')
  ) {
    issues.push({
      severity: 'medium',
      message:
        'Employment clause should address wage, leave, and social-security compliance.',
      statute: 'Labour Codes, 2020',
    });
  }

  const warnings = issues.filter((issue) => issue.severity !== 'critical');
  const violations = issues.filter((issue) => issue.severity === 'critical');
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'] as const;
  const severity =
    severityOrder.find((level) =>
      issues.some((issue) => issue.severity === level),
    ) ?? 'info';

  return {
    compliant: violations.length === 0,
    isCompliant: violations.length === 0,
    violations,
    warnings,
    issues,
    severity,
    jurisdiction: state,
    applicableRules: getApplicableRules(state, [normalizedInput.clauseType]),
  };
}

export function getDefaultPlaybookRules() {
  return [
    {
      id: 'india-001',
      clauseType: 'dpdp_privacy',
      severity: 'critical',
      description:
        'Privacy clauses must address consent, rights, and grievance redressal under DPDP.',
    },
    {
      id: 'india-002',
      clauseType: 'stamp_duty',
      severity: 'high',
      description:
        'Commercial and property documents should assign stamp-duty responsibility clearly.',
    },
    {
      id: 'india-003',
      clauseType: 'arbitration',
      severity: 'high',
      description:
        'Arbitration clauses should define seat, language, institution, and interim-relief support.',
    },
    {
      id: 'india-004',
      clauseType: 'rera_compliance',
      severity: 'high',
      description:
        'Real-estate templates must map to state RERA disclosure and escrow rules.',
    },
    {
      id: 'india-005',
      clauseType: 'gst_tax',
      severity: 'medium',
      description:
        'Payment clauses should address GST treatment, invoicing, and place of supply.',
    },
  ];
}
