/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { FakeLLM } from '@langchain/core/utils/testing';
import { ecsTestState } from '../../../__jest__/fixtures/ecs_mapping';
import type { EcsMappingState } from '../../types';
import { handleMissingKeys } from './missing';

const model = new FakeLLM({
  response: '{ "message": "ll callback later."}',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: EcsMappingState = ecsTestState;

describe('Testing ecs handler', () => {
  it('handleMissingKeys()', async () => {
    const response = await handleMissingKeys({ state, model });
    expect(response.currentMapping).toStrictEqual({ message: 'll callback later.' });
    expect(response.lastExecutedChain).toBe('missingKeys');
  });
});
