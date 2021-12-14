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

#cd ..
echo "Maven clean package"
mvn -DskipTests clean package
echo "Docker compose up"
cd docker/local-metadata/
docker-compose up -d --build
echo "docker build done"
echo "waiting for data ingestion"
while ! wget -O /dev/null -o /dev/null localhost:8585/api/v1/teams/name/Finance; do sleep 5; done