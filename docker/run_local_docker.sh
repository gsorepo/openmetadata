#!/bin/bash
#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

cd "$( dirname "${BASH_SOURCE[0]}" )"
echo "Maven Build - Skipping Tests"
cd ../ && mvn -DskipTests clean package
echo "Prepare Docker volume for the operators"
cd docker/local-metadata
echo "Starting Local Docker Containers"
docker compose down && docker compose up --build -d
until curl -s -f -o /dev/null "http://localhost:8585/api/v1/tables/name/bigquery_gcp.shopify.fact_sale"; do
    printf '.'
    sleep 2
done
curl -u "admin:admin" --data '{"dag_run_id":"es_index_1"}' -H "Content-type: application/json" -X POST http://localhost:8080/api/v1/dags/index_metadata/dagRuns
tput setaf 2; echo "✔ OpenMetadata is up and running"