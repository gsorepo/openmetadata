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

// import SVGIcons, { Icons } from '../../../utils/SvgUtils';
import classNames from 'classnames';
import { debounce } from 'lodash';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';

type Props = {
  onSearch: (text: string) => void;
  searchValue: string;
  typingInterval?: number;
  placeholder?: string;
  label?: string;
  removeMargin?: boolean;
};

const Searchbar = ({
  onSearch,
  searchValue,
  typingInterval = 0,
  placeholder,
  label,
  removeMargin = false,
}: Props) => {
  const [userSearch, setUserSearch] = useState('');
  // const typingTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // if (searchValue !== '') {
    setUserSearch(searchValue);
    // }
  }, [searchValue]);

  const debouncedOnSearch = useCallback(
    (searchText: string): void => {
      onSearch(searchText);
    },
    [onSearch]
  );

  const debounceOnSearch = useCallback(
    debounce(debouncedOnSearch, typingInterval),
    [debouncedOnSearch]
  );

  const handleChange = (e: React.ChangeEvent<{ value: string }>): void => {
    const searchText = e.target.value;
    setUserSearch(searchText);
    // clearTimeout(typingTimer.current);
    // typingTimer.current = setTimeout(() => {
    debounceOnSearch(searchText);
  };

  return (
    <div
      className={classNames('tw-group page-search-bar', {
        'tw-mb-4': !removeMargin,
      })}
      data-testid="search-bar-container">
      {label !== '' && <label>{label}</label>}
      <div className="tw-flex tw-bg-body-main tw-h-8">
        <span className="fa fa-search tw-absolute tw-block tw-z-10 tw-w-9 tw-h-8 tw-leading-8 tw-text-center tw-pointer-events-none tw-text-gray-400" />
        {/* <div className="tw-flex-initial">
          <span className="input-group-text1 tw-pr-3 tw-py-1.5 tw-flex">
            <SVGIcons
              alt="search"
              icon={Icons.SEARCH}
              className="search-icon"
            />
          </span>
        </div> */}
        <input
          className="tw-form-inputs tw-relative tw-px-3 tw-py-1 tw-pl-8"
          data-testid="searchbar"
          placeholder={placeholder}
          type="text"
          value={userSearch}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

Searchbar.defaultProps = {
  searchValue: '',
  typingInterval: 1000,
  placeholder: 'Search...',
  label: '',
};

Searchbar.propTypes = {
  onSearch: PropTypes.func.isRequired,
  searchValue: PropTypes.string,
  typingInterval: PropTypes.number,
  placeholder: PropTypes.string,
  label: PropTypes.string,
};

export default Searchbar;
