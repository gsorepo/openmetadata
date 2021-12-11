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

import { findByTestId, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import UserDataCard from './UserDataCard';

const mockItem = {
  description: 'description1',
  name: 'name1',
  id: 'id1',
  email: 'string@email.com',
  isActiveUser: true,
  profilePhoto: '',
  teamCount: 2,
};

const mockRemove = jest.fn();

jest.mock('../../components/common/avatar/Avatar', () => {
  return jest.fn().mockReturnValue(<p data-testid="avatar">Avatar</p>);
});

jest.mock('../../utils/SvgUtils', () => {
  return {
    __esModule: true,
    default: jest.fn().mockReturnValue(<p data-testid="svg-icon">SVGIcons</p>),
    Icons: {
      TABLE: 'table',
      TOPIC: 'topic',
      DASHBOARD: 'dashboard',
    },
  };
});

describe('Test userCard component', () => {
  it('Component should render', async () => {
    const { container } = render(
      <UserDataCard item={mockItem} onClick={mockRemove} />,
      {
        wrapper: MemoryRouter,
      }
    );

    const cardContainer = await findByTestId(container, 'user-card-container');
    const avatar = await findByTestId(container, 'avatar');

    expect(avatar).toBeInTheDocument();
    expect(cardContainer).toBeInTheDocument();
  });

  it('Data should render', async () => {
    const { container } = render(
      <UserDataCard item={mockItem} onClick={mockRemove} />,
      {
        wrapper: MemoryRouter,
      }
    );

    expect(await findByTestId(container, 'data-container')).toBeInTheDocument();
  });

  it('If isActionVisible is passed it should show delete icon', async () => {
    const { container } = render(
      <UserDataCard item={mockItem} onClick={mockRemove} />,
      {
        wrapper: MemoryRouter,
      }
    );

    const remove = await findByTestId(container, 'remove');

    expect(remove).toBeInTheDocument();

    fireEvent.click(remove);

    expect(mockRemove).toBeCalled();
  });

  it('If dataset is provided, it should display accordingly', async () => {
    const { container } = render(
      <UserDataCard item={mockItem} onClick={mockRemove} />,
      {
        wrapper: MemoryRouter,
      }
    );

    const svgIcon = await findByTestId(container, 'svg-icon');
    const datasetLink = await findByTestId(container, 'dataset-link');

    expect(svgIcon).toBeInTheDocument();
    expect(datasetLink).toBeInTheDocument();
  });
});
