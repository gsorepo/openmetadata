/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { queryByAttribute, render, screen } from '@testing-library/react';
import React from 'react';
import {
  MOCK_SQL_TEST_CASE,
  MOCK_TEST_CASE,
  MOCK_TEST_CASE_RESULT,
} from '../../../../mocks/TestSuite.mock';
import { getListTestCaseResults } from '../../../../rest/testAPI';
import { getEpochMillisForPastDays } from '../../../../utils/date-time/DateTimeUtils';
import { TestSummaryProps } from '../ProfilerDashboard/profilerDashboard.interface';
import TestSummary from './TestSummary';

const mockProps: TestSummaryProps = {
  data: MOCK_TEST_CASE[1],
};
const mockHistory = {
  push: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('../../../../rest/testAPI', () => {
  return {
    getListTestCaseResults: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ data: MOCK_TEST_CASE_RESULT })
      ),
  };
});
jest.mock('react-router-dom', () => {
  return {
    ...jest.requireActual('react-router-dom'),
    useHistory: jest.fn().mockImplementation(() => mockHistory),
  };
});

jest.mock('../../../common/DatePickerMenu/DatePickerMenu.component', () => {
  return jest
    .fn()
    .mockImplementation(() => <div>DatePickerMenu.component</div>);
});
jest.mock('../../../common/ErrorWithPlaceholder/ErrorPlaceHolder', () => {
  return jest
    .fn()
    .mockImplementation(() => <div>ErrorPlaceHolder.component</div>);
});
jest.mock('../../../common/Loader/Loader', () => {
  return jest.fn().mockImplementation(() => <div>Loader.component</div>);
});
jest.mock('../../SchemaEditor/SchemaEditor', () => {
  return jest.fn().mockImplementation(() => <div>SchemaEditor.component</div>);
});
jest.mock('../../../../utils/date-time/DateTimeUtils', () => {
  return {
    formatDateTime: jest.fn(),
    getCurrentMillis: jest.fn(),
    getEpochMillisForPastDays: jest.fn(),
  };
});

jest.mock(
  '../../../ActivityFeed/ActivityFeedProvider/ActivityFeedProvider',
  () => ({
    useActivityFeedProvider: jest.fn().mockImplementation(() => ({
      entityThread: [],
    })),
  })
);

describe('TestSummary component', () => {
  it('Component should render', async () => {
    render(<TestSummary {...mockProps} />);

    const graphContainer = await screen.findByTestId('graph-container');
    const graph = queryByAttribute(
      'id',
      graphContainer,
      `${mockProps.data.name}_graph`
    );

    expect(
      await screen.findByTestId('test-summary-container')
    ).toBeInTheDocument();
    expect(graphContainer).toBeInTheDocument();
    expect(graph).toBeInTheDocument();
    expect(
      await screen.findByText('DatePickerMenu.component')
    ).toBeInTheDocument();
  });

  it('Show no data placeholder when there is no result, other CTA should also visible', async () => {
    (getListTestCaseResults as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ data: [] })
    );
    render(<TestSummary {...mockProps} />);
    const graphContainer = await screen.findByTestId('graph-container');
    const graph = queryByAttribute(
      'id',
      graphContainer,
      `${mockProps.data.name}_graph`
    );

    expect(graphContainer).toBeInTheDocument();
    expect(graph).not.toBeInTheDocument();
    expect(
      await screen.findByText('ErrorPlaceHolder.component')
    ).toBeInTheDocument();
  });

  it('default time range should be 30 days', async () => {
    const MockGetEpochMillisForPastDays =
      getEpochMillisForPastDays as jest.Mock;
    render(<TestSummary data={MOCK_SQL_TEST_CASE} />);

    expect(MockGetEpochMillisForPastDays).toHaveBeenCalledWith(30);
  });
});
