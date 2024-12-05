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
 * OpenSearch Connection.
 */
export interface OpenSearchConnection {
    connectionArguments?: { [key: string]: any };
    connectionOptions?:   { [key: string]: string };
    /**
     * Connection Timeout in Seconds
     */
    connectionTimeoutSecs?: number;
    /**
     * Host and port of the OpenSearch service.
     */
    hostPort: string;
    /**
     * Keep Alive Timeout in Seconds
     */
    keepAliveTimeoutSecs?: number;
    /**
     * OpenSearch Password for Login
     */
    password?: string;
    /**
     * Http/Https connection scheme
     */
    scheme?: string;
    /**
     * Socket Timeout in Seconds
     */
    socketTimeoutSecs?:          number;
    supportsMetadataExtraction?: boolean;
    /**
     * Truststore Password
     */
    truststorePassword?: string;
    /**
     * Truststore Path
     */
    truststorePath?: string;
    /**
     * Service Type
     */
    type?: OpenSearchType;
    /**
     * OpenSearch Username for Login
     */
    username?: string;
}

/**
 * Service Type
 *
 * OpenSearch service type
 */
export enum OpenSearchType {
    OpenSearch = "OpenSearch",
}
