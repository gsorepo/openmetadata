/*
  * Licensed to the Apache Software Foundation (ASF) under one or more
  * contributor license agreements. See the NOTICE file distributed with
  * this work for additional information regarding copyright ownership.
  * The ASF licenses this file to You under the Apache License, Version 2.0
  * (the "License"); you may not use this file except in compliance with
  * the License. You may obtain a copy of the License at

  * http://www.apache.org/licenses/LICENSE-2.0

  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
*/

import { AxiosResponse } from 'axios';
import { getCurrentUserId } from '../utils/CommonUtils';
import APIClient from './index';

export const searchData: Function = (
  queryString: string,
  from: number,
  size: number,
  filters: string,
  sortField: string,
  sortOrder: string
): Promise<AxiosResponse> => {
  const start = (from - 1) * size;
  const query = queryString ? `*${queryString}*` : '*';

  return APIClient.get(
    `/search/query?q=${query}${
      filters ? ` AND ${filters}` : ''
    }&from=${start}&size=${size}${sortField ? `&sort_field=${sortField}` : ''}${
      sortOrder ? `&sort_order=${sortOrder}` : ''
    }`
  );
};

export const getOwnershipCount: Function = (
  ownership: string
): Promise<AxiosResponse> => {
  return APIClient.get(
    `/search/query?q=${ownership}:${getCurrentUserId()}&from=${0}&size=${0}`
  );
};

export const fetchAuthorizerConfig: Function = (): Promise<AxiosResponse> => {
  return APIClient.get('/config/auth');
};

export const getSuggestions: Function = (
  queryString: string
): Promise<AxiosResponse> => {
  return APIClient.get(`/search/suggest?q=${queryString}`);
};
