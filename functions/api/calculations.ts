export type VarianceStatus =
  | 'Shortage'
  | 'Excess'
  | 'Matched'
  | 'Variance Unavailable'
  | 'Not Counted'
  | 'Conflict';

export interface AuditLineCalculation {
  variantId: string;
  expectedQuantity: number | null; // null means unavailable/unknown
  actualQuantity: number | null;   // null means not counted
  variance: number | null;         // actual - expected, or null if either is null
  shortageUnits: number;           // positive number representing shortage units
  excessUnits: number;             // positive number representing excess units
  status: VarianceStatus;
  hasConflict: boolean;
  countEntriesCount: number;
}

export interface AuditTotals {
  totalLines: number;
  expectedUnitsTotal: number;
  countedUnitsTotal: number;
  matchedLinesCount: number;
  shortageLinesCount: number;
  excessLinesCount: number;
  unavailableLinesCount: number;
  notCountedLinesCount: number;
  conflictLinesCount: number;
  totalShortageUnits: number;
  totalExcessUnits: number;
  netVarianceUnits: number;
}

/**
 * Authoritative evaluation of a single audit line item according to the 6 mandatory rules.
 */
export function calculateLineVariance(
  expected: number | null | undefined,
  actual: number | null | undefined,
  hasConflict = false
): AuditLineCalculation {
  const normExpected = expected !== null && expected !== undefined ? Number(expected) : null;
  const normActual = actual !== null && actual !== undefined ? Number(actual) : null;

  if (hasConflict) {
    return {
      variantId: '',
      expectedQuantity: normExpected,
      actualQuantity: normActual,
      variance: null,
      shortageUnits: 0,
      excessUnits: 0,
      status: 'Conflict',
      hasConflict: true,
      countEntriesCount: 0
    };
  }

  // Case 5: Not counted (Actual is null/undefined)
  if (normActual === null) {
    return {
      variantId: '',
      expectedQuantity: normExpected,
      actualQuantity: null,
      variance: null,
      shortageUnits: 0,
      excessUnits: 0,
      status: 'Not Counted',
      hasConflict: false,
      countEntriesCount: 0
    };
  }

  // Case 4: Expected quantity unavailable (Expected is null/undefined)
  if (normExpected === null) {
    return {
      variantId: '',
      expectedQuantity: null,
      actualQuantity: normActual,
      variance: null,
      shortageUnits: 0,
      excessUnits: 0,
      status: 'Variance Unavailable',
      hasConflict: false,
      countEntriesCount: 1
    };
  }

  // Valid comparison can be performed
  const variance = Math.round((normActual - normExpected) * 1000) / 1000;

  // Case 3: Matched
  if (variance === 0) {
    return {
      variantId: '',
      expectedQuantity: normExpected,
      actualQuantity: normActual,
      variance: 0,
      shortageUnits: 0,
      excessUnits: 0,
      status: 'Matched',
      hasConflict: false,
      countEntriesCount: 1
    };
  }

  // Case 1 & Case 6: Shortage (including Case 6 where physical quantity is 0)
  if (variance < 0) {
    const shortage = Math.abs(variance);
    return {
      variantId: '',
      expectedQuantity: normExpected,
      actualQuantity: normActual,
      variance,
      shortageUnits: shortage,
      excessUnits: 0,
      status: 'Shortage',
      hasConflict: false,
      countEntriesCount: 1
    };
  }

  // Case 2: Excess
  return {
    variantId: '',
    expectedQuantity: normExpected,
    actualQuantity: normActual,
    variance,
    shortageUnits: 0,
    excessUnits: variance,
    status: 'Excess',
    hasConflict: false,
    countEntriesCount: 1
  };
}

/**
 * Computes reconciled audit totals across an array of calculated lines.
 */
export function calculateAuditTotals(lines: AuditLineCalculation[]): AuditTotals {
  let expectedUnitsTotal = 0;
  let countedUnitsTotal = 0;
  let matchedLinesCount = 0;
  let shortageLinesCount = 0;
  let excessLinesCount = 0;
  let unavailableLinesCount = 0;
  let notCountedLinesCount = 0;
  let conflictLinesCount = 0;
  let totalShortageUnits = 0;
  let totalExcessUnits = 0;

  for (const line of lines) {
    if (line.hasConflict) {
      conflictLinesCount++;
      continue;
    }

    if (line.expectedQuantity !== null) {
      expectedUnitsTotal += line.expectedQuantity;
    }

    if (line.actualQuantity !== null) {
      countedUnitsTotal += line.actualQuantity;
    }

    switch (line.status) {
      case 'Matched':
        matchedLinesCount++;
        break;
      case 'Shortage':
        shortageLinesCount++;
        totalShortageUnits += line.shortageUnits;
        break;
      case 'Excess':
        excessLinesCount++;
        totalExcessUnits += line.excessUnits;
        break;
      case 'Variance Unavailable':
        unavailableLinesCount++;
        break;
      case 'Not Counted':
        notCountedLinesCount++;
        break;
    }
  }

  const netVarianceUnits = Math.round((totalExcessUnits - totalShortageUnits) * 1000) / 1000;

  return {
    totalLines: lines.length,
    expectedUnitsTotal: Math.round(expectedUnitsTotal * 1000) / 1000,
    countedUnitsTotal: Math.round(countedUnitsTotal * 1000) / 1000,
    matchedLinesCount,
    shortageLinesCount,
    excessLinesCount,
    unavailableLinesCount,
    notCountedLinesCount,
    conflictLinesCount,
    totalShortageUnits: Math.round(totalShortageUnits * 1000) / 1000,
    totalExcessUnits: Math.round(totalExcessUnits * 1000) / 1000,
    netVarianceUnits
  };
}

