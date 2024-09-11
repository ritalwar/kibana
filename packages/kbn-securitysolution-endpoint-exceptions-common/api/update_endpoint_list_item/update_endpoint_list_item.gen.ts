/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Update endpoint list item API endpoint
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import {
  ExceptionListItemId,
  ExceptionListItemHumanId,
  ExceptionListItemType,
  ExceptionListItemName,
  ExceptionListItemDescription,
  ExceptionListItemOsTypeArray,
  ExceptionListItemTags,
  ExceptionListItemMeta,
  ExceptionListItemCommentArray,
} from '@kbn/securitysolution-exceptions-common/api/model/exception_list_common.gen';
import { ExceptionListItemEntryArray } from '@kbn/securitysolution-exceptions-common/api/model/exception_list_item_entry.gen';
import { EndpointListItem } from '../model/endpoint_list_common.gen';

export type UpdateEndpointListItemRequestBody = z.infer<typeof UpdateEndpointListItemRequestBody>;
export const UpdateEndpointListItemRequestBody = z.object({
  /**
   * Either `id` or `item_id` must be specified
   */
  id: ExceptionListItemId.optional(),
  /**
   * Either `id` or `item_id` must be specified
   */
  item_id: ExceptionListItemHumanId.optional(),
  type: ExceptionListItemType,
  name: ExceptionListItemName,
  description: ExceptionListItemDescription,
  entries: ExceptionListItemEntryArray,
  os_types: ExceptionListItemOsTypeArray.optional().default([]),
  tags: ExceptionListItemTags.optional(),
  meta: ExceptionListItemMeta.optional(),
  comments: ExceptionListItemCommentArray.optional().default([]),
  _version: z.string().optional(),
});
export type UpdateEndpointListItemRequestBodyInput = z.input<
  typeof UpdateEndpointListItemRequestBody
>;

export type UpdateEndpointListItemResponse = z.infer<typeof UpdateEndpointListItemResponse>;
export const UpdateEndpointListItemResponse = EndpointListItem;
