/* eslint-disable @typescript-eslint/no-explicit-any */
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

/**
 * Create Messaging service entity request
 */
export interface CreateMessagingService {
  /**
   * Multiple bootstrap addresses for Kafka. Single proxy address for Pulsar.
   */
  brokers: string[];
  /**
   * Description of messaging service entity.
   */
  description?: string;
  /**
   * Schedule for running metadata ingestion jobs
   */
  ingestionSchedule?: Schedule;
  /**
   * Name that identifies the this entity instance uniquely
   */
  name: string;
  /**
   * Schema registry URL
   */
  schemaRegistry?: string;
  serviceType: MessagingServiceType;
}

/**
 * Schedule for running metadata ingestion jobs
 *
 * This schema defines the type used for the schedule. The schedule has a start time and
 * repeat frequency.
 */
export interface Schedule {
  /**
   * Repeat frequency in ISO 8601 duration format. Example - 'P23DT23H'.
   */
  repeatFrequency?: string;
  /**
   * Start date and time of the schedule.
   */
  startDate?: Date;
}

/**
 * Type of messaging service - Kafka or Pulsar.
 */
export enum MessagingServiceType {
  Kafka = 'Kafka',
  Pulsar = 'Pulsar',
}
