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
import { AxiosResponse } from 'axios';
import { Operation } from 'fast-json-patch';
import { PagingResponse } from 'Models';
import { DataInsightLatestRun } from '../components/Applications/AppDetails/AppDetails.interface';
import { App } from '../generated/entity/applications/app';
import { AppRunRecord } from '../generated/entity/applications/appRunRecord';
import { CreateAppRequest } from '../generated/entity/applications/createAppRequest';
import { ListParams } from '../interface/API.interface';
import { getURLWithQueryFields } from '../utils/APIUtils';
import APIClient from './index';

const BASE_URL = '/apps';

type AppListParams = ListParams & {
  offset?: number;
  startTs?: number;
  endTs?: number;
};

export const getApplicationList = async (params?: ListParams) => {
  const response = await APIClient.get<PagingResponse<App[]>>(BASE_URL, {
    params,
  });

  return response.data;
};

export const installApplication = (
  data: CreateAppRequest
): Promise<AxiosResponse> => {
  return APIClient.post(`${BASE_URL}/install`, data);
};

export const getApplicationByName = async (
  appName: string,
  arrQueryFields: string | string[]
) => {
  const url = getURLWithQueryFields(
    `${BASE_URL}/name/${appName}`,
    arrQueryFields
  );

  const response = await APIClient.get<App>(url);

  return response.data;
};

export const getApplicationRuns = async (
  appName: string,
  params?: AppListParams
) => {
  const response = await APIClient.get<PagingResponse<AppRunRecord[]>>(
    `${BASE_URL}/name/${appName}/status`,
    {
      params,
    }
  );

  return response.data;
};

export const getLatestApplicationRuns = async (appName: string) => {
  const response = await APIClient.get<DataInsightLatestRun>(
    `${BASE_URL}/name/${appName}/logs`
  );

  return response.data;
};

export const uninstallApp = (appName: string, hardDelete = false) => {
  return APIClient.delete(`${BASE_URL}/name/${appName}`, {
    params: { hardDelete },
  });
};

export const patchApplication = async (id: string, patch: Operation[]) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json-patch+json' },
  };

  const response = await APIClient.patch<Operation[], AxiosResponse<App>>(
    `${BASE_URL}/${id}`,
    patch,
    configOptions
  );

  return response.data;
};

export const triggerOnDemandApp = (appName: string): Promise<AxiosResponse> => {
  return APIClient.post(`${BASE_URL}/trigger/${appName}`, {});
};

export const deployApp = (appName: string): Promise<AxiosResponse> => {
  return APIClient.post(`${BASE_URL}/deploy/${appName}`);
};
