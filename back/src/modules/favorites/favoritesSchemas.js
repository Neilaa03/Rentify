import { z } from 'zod';

export const listingIdParamSchema = z.object({
  listingId: z.uuid('listingId must be a valid UUID'),
});

