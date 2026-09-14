import { query } from 'express-validator';
import { paginationRules } from '../../common/pagination.js';

const rangeRules = [
  query('from').optional().isISO8601().withMessage('from must be an ISO date.').toDate(),
  query('to').optional().isISO8601().withMessage('to must be an ISO date.').toDate(),
];

export const reportRangeRules = [...rangeRules, ...paginationRules];
