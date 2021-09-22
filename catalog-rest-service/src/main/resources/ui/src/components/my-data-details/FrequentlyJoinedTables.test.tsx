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

import { getAllByTestId, getByTestId, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import FrequentlyJoinedTables from './FrequentlyJoinedTables';

const mockTableList = [
  {
    name: 'dim_customer',
    fqn: 'string',
    joinCount: 1,
  },
  {
    name: 'fact_sale',
    fqn: 'string',
    joinCount: 1,
  },
  {
    name: 'dim_product',
    fqn: 'string',
    joinCount: 1,
  },
  {
    name: 'dim_address',
    fqn: 'string',
    joinCount: 1,
  },
];

describe('Test QueryDetails Component', () => {
  it('Renders the proper header sent to the component', () => {
    const { container } = render(
      <FrequentlyJoinedTables
        header="Related Tables"
        tableList={mockTableList}
      />,
      { wrapper: MemoryRouter }
    );
    const header = getByTestId(container, 'related-tables-header');

    expect(header.textContent).toBe('Related Tables');
  });

  it('Renders the proper table list sent to the component', () => {
    const { container } = render(
      <FrequentlyJoinedTables
        header="Related Tables"
        tableList={mockTableList}
      />,
      { wrapper: MemoryRouter }
    );
    const tableData = getAllByTestId(container, 'related-tables-data');

    expect(tableData.length).toBe(4);
    expect(tableData.map((tableName) => tableName.textContent)).toStrictEqual([
      'dim_customer1',
      'fact_sale1',
      'dim_product1',
      '+ 1 more',
    ]);
  });
});
