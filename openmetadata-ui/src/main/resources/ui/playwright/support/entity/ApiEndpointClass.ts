/*
 *  Copyright 2024 Collate.
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
import { APIRequestContext, Page } from '@playwright/test';
import { uuid } from '../../utils/common';
import { visitEntityPage } from '../../utils/entity';
import { EntityTypeEndpoint } from './Entity.interface';
import { EntityClass } from './EntityClass';

export class ApiEndpointClass extends EntityClass {
  private serviceName = `pw-api-service-${uuid()}`;
  private apiCollectionName = `pw-api-collection-${uuid()}`;
  service = {
    name: this.serviceName,
    serviceType: 'REST',
    connection: {
      config: {
        type: 'REST',
        openAPISchemaURL: 'https://sandbox-beta.open-metadata.org/swagger.json',
      },
    },
  };

  apiCollection = {
    name: this.apiCollectionName,
    service: this.service.name,
  };

  private apiEndpointName = `pw-api-endpoint-${uuid()}`;
  private fqn = `${this.service.name}.${this.apiCollection.name}.${this.apiEndpointName}`;

  entity = {
    name: this.apiEndpointName,
    apiCollection: `${this.service.name}.${this.apiCollection.name}`,
    endpointURL: 'https://sandbox-beta.open-metadata.org/swagger.json',
    requestSchema: {
      schemaType: 'JSON',
      schemaFields: [
        {
          name: 'default',
          dataType: 'RECORD',
          fullyQualifiedName: `${this.fqn}.default`,
          tags: [],
          children: [
            {
              name: 'name',
              dataType: 'RECORD',
              fullyQualifiedName: `${this.fqn}.default.name`,
              tags: [],
              children: [
                {
                  name: 'first_name',
                  dataType: 'STRING',
                  description: 'Description for schema field first_name',
                  fullyQualifiedName: `${this.fqn}.default.name.first_name`,
                  tags: [],
                },
                {
                  name: 'last_name',
                  dataType: 'STRING',
                  fullyQualifiedName: `${this.fqn}.default.name.last_name`,
                  tags: [],
                },
              ],
            },
            {
              name: 'age',
              dataType: 'INT',
              fullyQualifiedName: `${this.fqn}.default.age`,
              tags: [],
            },
            {
              name: 'club_name',
              dataType: 'STRING',
              fullyQualifiedName: `${this.fqn}.default.club_name`,
              tags: [],
            },
          ],
        },
      ],
    },
    responseSchema: {
      schemaType: 'JSON',
      schemaFields: [
        {
          name: 'default',
          dataType: 'RECORD',
          fullyQualifiedName: `${this.fqn}.default`,
          tags: [],
          children: [
            {
              name: 'name',
              dataType: 'RECORD',
              fullyQualifiedName: `${this.fqn}.default.name`,
              tags: [],
              children: [
                {
                  name: 'first_name',
                  dataType: 'STRING',
                  fullyQualifiedName: `${this.fqn}.default.name.first_name`,
                  tags: [],
                },
                {
                  name: 'last_name',
                  dataType: 'STRING',
                  fullyQualifiedName: `${this.fqn}.default.name.last_name`,
                  tags: [],
                },
              ],
            },
            {
              name: 'age',
              dataType: 'INT',
              fullyQualifiedName: `${this.fqn}.default.age`,
              tags: [],
            },
            {
              name: 'club_name',
              dataType: 'STRING',
              fullyQualifiedName: `${this.fqn}.default.club_name`,
              tags: [],
            },
          ],
        },
      ],
    },
  };

  serviceResponseData: unknown;
  apiCollectionResponseData: unknown;
  entityResponseData: unknown;

  constructor(name?: string) {
    super(EntityTypeEndpoint.API_ENDPOINT);
    this.service.name = name ?? this.service.name;
    this.type = 'ApiEndpoint';
  }

  async create(apiContext: APIRequestContext) {
    const serviceResponse = await apiContext.post(
      '/api/v1/services/apiServices',
      {
        data: this.service,
      }
    );

    const apiCollectionResponse = await apiContext.post(
      '/api/v1/apiCollections',
      {
        data: this.apiCollection,
      }
    );

    const entityResponse = await apiContext.post('/api/v1/apiEndpoints', {
      data: this.entity,
    });

    this.serviceResponseData = await serviceResponse.json();
    this.apiCollectionResponseData = await apiCollectionResponse.json();
    this.entityResponseData = await entityResponse.json();

    return {
      service: serviceResponse.body,
      apiCollection: apiCollectionResponse.body,
      entity: entityResponse.body,
    };
  }

  async get() {
    return {
      service: this.serviceResponseData,
      entity: this.entityResponseData,
      apiCollection: this.apiCollectionResponseData,
    };
  }

  async visitEntityPage(page: Page) {
    await visitEntityPage({
      page,
      searchTerm: this.entityResponseData?.['fullyQualifiedName'],
      dataTestId: `${this.service.name}-${this.entity.name}`,
    });
  }

  async delete(apiContext: APIRequestContext) {
    const serviceResponse = await apiContext.delete(
      `/api/v1/services/apiServices/name/${encodeURIComponent(
        this.serviceResponseData?.['fullyQualifiedName']
      )}?recursive=true&hardDelete=true`
    );

    return {
      service: serviceResponse.body,
      entity: this.entityResponseData,
      apiCollection: this.apiCollectionResponseData,
    };
  }
}
