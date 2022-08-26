/*
 *  Copyright 2021 Collate
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

import { Button, Col, Row, Space } from 'antd';
import { AxiosError } from 'axios';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getPolicies } from '../../../axiosAPIs/rolesAPIV1';
import NextPrevious from '../../../components/common/next-previous/NextPrevious';
import Loader from '../../../components/Loader/Loader';
import {
  INITIAL_PAGING_VALUE,
  PAGE_SIZE,
  ROUTES,
} from '../../../constants/constants';
import { Policy } from '../../../generated/entity/policies/policy';
import { Paging } from '../../../generated/type/paging';
import { showErrorToast } from '../../../utils/ToastUtils';
import PoliciesList from './PoliciesList';
import './PoliciesList.less';

const PoliciesListPage = () => {
  const history = useHistory();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paging, setPaging] = useState<Paging>();
  const [currentPage, setCurrentPage] = useState<number>(INITIAL_PAGING_VALUE);

  const fetchPolicies = async (paging?: Paging) => {
    setIsLoading(true);
    try {
      const data = await getPolicies(
        'owner,location,roles,teams',
        paging?.after,
        paging?.before
      );

      setPolicies(data.data || []);
      setPaging(data.paging);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPolicy = () => {
    history.push(ROUTES.ADD_POLICY);
  };

  const handlePaging = (_: string | number, activePage?: number) => {
    setCurrentPage(activePage ?? INITIAL_PAGING_VALUE);
    fetchPolicies(paging);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  return isLoading ? (
    <Loader />
  ) : (
    <Row className="policies-list-container" gutter={[16, 16]}>
      <Col span={24}>
        <Space align="center" className="tw-w-full tw-justify-end" size={16}>
          <Button
            data-testid="add-policy"
            type="primary"
            onClick={handleAddPolicy}>
            Add Policy
          </Button>
        </Space>
      </Col>
      <Col span={24}>
        <PoliciesList fetchPolicies={fetchPolicies} policies={policies} />
      </Col>
      <Col span={24}>
        {paging && paging.total > PAGE_SIZE && (
          <NextPrevious
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            paging={paging}
            pagingHandler={handlePaging}
            totalCount={paging.total}
          />
        )}
      </Col>
    </Row>
  );
};

export default PoliciesListPage;
