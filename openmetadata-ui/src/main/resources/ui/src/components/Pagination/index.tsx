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

import { PaginationProps } from 'Models';
import PropTypes from 'prop-types';
import React from 'react';
import Paginations from 'react-js-pagination';
import './Pagination.css';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
const Pagination: React.FC<PaginationProps> = ({
  sizePerPage,
  totalNumberOfValues,
  currentPage,
  paginate,
}): JSX.Element => {
  return (
    <div data-testid="pagination-button">
      <Paginations
        hideFirstLastPages
        activePage={currentPage}
        disabledClass="tw-opacity-60 disabled"
        itemClass="tw-border tw-border-primary tw-text-blue-500 tw-rounded tw-px-3 tw-py-1.5 tw-text-sm tw-mx-2 hover:tw-bg-primary button-text"
        itemsCountPerPage={sizePerPage}
        linkClass="tw-text-primary tw-font-medium tw-link"
        nextPageText={
          <>
            Next{' '}
            <FontAwesomeIcon
              className="tw-text-sm tw-align-middle tw-pr-1.5"
              icon={faArrowRight}
            />
          </>
        }
        pageRangeDisplayed={-1}
        prevPageText={
          <>
            <FontAwesomeIcon
              className="tw-text-sm tw-align-middle tw-pr-1.5"
              icon={faArrowLeft}
            />
            Previous{' '}
          </>
        }
        totalItemsCount={totalNumberOfValues}
        onChange={paginate}
      />
    </div>
  );
};

Pagination.propTypes = {
  sizePerPage: PropTypes.number.isRequired,
  totalNumberOfValues: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
  paginate: PropTypes.func.isRequired,
};

export default Pagination;
