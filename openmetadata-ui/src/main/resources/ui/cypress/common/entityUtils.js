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
/**
 * create full hierarchy of database service (service > database > schema > tables)
 */
export const createEntityTable = ({
  service,
  database,
  schema,
  tables,
  token,
}) => {
  // Create service
  cy.request({
    method: 'POST',
    url: `/api/v1/services/databaseServices`,
    headers: { Authorization: `Bearer ${token}` },
    body: service,
  }).then((response) => {
    expect(response.status).to.eq(201);
  });

  // Create Database
  cy.request({
    method: 'POST',
    url: `/api/v1/databases`,
    headers: { Authorization: `Bearer ${token}` },
    body: database,
  }).then((response) => {
    expect(response.status).to.eq(201);
  });

  // Create Database Schema
  cy.request({
    method: 'POST',
    url: `/api/v1/databaseSchemas`,
    headers: { Authorization: `Bearer ${token}` },
    body: schema,
  }).then((response) => {
    expect(response.status).to.eq(201);
  });

  tables.forEach((body) => {
    cy.request({
      method: 'POST',
      url: `/api/v1/tables`,
      headers: { Authorization: `Bearer ${token}` },
      body,
    }).then((response) => {
      expect(response.status).to.eq(201);
    });
  });
};

/**
 * Create single level service like messaging, pipeline, mlmodel etc.
 */
export const createSingleLevelEntity = ({
  service,
  entity,
  serviceType,
  entityType,
  token,
}) => {
  // Create service
  cy.request({
    method: 'POST',
    url: `/api/v1/services/${serviceType}`,
    headers: { Authorization: `Bearer ${token}` },
    body: service,
  }).then((response) => {
    expect(response.status).to.eq(201);
  });

  entity.forEach((body) => {
    cy.request({
      method: 'POST',
      url: `/api/v1/${entityType}`,
      headers: { Authorization: `Bearer ${token}` },
      body,
    }).then((response) => {
      expect(response.status).to.eq(201);
    });
  });
};

/**
 * Delete full hierarchy of any service
 */
export const hardDeleteService = ({ serviceFqn, token, serviceType }) => {
  cy.request({
    method: 'GET',
    url: `/api/v1/services/${serviceType}/name/${serviceFqn}`,
    headers: { Authorization: `Bearer ${token}` },
  }).then((response) => {
    cy.request({
      method: 'DELETE',
      url: `/api/v1/services/${serviceType}/${response.body.id}?hardDelete=true&recursive=true`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });
};
