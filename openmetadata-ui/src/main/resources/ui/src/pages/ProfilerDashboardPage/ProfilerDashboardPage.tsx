/*
 *  Copyright 2022 Collate
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

import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getColumnProfilerList,
  getTableDetailsByFQN,
  patchTableDetails,
} from '../../axiosAPIs/tableAPI';
import { getListTestCase } from '../../axiosAPIs/testAPI';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import PageContainerV1 from '../../components/containers/PageContainerV1';
import Loader from '../../components/Loader/Loader';
import ProfilerDashboard from '../../components/ProfilerDashboard/ProfilerDashboard';
import { API_RES_MAX_SIZE } from '../../constants/constants';
import { ProfilerDashboardType } from '../../enums/table.enum';
import { ColumnProfile, Table } from '../../generated/entity/data/table';
import { TestCase } from '../../generated/tests/testCase';
import jsonData from '../../jsons/en';
import {
  getNameFromFQN,
  getTableFQNFromColumnFQN,
} from '../../utils/CommonUtils';
import { generateEntityLink } from '../../utils/TableUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const ProfilerDashboardPage = () => {
  const { entityTypeFQN, dashboardType } = useParams<Record<string, string>>();
  const isColumnView = dashboardType === ProfilerDashboardType.COLUMN;
  const [table, setTable] = useState<Table>({} as Table);
  const [profilerData, setProfilerData] = useState<ColumnProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  const fetchProfilerData = async (fqn: string, days = 3) => {
    try {
      const startTs = moment().subtract(days, 'days').unix();
      const endTs = moment().unix();

      const { data } = await getColumnProfilerList(fqn, {
        startTs,
        endTs,
        limit: API_RES_MAX_SIZE,
      });
      setProfilerData(data || []);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTestCases = async (fqn: string) => {
    try {
      const { data } = await getListTestCase({
        fields: 'testDefinition,testCaseResult,testSuite',
        entityLink: fqn,
        includeAllTests: !isColumnView,
        limit: API_RES_MAX_SIZE,
      });
      setTestCases(data);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['fetch-column-test-error']
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCaseUpdate = () => {
    fetchTestCases(generateEntityLink(entityTypeFQN, isColumnView));
  };

  const fetchTableEntity = async () => {
    try {
      const fqn = isColumnView
        ? getTableFQNFromColumnFQN(entityTypeFQN)
        : entityTypeFQN;
      const field = `tags, usageSummary, owner, followers${
        isColumnView ? ', profile' : ''
      }`;
      const data = await getTableDetailsByFQN(fqn, field);
      setTable(data ?? ({} as Table));
      if (isColumnView) {
        fetchProfilerData(entityTypeFQN);
      } else {
        fetchTestCases(generateEntityLink(entityTypeFQN));
      }
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['fetch-table-details-error']
      );
      setIsLoading(false);
      setError(true);
    }
  };

  const updateTableHandler = async (updatedTable: Table) => {
    const jsonPatch = compare(table, updatedTable);

    try {
      const tableRes = await patchTableDetails(table.id, jsonPatch);
      setTable(tableRes);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['update-entity-error']
      );
    }
  };

  useEffect(() => {
    if (entityTypeFQN) {
      fetchTableEntity();
    } else {
      setIsLoading(false);
      setError(true);
    }
  }, [entityTypeFQN]);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <ErrorPlaceHolder>
        <p className="tw-text-center">
          No data found{' '}
          {entityTypeFQN ? `for column ${getNameFromFQN(entityTypeFQN)}` : ''}
        </p>
      </ErrorPlaceHolder>
    );
  }

  return (
    <PageContainerV1 className="tw-py-4">
      <ProfilerDashboard
        fetchProfilerData={fetchProfilerData}
        fetchTestCases={fetchTestCases}
        profilerData={profilerData}
        table={table}
        testCases={testCases}
        onTableChange={updateTableHandler}
        onTestCaseUpdate={handleTestCaseUpdate}
      />
    </PageContainerV1>
  );
};

export default ProfilerDashboardPage;
